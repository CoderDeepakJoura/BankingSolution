import React, { useState, useEffect } from "react";
import {
  ArrowLeft, RotateCcw, TrendingUp, Search, CheckSquare, Square,
  Save, AlertCircle, BarChart2, X,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import superUserSettingsApi from "../../../services/superuser/superUserSettingsApi";
import loanInterestPostingApi, {
  LoanInterestBatchItemDTO,
  InterestCalcSegmentDTO,
  PenalBreakdownItemDTO,
  LoanInterestPeriodDetailRowDTO,
} from "../../../services/vouchers/loan/loanInterestPostingApi";

// ── Select styles ─────────────────────────────────────────────────────────────

const selectStyles = (hasError = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "44px",
    borderWidth: "2px",
    borderColor: hasError ? "#ef4444" : state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": { borderColor: hasError ? "#ef4444" : "#3b82f6" },
  }),
  option: (base: any) => ({ ...base, cursor: "pointer" }),
  dropdownIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  clearIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  menu: (base: any) => ({ ...base, zIndex: 9999 }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtWhole = (n: number) => Math.round(n).toLocaleString("en-IN");

const fmtDateShort = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

interface LoanAccountOption {
  accId: number;
  accountName: string;
  loanAmountPassed?: number;
}

// ── Interest Detail Popup ─────────────────────────────────────────────────────

const LoanInterestDetailPopup = ({
  item,
  onClose,
}: {
  item: LoanInterestBatchItemDTO;
  onClose: () => void;
}) => {
  const user = useSelector((state: RootState) => state.user);
  const isAddInBalance = item.actOnIntPosting === 1;

  const [activeTab, setActiveTab] = useState<"calc" | "detail">("calc");
  const [periodRows, setPeriodRows]     = useState<LoanInterestPeriodDetailRowDTO[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]     = useState<string | null>(null);

  // Fetch period detail when that tab is first opened
  useEffect(() => {
    if (activeTab !== "detail" || periodRows !== null) return;
    setDetailLoading(true);
    setDetailError(null);
    const asOf = item.calcToDate ? item.calcToDate.slice(0, 10) : undefined;
    loanInterestPostingApi
      .getInterestPeriodDetail(item.loanAccId, user.branchid, asOf)
      .then((res) => {
        if (res.success && res.data) setPeriodRows(res.data);
        else setDetailError(res.message || "Failed to load detail.");
      })
      .catch((err: any) => setDetailError(err?.message || "Error loading detail."))
      .finally(() => setDetailLoading(false));
  }, [activeTab]);

  const fromDate = item.calcFromDate ? new Date(item.calcFromDate) : null;
  const toDate   = item.calcToDate   ? new Date(item.calcToDate)   : null;
  const days = item.calcBreakdown && item.calcBreakdown.length > 0
    ? item.calcBreakdown.reduce((sum, s) => sum + s.days, 0)
    : fromDate && toDate
      ? Math.max(0, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateStr = (s: string) =>
    fmtDate(new Date(s));
  const fmtAmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtN = (n: number) =>
    n === 0 ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalInterest = item.totalPostable > 0
    ? item.totalPostable
    : item.stdInterest + item.penalInterest;

  // Wider modal when showing period detail (16 columns)
  const modalWidth = activeTab === "detail" ? "w-full max-w-[98vw]" : "w-full max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl ${modalWidth} max-h-[95vh] flex flex-col overflow-hidden transition-all duration-200`}
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight tracking-tight">Interest Calculation Detail</p>
              <p className="text-blue-100 text-xs mt-0.5 font-medium">
                {item.accountNumber} &nbsp;·&nbsp; {item.memberName}
                {item.memberRelativeName && <span className="text-blue-200"> · {item.memberRelativeName}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-white" style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0", transform: "scaleX(1.05)" }} />
        </div>

        {/* Summary cards */}
        <div className="px-6 pt-4 pb-3 grid grid-cols-3 gap-3 flex-shrink-0">
          {[
            { label: "Principal Balance", value: fmtAmt(item.principalBalance), color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
            { label: "Total Interest",    value: fmtAmt(totalInterest),         color: "text-blue-700",  bg: "bg-blue-50 border-blue-200"  },
            { label: "Period (Days)",     value: days !== null ? `${days} days` : "—", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border px-4 py-2.5 ${bg}`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
              <p className={`font-bold text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="px-6 pb-0 flex-shrink-0 border-b border-gray-200">
          <div className="flex gap-1">
            {([["calc", "Calculation"], ["detail", "Period Detail"]] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 mx-4 my-3 rounded-xl border border-gray-200 shadow-inner">
          {/* ── Calculation tab ── */}
          {activeTab === "calc" && (
            <>
              {item.noInterestReason && totalInterest === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-amber-600 gap-3">
                  <AlertCircle className="w-10 h-10" />
                  <p className="text-sm font-semibold text-center px-6">{item.noInterestReason}</p>
                </div>
              ) : isAddInBalance ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-500">
                      {["From Date", "To Date", "Days", "Principal", "Rate", "Method", "Interest"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-600">{fmtDate(fromDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(toDate)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{days ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtAmt(item.principalBalance)}</td>
                      <td className="px-4 py-3 text-gray-700">{item.stdInterestRate ?? "—"}%</td>
                      <td className="px-4 py-3 text-gray-500">{item.intCalcMethod}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">₹{Math.round(item.stdInterest).toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={6} className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 font-extrabold text-blue-800">₹{Math.round(item.stdInterest).toLocaleString("en-IN")}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : item.calcBreakdown && item.calcBreakdown.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-500">
                      {["From Date", "To Date", "Days", "Balance", "Rate", "Interest"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.calcBreakdown.map((seg: InterestCalcSegmentDTO, i: number) => (
                      <tr key={i} className={`border-b border-gray-100 hover:bg-amber-50/40 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(new Date(seg.fromDate))}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(new Date(seg.toDate))}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{seg.days}</td>
                        <td className="px-4 py-3 text-gray-700">{fmtAmt(seg.balance)}</td>
                        <td className="px-4 py-3 text-gray-700">{seg.rate}%</td>
                        <td className="px-4 py-3 font-bold text-amber-700">{fmtAmt(seg.interest)}</td>
                      </tr>
                    ))}
                    {item.stdRecoverable > 0 && (
                      <tr className="bg-purple-50/30 border-b border-gray-100">
                        <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-purple-700">Recoverable (posted, not yet collected)</td>
                        <td className="px-4 py-3 font-bold text-purple-700">{fmtAmt(item.stdRecoverable)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={5} className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Total Postable</td>
                      <td className="px-4 py-3 font-extrabold text-blue-800">{fmtAmt(item.totalPostable)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-500">
                      {["Type", "From Date", "To Date", "Principal", "Rate", "Method", "Amount"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.stdInterest > 0 && (
                      <tr className="bg-white border-b border-gray-100 hover:bg-amber-50/40">
                        <td className="px-4 py-3 font-semibold text-amber-700">Standard</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(fromDate)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(toDate)}</td>
                        <td className="px-4 py-3 text-gray-700">{fmtAmt(item.principalBalance)}</td>
                        <td className="px-4 py-3 text-gray-700">{item.stdInterestRate ?? "—"}%</td>
                        <td className="px-4 py-3 text-gray-500">{item.intCalcMethod}</td>
                        <td className="px-4 py-3 font-bold text-amber-700">{fmtAmt(item.stdInterest)}</td>
                      </tr>
                    )}
                    {item.penalInterest > 0 && item.penalBreakdown && item.penalBreakdown.length > 0 ? (
                      <>
                        <tr className="bg-rose-100/60 border-b border-rose-200">
                          <td colSpan={7} className="px-4 py-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
                            Penal Interest — Overdue Kist Breakdown
                          </td>
                        </tr>
                        <tr className="bg-rose-50/40 border-b border-gray-100">
                          {["Kist No.", "Due Date", "Principal", "Days Overdue", "Rate", "Method", "Penal Int."].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-rose-700 uppercase tracking-wider bg-rose-50">{h}</th>
                          ))}
                        </tr>
                        {item.penalBreakdown.map((pb: PenalBreakdownItemDTO, i: number) => (
                          <tr key={i} className={`border-b border-gray-100 hover:bg-rose-50/40 ${i % 2 === 0 ? "bg-white" : "bg-rose-50/20"}`}>
                            <td className="px-4 py-2.5 font-semibold text-rose-700">#{pb.kistNumber}</td>
                            <td className="px-4 py-2.5 text-gray-600">{fmtDate(new Date(pb.dueDate))}</td>
                            <td className="px-4 py-2.5 text-gray-700">{fmtAmt(pb.principalAmount)}</td>
                            <td className="px-4 py-2.5 font-semibold text-rose-600">{pb.daysOverdue} days</td>
                            <td className="px-4 py-2.5 text-gray-700">{pb.overdueRate}%</td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs">P&times;R&times;D/365</td>
                            <td className="px-4 py-2.5 font-bold text-rose-700">{fmtAmt(pb.penalInterest)}</td>
                          </tr>
                        ))}
                      </>
                    ) : item.penalInterest > 0 ? (
                      <tr className="bg-rose-50/30 border-b border-gray-100 hover:bg-rose-50/60">
                        <td className="px-4 py-3 font-semibold text-rose-700">Penal</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(fromDate)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(toDate)}</td>
                        <td className="px-4 py-3 text-gray-700">{fmtAmt(item.overduePrincipal ?? 0)}</td>
                        <td className="px-4 py-3 text-gray-700">{item.overdueInterestRate ?? "—"}%</td>
                        <td className="px-4 py-3 text-gray-500">—</td>
                        <td className="px-4 py-3 font-bold text-rose-700">{fmtAmt(item.penalInterest)}</td>
                      </tr>
                    ) : null}
                    {item.stdRecoverable > 0 && (
                      <tr className="bg-purple-50/30 border-b border-gray-100">
                        <td className="px-4 py-3 font-semibold text-purple-700">Recoverable</td>
                        <td colSpan={5} className="px-4 py-3 text-xs text-gray-400 italic">Previously accrued std interest not yet recovered</td>
                        <td className="px-4 py-3 font-bold text-purple-700">{fmtAmt(item.stdRecoverable)}</td>
                      </tr>
                    )}
                    {item.stdInterest === 0 && item.penalInterest === 0 && item.stdRecoverable === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No interest components to display.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={6} className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Total Postable</td>
                      <td className="px-4 py-3 font-extrabold text-blue-800">{fmtAmt(item.totalPostable)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {/* ── Period Detail tab ── */}
          {activeTab === "detail" && (
            <>
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-blue-600 gap-3">
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm font-semibold">Loading period detail…</span>
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-3">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm font-semibold">{detailError}</p>
                </div>
              ) : !periodRows || periodRows.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  No period detail available for this account.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl">
                  <table className="text-xs border-collapse w-full" style={{ minWidth: "1360px" }}>
                    <thead className="sticky top-0 z-10">
                      {/* Group header row */}
                      <tr>
                        <th colSpan={3} className="px-3 py-1.5 text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-slate-900 border-r-2 border-slate-600" />
                        <th colSpan={2} className="px-3 py-1.5 text-center text-[9px] font-bold text-emerald-300 uppercase tracking-widest bg-slate-900 border-r-2 border-slate-600">
                          Transactions
                        </th>
                        <th colSpan={3} className="px-3 py-1.5 text-center text-[9px] font-bold text-blue-300 uppercase tracking-widest bg-blue-900/70 border-r-2 border-blue-700">
                          Standard Interest
                        </th>
                        <th colSpan={5} className="px-3 py-1.5 text-center text-[9px] font-bold text-rose-300 uppercase tracking-widest bg-rose-900/60 border-r-2 border-rose-700">
                          Overdue / Penal
                        </th>
                        <th colSpan={2} className="px-3 py-1.5 text-center text-[9px] font-bold text-violet-300 uppercase tracking-widest bg-violet-900/60 border-r border-violet-700">
                          Result
                        </th>
                        <th className="px-3 py-1.5 text-center text-[9px] font-bold text-purple-200 uppercase tracking-widest bg-purple-900/70" />
                      </tr>
                      {/* Column header row */}
                      <tr>
                        {/* Info */}
                        {[
                          { label: "Date",        cls: "text-left border-r border-slate-600 bg-slate-800" },
                          { label: "Particulars",  cls: "text-left border-r border-slate-600 bg-slate-800" },
                          { label: "Days",         cls: "text-right border-r-2 border-slate-600 bg-slate-800" },
                          /* Transactions */
                          { label: "Dr",           cls: "text-right border-r border-emerald-700/50 bg-slate-800/90" },
                          { label: "Cr",           cls: "text-right border-r-2 border-slate-600 bg-slate-800/90" },
                          /* Standard */
                          { label: "STD Bal",      cls: "text-right border-r border-blue-700/50 bg-blue-950/80" },
                          { label: "ROI",          cls: "text-right border-r border-blue-700/50 bg-blue-950/80" },
                          { label: "STD Int",      cls: "text-right border-r-2 border-blue-700 bg-blue-950/80" },
                          /* Overdue */
                          { label: "ODD",          cls: "text-right border-r border-rose-800/50 bg-rose-950/70" },
                          { label: "ODC",          cls: "text-right border-r border-rose-800/50 bg-rose-950/70" },
                          { label: "ODB",          cls: "text-right border-r border-rose-800/50 bg-rose-950/70" },
                          { label: "Balance",      cls: "text-right border-r border-rose-800/50 bg-rose-950/70" },
                          { label: "OROI",         cls: "text-right border-r-2 border-rose-800 bg-rose-950/70" },
                          /* Result */
                          { label: "Ovr Int",      cls: "text-right border-r border-violet-800/50 bg-violet-950/70" },
                          { label: "T Int",        cls: "text-right border-r border-violet-800/50 bg-violet-950/70" },
                          { label: "Int Bal",      cls: "text-right bg-purple-950/80" },
                        ].map(({ label, cls }) => (
                          <th key={label} className={`px-2.5 py-2 text-[10px] font-bold text-slate-200 uppercase tracking-wide whitespace-nowrap ${cls}`}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periodRows.map((row, i) => {
                        const isKistRow  = row.particulars.includes("Kist #");
                        const isIpRow    = row.particulars.includes("Interest Posting");
                        const isLrRow    = row.particulars.includes("Loan Recovery");
                        const isLaRow    = row.particulars.includes("Loan Advancement");
                        const hasOverdue = row.odc > 0;

                        // Accent stripe color per row type
                        const accentColor = isLaRow  ? "border-l-4 border-l-emerald-400"
                          : isIpRow  ? "border-l-4 border-l-blue-400"
                          : isLrRow  ? "border-l-4 border-l-amber-400"
                          : isKistRow ? "border-l-4 border-l-rose-400"
                          : "border-l-4 border-l-transparent";

                        const baseBg = isLaRow   ? "bg-emerald-50/70 hover:bg-emerald-100/60"
                          : isIpRow   ? "bg-blue-50/70 hover:bg-blue-100/60"
                          : isLrRow   ? "bg-amber-50/70 hover:bg-amber-100/60"
                          : isKistRow ? "bg-rose-50/50 hover:bg-rose-100/50"
                          : i % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/80 hover:bg-slate-100/70";

                        // shared cell classes
                        const c  = "px-2.5 py-2 border-b border-gray-150 text-right whitespace-nowrap tabular-nums";
                        const cL = "px-2.5 py-2 border-b border-gray-150 text-left whitespace-nowrap";
                        const nil = <span className="text-slate-300 text-[10px]">–</span>;

                        return (
                          <tr key={i} className={`${baseBg} ${accentColor} transition-colors`}>
                            {/* Info */}
                            <td className={cL + " font-medium text-slate-600 text-[11px] border-r border-gray-200"}>{fmtDateStr(row.date)}</td>
                            <td className={cL + " text-slate-700 font-medium border-r border-gray-200 max-w-[150px] truncate"} title={row.particulars}>{row.particulars}</td>
                            <td className={c + " font-semibold text-slate-500 border-r-2 border-gray-300"}>{row.days > 0 ? row.days : nil}</td>
                            {/* Transactions */}
                            <td className={c + " text-emerald-700 font-semibold border-r border-gray-200"}>{row.dr > 0 ? fmtN(row.dr) : nil}</td>
                            <td className={c + " text-amber-700 font-semibold border-r-2 border-gray-300"}>{row.cr > 0 ? fmtN(row.cr) : nil}</td>
                            {/* Standard */}
                            <td className={c + " text-slate-700 bg-blue-50/30 border-r border-blue-100"}>{fmtN(row.stdBal)}</td>
                            <td className={c + " text-blue-600 bg-blue-50/30 border-r border-blue-100 font-medium"}>{row.roi > 0 ? `${row.roi}%` : nil}</td>
                            <td className={c + " text-blue-700 font-bold bg-blue-50/30 border-r-2 border-blue-200"}>{row.stdInt > 0 ? fmtN(row.stdInt) : nil}</td>
                            {/* Overdue */}
                            <td className={c + " border-r border-rose-100 bg-rose-50/20 " + (hasOverdue ? "text-rose-600 font-semibold" : "")}>{row.odd > 0 ? row.odd : nil}</td>
                            <td className={c + " border-r border-rose-100 bg-rose-50/20 " + (hasOverdue ? "text-rose-600 font-semibold" : "")}>{row.odc > 0 ? row.odc : nil}</td>
                            <td className={c + " border-r border-rose-100 bg-rose-50/20 " + (hasOverdue ? "text-rose-600 font-semibold" : "")}>{row.odb > 0 ? fmtN(row.odb) : nil}</td>
                            <td className={c + " border-r border-rose-100 bg-rose-50/20 text-slate-800 font-bold"}>{fmtN(row.balance)}</td>
                            <td className={c + " border-r-2 border-rose-200 bg-rose-50/20 text-slate-500 font-medium"}>{row.oroi > 0 ? `${row.oroi}%` : nil}</td>
                            {/* Result */}
                            <td className={c + " border-r border-violet-100 bg-violet-50/20 text-rose-700 font-semibold"}>{row.ovrInt > 0 ? fmtN(row.ovrInt) : nil}</td>
                            <td className={c + " border-r border-violet-100 bg-violet-50/20 text-indigo-700 font-bold"}>{row.tInt > 0 ? fmtN(row.tInt) : nil}</td>
                            <td className={c + " bg-purple-50/30 text-purple-700 font-bold"}>{row.intBal > 0 ? fmtN(row.intBal) : nil}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 text-white font-bold">
                        <td colSpan={3} className="px-3 py-2.5 text-left border-r-2 border-slate-600">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">Totals</span>
                        </td>
                        <td className="px-2.5 py-2.5 text-right border-r border-slate-600 text-emerald-300 tabular-nums">
                          {fmtN(periodRows.reduce((s, r) => s + r.dr, 0))}
                        </td>
                        <td className="px-2.5 py-2.5 text-right border-r-2 border-slate-600 text-amber-300 tabular-nums">
                          {fmtN(periodRows.reduce((s, r) => s + r.cr, 0))}
                        </td>
                        <td colSpan={2} className="border-r-2 border-slate-600 bg-blue-900/30" />
                        <td className="px-2.5 py-2.5 text-right border-r-2 border-slate-600 text-blue-300 tabular-nums">
                          {fmtN(periodRows.reduce((s, r) => s + r.stdInt, 0))}
                        </td>
                        <td colSpan={5} className="border-r-2 border-slate-600 bg-rose-900/20" />
                        <td className="px-2.5 py-2.5 text-right border-r border-slate-600 text-rose-300 tabular-nums">
                          {fmtN(periodRows.reduce((s, r) => s + r.ovrInt, 0))}
                        </td>
                        <td className="px-2.5 py-2.5 text-right border-r border-slate-600 text-indigo-300 tabular-nums">
                          {fmtN(periodRows.reduce((s, r) => s + r.tInt, 0))}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-purple-300 tabular-nums">
                          {fmtN(periodRows[periodRows.length - 1].intBal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Formula hint (calc tab, AddInBalance, Balance/MinBalance method only) */}
        {activeTab === "calc" && isAddInBalance && days !== null && item.stdInterestRate && item.intCalcMethod !== "Schedule" && (
          <div className="mx-4 mb-3 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-mono flex-shrink-0">
            {fmtAmt(item.principalBalance)} × {item.stdInterestRate}% / 100 × {days} / 365 = ₹{Math.round(item.stdInterest).toLocaleString("en-IN")}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-4 flex justify-center flex-shrink-0">
          <button
            onClick={onClose}
            className="group flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm text-white
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-600 hover:to-indigo-600
                       shadow-md hover:shadow-blue-200 hover:shadow-lg
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

// ── Component ─────────────────────────────────────────────────────────────────

const LoanInterestPostingVoucher: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [productsLoading, setProductsLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [posting, setPosting] = useState(false);

  const [loanProducts, setLoanProducts] = useState<{ id: number; productName: string }[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccountOption[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [narration, setNarration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Results state ──────────────────────────────────────────────────────────
  const [batchItems, setBatchItems] = useState<LoanInterestBatchItemDTO[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [hasShown, setHasShown] = useState(false);
  const [stdOverrides, setStdOverrides] = useState<Record<number, number>>({});
  const [penalOverrides, setPenalOverrides] = useState<Record<number, number>>({});
  const [stdDisplayValues, setStdDisplayValues] = useState<Record<number, string>>({});
  const [penalDisplayValues, setPenalDisplayValues] = useState<Record<number, string>>({});
  const [allowLoanInterestChange, setAllowLoanInterestChange] = useState(false);
  const [popupItem, setPopupItem] = useState<LoanInterestBatchItemDTO | null>(null);

  // ── Load products on mount ────────────────────────────────────────────────

  useEffect(() => {
    superUserSettingsApi.getInterestPostingSettings(user.branchid).then((res: any) => {
      if (res.success && res.data) setAllowLoanInterestChange(res.data.allowLoanInterestChange);
    });
    setProductsLoading(true);
    commonservice
      .fetch_loan_products(user.branchid, sessionDate)
      .then((res) => {
        const list = res.data ?? (res as any).Data ?? [];
        setLoanProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        Swal.fire("Error", "Failed to load loan products.", "error");
      })
      .finally(() => setProductsLoading(false));
  }, [user.branchid]);

  // ── Product change ────────────────────────────────────────────────────────

  const handleProductChange = async (sel: any) => {
    const id = sel ? sel.value : 0;
    setSelectedProductId(id);
    setSelectedAccountId(0);
    setLoanAccounts([]);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);
    setErrors((p) => { const n = { ...p }; delete n.product; return n; });

    if (!id) return;
    setAccountsLoading(true);
    try {
      const res = await commonservice.fetch_loan_accounts_by_product(user.branchid, id, sessionDate);
      const list = res.data ?? (res as any).Data ?? [];
      setLoanAccounts(Array.isArray(list) ? list : []);
    } catch {
      Swal.fire("Error", "Failed to load accounts for this product.", "error");
    } finally {
      setAccountsLoading(false);
    }
  };

  // ── Account change ────────────────────────────────────────────────────────

  const handleAccountChange = (sel: any) => {
    setSelectedAccountId(sel ? sel.value : 0);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);
  };

  // ── Show (calculate) ──────────────────────────────────────────────────────

  const handleShow = async () => {
    if (!selectedProductId) {
      setErrors({ product: "Please select a loan product" });
      return;
    }
    setErrors({});
    setCalculating(true);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);
    setStdOverrides({});
    setPenalOverrides({});
    setStdDisplayValues({});
    setPenalDisplayValues({});

    try {
      const res = await loanInterestPostingApi.batchCalculate(
        user.branchid,
        selectedProductId,
        selectedAccountId || undefined,
        sessionDate,
      );
      const data: LoanInterestBatchItemDTO[] = (res as any).data ?? (res as any).Data ?? [];
      if (!Array.isArray(data)) {
        throw new Error((res as any).message ?? "Unexpected response from server.");
      }
      setBatchItems(data);
      setCheckedIds(new Set(data.filter((x) => x.totalPostable > 0).map((x) => x.loanAccId)));
      setHasShown(true);

      const postableCount = data.filter((x) => x.totalPostable > 0).length;
      if (data.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Accounts Found",
          text: "No loan accounts found for the selected product.",
        });
      } else if (postableCount === 0) {
        Swal.fire({
          icon: "info",
          title: "No Interest to Post",
          text: `${data.length} account(s) found but none have postable interest. See the reason column for details.`,
        });
      }
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to calculate interest. Please try again.", "error");
    } finally {
      setCalculating(false);
    }
  };

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  const postableItems = batchItems.filter((x) => x.totalPostable > 0);
  const allChecked = postableItems.length > 0 && checkedIds.size === postableItems.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < postableItems.length;

  const toggleAll = () => {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(postableItems.map((x) => x.loanAccId)));
  };

  const toggleOne = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Post selected ─────────────────────────────────────────────────────────

  const handlePost = async () => {
    const selected = batchItems.filter((x) => checkedIds.has(x.loanAccId));
    if (selected.length === 0) {
      Swal.fire("Warning", "No accounts selected for posting.", "warning");
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirm Posting",
      text: `Post interest for ${selected.length} account(s)?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Post",
      confirmButtonColor: "#3B82F6",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await loanInterestPostingApi.batchPost({
        brId: user.branchid,
        voucherDate: sessionDate,
        narration: narration || undefined,
        items: selected.map((x) => ({
          loanAccountId: x.loanAccId,
          stdInterestAmount: getStd(x),
          penalInterestAmount: getPenal(x),
        })),
      });

      const result = (res as any).data ?? (res as any).Data;
      if (result) {
        const { successCount, failCount, errors: errs } = result;
        if (failCount === 0) {
          await Swal.fire({
            icon: "success",
            title: "Posted Successfully",
            text: `Interest posted for ${successCount} account(s).`,
            confirmButtonColor: "#3B82F6",
          });
        } else {
          await Swal.fire({
            icon: "warning",
            title: `Posted: ${successCount}, Failed: ${failCount}`,
            html: errs.length
              ? `<ul class="text-left text-sm mt-2">${errs.map((e: string) => `<li>• ${e}</li>`).join("")}</ul>`
              : undefined,
          });
        }
        // Re-calculate to refresh table
        await handleShow();
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to post interest." });
    } finally {
      setPosting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSelectedProductId(0);
    setSelectedAccountId(0);
    setLoanAccounts([]);
    setBatchItems([]);
    setCheckedIds(new Set());
    setNarration("");
    setErrors({});
    setHasShown(false);
    setStdOverrides({});
    setPenalOverrides({});
    setStdDisplayValues({});
    setPenalDisplayValues({});
  };

  // ── Options ───────────────────────────────────────────────────────────────

  const loanProductOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const loanAccountOptions = loanAccounts.map((a) => ({ value: a.accId, label: a.accountName }));

  const getStd = (x: LoanInterestBatchItemDTO) =>
    stdOverrides[x.loanAccId] ?? (x.actOnIntPosting === 1 ? Math.round(x.stdInterest) : x.stdInterest);
  const getPenal = (x: LoanInterestBatchItemDTO) => penalOverrides[x.loanAccId] ?? x.penalInterest;
  const getTotalPostable = (x: LoanInterestBatchItemDTO) => getStd(x) + getPenal(x);

  const totalSelected = batchItems
    .filter((x) => checkedIds.has(x.loanAccId))
    .reduce((s, x) => s + getTotalPostable(x), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* ── Filter Card ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Loan Interest Posting Voucher</h2>
                      <p className="text-sm text-gray-600">Select product and account, then click Show to calculate interest</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>

              {/* Filter row */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

                  {/* Voucher Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher Date</label>
                    <input
                      type="text"
                      readOnly
                      value={sessionDate}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-not-allowed text-sm"
                    />
                  </div>

                  {/* Loan Product */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Loan Product <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={loanProductOptions}
                      value={loanProductOptions.find((o) => o.value === selectedProductId) ?? null}
                      onChange={handleProductChange}
                      placeholder={productsLoading ? "Loading…" : "Select Product"}
                      isClearable
                      isLoading={productsLoading}
                      noOptionsMessage={() => productsLoading ? "Loading…" : "No products"}
                      styles={selectStyles(!!errors.product)}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    {errors.product && <p className="mt-1 text-xs text-red-600">{errors.product}</p>}
                  </div>

                  {/* Loan Account (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Loan Account
                      <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <Select
                      options={loanAccountOptions}
                      value={loanAccountOptions.find((o) => o.value === selectedAccountId) ?? null}
                      onChange={handleAccountChange}
                      placeholder={accountsLoading ? "Loading…" : "All accounts"}
                      isClearable
                      isLoading={accountsLoading}
                      isDisabled={!selectedProductId || accountsLoading}
                      noOptionsMessage={() => !selectedProductId ? "Select product first" : "No accounts"}
                      styles={selectStyles()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  {/* Show + Reset buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleShow}
                      disabled={calculating || !selectedProductId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {calculating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calculating…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Show
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                      title="Reset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Narration (shown when results are present) */}
                {hasShown && batchItems.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Narration</label>
                    <input
                      type="text"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      placeholder="Optional narration for the posting vouchers"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Results Table ─────────────────────────────────────────── */}
            {hasShown && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

                {/* Table header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      Interest Calculation Results
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {batchItems.filter((x) => x.totalPostable > 0).length} of {batchItems.length} account(s) have postable interest
                      {checkedIds.size > 0 && (
                        <span className="ml-2 text-blue-700 font-medium">
                          · {checkedIds.size} selected · Total: ₹{fmt(totalSelected)}
                        </span>
                      )}
                    </p>
                  </div>
                  {batchItems.length > 0 && (
                    <button
                      onClick={handlePost}
                      disabled={posting || checkedIds.size === 0}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {posting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Posting…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Post Selected ({checkedIds.size})
                        </>
                      )}
                    </button>
                  )}
                </div>

                {batchItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <AlertCircle className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">No accounts found for this product</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <button onClick={toggleAll} className="flex items-center cursor-pointer">
                              {allChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : someChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-400 opacity-60" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Sr
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Account No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Member Name
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Principal Bal
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase tracking-wide">
                            Std Interest
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-rose-700 uppercase tracking-wide">
                            Penal Interest
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            Std Recoverable
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wide">
                            Total Postable
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchItems.map((item, idx) => {
                          const isPostable = item.totalPostable > 0;
                          const checked = checkedIds.has(item.loanAccId);
                          return (
                            <tr
                              key={item.loanAccId}
                              onClick={() => isPostable && toggleOne(item.loanAccId)}
                              className={`transition-colors ${
                                !isPostable
                                  ? "bg-gray-50 opacity-60"
                                  : checked
                                  ? "bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                  : "hover:bg-gray-50 cursor-pointer"
                              }`}
                            >
                              <td className="px-4 py-3">
                                {!isPostable ? (
                                  <Square className="w-4 h-4 text-gray-300" />
                                ) : checked ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-800 font-semibold">
                                {item.accountNumber}
                              </td>
                              <td className="px-4 py-3 text-gray-800">
                                <div className="font-medium">{item.memberName}</div>
                                {item.memberRelativeName && (
                                  <div className="text-xs text-gray-400">{item.memberRelativeName}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700">
                                ₹{fmt(item.principalBalance)}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-700 font-semibold" onClick={(e) => e.stopPropagation()}>
                                {allowLoanInterestChange ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    maxLength={8}
                                    value={
                                      stdDisplayValues[item.loanAccId] !== undefined
                                        ? stdDisplayValues[item.loanAccId]
                                        : item.actOnIntPosting === 1
                                        ? Math.round(item.stdInterest).toString()
                                        : parseFloat(item.stdInterest.toFixed(2)).toString()
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                                        setStdDisplayValues((prev) => ({ ...prev, [item.loanAccId]: raw }));
                                        const val = parseFloat(raw);
                                        setStdOverrides((prev) => ({ ...prev, [item.loanAccId]: isNaN(val) ? 0 : val }));
                                      }
                                    }}
                                    className="w-24 px-2 py-1 text-right border border-amber-300 rounded-lg text-sm font-semibold text-amber-700 bg-white outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                ) : (
                                  <>₹{item.actOnIntPosting === 1 ? fmtWhole(getStd(item)) : fmt(getStd(item))}</>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-rose-700 font-semibold" onClick={(e) => e.stopPropagation()}>
                                {allowLoanInterestChange ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    maxLength={8}
                                    value={
                                      penalDisplayValues[item.loanAccId] !== undefined
                                        ? penalDisplayValues[item.loanAccId]
                                        : parseFloat(item.penalInterest.toFixed(2)).toString()
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
                                        setPenalDisplayValues((prev) => ({ ...prev, [item.loanAccId]: raw }));
                                        const val = parseFloat(raw);
                                        setPenalOverrides((prev) => ({ ...prev, [item.loanAccId]: isNaN(val) ? 0 : val }));
                                      }
                                    }}
                                    className="w-24 px-2 py-1 text-right border border-rose-300 rounded-lg text-sm font-semibold text-rose-700 bg-white outline-none focus:ring-2 focus:ring-rose-400"
                                  />
                                ) : (
                                  <>{getPenal(item) > 0 ? `₹${fmt(getPenal(item))}` : "—"}</>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-purple-700 font-semibold">
                                {item.stdRecoverable > 0 ? `₹${fmt(item.stdRecoverable)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right text-green-700 font-bold">
                                ₹{item.actOnIntPosting === 1 ? fmtWhole(getTotalPostable(item)) : fmt(getTotalPostable(item))}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setPopupItem(item)}
                                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  View Details
                                </button>
                                {item.noInterestReason && (
                                  <div className="mt-1 text-xs text-amber-600 font-medium leading-tight max-w-[160px]">
                                    {item.noInterestReason}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Footer totals */}
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
                            Totals ({postableItems.length} postable of {batchItems.length} accounts)
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">
                            ₹{fmt(postableItems.reduce((s, x) => s + getStd(x), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-rose-700">
                            ₹{fmt(postableItems.reduce((s, x) => s + getPenal(x), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">
                            ₹{fmt(postableItems.reduce((s, x) => s + x.stdRecoverable, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                            ₹{fmt(postableItems.reduce((s, x) => s + getTotalPostable(x), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Interest detail popup */}
          {popupItem && (
            <LoanInterestDetailPopup item={popupItem} onClose={() => setPopupItem(null)} />
          )}
        </div>
      }
    />
  );
};

export default LoanInterestPostingVoucher;
