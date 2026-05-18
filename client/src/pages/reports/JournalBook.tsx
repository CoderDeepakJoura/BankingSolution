import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookText, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import journalBookApi, { JournalBook } from "../../services/reports/journalBookApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDate(iso);

const buildExportConfig = (report: JournalBook): ExportConfig => {
  const columns = [
    { header: "Date",       widthRatio: 0.09, align: "center" as const },
    { header: "V.No",       widthRatio: 0.06, align: "center" as const },
    { header: "Account No", widthRatio: 0.10, align: "left"   as const },
    { header: "Account",    widthRatio: 0.28, align: "left"   as const },
    { header: "Narration",  widthRatio: 0.25, align: "left"   as const },
    { header: "Dr",         widthRatio: 0.11, align: "right"  as const },
    { header: "Cr",         widthRatio: 0.11, align: "right"  as const },
  ];
  const rows: ExportRow[] = report.entries.map((e, i) => ({
    style: "normal",
    cells: [fmtShort(e.voucherDate), String(e.voucherNo), e.accountNumber, e.accountName, e.narration ?? "", e.dr > 0 ? fmt(e.dr) : "", e.cr > 0 ? fmt(e.cr) : ""],
  }));
  rows.push({ style: "total", spanFirst: 5, cells: ["Total", "", "", "", "", fmt(report.totalDr), fmt(report.totalCr)] });
  return {
    meta: { title: report.branchName, subtitle: report.branchAddress, reportTitle: `Journal Book | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`, fileName: `JournalBook_${toInput(report.fromDate)}_${toInput(report.toDate)}`, landscape: true },
    columns, rows,
  };
};

const buildPrintHTML = (report: JournalBook): string => {
  let rows = "";
  report.entries.forEach((e, i) => {
    rows += `<tr class="${i%2===0?"":"even"}"><td style="text-align:center;white-space:nowrap">${fmtShort(e.voucherDate)}</td><td style="text-align:center">${e.voucherNo}</td><td style="font-family:monospace">${e.accountNumber}</td><td>${e.accountName}</td><td>${e.narration ?? ""}</td><td class="amt dr">${e.dr > 0 ? fmt(e.dr) : ""}</td><td class="amt cr">${e.cr > 0 ? fmt(e.cr) : ""}</td></tr>`;
  });
  rows += `<tr class="total-row"><td colspan="5" style="text-align:right">Total</td><td class="amt dr">${fmt(report.totalDr)}</td><td class="amt cr">${fmt(report.totalCr)}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Journal Book</title><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10.5px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}.rh p{font-size:10px;color:#64748b;}.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9.5px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 4px;font-size:10px;}tr.even td{background:#f8fafc;}.total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;}
.amt{text-align:right;}.dr{color:#b91c1c;}.cr{color:#065f46;}
@media print{body{padding:6px;}@page{margin:8mm;size:A4 landscape;}}
</style></head><body>
<div class="rh"><h1>${report.branchName}</h1><p>${report.branchAddress ?? ""}</p><h2>Journal Book | ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}</h2></div>
<table><thead><tr><th style="width:72px">Date</th><th style="width:40px">V.No</th><th style="width:80px;text-align:left">Acc No</th><th style="text-align:left">Account</th><th style="text-align:left">Narration</th><th style="width:90px">Dr</th><th style="width:90px">Cr</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
};

const JournalBookPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());
  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate]     = useState(workingDate);
  const [sessionMin, setSessionMin] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport]   = useState<JournalBook | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    journalBookApi.getSessionDates(user.branchid).then(res => {
      if ((res as any).success && (res as any).data) {
        setSessionMin(toInput((res as any).data.fromDate));
        setFromDate(toInput((res as any).data.fromDate));
        setToDate(workingDate);
      }
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From > To.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await journalBookApi.getJournalBook(user.branchid, fromDate, toDate);
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
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center"><BookText className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-base font-bold text-slate-800">Journal Book</h2><p className="text-xs text-slate-500">All voucher entries for the selected date range</p></div>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-4">
              <div><label className={lbl}>From Date</label><input type="date" value={fromDate} min={sessionMin || undefined} max={workingDate} onChange={e => { setFromDate(e.target.value); setReport(null); }} className={inp} /></div>
              <div><label className={lbl}>To Date</label><input type="date" value={toDate} min={sessionMin || undefined} max={workingDate} onChange={e => { setToDate(e.target.value); setReport(null); }} className={inp} /></div>
              <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
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
                  <span className="text-xs font-semibold uppercase tracking-widest text-blue-700 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">Journal Book</span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fmtLong(report.fromDate)} to {fmtLong(report.toDate)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-red-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Dr</p>
                  <p className="text-base font-bold text-red-700 mt-0.5">₹{fmt(report.totalDr)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 border-t-emerald-500 text-center">
                  <p className="text-xs text-slate-500 uppercase font-medium">Total Cr</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">₹{fmt(report.totalCr)}</p>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                {report.entries.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No entries found for the selected date range.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[60vh]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {["Date","V.No","Account No","Account Name","Narration","Dr","Cr"].map(h => (
                            <th key={h} className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${["Dr","Cr"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.entries.map((e, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                            <td className="border-b border-slate-100 px-3 py-2 whitespace-nowrap text-slate-600">{fmtShort(e.voucherDate)}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600">{e.voucherNo}</td>
                            <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-600">{e.accountNumber}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{e.accountName}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{e.narration ?? ""}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-red-700 font-medium">{e.dr > 0 ? fmt(e.dr) : ""}</td>
                            <td className="border-b border-slate-100 px-3 py-2 text-right text-emerald-700 font-medium">{e.cr > 0 ? fmt(e.cr) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-slate-700">Total</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-red-700">{fmt(report.totalDr)}</td>
                          <td className="bg-slate-100 border-t-2 border-slate-400 px-3 py-2.5 text-right text-xs font-bold text-emerald-700">{fmt(report.totalCr)}</td>
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

export default JournalBookPage;
