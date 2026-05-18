import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { ClipboardList, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import loanDemandApi, { LoanDemand, LoanDemandRow } from "../../services/reports/loanDemandApi";
import { LoanProductItem } from "../../services/reports/loanAdvancementApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string | null) => iso ? localDate(iso).toLocaleDateString("en-GB") : "-";
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDate(iso);

const buildExportConfig = (report: LoanDemand, pendingOnly: boolean): ExportConfig => {
  const columns = [
    { header: "Acc No",      widthRatio: 0.09, align: "left"   as const },
    { header: "Name",        widthRatio: 0.16, align: "left"   as const },
    { header: "Product",     widthRatio: 0.11, align: "left"   as const },
    { header: "Loan Date",   widthRatio: 0.08, align: "center" as const },
    { header: "Loan Amt",    widthRatio: 0.09, align: "right"  as const },
    { header: "Kist No",     widthRatio: 0.06, align: "center" as const },
    { header: "Kist Date",   widthRatio: 0.08, align: "center" as const },
    { header: "Kist Amt",    widthRatio: 0.09, align: "right"  as const },
    { header: "Principal",   widthRatio: 0.09, align: "right"  as const },
    { header: "Interest",    widthRatio: 0.08, align: "right"  as const },
    { header: "Status",      widthRatio: 0.07, align: "center" as const },
  ];
  const rows: ExportRow[] = report.rows.map(r => ({
    style: "normal",
    cells: [
      r.accountNumber, r.accountName, r.productName,
      fmtShort(r.loanDate), r.loanAmount != null ? fmt(r.loanAmount) : "-",
      String(r.kistNumber), fmtShort(r.kistDate),
      fmt(r.kistAmount), fmt(r.principalAmt), fmt(r.interestAmt),
      r.status,
    ],
  }));
  rows.push({
    style: "total", spanFirst: 7,
    cells: ["Total", "", "", "", "", "", "", fmt(report.totalKistAmount), fmt(report.totalPrincipal), fmt(report.totalInterest), ""],
  });
  return {
    meta: {
      title: report.branchName, subtitle: report.branchAddress,
      reportTitle: `Loan Demand${pendingOnly ? " (Pending)" : ""} | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `LoanDemand_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: true,
    },
    columns, rows,
  };
};

const buildPrintHTML = (report: LoanDemand, pendingOnly: boolean): string => {
  let rows = "";
  report.rows.forEach((r, i) => {
    const isPaid = r.status === "Paid";
    const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
    const statusColor = isPaid ? "#065f46" : "#9a3412";
    const statusBg   = isPaid ? "#dcfce7"  : "#fee2e2";
    rows += `<tr style="background:${bg}">
      <td style="font-family:monospace">${r.accountNumber}</td><td>${r.accountName}</td><td>${r.productName}</td>
      <td style="text-align:center;white-space:nowrap">${fmtShort(r.loanDate)}</td>
      <td style="text-align:right">${r.loanAmount != null ? fmt(r.loanAmount) : "-"}</td>
      <td style="text-align:center">${r.kistNumber}</td>
      <td style="text-align:center;white-space:nowrap">${fmtShort(r.kistDate)}</td>
      <td class="amt">${fmt(r.kistAmount)}</td><td class="amt">${fmt(r.principalAmt)}</td><td class="amt">${fmt(r.interestAmt)}</td>
      <td style="text-align:center"><span style="background:${statusBg};color:${statusColor};padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600">${r.status}</span></td>
    </tr>`;
  });
  rows += `<tr class="total-row"><td colspan="7" style="text-align:right">Total</td><td class="amt">${fmt(report.totalKistAmount)}</td><td class="amt">${fmt(report.totalPrincipal)}</td><td class="amt">${fmt(report.totalInterest)}</td><td></td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loan Demand</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 4px;font-size:9.5px;}.total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;}
.amt{text-align:right;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 landscape;}}
</style></head><body>
<div class="rh"><h1>${report.branchName}</h1><p>${report.branchAddress ?? ""}</p><h2>Loan Demand${pendingOnly ? " (Pending Only)" : ""} | ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}${report.productName !== "All Products" ? ` | ${report.productName}` : ""}</h2></div>
<table><thead><tr>
  <th style="text-align:left">Acc No</th><th style="text-align:left">Name</th><th style="text-align:left">Product</th>
  <th>Loan Date</th><th style="width:75px">Loan Amt</th><th>Kist No</th><th>Kist Date</th>
  <th style="width:75px">Kist Amt</th><th style="width:75px">Principal</th><th style="width:75px">Interest</th><th>Status</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`;
};

const LoanDemandPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());
  const [fromDate, setFromDate]   = useState(workingDate);
  const [toDate, setToDate]       = useState(workingDate);
  const [products, setProducts]   = useState<LoanProductItem[]>([]);
  const [productId, setProductId] = useState(0);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<LoanDemand | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    loanDemandApi.getLoanProducts(user.branchid).then(res => {
      const list = (res as any).data ?? (res as any).Data ?? [];
      setProducts(list);
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From > To.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await loanDemandApi.getLoanDemand(user.branchid, fromDate, toDate, productId, pendingOnly);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data.");
      setReport(data);
    } catch (e: any) { Swal.fire("Error", e?.message || "Failed.", "error"); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildPrintHTML(report, pendingOnly)); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center"><ClipboardList className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-base font-bold text-slate-800">Loan Demand (Kist)</h2><p className="text-xs text-slate-500">Kist-wise instalment demand for the selected date range</p></div>
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
              <div className="flex items-center gap-2 pb-0.5">
                <input id="pendingOnly" type="checkbox" checked={pendingOnly} onChange={e => { setPendingOnly(e.target.checked); setReport(null); }} className="w-4 h-4 rounded accent-violet-600 cursor-pointer" />
                <label htmlFor="pendingOnly" className="text-sm font-medium text-slate-600 cursor-pointer select-none">Pending Only</label>
              </div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm"><Printer size={15} /> Print</button>
                <button onClick={() => exportToPdf(buildExportConfig(report, pendingOnly))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileText size={15} /> PDF</button>
                <button onClick={() => exportToExcel(buildExportConfig(report, pendingOnly))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm"><FileSpreadsheet size={15} /> Excel</button>
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
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet-700 px-3 py-1 bg-violet-50 border border-violet-100 rounded-full">
                    Loan Demand{pendingOnly ? " — Pending" : ""}
                  </span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fmtLong(report.fromDate)} to {fmtLong(report.toDate)}</p>
                {report.productName !== "All Products" && <p className="text-xs text-violet-700 font-medium mt-1">{report.productName}</p>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-violet-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Kist Amount</p>
                  <p className="text-base font-bold text-violet-700 mt-0.5">₹{fmt(report.totalKistAmount)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-red-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Principal</p>
                  <p className="text-base font-bold text-red-700 mt-0.5">₹{fmt(report.totalPrincipal)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-orange-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Interest</p>
                  <p className="text-base font-bold text-orange-700 mt-0.5">₹{fmt(report.totalInterest)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-slate-400 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Paid / Pending</p>
                  <p className="text-base font-bold mt-0.5">
                    <span className="text-emerald-700">{report.paidCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-red-700">{report.pendingCount}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {report.rows.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No kist records found for the selected criteria.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {["Acc No","Name","Product","Loan Date","Loan Amt","Kist No","Kist Date","Kist Amt","Principal","Interest","Status"].map(h => (
                            <th key={h} className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${["Loan Amt","Kist Amt","Principal","Interest"].includes(h) ? "text-right" : ["Loan Date","Kist Date","Kist No","Status"].includes(h) ? "text-center" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((r: LoanDemandRow, i: number) => {
                          const isPaid = r.status === "Paid";
                          return (
                            <tr key={`${r.accountNumber}-${r.kistNumber}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                              <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">{r.accountNumber}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.accountName}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{r.productName}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600 whitespace-nowrap">{fmtShort(r.loanDate)}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">{r.loanAmount != null ? fmt(r.loanAmount) : "-"}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600">{r.kistNumber}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600 whitespace-nowrap">{fmtShort(r.kistDate)}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-right text-violet-700 font-medium">{fmt(r.kistAmount)}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-right text-red-700 font-medium">{fmt(r.principalAmt)}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-right text-orange-700 font-medium">{fmt(r.interestAmt)}</td>
                              <td className="border-b border-slate-100 px-3 py-2 text-center">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{r.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={7} className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-violet-700">{fmt(report.totalKistAmount)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-red-700">{fmt(report.totalPrincipal)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-orange-700">{fmt(report.totalInterest)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400" />
                        </tr>
                      </tfoot>
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

export default LoanDemandPage;
