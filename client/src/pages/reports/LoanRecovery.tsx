import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { RefreshCw, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import loanRecoveryApi, { LoanProductItem, LoanRecovery } from "../../services/reports/loanRecoveryApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const fmtDate  = (iso: string | null) => iso ? fmtShort(iso) : "—";
const toInput  = (iso: string) => isoDate(iso);

const buildExportConfig = (report: LoanRecovery): ExportConfig => {
  const columns = [
    { header: "#",           widthRatio: 0.03, align: "center" as const },
    { header: "Date",        widthRatio: 0.09, align: "center" as const },
    { header: "V.No",        widthRatio: 0.06, align: "center" as const },
    { header: "Account No",  widthRatio: 0.10, align: "left"   as const },
    { header: "Account",     widthRatio: 0.22, align: "left"   as const },
    { header: "Product",     widthRatio: 0.16, align: "left"   as const },
    { header: "Loan Date",   widthRatio: 0.09, align: "center" as const },
    { header: "Loan Amt",    widthRatio: 0.12, align: "right"  as const },
    { header: "Recovery",    widthRatio: 0.12, align: "right"  as const },
  ];
  const rows: ExportRow[] = report.rows.map((r, i) => ({
    style: "normal",
    cells: [String(i+1), fmtShort(r.voucherDate), String(r.voucherNo), r.accountNumber, r.accountName, r.productName, fmtDate(r.loanDate), r.loanAmountPassed!=null?fmt(r.loanAmountPassed):"—", fmt(r.recoveryAmount)],
  }));
  rows.push({ style: "total", spanFirst: 8, cells: [`Total (${report.rows.length})`, "", "", "", "", "", "", "", fmt(report.totalRecovery)] });
  return {
    meta: { title: report.branchName, subtitle: report.branchAddress, reportTitle: `Loan Recovery${report.productName?` — ${report.productName}`:""} | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`, fileName: `LoanRecovery_${toInput(report.fromDate)}_${toInput(report.toDate)}`, landscape: true },
    columns, rows,
  };
};

const buildPrintHTML = (report: LoanRecovery): string => {
  let rows = "";
  report.rows.forEach((r, i) => {
    rows += `<tr class="${i%2===0?"":"even"}"><td style="text-align:center">${i+1}</td><td style="text-align:center;white-space:nowrap">${fmtShort(r.voucherDate)}</td><td style="text-align:center">${r.voucherNo}</td><td style="font-family:monospace">${r.accountNumber}</td><td>${r.accountName}</td><td>${r.productName}</td><td style="text-align:center;white-space:nowrap">${fmtDate(r.loanDate)}</td><td class="amt">${r.loanAmountPassed!=null?fmt(r.loanAmountPassed):"—"}</td><td class="amt cr">${fmt(r.recoveryAmount)}</td></tr>`;
  });
  rows += `<tr class="total-row"><td colspan="8" style="text-align:right">Total (${report.rows.length})</td><td class="amt cr">${fmt(report.totalRecovery)}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loan Recovery</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:9px;color:#64748b;}.rh h2{font-size:10px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 4px;font-size:9px;text-transform:uppercase;}td{border:1px solid #e2e8f0;padding:2px 4px;font-size:9.5px;}tr.even td{background:#f8fafc;}.total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;}.amt{text-align:right;}.cr{color:#065f46;font-weight:600;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 landscape;}}
</style></head><body>
<div class="rh"><h1>${report.branchName}</h1><p>${report.branchAddress??""}</p><h2>Loan Recovery${report.productName?` — ${report.productName}`:""} | ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}</h2></div>
<table><thead><tr><th>#</th><th>Date</th><th>V.No</th><th style="text-align:left">Acc No</th><th style="text-align:left">Account</th><th style="text-align:left">Product</th><th>Loan Date</th><th>Loan Amt</th><th>Recovery</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
};

const LoanRecoveryPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());
  const [products, setProducts]   = useState<LoanProductItem[]>([]);
  const [productId, setProductId] = useState(0);
  const [fromDate, setFromDate]   = useState(workingDate);
  const [toDate, setToDate]       = useState(workingDate);
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<LoanRecovery | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    loanRecoveryApi.getLoanProducts(user.branchid).then(res => { const d = (res as any).data ?? (res as any).Data ?? []; setProducts(d); }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    setLoading(true); setReport(null);
    try {
      const res = await loanRecoveryApi.getLoanRecovery(user.branchid, fromDate, toDate, productId);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data."); setReport(data);
    } catch (e: any) { Swal.fire("Error", e?.message || "Failed.", "error"); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!report) return; const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildPrintHTML(report)); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const sel = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center"><RefreshCw className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-base font-bold text-slate-800">Loan Recovery Report</h2><p className="text-xs text-slate-500">Loan repayments received in the selected date range</p></div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div className="w-56"><label className={lbl}>Loan Product</label>
                <select value={productId} onChange={e => { setProductId(Number(e.target.value)); setReport(null); }} className={sel}>
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <div><label className={lbl}>From Date</label><input type="date" value={fromDate} max={workingDate} onChange={e => { setFromDate(e.target.value); setReport(null); }} className={inp} /></div>
              <div><label className={lbl}>To Date</label><input type="date" value={toDate} max={workingDate} onChange={e => { setToDate(e.target.value); setReport(null); }} className={inp} /></div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
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

          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">Loan Recovery</span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fmtLong(report.fromDate)} to {fmtLong(report.toDate)}{report.productName ? ` — ${report.productName}` : ""}</p>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-4">
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm border-t-4 border-t-emerald-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Recovery</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">₹{fmt(report.totalRecovery)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm border-t-4 border-t-slate-400 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Transactions</p>
                  <p className="text-base font-bold text-slate-700 mt-0.5">{report.rows.length}</p>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                {report.rows.length === 0 ? <p className="text-center py-12 text-slate-400 text-sm">No loan recoveries found.</p> : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {["#","Date","V.No","Account No","Account Name","Product","Loan Date","Loan Amt","Recovery"].map(h => (
                            <th key={h} className={`bg-slate-800 text-white px-2 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${["Loan Amt","Recovery"].includes(h)?"text-right":"text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((r, i) => (
                          <tr key={i} className={i%2===0?"bg-white":"bg-slate-50/70"}>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-500 text-center">{i+1}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-600 whitespace-nowrap">{fmtShort(r.voucherDate)}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-600 text-center">{r.voucherNo}</td>
                            <td className="border-b border-slate-100 px-2 py-2 font-mono text-slate-600">{r.accountNumber}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-800">{r.accountName}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-600">{r.productName}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-slate-600 whitespace-nowrap">{fmtDate(r.loanDate)}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-right text-slate-700">{r.loanAmountPassed!=null?fmt(r.loanAmountPassed):"—"}</td>
                            <td className="border-b border-slate-100 px-2 py-2 text-right text-emerald-700 font-semibold">{fmt(r.recoveryAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={8} className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total ({report.rows.length})</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-2 py-2.5 text-right text-xs font-bold text-emerald-700">{fmt(report.totalRecovery)}</td>
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

export default LoanRecoveryPage;
