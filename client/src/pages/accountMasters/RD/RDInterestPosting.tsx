import React, { useState, useEffect } from "react";
import {
  IndianRupee, Calculator, Send, AlertCircle,
  ArrowLeft, RefreshCw, CreditCard, BarChart2, X,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import DatePicker from "../../../components/DatePicker";
import commonservice from "../../../services/common/commonservice";
import rdInterestPostingApi, {
  RDInterestAccountDTO,
  RDInterestKistBreakdownDTO,
  RDInterestPostingInfoDTO,
} from "../../../services/accountMasters/rdaccount/rdInterestPostingApi";

interface ProductOption { value: number; label: string; }
interface AccountOption { value: number; label: string; }

// ── Breakdown Popup ──────────────────────────────────────────────────────────
const BreakdownPopup = ({
  row,
  onClose,
}: {
  row: RDInterestAccountDTO;
  onClose: () => void;
}) => {
  const details: RDInterestKistBreakdownDTO[] = row.details;

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
        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-500">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center shadow-inner">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight tracking-tight">Kist-wise Breakdown</p>
              <p className="text-indigo-100 text-xs mt-0.5 font-medium">
                {row.accountNumber} &nbsp;·&nbsp; {row.accountName} &nbsp;·&nbsp; RD# {row.rdNumber}
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
            { label: "Kists Paid", value: String(details.length), color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
            { label: "Total Interest", value: `₹${row.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Rate", value: details[0] ? `${details[0].rate}%` : "-", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
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
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-500">
                  {["Kist#", "Kist Amount (₹)", "Kist Date", "Earn From", "Earn To", "Days", "Rate %", "Interest (₹)"].map((h) => (
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
                    className={`border-b border-gray-100 transition-colors hover:bg-indigo-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{d.kistNo}</td>
                    <td className="px-3 py-2.5 text-gray-600">₹{d.kistAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(d.kistDate)}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(d.earnFrom)}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(d.earnTo)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.days}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.rate}%</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">₹{d.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50 border-t-2 border-indigo-200">
                  <td colSpan={7} className="px-3 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">Total</td>
                  <td className="px-3 py-3 font-extrabold text-emerald-700 text-base">
                    ₹{row.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-center">
          <button
            onClick={onClose}
            className="group flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm text-white
                       bg-gradient-to-r from-indigo-500 to-violet-500
                       hover:from-indigo-600 hover:to-violet-600
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

const RDInterestPosting: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const workingDateISO = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();
  const sessionFromDate = user.sessionInfo
    ? `${user.sessionInfo.split('-')[0]}-04-01`
    : workingDateISO;

  const [voucherDate] = useState(workingDateISO);
  const [fromDate, setFromDate] = useState(sessionFromDate);
  const [toDate, setToDate] = useState(workingDateISO);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  const [info, setInfo] = useState<RDInterestPostingInfoDTO | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [popupRow, setPopupRow] = useState<RDInterestAccountDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    commonservice.fetch_rd_products(user.branchid).then((res: any) => {
      if (res.success && res.data)
        setProducts(res.data.map((p: any) => ({ value: p.id, label: p.productName })));
    });
  }, [user.branchid]);

  useEffect(() => {
    if (!selectedProduct) { setAccounts([]); setSelectedAccount(null); return; }
    commonservice.fetch_deposit_accounts(user.branchid, selectedProduct.value, 5, false).then((res: any) => {
      if (res.success && res.data)
        setAccounts(res.data.map((a: any) => ({
          value: a.accId,
          label: `${a.accountNumber || a.accId} — ${a.accountName}`,
        })));
    });
    setSelectedAccount(null);
    setInfo(null);
    setSelectedIds(new Set());
  }, [selectedProduct]);

  const handleShow = async () => {
    if (!selectedProduct) { setError("Please select an RD product."); return; }
    if (fromDate > toDate) { setError("Interest From Date cannot be after Interest To Date."); return; }
    setError("");
    setLoading(true);
    setInfo(null);
    setSelectedIds(new Set());
    try {
      const res = await rdInterestPostingApi.getEligibleAccounts(
        user.branchid, selectedProduct.value, fromDate, toDate, selectedAccount?.value
      );
      const data: RDInterestPostingInfoDTO = (res as any)?.data ?? null;
      if (data && data.accounts.length > 0) {
        setInfo(data);
        setSelectedIds(new Set(data.accounts.map((a) => a.accountId)));
      } else {
        setInfo(data);
        setError("No eligible RD accounts found. Interest may have already been posted for this period.");
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
      title: "Confirm RD Interest Posting",
      html: `Post interest for <strong>${selectedIds.size}</strong> RD account(s)?<br/>
             <span class="text-sm text-gray-500">Period: ${fromDate} to ${toDate}</span><br/>
             <span class="text-sm text-gray-500">This action cannot be undone.</span>`,
      showCancelButton: true,
      confirmButtonText: "Yes, Post",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#6366F1",
      cancelButtonColor: "#6B7280",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await rdInterestPostingApi.postInterest({
        branchId: user.branchid,
        productId: selectedProduct!.value,
        postingDate: voucherDate,
        fromDate,
        toDate,
        accountIds: Array.from(selectedIds),
      });
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Posted!",
          text: res.message || "RD interest posted successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        setInfo(null);
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
    if (!info) return;
    if (selectedIds.size === info.accounts.length)
      setSelectedIds(new Set());
    else
      setSelectedIds(new Set(info.accounts.map((r) => r.accountId)));
  };

  const totalSelected = info?.accounts
    .filter((r) => selectedIds.has(r.accountId))
    .reduce((s, r) => s + r.interest, 0) ?? 0;

  return (
    <>
      {popupRow && <BreakdownPopup row={popupRow} onClose={() => setPopupRow(null)} />}
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">RD Interest Posting</h2>
                      <p className="text-sm text-indigo-100">Calculate and post interest for recurring deposit accounts</p>
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
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">

                  {/* Voucher Date — disabled */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher Date</label>
                    <DatePicker
                      value={voucherDate}
                      onChange={() => {}}
                      workingDate={workingDateISO}
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                      disabled
                    />
                  </div>

                  {/* Interest From Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Interest From Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={fromDate}
                      onChange={(v) => { setFromDate(v); setInfo(null); setError(""); }}
                      min={sessionFromDate}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* Interest To Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Interest To Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={toDate}
                      onChange={(v) => { setToDate(v); setInfo(null); setError(""); }}
                      min={sessionFromDate}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* RD Product */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      RD Product <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={products}
                      value={selectedProduct}
                      onChange={(opt) => { setSelectedProduct(opt); setInfo(null); setError(""); }}
                      placeholder="Select Product"
                      isClearable
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base: any) => ({ ...base, cursor: "pointer" }) }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      className="text-sm"
                    />
                  </div>

                  {/* Account (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Account <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <Select
                      options={accounts}
                      value={selectedAccount}
                      onChange={(opt) => { setSelectedAccount(opt); setInfo(null); setError(""); }}
                      placeholder={selectedProduct ? "All accounts" : "Select product first"}
                      isDisabled={!selectedProduct}
                      isClearable
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base: any) => ({ ...base, cursor: "pointer" }) }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      className="text-sm"
                    />
                  </div>

                  {/* Show button */}
                  <div className="flex items-end">
                    <button
                      onClick={handleShow}
                      disabled={!selectedProduct || loading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Calculator className="w-4 h-4" />}
                      {loading ? "Calculating..." : "Show"}
                    </button>
                  </div>
                </div>

                {/* Debit account display */}
                {info && info.debitAccountName && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm text-gray-600">Debit Account:</span>
                    <span className="text-sm font-semibold text-indigo-700">{info.debitAccountName}</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results grid */}
            {info && info.accounts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <IndianRupee className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-gray-800">
                      Eligible Accounts ({info.accounts.length})
                    </span>
                    {selectedIds.size > 0 && (
                      <span className="text-sm text-gray-500">
                        — {selectedIds.size} selected &nbsp;|&nbsp;
                        Total Interest: <span className="font-bold text-emerald-600">
                          ₹{totalSelected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handlePost}
                    disabled={selectedIds.size === 0 || posting}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
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
                            checked={selectedIds.size === info.accounts.length}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">S.No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RD Number</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Interest (₹)</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.accounts.map((row, i) => (
                        <tr
                          key={row.accountId}
                          className={`border-b border-gray-100 transition-colors ${
                            selectedIds.has(row.accountId) ? "bg-indigo-50/50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          } hover:bg-indigo-50/40`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.accountId)}
                              onChange={() => toggleSelect(row.accountId)}
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{row.accountNumber}</td>
                          <td className="px-4 py-3 text-gray-700">{row.accountName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.rdNumber}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            ₹{row.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setPopupRow(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors cursor-pointer"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-indigo-50 to-violet-50 border-t-2 border-indigo-200">
                        <td colSpan={6} className="px-4 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                          Total ({selectedIds.size} selected)
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-base">
                          ₹{totalSelected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
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

export default RDInterestPosting;
