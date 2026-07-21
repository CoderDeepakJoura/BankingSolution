import React, { useState, useEffect } from "react";
import {
  IndianRupee, Calculator, Send,
  AlertCircle, FileText, ArrowLeft, X, BarChart2,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import DatePicker from "../../../components/DatePicker";
import commonservice from "../../../services/common/commonservice";
import savingInterestApi, {
  SavingInterestAccountDTO,
  MonthlyInterestBreakdownDTO,
} from "../../../services/accountMasters/saving/savingInterestApi";

interface ProductOption { value: number; label: string; }
interface AccountOption { value: number; label: string; }

// ── Breakdown Popup ──────────────────────────────────────────────────────────
const BreakdownPopup = ({
  row,
  onClose,
}: {
  row: SavingInterestAccountDTO;
  onClose: () => void;
}) => {
  const rows: MonthlyInterestBreakdownDTO[] = row.monthlyBreakdown;
  const total = rows.reduce((s, r) => s + r.interest, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center shadow-inner">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight tracking-tight">Monthly Breakdown</p>
              <p className="text-blue-100 text-xs mt-0.5 font-medium">
                {row.accountNumber} &nbsp;·&nbsp; {row.accountName}
              </p>
            </div>
          </div>
          {/* X close top-right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Decorative arc */}
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-white" style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0", transform: "scaleX(1.05)" }} />
        </div>

        {/* Summary cards */}
        <div className="px-6 pt-5 pb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Current Balance", value: `₹${row.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
            { label: "Total Interest", value: `₹${row.calculatedInterest.toLocaleString("en-IN", { minimumFractionDigits: 3 })}`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Months", value: String(rows.length), color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className={`font-bold text-base ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 mx-4 mb-4 rounded-xl border border-gray-200 shadow-inner">
          {rows.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No breakdown data available.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-indigo-600 to-blue-500">
                  {["Month", "Eff. Balance (₹)", "Days", "Rate %", "Interest (₹)"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 transition-colors hover:bg-indigo-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{r.month}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      ₹{r.effectiveBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{r.days}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.rate}%</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">
                      ₹{r.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 font-extrabold text-emerald-700 text-base">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer — centered Close button */}
        <div className="px-6 pb-5 flex justify-center">
          <button
            onClick={onClose}
            className="group flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm text-white
                       bg-gradient-to-r from-indigo-500 to-blue-500
                       hover:from-indigo-600 hover:to-blue-600
                       shadow-md hover:shadow-indigo-200 hover:shadow-lg
                       transition-all duration-200 cursor-pointer"
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const SavingInterestPosting: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const workingDateISO = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();
  const sessionFromDate = user.sessionInfo
    ? `${user.sessionInfo.split('-')[0]}-04-01`
    : undefined;

  const [postingDate, setPostingDate] = useState(workingDateISO);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const [gridData, setGridData] = useState<SavingInterestAccountDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [popupRow, setPopupRow] = useState<SavingInterestAccountDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    commonservice.fetch_saving_products(user.branchid).then((res) => {
      if (res.success && res.data)
        setProducts(res.data.map((p: any) => ({ value: p.id, label: p.productName })));
    });
  }, [user.branchid]);

  useEffect(() => {
    if (!selectedProduct) { setAccounts([]); setSelectedAccount(null); return; }
    commonservice.fetch_deposit_accounts(user.branchid, selectedProduct.value, 2, false).then((res) => {
      if (res.success && res.data)
        setAccounts(res.data.map((a: any) => ({
          value: a.accId,
          label: `${a.accountNumber || a.accId} — ${a.accountName}`,
        })));
    });
    setSelectedAccount(null);
    setGridData([]);
    setSelectedIds(new Set());
  }, [selectedProduct]);

  const handleCalculate = async () => {
    if (!selectedProduct) { setError("Please select a saving product."); return; }
    setError("");
    setLoading(true);
    setGridData([]);
    setSelectedIds(new Set());
    try {
      const res = await savingInterestApi.getEligibleAccounts(
        user.branchid,
        selectedProduct.value,
        postingDate,
        selectedAccount?.value
      );
      if (res.success && res.data) {
        setGridData(res.data);
        setSelectedIds(new Set(res.data.map((a) => a.accountId)));
        if (res.data.length === 0)
          setError("No eligible accounts found for the selected criteria. Accounts may have already had interest posted.");
      } else {
        setError(res.message || "Failed to calculate interest.");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (selectedIds.size === 0) { setError("Please select at least one account."); return; }

    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirm Interest Posting",
      html: `Post saving interest for <strong>${selectedIds.size}</strong> account(s) on <strong>${postingDate}</strong>?<br/>
             <span class="text-sm text-gray-500">This action cannot be undone.</span>`,
      showCancelButton: true,
      confirmButtonText: "Yes, Post",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await savingInterestApi.postInterest({
        branchId: user.branchid,
        productId: selectedProduct!.value,
        postingDate,
        accountIds: Array.from(selectedIds),
      });
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Posted!",
          text: res.message || "Interest posted successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        setGridData([]);
        setSelectedIds(new Set());
      } else {
        Swal.fire({ icon: "error", title: "Error", text: res.message || "Posting failed." });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "An unexpected error occurred." });
    } finally {
      setPosting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === gridData.length)
      setSelectedIds(new Set());
    else
      setSelectedIds(new Set(gridData.map((r) => r.accountId)));
  };

  const totalSelected = gridData
    .filter((r) => selectedIds.has(r.accountId))
    .reduce((s, r) => s + r.calculatedInterest, 0);

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Saving Interest Posting</h2>
                      <p className="text-sm text-emerald-100">Calculate and post interest for saving accounts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Operations
                  </button>
                </div>
              </div>

              {/* Filter form */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Posting Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={postingDate}
                      onChange={(v) => { setPostingDate(v); setGridData([]); setError(""); }}
                      min={sessionFromDate}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Saving Product <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={products}
                      value={selectedProduct}
                      onChange={(opt) => { setSelectedProduct(opt); setGridData([]); setError(""); }}
                      placeholder="Select Product"
                      isClearable
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base: any) => ({ ...base, cursor: "pointer" }) }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Account <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <Select
                      options={accounts}
                      value={selectedAccount}
                      onChange={(opt) => { setSelectedAccount(opt); setGridData([]); setError(""); }}
                      placeholder={selectedProduct ? "All accounts" : "Select product first"}
                      isDisabled={!selectedProduct}
                      isClearable
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base: any) => ({ ...base, cursor: "pointer" }) }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      className="text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleCalculate}
                      disabled={!selectedProduct || loading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Calculator className="w-4 h-4" />}
                      {loading ? "Calculating..." : "Calculate"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results grid */}
            {gridData.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-800">
                      {gridData.length} Account{gridData.length !== 1 ? "s" : ""} Eligible
                    </span>
                    {selectedIds.size > 0 && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        {selectedIds.size} selected — Total ₹{totalSelected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={selectedIds.size === 0 || posting}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    {posting
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                    {posting ? "Posting..." : `Post Interest (${selectedIds.size})`}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === gridData.length}
                            onChange={toggleAll}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                        </th>
                        {["#", "Account No", "Account Name", "Current Balance", "Interest (₹)", "Details"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {gridData.map((row, idx) => {
                        const isSelected = selectedIds.has(row.accountId);
                        return (
                          <tr
                            key={row.accountId}
                            onClick={() => toggleSelect(row.accountId)}
                            className={`transition-colors cursor-pointer ${isSelected ? "bg-emerald-50 hover:bg-emerald-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(row.accountId)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.accountNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.accountName}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                              ₹{row.currentBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                              ₹{row.calculatedInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPopupRow(row); }}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                              >
                                <BarChart2 className="w-3.5 h-3.5" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-800">
                          Total ({selectedIds.size} selected)
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                          ₹{totalSelected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown popup */}
          {popupRow && (
            <BreakdownPopup row={popupRow} onClose={() => setPopupRow(null)} />
          )}
        </div>
      }
    />
  );
};

export default SavingInterestPosting;
