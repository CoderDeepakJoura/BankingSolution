import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { ArrowLeft, Landmark, Search, Save, Printer } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import DatePicker from "../../components/DatePicker";
import { bankFDInterestPostingApi, BFDIPPreviewRow } from "../../services/bankfd/bankFDInterestPostingApi";
import bankFDMatureApi from "../../services/bankfd/bankFDMatureApi";

interface SelectOption { value: number; label: string; }

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compLabel = (v: number) =>
  ({ 12: "Monthly", 4: "Quarterly", 2: "Half-Yearly", 1: "Yearly", 0: "No Compounding" }[v] ?? String(v));

const selectStyles = {
  control: (b: any) => ({ ...b, cursor: "pointer", minHeight: 36, fontSize: 13 }),
  menu: (b: any) => ({ ...b, zIndex: 9999 }),
};

const BankFDInterestPosting: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate ? commonservice.parseWorkingDate(user.workingdate) : "";

  // Filter state
  const [postingDate, setPostingDate] = useState(workingDate);
  const [headId, setHeadId] = useState<number>(0);
  const [bfdAccId, setBfdAccId] = useState<number>(0);
  const [creditAccId, setCreditAccId] = useState<number | null>(null);
  const [narration, setNarration] = useState("");

  // Dropdown data
  const [accountHeads, setAccountHeads] = useState<SelectOption[]>([]);
  const [bfdAccounts, setBfdAccounts] = useState<SelectOption[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<SelectOption[]>([]);

  // Table data
  const [rows, setRows] = useState<BFDIPPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [shown, setShown] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load account heads and GL accounts on mount
  useEffect(() => {
    if (!user.branchid) return;

    commonservice.makeRequest<any>("/fetchdata/get_all_accountheads", {
      method: "POST",
      body: JSON.stringify({ BranchId: user.branchid }),
      headers: { "Content-Type": "application/json" },
    }).then(res => {
      const data = (res as any)?.data ?? [];
      setAccountHeads(data.map((h: any) => ({
        value: h.accountHeadId ?? h.AccountHeadId,
        label: h.accountHeadName ?? h.AccountHeadName,
      })));
    }).catch(() => {});

    commonservice.general_accmasters_info(user.branchid)
      .then(r => setGeneralAccounts((r.data ?? []).map((a: any) => ({ value: a.accId, label: a.accountName }))));
  }, [user.branchid]);

  // Load BFD accounts + auto-fill interest income account when head changes
  useEffect(() => {
    setBfdAccId(0);
    setBfdAccounts([]);
    setCreditAccId(null);
    if (!user.branchid) return;
    bankFDInterestPostingApi.getAccounts(user.branchid, headId)
      .then(r => setBfdAccounts((r as any)?.data?.map((a: any) => ({ value: a.accId, label: `${a.accNo} — ${a.accountName}` })) ?? []));
    if (headId > 0) {
      bankFDMatureApi.getInterestIncomeSettingByHeadId(user.branchid, headId)
        .then(r => {
          const id = (r as any)?.data?.intIncomeAccId ?? null;
          if (id) setCreditAccId(id);
        }).catch(() => {});
    }
  }, [headId, user.branchid]);

  const handleShow = async () => {
    if (!creditAccId) {
      Swal.fire("Warning", "Please select a Credit (Interest Income) Account.", "warning"); return;
    }
    setLoading(true);
    setShown(false);
    try {
      const res = await bankFDInterestPostingApi.getPreview(
        user.branchid, headId, bfdAccId, postingDate
      );
      const data = (res as any)?.data ?? [];
      setRows(data);
      setShown(true);
      if (data.length === 0)
        Swal.fire("Info", "No eligible FD details found for interest posting.", "info");
    } catch (err: any) {
      Swal.fire("Error", err?.message ?? "Failed to fetch interest details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (detailId: number, field: "intAmount" | "tdsAmount", raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const num = digits === "" ? 0 : parseInt(digits, 10);
    setRows(prev => prev.map(r => r.detailId === detailId ? { ...r, [field]: num } : r));
  };

  const totalInterest = rows.reduce((s, r) => s + r.intAmount, 0);
  const totalTDS = rows.reduce((s, r) => s + r.tdsAmount, 0);

  const handlePost = async () => {
    if (!rows.length) return;
    if (!creditAccId) {
      Swal.fire("Warning", "Credit account is required.", "warning"); return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Interest Posting",
      html: `Post interest for <b>${rows.length}</b> FD account(s)?<br/>
             Total Interest: <b>₹${fmt(totalInterest)}</b><br/>
             Total TDS: <b>₹${fmt(totalTDS)}</b>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Post",
      confirmButtonColor: "#4f46e5",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await bankFDInterestPostingApi.post({
        branchId: user.branchid,
        voucherDate: postingDate,
        creditAccId: creditAccId!,
        narration,
        rows: rows.map(r => ({
          accId: r.accId,
          detailId: r.detailId,
          intAmount: r.intAmount,
          tdsAmount: r.tdsAmount,
          lastPostingDate: r.lastPostingDate,
        })),
      });
      await Swal.fire("Success", (res as any)?.message ?? "Interest posted successfully.", "success");
      setRows([]);
      setShown(false);
      setNarration("");
    } catch (err: any) {
      Swal.fire("Error", err?.message ?? "Failed to post interest.", "error");
    } finally {
      setPosting(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Bank FD Interest Posting</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        td.num { text-align: right; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
        .totals { margin-top: 10px; font-weight: bold; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-xl shadow-lg p-4 mb-5 flex items-center gap-3">
          <div className="p-2 bg-white/15 rounded-lg"><Landmark size={20} className="text-white" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Bank FD Interest Posting</h1>
            <p className="text-blue-100 text-xs">Calculate and post periodic interest on Bank FD accounts</p>
          </div>
          <button
            onClick={() => navigate("/voucher-operations")}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Back to Operations
          </button>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-xl shadow p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {/* Posting Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
              <DatePicker
                value={postingDate}
                onChange={setPostingDate}
                max={workingDate}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Account Head */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Account Head</label>
              <Select
                options={accountHeads}
                value={accountHeads.find(o => o.value === headId) ?? null}
                onChange={o => setHeadId(o?.value ?? 0)}
                placeholder="Select account head..."
                isClearable
                styles={selectStyles}
              />
            </div>

            {/* BFD Account */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">BFD Account <span className="text-gray-400">(blank = all)</span></label>
              <Select
                options={bfdAccounts}
                value={bfdAccounts.find(o => o.value === bfdAccId) ?? null}
                onChange={o => setBfdAccId(o?.value ?? 0)}
                placeholder="All accounts..."
                isClearable
                isDisabled={!headId}
                styles={selectStyles}
              />
            </div>

            {/* Credit Account */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Credit Account (Interest Income) <span className="text-red-500">*</span></label>
              <Select
                options={generalAccounts}
                value={generalAccounts.find(o => o.value === creditAccId) ?? null}
                onChange={o => setCreditAccId(o?.value ?? null)}
                placeholder="Interest income GL..."
                isClearable
                styles={selectStyles}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleShow}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              <Search size={15} />
              {loading ? "Loading..." : "Show"}
            </button>
          </div>
        </div>

        {/* Results Table */}
        {shown && (
          <div className="bg-white rounded-xl shadow p-5">
            <div ref={printRef}>
              <div className="title mb-3 hidden print:block">Bank FD Interest Posting — {postingDate}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-800">
                      <th className="border border-gray-200 px-3 py-2 text-left">S.No.</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">Account No.</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">Account Name</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">LTD No.</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">FD Balance</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">Rate %</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">Compounding</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">Interest</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">TDS</th>
                      <th className="border border-gray-200 px-3 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.accId}-${r.detailId}`} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2">{i + 1}</td>
                        <td className="border border-gray-200 px-3 py-2 font-mono">{r.accNo}</td>
                        <td className="border border-gray-200 px-3 py-2">{r.accName}</td>
                        <td className="border border-gray-200 px-3 py-2">{r.ltdNo}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right">{fmt(r.fdBalance)}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right">{r.intRate.toFixed(2)}</td>
                        <td className="border border-gray-200 px-3 py-2">{compLabel(r.intCompInterval)}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={r.intAmount}
                            maxLength={10}
                            onChange={e => handleRowChange(r.detailId, "intAmount", e.target.value)}
                            className="w-28 text-right border border-gray-300 rounded px-2 py-1 text-sm font-semibold text-green-700 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={r.tdsAmount}
                            maxLength={10}
                            onChange={e => handleRowChange(r.detailId, "tdsAmount", e.target.value)}
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm text-red-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                          />
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-right font-semibold">{fmt(r.intAmount - r.tdsAmount)}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold">
                        <td colSpan={7} className="border border-gray-200 px-3 py-2 text-right">Total</td>
                        <td className="border border-gray-200 px-3 py-2 text-right text-green-700">{fmt(totalInterest)}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right text-red-600">{fmt(totalTDS)}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right">{fmt(totalInterest - totalTDS)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Bottom bar */}
            {rows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Narration:</label>
                  <input
                    type="text"
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    placeholder="Optional narration..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Printer size={15} /> Print
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={posting}
                    className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Save size={15} />
                    {posting ? "Posting..." : "Post Interest"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      }
    />
  );
};

export default BankFDInterestPosting;
