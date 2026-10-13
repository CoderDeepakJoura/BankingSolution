import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { FaSearch, FaTimes, FaPlus, FaBoxOpen } from "react-icons/fa";
import { X, ToggleLeft, ToggleRight, Trash2, Play } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import autoDebitApi, { AutoDebitMandateDTO } from "../../services/autoDebit/autoDebitApi";
import commonservice from "../../services/common/commonservice";

const ACCOUNT_TYPES = [
  { value: "RDKist",       label: "RD Kist",      accTypeId: 5 },
  { value: "LoanRecovery", label: "Loan Recovery", accTypeId: 3 },
];

const typeLabel = (t: string) => ACCOUNT_TYPES.find(x => x.value === t)?.label ?? t;
const typeBadge = (t: string) =>
  t === "RDKist" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700";

const AutoDebitMandates = () => {
  const navigate  = useNavigate();
  const user      = useSelector((s: RootState) => s.user);

  const [mandates,      setMandates]      = useState<AutoDebitMandateDTO[]>([]);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [pageNumber,    setPageNumber]    = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const [totalCount,    setTotalCount]    = useState(0);
  const [isLoading,     setIsLoading]     = useState(true);
  const [running,       setRunning]       = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearchTerm(pendingSearch.trim()); setPageNumber(1); }, 400);
    return () => clearTimeout(t);
  }, [pendingSearch]);

  const fetchMandates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await autoDebitApi.getMandates(user.branchid);
      if (res.success) {
        const all: AutoDebitMandateDTO[] = (res as any).data ?? [];
        const filtered = searchTerm
          ? all.filter(m =>
              m.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.accountNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.savingAccName?.toLowerCase().includes(searchTerm.toLowerCase()))
          : all;
        setTotalCount(filtered.length);
        const start = (pageNumber - 1) * pageSize;
        setMandates(filtered.slice(start, start + pageSize));
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [user.branchid, searchTerm, pageNumber, pageSize]);

  useEffect(() => { fetchMandates(); }, [fetchMandates]);

  // ── Add mandate (Swal dialog) ────────────────────────────────────────────────
  const handleAdd = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Add Auto-Debit Mandate",
      html: `
        <div style="text-align:left; padding: 8px 0;">
          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Account Type</label>
            <select id="swal-acctype" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; cursor:pointer;">
              ${ACCOUNT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join("")}
            </select>
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">
              Select Account <span id="swal-acc-loading" style="color:#10b981; font-weight:400;"></span>
            </label>
            <select id="swal-accid" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; cursor:pointer;">
              <option value="">— Select Account —</option>
            </select>
          </div>
          <div style="margin-bottom:14px;" id="swal-saving-wrap">
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">
              Debit Saving A/C <span id="swal-sav-loading" style="color:#10b981; font-weight:400;"></span>
            </label>
            <select id="swal-savaccid" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; cursor:pointer;">
              <option value="">— Select after choosing account —</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Notes (optional)</label>
            <input id="swal-notes" type="text" placeholder="e.g. Member consent obtained"
              style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; box-sizing:border-box;" />
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: "Add Mandate",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      didOpen: async () => {
        const accTypeEl  = document.getElementById("swal-acctype")  as HTMLSelectElement;
        const accIdEl    = document.getElementById("swal-accid")    as HTMLSelectElement;
        const savAccEl   = document.getElementById("swal-savaccid") as HTMLSelectElement;
        const loadingEl  = document.getElementById("swal-acc-loading")!;
        const savLoadEl  = document.getElementById("swal-sav-loading")!;

        // accId → memberId lookup cache
        let accMemberMap: Record<number, { memberId: number; memberBrId: number }> = {};

        const loadSavingAccounts = async (accId: number) => {
          const info = accMemberMap[accId];
          if (!info || !info.memberId) {
            savAccEl.innerHTML = '<option value="">— No member linked —</option>';
            return;
          }
          savLoadEl.textContent = "(loading…)";
          savAccEl.innerHTML = '<option value="">— Loading… —</option>';
          try {
            const res: any = await commonservice.fetch_member_saving_accounts(user.branchid, info.memberId, info.memberBrId);
            const opts = (res?.data ?? []).map((a: any) => `<option value="${a.accId}">${a.accountNo} — ${a.accountName}</option>`).join("");
            savAccEl.innerHTML = opts
              ? '<option value="">— Select Saving A/C —</option>' + opts
              : '<option value="">— No saving accounts found —</option>';
          } catch {
            savAccEl.innerHTML = '<option value="">Failed to load</option>';
          } finally { savLoadEl.textContent = ""; }
        };

        const loadAccounts = async (accType: string) => {
          const typeConf = ACCOUNT_TYPES.find(t => t.value === accType);
          if (!typeConf) return;
          loadingEl.textContent = "(loading…)";
          accIdEl.innerHTML = '<option value="">— Loading… —</option>';
          savAccEl.innerHTML = '<option value="">— Select account first —</option>';
          accMemberMap = {};
          try {
            const res: any = await commonservice.fetch_accounts_by_type(user.branchid, typeConf.accTypeId);
            const accounts: any[] = res?.data ?? [];
            // Store member info per account
            accounts.forEach((a: any) => {
              if (a.accId && a.memberId) {
                accMemberMap[a.accId] = { memberId: a.memberId, memberBrId: a.memberBrId ?? user.branchid };
              }
            });
            const opts = accounts.map((a: any) => `<option value="${a.accId}">${a.accountName}</option>`).join("");
            accIdEl.innerHTML = '<option value="">— Select Account —</option>' + opts;
          } catch {
            accIdEl.innerHTML = '<option value="">Failed to load</option>';
          } finally { loadingEl.textContent = ""; }
        };

        accIdEl.addEventListener("change", () => {
          const id = parseInt(accIdEl.value);
          if (id) loadSavingAccounts(id);
          else savAccEl.innerHTML = '<option value="">— Select account first —</option>';
        });
        accTypeEl.addEventListener("change", () => loadAccounts(accTypeEl.value));
        await loadAccounts(accTypeEl.value);
      },
      preConfirm: () => {
        const accType    = (document.getElementById("swal-acctype")  as HTMLSelectElement).value;
        const accId      = (document.getElementById("swal-accid")    as HTMLSelectElement).value;
        const savAccId   = (document.getElementById("swal-savaccid") as HTMLSelectElement).value;
        const notes      = (document.getElementById("swal-notes")    as HTMLInputElement).value.trim();
        if (!accId)    { Swal.showValidationMessage("Please select an account.");          return null; }
        if (!savAccId) { Swal.showValidationMessage("Please select a saving account for debit."); return null; }
        return { accType, accId: parseInt(accId), savAccId: parseInt(savAccId), notes };
      },
    });

    if (!formValues) return;
    try {
      const res = await autoDebitApi.addMandate({
        branchId: user.branchid, accountId: formValues.accId,
        accountType: formValues.accType, notes: formValues.notes,
        savingAccountId: formValues.savAccId,
      });
      if (res.success) {
        Swal.fire({ icon: "success", title: "Added", text: "Mandate added successfully.", timer: 1500, showConfirmButton: false });
        fetchMandates();
      } else {
        Swal.fire("Error", (res as any).message || "Failed to add mandate.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed.", "error");
    }
  };

  const handleToggle = async (mandate: AutoDebitMandateDTO) => {
    try {
      const res = await autoDebitApi.toggleMandate(mandate.id, user.branchid);
      if (res.success) fetchMandates();
    } catch { /* ignore */ }
  };

  const handleDelete = async (mandate: AutoDebitMandateDTO) => {
    const conf = await Swal.fire({
      title: "Remove mandate?",
      text: `This will stop auto-debit for ${mandate.accountName}.`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Yes, remove", cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!conf.isConfirmed) return;
    try {
      const res = await autoDebitApi.deleteMandate(mandate.id, user.branchid);
      if (res.success) fetchMandates();
    } catch { /* ignore */ }
  };

  const handleRunNow = async () => {
    const conf = await Swal.fire({
      title: "Run Auto-Debit Now?",
      text: "This will immediately process all active mandates for today's date.",
      icon: "question", showCancelButton: true,
      confirmButtonText: "Yes, Run Now", confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
    });
    if (!conf.isConfirmed) return;
    setRunning(true);
    try {
      const res: any = await autoDebitApi.runNow(user.branchid);
      if (res.success) {
        await Swal.fire({
          icon: "success", title: "Batch Complete",
          text: res.message || "Auto-debit batch completed successfully.",
          confirmButtonText: "View History", confirmButtonColor: "#2563eb",
          showCancelButton: true, cancelButtonText: "Stay Here",
        }).then(r => { if (r.isConfirmed) navigate("/auto-debit-history"); });
        fetchMandates();
      } else {
        Swal.fire("Error", res.message || "Batch failed.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Batch failed.", "error");
    } finally { setRunning(false); }
  };

  const totalPages  = Math.ceil(totalCount / pageSize);
  const startEntry  = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endEntry    = Math.min(startEntry + mandates.length - 1, totalCount);
  const getPageNumbers = () => {
    const max = 5;
    const start = Math.max(1, pageNumber - Math.floor(max / 2));
    const end   = Math.min(totalPages, start + max - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const COLS = ["S.No", "Account No.", "Account Name", "Debit Saving A/C", "Type", "Status", "Added On", "Notes", "Actions"];

  return (
    <DashboardLayout
      mainContent={
        <div className="p-4 sm:p-8 bg-gray-100 min-h-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Auto-Debit Mandates</h1>
            <div className="flex items-center gap-2">
              <button onClick={handleRunNow} disabled={running}
                className="flex items-center bg-violet-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-violet-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer disabled:opacity-60">
                <Play className="mr-2 w-4 h-4" />
                {running ? "Running…" : "Run Now"}
              </button>
              <button onClick={handleAdd}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-green-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer">
                <FaPlus className="mr-2" /> Add Mandate
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-red-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer">
                <X className="mr-2 w-4 h-4" /> Close
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6">
            <div className="relative flex items-center">
              <FaSearch className="absolute left-3 text-gray-500" />
              <input type="text" placeholder="Search by account name, number or saving A/C…"
                value={pendingSearch} onChange={(e) => setPendingSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setPendingSearch(""); setSearchTerm(""); } }}
                className="w-full pl-10 pr-12 py-2 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {pendingSearch && (
                <button onClick={() => { setPendingSearch(""); setSearchTerm(""); }}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-200 rounded-lg h-12 w-full" />)}
            </div>
          ) : mandates.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 text-gray-500">
              <FaBoxOpen className="text-4xl mb-2" />
              <span>No mandates found</span>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 bg-gradient-to-b from-slate-50 to-gray-100 border-b-2 border-slate-200 z-10">
                    <tr>
                      {COLS.map((h, i) => (
                        <th key={h} className={`p-4 font-bold text-slate-700 uppercase text-xs tracking-wider text-center ${i > 0 ? "border-l border-slate-200" : ""}`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-70" />
                            {h}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mandates.map((m, ri) => (
                      <tr key={m.id}
                        className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="p-4 text-center text-xs font-semibold text-slate-500">{startEntry + ri}</td>
                        <td className="p-4 text-center font-mono text-sm font-medium text-blue-600 border-l border-slate-100">{m.accountNo || "—"}</td>
                        <td className="p-4 text-center font-medium text-gray-800 border-l border-slate-100">{m.accountName}</td>
                        <td className="p-4 text-center border-l border-slate-100">
                          {m.savingAccName ? (
                            <div>
                              <div className="font-medium text-gray-700 text-xs">{m.savingAccName}</div>
                              <div className="font-mono text-xs text-emerald-600">{m.savingAccNo}</div>
                            </div>
                          ) : (
                            <span className="text-red-400 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="p-4 text-center border-l border-slate-100">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(m.accounttype)}`}>
                            {typeLabel(m.accounttype)}
                          </span>
                        </td>
                        <td className="p-4 text-center border-l border-slate-100">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.isactive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {m.isactive ? "Active" : "Paused"}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-500 border-l border-slate-100">{m.createdAt}</td>
                        <td className="p-4 text-center text-gray-400 max-w-xs truncate border-l border-slate-100">{m.notes || "—"}</td>
                        <td className="p-4 text-center border-l border-slate-100">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleToggle(m)} title={m.isactive ? "Pause" : "Resume"}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-300 text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                              {m.isactive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDelete(m)} title="Remove"
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-red-300 text-red-400 hover:bg-red-50 cursor-pointer transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">
                Showing <strong>{startEntry}</strong> – <strong>{endEntry}</strong> of <strong>{totalCount}</strong>
              </div>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
                className="text-sm border rounded-full px-3 py-1 shadow-sm cursor-pointer">
                {[10, 20, 50].map(s => <option key={s} value={s}>{s} / page</option>)}
              </select>
              <div className="flex items-center gap-2">
                <button onClick={() => setPageNumber(1)} disabled={pageNumber === 1}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50 cursor-pointer">« First</button>
                <button onClick={() => setPageNumber(p => Math.max(p - 1, 1))} disabled={pageNumber === 1}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50 cursor-pointer">‹ Prev</button>
                {getPageNumbers().map(pg => (
                  <button key={pg} onClick={() => setPageNumber(pg)}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer ${pg === pageNumber ? "bg-blue-600 text-white" : "border bg-white"}`}>
                    {pg}
                  </button>
                ))}
                <button onClick={() => setPageNumber(p => Math.min(p + 1, totalPages))} disabled={pageNumber === totalPages}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50 cursor-pointer">Next ›</button>
                <button onClick={() => setPageNumber(totalPages)} disabled={pageNumber === totalPages}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50 cursor-pointer">Last »</button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default AutoDebitMandates;
