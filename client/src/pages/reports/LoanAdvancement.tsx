import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { TrendingUp, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import loanAdvancementApi, { LoanAdvancement, LoanAdvancementRow, LoanProductItem } from "../../services/reports/loanAdvancementApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDate(iso);

const groupByDate = (rows: LoanAdvancementRow[]): Map<string, LoanAdvancementRow[]> => {
  const map = new Map<string, LoanAdvancementRow[]>();
  rows.forEach(r => {
    const key = isoDate(r.voucherDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });
  return map;
};

const buildExportConfig = (report: LoanAdvancement): ExportConfig => {
  const columns = [
    { header: "S.No.",        widthRatio: 0.04, align: "center" as const },
    { header: "Account No.", widthRatio: 0.09, align: "left"   as const },
    { header: "Account Name",widthRatio: 0.18, align: "left"   as const },
    { header: "Relative Name",widthRatio: 0.14, align: "left"  as const },
    { header: "Relation",    widthRatio: 0.08, align: "left"   as const },
    { header: "Particulars", widthRatio: 0.20, align: "left"   as const },
    { header: "Advancement", widthRatio: 0.13, align: "right"  as const },
    { header: "Loan Passed", widthRatio: 0.14, align: "right"  as const },
  ];
  const rows: ExportRow[] = [];
  const groups = groupByDate(report.rows);
  groups.forEach((dateRows, dateKey) => {
    rows.push({ style: "group", spanFirst: 8, cells: [`Advancement on: ${fmtShort(dateKey)}`, "", "", "", "", "", "", ""] });
    dateRows.forEach((r, i) => {
      rows.push({ style: "normal", cells: [String(i + 1), r.accountNumber, r.accountName, r.relativeName, r.relationName, r.particulars, fmt(r.amount), r.loanAmountPassed != null ? fmt(r.loanAmountPassed) : ""] });
    });
    const dateTotal = dateRows.reduce((s, r) => s + r.amount, 0);
    rows.push({ style: "subtotal", spanFirst: 6, cells: [`Total of: ${report.branchName}`, "", "", "", "", "", fmt(dateTotal), ""] });
    rows.push({ style: "subtotal", spanFirst: 6, cells: [`Total On: ${fmtShort(dateKey)}`, "", "", "", "", "", fmt(dateTotal), ""] });
  });
  rows.push({ style: "total", spanFirst: 6, cells: ["Grand Total", "", "", "", "", "", fmt(report.totalAmount), ""] });
  return {
    meta: {
      title: report.branchName, subtitle: report.branchAddress,
      reportTitle: `Advancement Report${report.productName !== "All Products" ? ` for ${report.productName}` : ""} | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `LoanAdvancement_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: true,
    },
    columns, rows,
  };
};

const buildPrintHTML = (report: LoanAdvancement): string => {
  const groups = groupByDate(report.rows);
  let tbody = "";
  groups.forEach((dateRows, dateKey) => {
    const dateTotal = dateRows.reduce((s, r) => s + r.amount, 0);
    tbody += `<tr><td colspan="8" style="background:#1e293b;color:#fff;text-align:center;font-weight:700;padding:5px 4px;font-size:10px">Advancement on: ${fmtShort(dateKey)}</td></tr>`;
    tbody += `<tr style="background:#374151;color:#fff"><th>S.No.</th><th style="text-align:left">Account No.</th><th style="text-align:left">Account Name</th><th style="text-align:left">Relative Name</th><th style="text-align:left">Relation</th><th style="text-align:left">Particulars</th><th class="amt">Advancement</th><th class="amt">Loan Passed</th></tr>`;
    dateRows.forEach((r, i) => {
      tbody += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}"><td style="text-align:center">${i + 1}</td><td style="font-family:monospace">${r.accountNumber}</td><td>${r.accountName}</td><td>${r.relativeName}</td><td>${r.relationName}</td><td>${r.particulars}</td><td class="amt">${fmt(r.amount)}</td><td class="amt">${r.loanAmountPassed != null ? fmt(r.loanAmountPassed) : ""}</td></tr>`;
    });
    tbody += `<tr class="sub"><td colspan="6" style="text-align:right">Total of: ${report.branchName}</td><td class="amt">${fmt(dateTotal)}</td><td></td></tr>`;
    tbody += `<tr class="sub"><td colspan="6" style="text-align:right">Total On: ${fmtShort(dateKey)}</td><td class="amt">${fmt(dateTotal)}</td><td></td></tr>`;
  });
  tbody += `<tr class="grand"><td colspan="6" style="text-align:right">Grand Total:</td><td class="amt">${fmt(report.totalAmount)}</td><td></td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loan Advancement Report</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #334155;}
.rh h1{font-size:13px;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
.rh h2{font-size:11px;font-weight:700;margin-top:3px;text-decoration:underline;}
table{width:100%;border-collapse:collapse;}
th{padding:3px 4px;font-size:9px;text-transform:uppercase;}
td{border:1px solid #d1d5db;padding:2px 4px;font-size:9.5px;}
.sub td{background:#e5e7eb;font-weight:700;border-top:1px solid #9ca3af;}
.grand td{background:#1e293b;color:#fff;font-weight:700;}
.amt{text-align:right;}
@media print{body{padding:4px;}@page{margin:6mm;size:A4 landscape;}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  ${report.branchAddress ? `<p style="font-size:9px;color:#475569">${report.branchAddress}</p>` : ""}
  <h2>Advancement Report${report.productName !== "All Products" ? ` of all branches for ${report.productName}` : ""} from ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}</h2>
</div>
<table><tbody>${tbody}</tbody></table></body></html>`;
};

const LoanAdvancementPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());
  const [fromDate, setFromDate]   = useState(workingDate);
  const [toDate, setToDate]       = useState(workingDate);
  const [products, setProducts]   = useState<LoanProductItem[]>([]);
  const [productId, setProductId] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<LoanAdvancement | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    loanAdvancementApi.getLoanProducts(user.branchid).then(res => {
      const list = (res as any).data ?? (res as any).Data ?? [];
      setProducts(list);
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From > To.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await loanAdvancementApi.getLoanAdvancement(user.branchid, fromDate, toDate, productId);
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

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-sm";
  const groups = report ? groupByDate(report.rows) : new Map<string, LoanAdvancementRow[]>();

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-base font-bold text-slate-800">Loan Advancement Report</h2><p className="text-xs text-slate-500">Date-wise loan disbursements with member details</p></div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>Product</label>
                <select value={productId} onChange={e => { setProductId(Number(e.target.value)); setReport(null); }} className={inp}>
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <div><label className={lbl}>From Date</label><input type="date" value={fromDate} max={workingDate} onChange={e => { setFromDate(e.target.value); setReport(null); }} className={inp} /></div>
              <div><label className={lbl}>To Date</label><input type="date" value={toDate} max={workingDate} onChange={e => { setToDate(e.target.value); setReport(null); }} className={inp} /></div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
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
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900 underline">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <p className="text-sm font-bold text-slate-700 mt-2 underline">
                  Advancement Report{report.productName !== "All Products" ? ` of all branches for ${report.productName}` : ""} from {fmtLong(report.fromDate)} to {fmtLong(report.toDate)}
                </p>
              </div>

              <div className="px-4 pt-4 pb-2">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                  <span className="text-xs text-slate-500 uppercase font-medium">Grand Total Advancement</span>
                  <span className="text-base font-bold text-green-700">₹{fmt(report.totalAmount)}</span>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {report.rows.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No loan advancements found for the selected criteria.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[65vh]">
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {Array.from(groups.entries()).map(([dateKey, dateRows]) => {
                          const dateTotal = dateRows.reduce((s, r) => s + r.amount, 0);
                          return (
                            <React.Fragment key={dateKey}>
                              <tr>
                                <td colSpan={8} className="bg-slate-800 text-white text-center font-bold py-2.5 px-3 text-xs uppercase tracking-wider">
                                  Advancement on: {fmtShort(dateKey)}
                                </td>
                              </tr>
                              <tr className="bg-slate-600 text-white">
                                {["S.No.", "Account No.", "Account Name", "Relative Name", "Relation", "Particulars", "Advancement", "Loan Passed"].map(h => (
                                  <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-r border-slate-500 last:border-r-0 whitespace-nowrap ${["Advancement","Loan Passed"].includes(h) ? "text-right" : h === "S.No." ? "text-center" : "text-left"}`}>{h}</th>
                                ))}
                              </tr>
                              {dateRows.map((r, i) => (
                                <tr key={`${dateKey}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                                  <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500">{i + 1}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">{r.accountNumber}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800 font-medium">{r.accountName}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{r.relativeName}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{r.relationName}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{r.particulars}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-right text-green-700 font-semibold">{fmt(r.amount)}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-600">{r.loanAmountPassed != null ? fmt(r.loanAmountPassed) : ""}</td>
                                </tr>
                              ))}
                              <tr className="bg-slate-100">
                                <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-slate-700 border-t border-slate-300">Total of: {report.branchName}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-green-700 border-t border-slate-300">{fmt(dateTotal)}</td>
                                <td className="border-t border-slate-300" />
                              </tr>
                              <tr className="bg-slate-100">
                                <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-slate-700 border-t border-slate-200">Total On: {fmtShort(dateKey)}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-green-700 border-t border-slate-200">{fmt(dateTotal)}</td>
                                <td className="border-t border-slate-200" />
                              </tr>
                            </React.Fragment>
                          );
                        })}
                        <tr className="bg-slate-800">
                          <td colSpan={6} className="px-3 py-3 text-right text-white font-bold">Grand Total:</td>
                          <td className="px-3 py-3 text-right text-white font-bold">{fmt(report.totalAmount)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    } />
  );
};

export default LoanAdvancementPage;
