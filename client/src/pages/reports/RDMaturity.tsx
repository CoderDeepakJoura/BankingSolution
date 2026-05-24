import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookOpen, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import rdMaturityApi, { RDMaturity, RDMaturityProductItem } from "../../services/reports/rdMaturityApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt      = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate  = (iso: string) => iso.split("T")[0];
const localDt  = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDt(iso).toLocaleDateString("en-GB");
const fmtLong  = (iso: string) => localDt(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const fmtNullable = (iso: string | null) => iso ? fmtShort(iso) : "-";
const toInput  = (iso: string) => isoDate(iso);

const buildExportConfig = (report: RDMaturity): ExportConfig => {
  const columns = [
    { header: "S.No.",          widthRatio: 0.05, align: "center" as const },
    { header: "Acc Detail",     widthRatio: 0.20, align: "left"   as const },
    { header: "Acc No.",        widthRatio: 0.10, align: "center" as const },
    { header: "RD No.",         widthRatio: 0.07, align: "center" as const },
    { header: "Opening Date",   widthRatio: 0.09, align: "center" as const },
    { header: "Maturity Date",  widthRatio: 0.09, align: "center" as const },
    { header: "Payment Date",   widthRatio: 0.09, align: "center" as const },
    { header: "RD Amt",         widthRatio: 0.12, align: "right"  as const },
    { header: "Maturity Amt",   widthRatio: 0.12, align: "right"  as const },
    { header: "Product",        widthRatio: 0.07, align: "left"   as const },
  ];

  const rows: ExportRow[] = report.rows.map((r, i) => ({
    style: "normal",
    cells: [
      String(i + 1),
      r.accountName,
      r.accountNumber,
      String(r.rdNumber),
      fmtShort(r.openingDate),
      fmtShort(r.maturityDate),
      fmtNullable(r.paymentDate),
      fmt(r.rdAmount),
      fmt(r.maturityAmount),
      r.productName,
    ],
  }));

  rows.push({
    style: "total", spanFirst: 7,
    cells: ["Total", "", "", "", "", "", "", fmt(report.totalRDAmount), fmt(report.totalMaturityAmount), ""],
  });

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `RD Maturity Detail | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}${report.productName !== "All Products" ? ` | ${report.productName}` : ""}`,
      fileName: `RDMaturity_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

const buildPrintHTML = (report: RDMaturity): string => {
  let rows = "";
  report.rows.forEach((r, i) => {
    rows += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
      <td style="text-align:center">${i + 1}</td>
      <td>${r.accountName}</td>
      <td style="font-family:monospace;text-align:center">${r.accountNumber}</td>
      <td style="text-align:center">${r.rdNumber}</td>
      <td style="text-align:center;white-space:nowrap">${fmtShort(r.openingDate)}</td>
      <td style="text-align:center;white-space:nowrap">${fmtShort(r.maturityDate)}</td>
      <td style="text-align:center;white-space:nowrap">${fmtNullable(r.paymentDate)}</td>
      <td class="amt">${fmt(r.rdAmount)}</td>
      <td class="amt">${fmt(r.maturityAmount)}</td>
    </tr>`;
  });
  rows += `<tr class="total-row">
    <td colspan="7" style="text-align:right">Total Amount</td>
    <td class="amt">${fmt(report.totalRDAmount)}</td>
    <td class="amt">${fmt(report.totalMaturityAmount)}</td>
  </tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RD Maturity</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 4px;font-size:9.5px;}.total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;}
.amt{text-align:right;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 landscape;}}
</style></head><body>
<div class="rh"><h1>${report.branchName}</h1><p>${report.branchAddress ?? ""}</p>
<h2>RD Maturity Detail Of Product:${report.productName} | RD Maturity From Date : ${fmtLong(report.fromDate)} To Date:${fmtLong(report.toDate)}</h2></div>
<table><thead><tr>
  <th style="width:35px">S.No</th><th style="text-align:left">Acc Detail</th>
  <th>AccNo</th><th>RD No</th><th>Opening Date</th><th>Maturity Date</th><th>Payment Date</th>
  <th style="width:80px">RD Amt</th><th style="width:80px">Maturity Amt</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`;
};

const RDMaturityPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());

  const [fromDate,  setFromDate]  = useState(workingDate);
  const [toDate,    setToDate]    = useState(workingDate);
  const [products,  setProducts]  = useState<RDMaturityProductItem[]>([]);
  const [productId, setProductId] = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [report,    setReport]    = useState<RDMaturity | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    rdMaturityApi.getRDProducts(user.branchid).then(res => {
      setProducts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate)    { Swal.fire("Validation", "From > To.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await rdMaturityApi.getRDMaturity(user.branchid, fromDate, toDate, productId);
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
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-800">RD Maturity Report</h2>
                <p className="text-xs text-slate-500">Recurring deposits maturing in the selected date range</p>
              </div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>From Date</label>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setReport(null); }} className={inp} />
              </div>
              <div>
                <label className={lbl}>To Date</label>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setReport(null); }} className={inp} />
              </div>
              <div>
                <label className={lbl}>Product</label>
                <select value={productId} onChange={e => { setProductId(Number(e.target.value)); setReport(null); }} className={inp}>
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <button onClick={handleLoad} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => exportToPdf(buildExportConfig(report))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <FileText size={15} /> PDF
                </button>
                <button onClick={() => exportToExcel(buildExportConfig(report))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <FileSpreadsheet size={15} /> Excel
                </button>
              </>}
              <button onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                Close
              </button>
            </div>
          </div>

          {/* Report table */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-teal-700 px-3 py-1 bg-teal-50 border border-teal-100 rounded-full">
                    RD Maturity Detail
                  </span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fmtLong(report.fromDate)} to {fmtLong(report.toDate)}</p>
                {report.productName !== "All Products" && <p className="text-xs text-teal-700 font-medium mt-1">{report.productName}</p>}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-teal-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total RD Amount</p>
                  <p className="text-base font-bold text-teal-700 mt-0.5">₹{fmt(report.totalRDAmount)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-blue-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Maturity Amount</p>
                  <p className="text-base font-bold text-blue-700 mt-0.5">₹{fmt(report.totalMaturityAmount)}</p>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {report.rows.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No open RD accounts maturing in the selected date range.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {["S.No","Acc Detail","AccNo","RD No","Opening Date","Maturity Date","Payment Date","RD Amt","Maturity Amt"].map(h => (
                            <th key={h} className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${["RD Amt","Maturity Amt"].includes(h) ? "text-right" : ["S.No","RD No","Opening Date","Maturity Date","Payment Date","AccNo"].includes(h) ? "text-center" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((r, i) => (
                          <tr key={`${r.accountId}-${r.rdNumber}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500">{i + 1}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.accountName}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center font-mono text-slate-600">{r.accountNumber}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600">{r.rdNumber}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600 whitespace-nowrap">{fmtShort(r.openingDate)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600 whitespace-nowrap">{fmtShort(r.maturityDate)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500 whitespace-nowrap">{fmtNullable(r.paymentDate)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-teal-700 font-medium">{fmt(r.rdAmount)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-blue-700 font-medium">{fmt(r.maturityAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={7} className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total Amount</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-teal-700">{fmt(report.totalRDAmount)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-blue-700">{fmt(report.totalMaturityAmount)}</td>
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

export default RDMaturityPage;
