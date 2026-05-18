import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Scale, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import trialBalanceApi, { TrialBalance, TrialBalanceRow } from "../../services/reports/trialBalanceApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtLong = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput = (iso: string) => isoDate(iso);

const TYPE_ORDER: Record<string, number> = { Assets: 1, Liabilities: 2, Income: 3, Expenditure: 4 };

const buildExportConfig = (report: TrialBalance): ExportConfig => {
  const columns = [
    { header: "Head Code",  widthRatio: 0.15, align: "left"  as const },
    { header: "Head Name",  widthRatio: 0.50, align: "left"  as const },
    { header: "Dr Balance", widthRatio: 0.17, align: "right" as const },
    { header: "Cr Balance", widthRatio: 0.17, align: "right" as const },
  ];
  const rows: ExportRow[] = [];
  const groups = [...new Set(report.rows.map(r => r.headTypeName))].sort((a, b) => (TYPE_ORDER[a] ?? 9) - (TYPE_ORDER[b] ?? 9));
  groups.forEach(g => {
    rows.push({ style: "group", spanFirst: 4, cells: [g, "", "", ""] });
    report.rows.filter(r => r.headTypeName === g).forEach(r =>
      rows.push({ style: "normal", cells: [String(r.headCode), r.headName, r.drBalance > 0 ? fmt(r.drBalance) : "", r.crBalance > 0 ? fmt(r.crBalance) : ""] })
    );
    const gDr = report.rows.filter(r => r.headTypeName === g).reduce((s, r) => s + r.drBalance, 0);
    const gCr = report.rows.filter(r => r.headTypeName === g).reduce((s, r) => s + r.crBalance, 0);
    rows.push({ style: "subtotal", spanFirst: 2, cells: [`Sub-Total — ${g}`, "", gDr > 0 ? fmt(gDr) : "", gCr > 0 ? fmt(gCr) : ""] });
  });
  rows.push({ style: "total", spanFirst: 2, cells: ["Grand Total", "", fmt(report.totalDr), fmt(report.totalCr)] });
  return {
    meta: { title: report.branchName, subtitle: report.branchAddress, reportTitle: `Trial Balance — As of ${fmtLong(report.asOfDate)}`, fileName: `TrialBalance_${toInput(report.asOfDate)}`, landscape: false },
    columns, rows,
  };
};

const buildPrintHTML = (report: TrialBalance): string => {
  const groups = [...new Set(report.rows.map(r => r.headTypeName))].sort((a, b) => (TYPE_ORDER[a] ?? 9) - (TYPE_ORDER[b] ?? 9));
  let tbody = "";
  groups.forEach(g => {
    const gRows = report.rows.filter(r => r.headTypeName === g);
    const gDr = gRows.reduce((s, r) => s + r.drBalance, 0);
    const gCr = gRows.reduce((s, r) => s + r.crBalance, 0);
    tbody += `<tr class="group-row"><td colspan="4">${g}</td></tr>`;
    gRows.forEach(r => { tbody += `<tr><td>${r.headCode}</td><td>${r.headName}</td><td class="amt">${r.drBalance > 0 ? fmt(r.drBalance) : ""}</td><td class="amt">${r.crBalance > 0 ? fmt(r.crBalance) : ""}</td></tr>`; });
    tbody += `<tr class="sub-row"><td colspan="2" style="text-align:right">Sub-Total — ${g}</td><td class="amt">${gDr > 0 ? fmt(gDr) : ""}</td><td class="amt">${gCr > 0 ? fmt(gCr) : ""}</td></tr>`;
  });
  tbody += `<tr class="total-row"><td colspan="2" style="text-align:right">Grand Total</td><td class="amt">${fmt(report.totalDr)}</td><td class="amt">${fmt(report.totalCr)}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Trial Balance</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10.5px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}
th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 6px;font-size:9.5px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 5px;font-size:10px;}
.group-row td{background:#dbeafe;color:#1e40af;font-weight:700;padding:4px 5px;}
.sub-row td{background:#f1f5f9;font-weight:600;border-top:1px solid #94a3b8;}
.total-row td{background:#1e293b;color:#fff;font-weight:700;}
.amt{text-align:right;font-variant-numeric:tabular-nums;}
@media print{body{padding:6px;}@page{margin:10mm;size:A4 portrait;}}
</style></head><body>
<div class="rh"><h1>${report.branchName}</h1><p>${report.branchAddress ?? ""}</p><h2>Trial Balance — As of ${fmtLong(report.asOfDate)}</h2></div>
<table><thead><tr><th style="width:100px">Head Code</th><th style="text-align:left">Head Name</th><th style="width:110px">Dr Balance</th><th style="width:110px">Cr Balance</th></tr></thead>
<tbody>${tbody}</tbody></table></body></html>`;
};

const TrialBalancePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());
  const [asOfDate, setAsOfDate] = useState(workingDate);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TrialBalance | null>(null);

  const handleLoad = async () => {
    setLoading(true); setReport(null);
    try {
      const res = await trialBalanceApi.getTrialBalance(user.branchid, asOfDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data.");
      setReport(data);
    } catch (e: any) { Swal.fire("Error", e?.message || "Failed.", "error"); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildPrintHTML(report)); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const groups = report ? [...new Set(report.rows.map(r => r.headTypeName))].sort((a, b) => (TYPE_ORDER[a] ?? 9) - (TYPE_ORDER[b] ?? 9)) : [];

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center"><Scale className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-base font-bold text-slate-800">Trial Balance</h2><p className="text-xs text-slate-500">Account head-wise Dr/Cr balances as of date</p></div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">As of Date</label>
                <input type="date" value={asOfDate} onChange={e => { setAsOfDate(e.target.value); setReport(null); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm"><Printer size={15} /> Print</button>
                <button onClick={() => exportToPdf(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileText size={15} /> PDF</button>
                <button onClick={() => exportToExcel(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileSpreadsheet size={15} /> Excel</button>
              </>}
            </div>
          </div>

          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-indigo-700 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">Trial Balance</span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">As of {fmtLong(report.asOfDate)}</p>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="bg-slate-800 text-white px-3 py-3 text-left font-semibold uppercase tracking-wider border-r border-slate-700 w-32">Head Code</th>
                        <th className="bg-slate-800 text-white px-3 py-3 text-left font-semibold uppercase tracking-wider border-r border-slate-700">Head Name</th>
                        <th className="bg-slate-800 text-white px-3 py-3 text-right font-semibold uppercase tracking-wider border-r border-slate-700 w-32">Dr Balance</th>
                        <th className="bg-slate-800 text-white px-3 py-3 text-right font-semibold uppercase tracking-wider w-32">Cr Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(g => {
                        const gRows = report.rows.filter(r => r.headTypeName === g);
                        const gDr = gRows.reduce((s, r) => s + r.drBalance, 0);
                        const gCr = gRows.reduce((s, r) => s + r.crBalance, 0);
                        return (
                          <React.Fragment key={g}>
                            <tr className="bg-indigo-50 border-l-4 border-indigo-400">
                              <td colSpan={4} className="px-3 py-2 font-bold text-indigo-800 uppercase tracking-wide">{g}</td>
                            </tr>
                            {gRows.map((r, i) => (
                              <tr key={r.headCode} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                                <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">{r.headCode}</td>
                                <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.headName}</td>
                                <td className="border-b border-slate-100 px-3 py-2 text-right text-red-700 font-medium">{r.drBalance > 0 ? fmt(r.drBalance) : ""}</td>
                                <td className="border-b border-slate-100 px-3 py-2 text-right text-emerald-700 font-medium">{r.crBalance > 0 ? fmt(r.crBalance) : ""}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-100 border-t border-slate-300">
                              <td colSpan={2} className="px-3 py-2 text-right text-slate-700 font-semibold text-xs">Sub-Total — {g}</td>
                              <td className="px-3 py-2 text-right text-red-700 font-bold">{gDr > 0 ? fmt(gDr) : ""}</td>
                              <td className="px-3 py-2 text-right text-emerald-700 font-bold">{gCr > 0 ? fmt(gCr) : ""}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      <tr className="bg-slate-800">
                        <td colSpan={2} className="px-3 py-2.5 text-right text-white font-bold">Grand Total</td>
                        <td className="px-3 py-2.5 text-right text-white font-bold">{fmt(report.totalDr)}</td>
                        <td className="px-3 py-2.5 text-right text-white font-bold">{fmt(report.totalCr)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    } />
  );
};

export default TrialBalancePage;
