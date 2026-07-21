import React, { useState, useEffect } from "react";
import {
  IndianRupee, Calculator, Send,
  AlertCircle, ArrowLeft, X, BarChart2, TrendingUp,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import DatePicker from "../../../components/DatePicker";
import commonservice from "../../../services/common/commonservice";
import fdInterestPostingApi, {
  FDInterestAccountDTO,
  FDInterestDetailDTO,
} from "../../../services/accountMasters/fdaccount/fdInterestPostingApi";
// intAccountType: 1 = SameAccount (cumulative FD), 2 = OtherAccount (MIS)

interface ProductOption { value: number; label: string; }
interface AccountOption { value: number; label: string; }

const INTERVAL_LABELS: Record<number, string> = {
  1: "No Compounding",
  2: "Daily",
  3: "Monthly",
  4: "Quarterly",
  5: "Half Yearly",
  6: "Yearly",
  7: "Two Yearly",
};

// ── Breakdown Popup ──────────────────────────────────────────────────────────
const BreakdownPopup = ({
  row,
  onClose,
}: {
  row: FDInterestAccountDTO;
  onClose: () => void;
}) => {
  const details: FDInterestDetailDTO[] = row.details;

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center shadow-inner">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight tracking-tight">FD Period Breakdown</p>
              <p className="text-orange-100 text-xs mt-0.5 font-medium">
                {row.accountNumber} &nbsp;·&nbsp; {row.accountName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div
            className="absolute bottom-0 left-0 right-0 h-3 bg-white"
            style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0", transform: "scaleX(1.05)" }}
          />
        </div>

        {/* Summary cards */}
        <div className="px-6 pt-5 pb-4 grid grid-cols-3 gap-3">
          {[
            { label: "FD Details", value: String(details.length), color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
            { label: "Total Interest", value: `₹${row.totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Periods Due", value: String(details.length), color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
              <p className={`font-bold text-base ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 mx-4 mb-4 rounded-xl border border-gray-200 shadow-inner">
          {details.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No breakdown data available.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500">
                  {["FD#", "FD Amount (₹)", "Period From", "Period To", "Days", "Rate %", "Interval", "Interest (₹)"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {details.map((d, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 transition-colors hover:bg-amber-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{d.serialNo}</td>
                    <td className="px-3 py-2.5 text-gray-600">₹{d.fdAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(d.periodFrom)}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(d.periodTo)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.days}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.intRate}%</td>
                    <td className="px-3 py-2.5 text-gray-500">{INTERVAL_LABELS[d.compInterval] ?? d.compInterval}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">₹{d.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-amber-200">
                  <td colSpan={7} className="px-3 py-3 text-xs font-bold text-amber-700 uppercase tracking-wider">Total</td>
                  <td className="px-3 py-3 font-extrabold text-emerald-700 text-base">
                    ₹{row.totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                       bg-gradient-to-r from-amber-500 to-orange-500
                       hover:from-amber-600 hover:to-orange-600
                       shadow-md hover:shadow-amber-200 hover:shadow-lg
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
interface Props {
  isMIS?: boolean;
}

const FDInterestPosting: React.FC<Props> = ({ isMIS = false }) => {
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

  const [gridData, setGridData] = useState<FDInterestAccountDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [popupRow, setPopupRow] = useState<FDInterestAccountDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const title = isMIS ? "MIS Interest Posting" : "FD Interest Posting";
  const subtitle = isMIS
    ? "Post monthly interest to MIS saving accounts"
    : "Post cumulative interest to FD interest payable account";
  const headerGradient = isMIS
    ? "bg-gradient-to-r from-violet-600 to-purple-600"
    : "bg-gradient-to-r from-amber-600 to-orange-600";
  const btnColor = isMIS
    ? "bg-violet-600 hover:bg-violet-700"
    : "bg-amber-600 hover:bg-amber-700";
  const pageGradient = isMIS
    ? "bg-gradient-to-br from-gray-50 to-violet-50"
    : "bg-gradient-to-br from-gray-50 to-amber-50";
  const accentCheckbox = isMIS ? "accent-violet-600" : "accent-amber-600";
  const viewBtnClass = isMIS
    ? "bg-violet-100 hover:bg-violet-200 text-violet-700"
    : "bg-amber-100 hover:bg-amber-200 text-amber-700";
  const selectedRowBg = isMIS ? "bg-violet-50/50" : "bg-amber-50/50";
  const hoverRowBg = isMIS ? "hover:bg-violet-50/40" : "hover:bg-amber-50/40";

  useEffect(() => {
    // 1 = SameAccount (cumulative FD), 2 = OtherAccount (MIS)
    const intAccountType = isMIS ? 2 : 1;
    fdInterestPostingApi.getProductsByType(user.branchid, intAccountType).then((res: any) => {
      if (res.success && res.data)
        setProducts(res.data.map((p: any) => ({ value: p.id, label: p.productName })));
    });
  }, [user.branchid, isMIS]);

  useEffect(() => {
    if (!selectedProduct) { setAccounts([]); setSelectedAccount(null); return; }
    commonservice.fetch_deposit_accounts(user.branchid, selectedProduct.value, 6, false).then((res: any) => {
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
    if (!selectedProduct) { setError("Please select an FD product."); return; }
    setError("");
    setLoading(true);
    setGridData([]);
    setSelectedIds(new Set());
    try {
      const res = await fdInterestPostingApi.getEligibleAccounts(
        user.branchid,
        selectedProduct.value,
        postingDate,
        isMIS,
        selectedAccount?.value
      );
      const data: FDInterestAccountDTO[] = (res as any)?.data ?? [];
      if (data.length > 0) {
        setGridData(data);
        setSelectedIds(new Set(data.map((a) => a.accountId)));
      } else {
        setError("No eligible FD accounts found. All accounts may be up-to-date or no intervals are due.");
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
      title: `Confirm ${title}`,
      html: `Post ${isMIS ? "MIS" : "FD"} interest for <strong>${selectedIds.size}</strong> account(s) on <strong>${postingDate}</strong>?<br/>
             <span class="text-sm text-gray-500">This action cannot be undone.</span>`,
      showCancelButton: true,
      confirmButtonText: "Yes, Post",
      cancelButtonText: "Cancel",
      confirmButtonColor: isMIS ? "#7C3AED" : "#D97706",
      cancelButtonColor: "#6B7280",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await fdInterestPostingApi.postInterest({
        branchId: user.branchid,
        productId: selectedProduct!.value,
        postingDate,
        accountIds: Array.from(selectedIds),
        isMIS,
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
    .reduce((s, r) => s + r.totalInterest, 0);

  return (
    <>
      {popupRow && <BreakdownPopup row={popupRow} onClose={() => setPopupRow(null)} />}
      <DashboardLayout
        enableScroll
        mainContent={
          <div className={`min-h-screen ${pageGradient} p-4 sm:p-6 lg:p-8`}>
            <div className="w-full space-y-6">

              {/* Header */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className={`${headerGradient} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <p className="text-sm text-white/80">{subtitle}</p>
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
                        FD Product <span className="text-red-500">*</span>
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
                        className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 ${btnColor} text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm`}
                      >
                        {loading
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Calculator className="w-4 h-4" />}
                        {loading ? "Calculating..." : "Calculate"}
                      </button>
                    </div>
                  </div>

                  {/* Error banner */}
                  {error && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Results grid */}
              {gridData.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-gray-800">
                        Eligible Accounts ({gridData.length})
                      </span>
                      {selectedIds.size > 0 && (
                        <span className="text-sm text-gray-500">
                          — {selectedIds.size} selected &nbsp;|&nbsp;
                          Total: <span className="font-bold text-emerald-600">
                            ₹{totalSelected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handlePost}
                      disabled={selectedIds.size === 0 || posting}
                      className={`flex items-center gap-2 px-5 py-2 ${btnColor} text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm`}
                    >
                      {posting
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                      {posting ? "Posting..." : `Post Interest (${selectedIds.size})`}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left w-10">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === gridData.length && gridData.length > 0}
                              onChange={toggleAll}
                              className={`w-4 h-4 rounded ${accentCheckbox} cursor-pointer`}
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account No.</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Interest (₹)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Periods Due</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gridData.map((row, i) => (
                          <tr
                            key={row.accountId}
                            className={`border-b border-gray-100 transition-colors ${
                              selectedIds.has(row.accountId) ? selectedRowBg : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            } ${hoverRowBg}`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(row.accountId)}
                                onChange={() => toggleSelect(row.accountId)}
                                className={`w-4 h-4 rounded ${accentCheckbox} cursor-pointer`}
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{row.accountNumber}</td>
                            <td className="px-4 py-3 text-gray-700">{row.accountName}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              ₹{row.totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{row.details.length}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setPopupRow(row)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${viewBtnClass} transition-colors cursor-pointer`}
                              >
                                <BarChart2 className="w-3.5 h-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        }
      />
    </>
  );
};

export default FDInterestPosting;
