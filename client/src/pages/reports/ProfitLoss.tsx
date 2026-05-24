import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { TrendingUp, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import profitLossApi, { ProfitLoss, ProfitLossSection } from "../../services/reports/profitLossApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDatePart = (iso: string) => iso.split("T")[0];
const localDate   = (iso: string) => { const [y, m, d] = isoDatePart(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort    = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong     = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput     = (iso: string) => isoDatePart(iso);

// ── Export ────────────────────────────────────────────────────────────────────

const sectionExportRows = (sections: ProfitLossSection[]): ExportRow[] => {
  const rows: ExportRow[] = [];
  sections.forEach(sec => {
    rows.push({ style: "date",     cells: [sec.typeName, ""] });
    sec.lines.forEach(l => rows.push({ style: "normal",  cells: [`  ${l.headName}`, fmt(l.balance)] }));
    rows.push({ style: "subtotal", cells: [`Total — ${sec.typeName}`, fmt(sec.subTotal)] });
  });
  return rows;
};

const buildExportConfig = (report: ProfitLoss): ExportConfig => {
  const columns = [
    { header: "Account / Description", widthRatio: 0.75, align: "left"  as const },
    { header: "Amount (₹)",            widthRatio: 0.25, align: "right" as const },
  ];
  const rows: ExportRow[] = [];

  rows.push({ style: "group", cells: ["EXPENDITURE", ""] });
  rows.push(...sectionExportRows(report.expenseSections));
  if (report.netProfit > 0)
    rows.push({ style: "cb",    cells: ["Net Profit for the Period", fmt(report.netProfit)] });
  rows.push({ style: "total",  cells: ["TOTAL EXPENDITURE", fmt(report.totalExpense + (report.netProfit > 0 ? report.netProfit : 0))] });

  rows.push({ style: "normal", cells: ["", ""] });

  rows.push({ style: "group", cells: ["INCOME", ""] });
  rows.push(...sectionExportRows(report.incomeSections));
  if (report.netProfit < 0)
    rows.push({ style: "ob",    cells: ["Net Loss for the Period", fmt(Math.abs(report.netProfit))] });
  rows.push({ style: "total",  cells: ["TOTAL INCOME", fmt(report.totalIncome + (report.netProfit < 0 ? Math.abs(report.netProfit) : 0))] });

  return {
    meta: {
      title: report.branchName, subtitle: report.branchAddress,
      reportTitle: `Profit & Loss Statement | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `ProfitLoss_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: false,
    },
    columns, rows,
  };
};

// ── Print HTML ─────────────────────────────────────────────────────────────────

const buildPrintHTML = (report: ProfitLoss): string => {
  const secHtml = (sections: ProfitLossSection[]) =>
    sections.map(sec =>
      `<tr class="sh"><td colspan="2">${sec.typeName}</td></tr>` +
      sec.lines.map(l => `<tr><td class="ind">${l.headName}</td><td class="amt">${fmt(l.balance)}</td></tr>`).join("") +
      `<tr class="ss"><td>Total — ${sec.typeName}</td><td class="amt">${fmt(sec.subTotal)}</td></tr>`
    ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Profit &amp; Loss</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
.cols{display:table;width:100%;}.col{display:table-cell;width:50%;vertical-align:top;padding:0 4px;}
table{width:100%;border-collapse:collapse;}
th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 6px;font-size:9px;text-align:left;}
td{border:1px solid #e2e8f0;padding:2px 5px;}
.sh td{background:#dbeafe;color:#1e40af;font-weight:700;font-style:italic;}
.ss td{background:#eff6ff;color:#1e3a8a;font-weight:600;}
.pr td{background:#dcfce7;color:#166534;font-weight:600;}
.ls td{background:#fee2e2;color:#991b1b;font-weight:600;}
.gt td{background:#1e293b;color:#fff;font-weight:700;}
.amt{text-align:right!important;}.ind{padding-left:14px!important;}
.summ{margin-top:10px;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;gap:24px;justify-content:center;font-size:9.5px;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 portrait;}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  ${report.branchAddress ? `<p>${report.branchAddress}</p>` : ""}
  <h2>Profit &amp; Loss Statement</h2>
  <p>For the period ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}</p>
</div>
<div class="cols">
  <div class="col">
    <table><thead><tr><th colspan="2">Expenditure</th></tr></thead><tbody>
      ${secHtml(report.expenseSections)}
      ${report.netProfit > 0 ? `<tr class="pr"><td>Net Profit for the Period</td><td class="amt">${fmt(report.netProfit)}</td></tr>` : ""}
      <tr class="gt"><td>Total Expenditure</td><td class="amt">₹${fmt(report.totalExpense + (report.netProfit > 0 ? report.netProfit : 0))}</td></tr>
    </tbody></table>
  </div>
  <div class="col">
    <table><thead><tr><th colspan="2">Income</th></tr></thead><tbody>
      ${secHtml(report.incomeSections)}
      ${report.netProfit < 0 ? `<tr class="ls"><td>Net Loss for the Period</td><td class="amt">${fmt(Math.abs(report.netProfit))}</td></tr>` : ""}
      <tr class="gt"><td>Total Income</td><td class="amt">₹${fmt(report.totalIncome + (report.netProfit < 0 ? Math.abs(report.netProfit) : 0))}</td></tr>
    </tbody></table>
  </div>
</div>
<div class="summ">
  <span>Total Income: <strong style="color:#166534">₹${fmt(report.totalIncome)}</strong></span>
  <span>Total Expense: <strong style="color:#991b1b">₹${fmt(report.totalExpense)}</strong></span>
  <span style="border-left:1px solid #cbd5e1;padding-left:24px">Net ${report.netProfit >= 0 ? "Profit" : "Loss"}: <strong style="color:${report.netProfit >= 0 ? "#166534" : "#991b1b"}">₹${fmt(Math.abs(report.netProfit))}</strong></span>
</div>
</body></html>`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-slate-200 px-3 py-1.5 text-xs ${className}`}>{children}</td>
);

const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`border border-slate-200 px-3 py-1.5 text-xs font-bold ${className}`}>{children}</th>
);

const SectionRows: React.FC<{ section: ProfitLossSection; showDrCr?: boolean }> = ({ section, showDrCr }) => (
  <>
    <tr className="bg-blue-50/70">
      <TD colSpan={showDrCr ? 4 : 2} className="font-semibold text-blue-800 italic">{section.typeName}</TD>
    </tr>
    {section.lines.map(line => (
      <tr key={line.headCode} className="hover:bg-slate-50">
        <TD className="pl-6 text-slate-700">{line.headName}</TD>
        {showDrCr && <TD className="text-right text-slate-500 tabular-nums">{fmt(line.drTotal)}</TD>}
        {showDrCr && <TD className="text-right text-slate-500 tabular-nums">{fmt(line.crTotal)}</TD>}
        <TD className="text-right font-medium text-slate-800 tabular-nums">{fmt(line.balance)}</TD>
      </tr>
    ))}
    <tr className="bg-slate-100">
      <TD className="font-semibold text-slate-700">Total — {section.typeName}</TD>
      {showDrCr && <TD />}{showDrCr && <TD />}
      <TD className="text-right font-bold text-slate-800 tabular-nums">{fmt(section.subTotal)}</TD>
    </tr>
  </>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const ProfitLossPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate]     = useState(workingDate);
  const [showDrCr, setShowDrCr] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [report, setReport]     = useState<ProfitLoss | null>(null);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select both dates.", "warning"); return; }
    if (fromDate > toDate)    { Swal.fire("Validation", "From Date must be ≤ To Date.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res  = await profitLossApi.getProfitLoss(user.branchid, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load.", "error");
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildPrintHTML(report)); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* ── Filter Card ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Profit &amp; Loss Statement</h2>
                <p className="text-xs text-slate-500">Income and expenditure for a period</p>
              </div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div><label className={lbl}>From Date</label><input type="date" value={fromDate} max={workingDate} onChange={e => { setFromDate(e.target.value); setReport(null); }} className={inp} /></div>
              <div><label className={lbl}>To Date</label><input type="date" value={toDate} max={workingDate} onChange={e => { setToDate(e.target.value); setReport(null); }} className={inp} /></div>
              <div className="flex items-center gap-2 pb-0.5">
                <input type="checkbox" id="showDrCr" checked={showDrCr} onChange={e => setShowDrCr(e.target.checked)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                <label htmlFor="showDrCr" className="text-sm text-slate-700 cursor-pointer select-none">Show Dr / Cr</label>
              </div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Generate"}
              </button>
              {report && <>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm"><Printer size={15} /> Print</button>
                <button onClick={() => exportToPdf(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileText size={15} /> PDF</button>
                <button onClick={() => exportToExcel(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileSpreadsheet size={15} /> Excel</button>
              </>}
              <button onClick={() => navigate("/dashboard")} className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                Close
              </button>
            </div>
          </div>

          {/* ── Report ──────────────────────────────────────────────────── */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Header */}
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">Profit &amp; Loss Statement</span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fmtLong(report.fromDate)} to {fmtLong(report.toDate)}</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-emerald-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Income</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">₹{fmt(report.totalIncome)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-red-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Expense</p>
                  <p className="text-base font-bold text-red-700 mt-0.5">₹{fmt(report.totalExpense)}</p>
                </div>
                <div className={`bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 ${report.netProfit >= 0 ? "border-t-blue-500" : "border-t-orange-500"} text-center`}>
                  <p className="text-xs text-slate-500 uppercase font-medium">Net {report.netProfit >= 0 ? "Profit" : "Loss"}</p>
                  <p className={`text-base font-bold mt-0.5 ${report.netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>₹{fmt(Math.abs(report.netProfit))}</p>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 p-4">

                {/* Expenditure */}
                <div className="pr-0 lg:pr-3 pb-4 lg:pb-0">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <TH className="text-left text-red-800 bg-red-50">Expenditure</TH>
                        {showDrCr && <TH className="text-right w-24 bg-slate-50 text-slate-600">Dr (₹)</TH>}
                        {showDrCr && <TH className="text-right w-24 bg-slate-50 text-slate-600">Cr (₹)</TH>}
                        <TH className="text-right w-28 bg-slate-50 text-slate-700">Amount (₹)</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenseSections.map(sec => <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />)}
                      {report.netProfit > 0 && (
                        <tr className="bg-emerald-50">
                          <TD className="font-semibold text-emerald-800">Net Profit for the Period</TD>
                          {showDrCr && <TD />}{showDrCr && <TD />}
                          <TD className="text-right font-bold text-emerald-700 tabular-nums">{fmt(report.netProfit)}</TD>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-slate-300 bg-slate-800 px-3 py-2 text-xs font-bold text-white">Total Expenditure</td>
                        {showDrCr && <td className="border border-slate-300 bg-slate-800" />}
                        {showDrCr && <td className="border border-slate-300 bg-slate-800" />}
                        <td className="border border-slate-300 bg-slate-800 px-3 py-2 text-xs font-bold text-white text-right tabular-nums">
                          ₹{fmt(report.totalExpense + (report.netProfit > 0 ? report.netProfit : 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Income */}
                <div className="pl-0 lg:pl-3 pt-4 lg:pt-0">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <TH className="text-left text-emerald-800 bg-emerald-50">Income</TH>
                        {showDrCr && <TH className="text-right w-24 bg-slate-50 text-slate-600">Dr (₹)</TH>}
                        {showDrCr && <TH className="text-right w-24 bg-slate-50 text-slate-600">Cr (₹)</TH>}
                        <TH className="text-right w-28 bg-slate-50 text-slate-700">Amount (₹)</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {report.incomeSections.map(sec => <SectionRows key={sec.typeName} section={sec} showDrCr={showDrCr} />)}
                      {report.netProfit < 0 && (
                        <tr className="bg-red-50">
                          <TD className="font-semibold text-red-800">Net Loss for the Period</TD>
                          {showDrCr && <TD />}{showDrCr && <TD />}
                          <TD className="text-right font-bold text-red-700 tabular-nums">{fmt(Math.abs(report.netProfit))}</TD>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-slate-300 bg-slate-800 px-3 py-2 text-xs font-bold text-white">Total Income</td>
                        {showDrCr && <td className="border border-slate-300 bg-slate-800" />}
                        {showDrCr && <td className="border border-slate-300 bg-slate-800" />}
                        <td className="border border-slate-300 bg-slate-800 px-3 py-2 text-xs font-bold text-white text-right tabular-nums">
                          ₹{fmt(report.totalIncome + (report.netProfit < 0 ? Math.abs(report.netProfit) : 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a date range and click Generate</p>
            </div>
          )}

        </div>
      </div>
    } />
  );
};

export default ProfitLossPage;
