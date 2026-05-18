import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Scale, Search, Printer } from "lucide-react";
import balanceSheetApi, { BalanceSheet, BalanceSheetSection } from "../../services/reports/balanceSheetApi";
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

const SectionRows: React.FC<{ section: BalanceSheetSection; showDrCr?: boolean }> = ({ section, showDrCr }) => (
  <>
    {/* Section header */}
    <tr className="bg-gray-100">
      <TD colSpan={showDrCr ? 4 : 2} className="font-semibold text-gray-700 italic">{section.typeName}</TD>
    </tr>
    {/* Lines */}
    {section.lines.map((line) => (
      <tr key={line.headCode} className="hover:bg-blue-50/40">
        <TD className="pl-6 text-gray-700">{line.headName}</TD>
        {showDrCr && <TD className="text-right text-gray-500">{fmt(line.drTotal)}</TD>}
        {showDrCr && <TD className="text-right text-gray-500">{fmt(line.crTotal)}</TD>}
        <TD className="text-right font-medium text-gray-800">{fmt(line.balance)}</TD>
      </tr>
    ))}
    {/* Section subtotal */}
    <tr className="bg-blue-50">
      <TD className="font-semibold text-blue-800">Total — {section.typeName}</TD>
      {showDrCr && <TD />}
      {showDrCr && <TD />}
      <TD className="text-right font-bold text-blue-800">{fmt(section.subTotal)}</TD>
    </tr>
  </>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const BalanceSheetPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [asOfDate, setAsOfDate] = useState(workingDate);
  const [showDrCr, setShowDrCr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheet | null>(null);

  const handleLoad = async () => {
    if (!asOfDate) {
      Swal.fire("Validation", "Please select a date.", "warning");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await balanceSheetApi.getBalanceSheet(user.branchid, asOfDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load balance sheet.", "error");
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
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Balance Sheet</h2>
                  <p className="text-xs text-gray-500">Financial position as of a date</p>
                </div>
              </div>

              <div className="p-5 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
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
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
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

            {/* ── Balance Sheet Report ─────────────────────────────────────── */}
            {report && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

                {/* Report header */}
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                  {report.branchAddress && (
                    <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>
                  )}
                  <h2 className="text-base font-semibold text-blue-800 mt-2">Balance Sheet</h2>
                  <p className="text-sm text-gray-600 mt-0.5">As of {fmtDate(report.asOfDate)}</p>
                </div>

                {/* Balance / Imbalance indicator */}
                {Math.abs(report.grandTotalLiabilities - report.grandTotalAssets) > 0.01 && (
                  <div className="mx-6 mt-4 px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 font-medium">
                    ⚠ Balance Sheet difference: ₹{fmt(Math.abs(report.grandTotalLiabilities - report.grandTotalAssets))}
                    — some accounts may not have head codes assigned or opening balances are outstanding.
                  </div>
                )}

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-300 p-4 gap-0">

                  {/* ── LIABILITIES ─────────────────────────────────────── */}
                  <div className="pr-0 lg:pr-3 pb-4 lg:pb-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <TH className="text-left text-blue-800 bg-blue-100">Liabilities</TH>
                          {showDrCr && <TH className="text-right w-28">Dr (₹)</TH>}
                          {showDrCr && <TH className="text-right w-28">Cr (₹)</TH>}
                          <TH className="text-right w-32">Amount (₹)</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {report.liabilitySections.map((sec) => (
                          <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />
                        ))}

                        {/* Net Profit row (positive = profit on liabilities side) */}
                        {report.netProfit > 0 && (
                          <tr className="bg-green-50">
                            <TD className="font-semibold text-green-800">Net Profit for the Period</TD>
                            {showDrCr && <TD />}
                            {showDrCr && <TD />}
                            <TD className="text-right font-bold text-green-700">{fmt(report.netProfit)}</TD>
                          </tr>
                        )}

                        {/* Grand total */}
                        <tr className="bg-blue-700">
                          <td className="border border-blue-800 px-3 py-2 text-xs font-bold text-white">Total Liabilities</td>
                          {showDrCr && <td className="border border-blue-800" />}
                          {showDrCr && <td className="border border-blue-800" />}
                          <td className="border border-blue-800 px-3 py-2 text-xs font-bold text-white text-right">
                            ₹{fmt(report.grandTotalLiabilities)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Income / Expense summary below liabilities */}
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                      <p className="font-semibold text-gray-600 mb-1">Profit & Loss Summary</p>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Income:</span>
                        <span className="font-medium text-green-700">₹{fmt(report.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Expense:</span>
                        <span className="font-medium text-red-600">₹{fmt(report.totalExpense)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-1">
                        <span className="font-semibold text-gray-700">Net {report.netProfit >= 0 ? "Profit" : "Loss"}:</span>
                        <span className={`font-bold ${report.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                          ₹{fmt(Math.abs(report.netProfit))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── ASSETS ──────────────────────────────────────────── */}
                  <div className="pl-0 lg:pl-3 pt-4 lg:pt-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <TH className="text-left text-blue-800 bg-blue-100">Assets</TH>
                          {showDrCr && <TH className="text-right w-28">Dr (₹)</TH>}
                          {showDrCr && <TH className="text-right w-28">Cr (₹)</TH>}
                          <TH className="text-right w-32">Amount (₹)</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {report.assetSections.map((sec) => (
                          <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />
                        ))}

                        {/* Net Loss row (negative profit = loss on assets side) */}
                        {report.netProfit < 0 && (
                          <tr className="bg-red-50">
                            <TD className="font-semibold text-red-800">Net Loss for the Period</TD>
                            {showDrCr && <TD />}
                            {showDrCr && <TD />}
                            <TD className="text-right font-bold text-red-700">{fmt(Math.abs(report.netProfit))}</TD>
                          </tr>
                        )}

                        {/* Grand total */}
                        <tr className="bg-blue-700">
                          <td className="border border-blue-800 px-3 py-2 text-xs font-bold text-white">Total Assets</td>
                          {showDrCr && <td className="border border-blue-800" />}
                          {showDrCr && <td className="border border-blue-800" />}
                          <td className="border border-blue-800 px-3 py-2 text-xs font-bold text-white text-right">
                            ₹{fmt(report.grandTotalAssets)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
                <Scale className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select a date and click Generate</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default BalanceSheetPage;
