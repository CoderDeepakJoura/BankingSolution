import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Search, Printer, Save, BarChart2, FileText, FileSpreadsheet } from "lucide-react";
import odReserveApi, { OdReserveReport, OdReserveRow, OdReserveProduct, GeneralAccount } from "../../services/reports/odReserveApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];

// Given working date, compute the 4 quarter-end dates for the financial year (Apr–Mar)
function getSessionQuarters(workingDate: string): { label: string; value: string }[] {
  const d = new Date(workingDate);
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // Apr = month 3
  return [
    { label: `Q1 — 30 Jun ${fy}`,      value: `${fy}-06-30` },
    { label: `Q2 — 30 Sep ${fy}`,      value: `${fy}-09-30` },
    { label: `Q3 — 31 Dec ${fy}`,      value: `${fy}-12-31` },
    { label: `Q4 — 31 Mar ${fy + 1}`,  value: `${fy + 1}-03-31` },
  ];
}

const buildExportConfig = (report: OdReserveReport, printNonZero: boolean): ExportConfig => {
  const filtered = printNonZero ? report.rows.filter(r => r.intBal !== 0) : report.rows;
  const columns = [
    { header: "SNo",         widthRatio: 0.05, align: "center" as const },
    { header: "Account Name",widthRatio: 0.30, align: "left"   as const },
    { header: "Acc No",      widthRatio: 0.10, align: "left"   as const },
    { header: "Debit",       widthRatio: 0.18, align: "right"  as const },
    { header: "Credit",      widthRatio: 0.18, align: "right"  as const },
    { header: "OD Balance",  widthRatio: 0.19, align: "right"  as const },
  ];
  const rows: ExportRow[] = filtered.map(r => ({
    style: "normal",
    cells: [String(r.sNo), r.accountName, r.acNo, fmt(r.debit), fmt(r.credit), fmt(r.intBal)],
  }));
  rows.push({
    style: "total", spanFirst: 3,
    cells: ["Total", "", "", fmt(report.totalDebit), fmt(report.totalCredit), fmt(report.totalOdReserve)],
  });
  return {
    meta: {
      title: report.branchName, subtitle: report.branchAddress,
      reportTitle: `OD Reserve Report | ${report.quarterLabel}`,
      fileName: `OdReserve_${isoDate(report.quarterDate)}`,
      landscape: false,
    },
    columns, rows,
  };
};

const buildPrintHTML = (report: OdReserveReport, printNonZero: boolean): string => {
  const filtered = printNonZero ? report.rows.filter(r => r.intBal !== 0) : report.rows;
  let rows = "";
  filtered.forEach((r, i) => {
    const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
    const balColor = r.intBal > 0 ? "#b91c1c" : "#065f46";
    rows += `<tr style="background:${bg}">
      <td style="text-align:center">${r.sNo}</td>
      <td>${r.accountName}</td>
      <td style="font-family:monospace">${r.acNo}</td>
      <td class="amt">${fmt(r.debit)}</td>
      <td class="amt">${fmt(r.credit)}</td>
      <td class="amt" style="color:${balColor};font-weight:600">${fmt(r.intBal)}</td>
    </tr>`;
  });
  rows += `<tr class="total-row">
    <td colspan="3" style="text-align:right">Total</td>
    <td class="amt">${fmt(report.totalDebit)}</td>
    <td class="amt">${fmt(report.totalCredit)}</td>
    <td class="amt">${fmt(report.totalOdReserve)}</td>
  </tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>OD Reserve Report</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}
th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 4px;font-size:9.5px;}
.total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;}
.amt{text-align:right;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 portrait;}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  <p>${report.branchAddress ?? ""}</p>
  <h2>OD Reserve Report | ${report.quarterLabel}</h2>
</div>
<table><thead><tr>
  <th style="width:40px">SNo</th>
  <th style="text-align:left">Account Name</th>
  <th style="text-align:left">Acc No</th>
  <th style="width:80px">Debit</th>
  <th style="width:80px">Credit</th>
  <th style="width:80px">OD Balance</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`;
};

const OdReservePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate
    ? isoDate(commonservice.splitDate(user.workingdate))
    : isoDate(new Date().toISOString());

  const quarters = getSessionQuarters(workingDate);

  const [products, setProducts] = useState<OdReserveProduct[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<GeneralAccount[]>([]);
  const [productId, setProductId] = useState(0);
  const [quarterDate, setQuarterDate] = useState(quarters[0].value);
  const [debitAccId, setDebitAccId] = useState(0);
  const [saveVoucher, setSaveVoucher] = useState(true);
  const [printNonZero, setPrintNonZero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<OdReserveReport | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    odReserveApi.getProducts(user.branchid).then(res => {
      setProducts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
    odReserveApi.getGeneralAccounts(user.branchid).then(res => {
      setGeneralAccounts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  const handleShow = async () => {
    setLoading(true); setReport(null);
    try {
      const res = await odReserveApi.getReport(user.branchid, productId, quarterDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data.");
      setReport(data);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load report.", "error");
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!report || report.rows.length === 0) {
      Swal.fire("Info", "No data to save.", "info"); return;
    }
    setSaving(true);
    try {
      const res = await odReserveApi.save(user.branchid, productId, quarterDate, report.rows);
      const ok = (res as any).success ?? true;
      if (ok) Swal.fire("Saved", "OD Reserve entries saved successfully.", "success");
      else throw new Error((res as any).message);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildPrintHTML(report, printNonZero));
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const displayedRows = report
    ? (printNonZero ? report.rows.filter(r => r.intBal !== 0) : report.rows)
    : [];

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Filter Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">OD Reserve Report</h2>
                <p className="text-xs text-slate-500">Quarterly overdue reserve calculation for loan accounts</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>Loan Product</label>
                <select value={productId} onChange={e => { setProductId(Number(e.target.value)); setReport(null); }} className={inp}>
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Quarter</label>
                <select value={quarterDate} onChange={e => { setQuarterDate(e.target.value); setReport(null); }} className={inp}>
                  {quarters.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Debit Account</label>
                <select value={debitAccId} onChange={e => setDebitAccId(Number(e.target.value))} className={inp}>
                  <option value={0}>-- Select --</option>
                  {generalAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={saveVoucher} onChange={e => setSaveVoucher(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600 cursor-pointer" />
                  <span className="text-sm font-medium text-slate-600">Save Voucher</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={printNonZero} onChange={e => setPrintNonZero(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600 cursor-pointer" />
                  <span className="text-sm font-medium text-slate-600">Print NonZero</span>
                </label>
              </div>

              <button onClick={handleShow} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
              </button>

              {report && <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save size={15} />}
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => exportToPdf(buildExportConfig(report, printNonZero))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <FileText size={15} /> PDF
                </button>
                <button onClick={() => exportToExcel(buildExportConfig(report, printNonZero))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                  <FileSpreadsheet size={15} /> Excel
                </button>
              </>}
            </div>
          </div>

          {/* Report Table */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet-700 px-3 py-1 bg-violet-50 border border-violet-100 rounded-full">
                    OD Reserve Report
                  </span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{report.quarterLabel}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-violet-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Debit</p>
                  <p className="text-base font-bold text-violet-700 mt-0.5">₹{fmt(report.totalDebit)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-emerald-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Credit</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">₹{fmt(report.totalCredit)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-red-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">OD Reserve</p>
                  <p className="text-base font-bold text-red-700 mt-0.5">₹{fmt(report.totalOdReserve)}</p>
                </div>
              </div>

              {/* Table */}
              <div className="p-4 overflow-x-auto">
                {displayedRows.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No OD reserve entries found for the selected criteria.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {["SNo", "Account Name", "Acc No", "Debit", "Credit", "OD Balance"].map(h => (
                            <th key={h} className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${["Debit","Credit","OD Balance"].includes(h) ? "text-right" : h === "SNo" ? "text-center" : "text-left"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.map((r: OdReserveRow, i: number) => (
                          <tr key={r.accId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500">{r.sNo}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{r.accountName}</td>
                            <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">{r.acNo}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-violet-700 font-medium">{fmt(r.debit)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-emerald-700 font-medium">{fmt(r.credit)}</td>
                            <td className={`border-b border-slate-100 px-3 py-2 text-right font-semibold ${r.intBal > 0 ? "text-red-700" : "text-emerald-700"}`}>{fmt(r.intBal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-violet-700">{fmt(report.totalDebit)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-emerald-700">{fmt(report.totalCredit)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-red-700">{fmt(report.totalOdReserve)}</td>
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

export default OdReservePage;
