import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { TrendingUp, Search, Printer } from "lucide-react";
import profitLossApi, { ProfitLoss, ProfitLossSection } from "../../services/reports/profitLossApi";
import commonservice from "../../services/common/commonservice";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

const toInputDate = (iso: string) => isoDatePart(iso);

// ── Sub-components ────────────────────────────────────────────────────────────

const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-300 px-3 py-1.5 text-xs ${className}`}>{children}</td>
);

const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`border border-gray-300 px-3 py-1.5 text-xs font-bold bg-blue-50 text-gray-800 ${className}`}>{children}</th>
);

const SectionRows: React.FC<{ section: ProfitLossSection; showDrCr?: boolean }> = ({ section, showDrCr }) => (
  <>
    <tr className="bg-gray-100">
      <TD colSpan={showDrCr ? 4 : 2} className="font-semibold text-gray-700 italic">{section.typeName}</TD>
    </tr>
    {section.lines.map((line) => (
      <tr key={line.headCode} className="hover:bg-blue-50/40">
        <TD className="pl-6 text-gray-700">{line.headName}</TD>
        {showDrCr && <TD className="text-right text-gray-500">{fmt(line.drTotal)}</TD>}
        {showDrCr && <TD className="text-right text-gray-500">{fmt(line.crTotal)}</TD>}
        <TD className="text-right font-medium text-gray-800">{fmt(line.balance)}</TD>
      </tr>
    ))}
    <tr className="bg-blue-50">
      <TD className="font-semibold text-blue-800">Total — {section.typeName}</TD>
      {showDrCr && <TD />}
      {showDrCr && <TD />}
      <TD className="text-right font-bold text-blue-800">{fmt(section.subTotal)}</TD>
    </tr>
  </>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const ProfitLossPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate]     = useState(workingDate);
  const [showDrCr, setShowDrCr] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [report, setReport]     = useState<ProfitLoss | null>(null);

  const handleLoad = async () => {
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select both From Date and To Date.", "warning");
      return;
    }
    if (fromDate > toDate) {
      Swal.fire("Validation", "From Date must be on or before To Date.", "warning");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await profitLossApi.getProfitLoss(user.branchid, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load profit & loss statement.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-5">

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center shadow">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Profit & Loss Statement</h2>
                  <p className="text-xs text-gray-500">Income and expenditure for a period</p>
                </div>
              </div>

              <div className="p-5 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showDrCr"
                    checked={showDrCr}
                    onChange={(e) => setShowDrCr(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="showDrCr" className="text-sm text-gray-700 cursor-pointer select-none">
                    Show Dr / Cr columns
                  </label>
                </div>

                <button
                  onClick={handleLoad}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                  ) : (
                    <><Search className="w-4 h-4" /> Generate</>
                  )}
                </button>

                {report && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
              </div>
            </div>

            {/* ── P&L Report ──────────────────────────────────────────────── */}
            {report && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

                {/* Report header */}
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                  {report.branchAddress && (
                    <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>
                  )}
                  <h2 className="text-base font-semibold text-teal-800 mt-2">Profit & Loss Statement</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    For the period {fmtDate(report.fromDate)} to {fmtDate(report.toDate)}
                  </p>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-300 p-4 gap-0">

                  {/* ── EXPENDITURE ─────────────────────────────────────── */}
                  <div className="pr-0 lg:pr-3 pb-4 lg:pb-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <TH className="text-left text-red-800 bg-red-50">Expenditure</TH>
                          {showDrCr && <TH className="text-right w-28">Dr (₹)</TH>}
                          {showDrCr && <TH className="text-right w-28">Cr (₹)</TH>}
                          <TH className="text-right w-32">Amount (₹)</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {report.expenseSections.map((sec) => (
                          <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />
                        ))}

                        {/* Net Profit row on expenditure side when profit > 0 */}
                        {report.netProfit > 0 && (
                          <tr className="bg-green-50">
                            <TD className="font-semibold text-green-800">Net Profit for the Period</TD>
                            {showDrCr && <TD />}
                            {showDrCr && <TD />}
                            <TD className="text-right font-bold text-green-700">{fmt(report.netProfit)}</TD>
                          </tr>
                        )}

                        {/* Grand total */}
                        <tr className="bg-red-700">
                          <td className="border border-red-800 px-3 py-2 text-xs font-bold text-white">Total Expenditure</td>
                          {showDrCr && <td className="border border-red-800" />}
                          {showDrCr && <td className="border border-red-800" />}
                          <td className="border border-red-800 px-3 py-2 text-xs font-bold text-white text-right">
                            ₹{fmt(report.totalExpense + (report.netProfit > 0 ? report.netProfit : 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── INCOME ──────────────────────────────────────────── */}
                  <div className="pl-0 lg:pl-3 pt-4 lg:pt-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <TH className="text-left text-green-800 bg-green-50">Income</TH>
                          {showDrCr && <TH className="text-right w-28">Dr (₹)</TH>}
                          {showDrCr && <TH className="text-right w-28">Cr (₹)</TH>}
                          <TH className="text-right w-32">Amount (₹)</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {report.incomeSections.map((sec) => (
                          <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />
                        ))}

                        {/* Net Loss row on income side when loss */}
                        {report.netProfit < 0 && (
                          <tr className="bg-red-50">
                            <TD className="font-semibold text-red-800">Net Loss for the Period</TD>
                            {showDrCr && <TD />}
                            {showDrCr && <TD />}
                            <TD className="text-right font-bold text-red-700">{fmt(Math.abs(report.netProfit))}</TD>
                          </tr>
                        )}

                        {/* Grand total */}
                        <tr className="bg-green-700">
                          <td className="border border-green-800 px-3 py-2 text-xs font-bold text-white">Total Income</td>
                          {showDrCr && <td className="border border-green-800" />}
                          {showDrCr && <td className="border border-green-800" />}
                          <td className="border border-green-800 px-3 py-2 text-xs font-bold text-white text-right">
                            ₹{fmt(report.totalIncome + (report.netProfit < 0 ? Math.abs(report.netProfit) : 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary bar */}
                <div className="mx-4 mb-4 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs flex flex-wrap gap-6 justify-center print:hidden">
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-600">Total Income:</span>
                    <span className="font-bold text-green-700">₹{fmt(report.totalIncome)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-600">Total Expense:</span>
                    <span className="font-bold text-red-600">₹{fmt(report.totalExpense)}</span>
                  </div>
                  <div className="flex gap-2 items-center border-l border-gray-300 pl-6">
                    <span className="font-semibold text-gray-700">Net {report.netProfit >= 0 ? "Profit" : "Loss"}:</span>
                    <span className={`font-bold text-base ${report.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                      ₹{fmt(Math.abs(report.netProfit))}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!report && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <TrendingUp className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select a date range and click Generate</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default ProfitLossPage;
