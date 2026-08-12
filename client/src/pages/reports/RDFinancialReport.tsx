import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BarChart2, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import rdFinancialReportApi, {
  RDFinancialReport,
  RDFinRow,
} from "../../services/reports/rdFinancialReportApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";
import { getSessionFromDate } from "../../utils/sessionUtils";

// -- Helpers ------------------------------------------------------------------

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDt = (iso: string) => {
  const [y, m, d] = isoDate(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtShort = (iso: string) =>
  localDt(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
const toInput = (iso: string) => isoDate(iso);

// positive = Cr, negative = Dr (standard banking convention used by this report)
const fmtBal = (n: number): string => {
  if (n === 0) return "";
  return n < 0 ? `${fmt(Math.abs(n))} Dr` : `${fmt(n)} Cr`;
};

// opening = closing - periodCr + periodDr
const openingBal = (r: RDFinRow): number => r.closingBalance - r.periodCr + r.periodDr;

// -- Format type --------------------------------------------------------------

type ReportFormat = "standard" | "with-balance";

// -- Export config ------------------------------------------------------------

const buildExportConfig = (report: RDFinancialReport, format: ReportFormat): ExportConfig => {
  const wb = format === "with-balance";

  const columns = wb
    ? [
        { header: "Sr.No.",          widthRatio: 0.06, align: "right" as const },
        { header: "Account Name",    widthRatio: 0.34, align: "left"  as const },
        { header: "Opening Balance", widthRatio: 0.15, align: "right" as const },
        { header: "Debit",           widthRatio: 0.15, align: "right" as const },
        { header: "Credit",          widthRatio: 0.15, align: "right" as const },
        { header: "Closing Balance", widthRatio: 0.15, align: "right" as const },
      ]
    : [
        { header: "Sr.No.",       widthRatio: 0.08, align: "right" as const },
        { header: "Account Name", widthRatio: 0.54, align: "left"  as const },
        { header: "Debit",        widthRatio: 0.19, align: "right" as const },
        { header: "Credit",       widthRatio: 0.19, align: "right" as const },
      ];

  const rows: ExportRow[] = [];
  const infoExt = wb ? ["", "", "", ""] : ["", ""];
  rows.push({
    style: "info",
    cells: [`Branch: ${report.branchName}`, `Period: ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`, ...infoExt],
  });

  const cashHead = report.rows.find(r => r.accOrHead === "");
  const mainRows = report.rows.filter(r => r.accOrHead !== "");
  let srNo = 1;

  if (cashHead) {
    rows.push({
      style: "normal",
      cells: wb
        ? [String(srNo++), "Opening Cash", "", cashHead.periodDr > 0 ? fmt(cashHead.periodDr) : "", cashHead.periodCr > 0 ? fmt(cashHead.periodCr) : "", ""]
        : [String(srNo++), "Opening Cash", cashHead.periodDr > 0 ? fmt(cashHead.periodDr) : "", cashHead.periodCr > 0 ? fmt(cashHead.periodCr) : ""],
    });
  }

  for (const r of mainRows) {
    rows.push({
      style: "normal",
      cells: wb
        ? [String(srNo++), r.name, fmtBal(openingBal(r)), r.periodDr > 0 ? fmt(r.periodDr) : "", r.periodCr > 0 ? fmt(r.periodCr) : "", fmtBal(r.closingBalance)]
        : [String(srNo++), r.name, r.periodDr > 0 ? fmt(r.periodDr) : "", r.periodCr > 0 ? fmt(r.periodCr) : ""],
    });
  }

  rows.push({
    style: "total",
    cells: wb
      ? ["", "Grand Total", "", fmt(report.totalPeriodDr), fmt(report.totalPeriodCr), ""]
      : ["", "Grand Total", fmt(report.totalPeriodDr), fmt(report.totalPeriodCr)],
  });

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `RD Financial Report | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `RDFinancialReport_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: wb,
    },
    columns,
    rows,
  };
};

// -- Print HTML ---------------------------------------------------------------

const buildPrintHTML = (report: RDFinancialReport, format: ReportFormat): string => {
  const wb = format === "with-balance";
  const cashHead = report.rows.find(r => r.accOrHead === "");
  const mainRows = report.rows.filter(r => r.accOrHead !== "");
  let srNo = 1;
  let tbody = "";

  if (cashHead) {
    tbody += `<tr>
      <td class="sr">${srNo++}</td>
      <td>Opening Cash</td>
      ${wb ? "<td class=\"amt\"></td>" : ""}
      <td class="amt">${cashHead.periodDr > 0 ? fmt(cashHead.periodDr) : ""}</td>
      <td class="amt">${cashHead.periodCr > 0 ? fmt(cashHead.periodCr) : ""}</td>
      ${wb ? "<td class=\"amt\"></td>" : ""}
    </tr>`;
  }

  mainRows.forEach((r, i) => {
    tbody += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
      <td class="sr">${srNo++}</td>
      <td>${r.name}</td>
      ${wb ? `<td class="amt">${fmtBal(openingBal(r))}</td>` : ""}
      <td class="amt">${r.periodDr > 0 ? fmt(r.periodDr) : ""}</td>
      <td class="amt">${r.periodCr > 0 ? fmt(r.periodCr) : ""}</td>
      ${wb ? `<td class="amt">${fmtBal(r.closingBalance)}</td>` : ""}
    </tr>`;
  });

  tbody += `<tr class="total-row">
    <td class="sr"></td>
    <td style="text-align:right">Grand Total</td>
    ${wb ? "<td class=\"amt\"></td>" : ""}
    <td class="amt">${fmt(report.totalPeriodDr)}</td>
    <td class="amt">${fmt(report.totalPeriodCr)}</td>
    ${wb ? "<td class=\"amt\"></td>" : ""}
  </tr>`;

  const thExtra = wb
    ? `<th style="width:110px">Opening Balance</th><th style="width:100px">Debit</th><th style="width:100px">Credit</th><th style="width:110px">Closing Balance</th>`
    : `<th style="width:120px">Debit</th><th style="width:120px">Credit</th>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RD Financial Report</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:10.5px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:13px;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
table{width:100%;border-collapse:collapse;}
th{background:#c0c0c0;border:1px solid #999;padding:4px 6px;font-size:10px;text-align:center;}
td{border:1px solid #ccc;padding:2px 5px;font-size:10px;}
.sr{width:40px;text-align:right;}
.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
.total-row td{background:#c0c0c0;font-weight:700;}
@media print{body{padding:6px;}@page{margin:10mm;size:A4 ${wb ? "landscape" : "portrait"};}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  <h2>RD Financial Report &nbsp;&nbsp; ${fmtShort(report.fromDate)} - ${fmtShort(report.toDate)}</h2>
</div>
<table>
  <thead>
    <tr>
      <th style="width:40px">Sr.No.</th>
      <th style="text-align:left">Account Name</th>
      ${thExtra}
    </tr>
  </thead>
  <tbody>${tbody}</tbody>
</table>
</body></html>`;
};

// -- Page Component -----------------------------------------------------------

const RDFinancialReportPage: React.FC = () => {
  const user      = useSelector((state: RootState) => state.user);
  const navigate  = useNavigate();
  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : new Date().toISOString().split("T")[0];

  const [fromDate,      setFromDate]      = useState(getSessionFromDate(user.sessionInfo, workingDate));
  const [toDate,        setToDate]        = useState(workingDate);
  const [showAllClBal,  setShowAllClBal]  = useState(false);
  const [reportFormat,  setReportFormat]  = useState<ReportFormat>("standard");
  const [loading,       setLoading]       = useState(false);
  const [report,        setReport]        = useState<RDFinancialReport | null>(null);
  const [dateError,     setDateError]     = useState("");

  const validate = (): boolean => {
    if (!fromDate) { setDateError("From Date is required."); return false; }
    if (!toDate)   { setDateError("To Date is required.");   return false; }
    if (fromDate > toDate) { setDateError("From Date cannot be greater than To Date."); return false; }
    setDateError("");
    return true;
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setReport(null);
    if (val > toDate) setDateError("From Date cannot be greater than To Date.");
    else setDateError("");
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    setReport(null);
    if (fromDate > val) setDateError("From Date cannot be greater than To Date.");
    else setDateError("");
  };

  const handleLoad = async () => {
    if (!validate()) return;
    setLoading(true);
    setReport(null);
    try {
      const res = await rdFinancialReportApi.get(user.branchid, fromDate, toDate, showAllClBal);
      if (!res.data) throw new Error(res.message ?? "No data returned.");
      setReport(res.data);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintHTML(report, reportFormat));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer";

  const cashHead = report ? report.rows.find(r => r.accOrHead === "") : null;
  const mainRows = report ? report.rows.filter(r => r.accOrHead !== "") : [];
  const wb = reportFormat === "with-balance";

  let srNo = 1;

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">RD Financial Report</h2>
                <p className="text-xs text-slate-500">Account head-wise Dr/Cr movements for a period</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              {/* From Date */}
              <div>
                <label className={lbl}>From Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={e => handleFromDateChange(e.target.value)}
                  className={`${inp} ${dateError ? "border-red-400 bg-red-50" : ""}`}
                />
              </div>

              {/* To Date */}
              <div>
                <label className={lbl}>To Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={e => handleToDateChange(e.target.value)}
                  className={`${inp} ${dateError ? "border-red-400 bg-red-50" : ""}`}
                />
              </div>

              {/* Format selector */}
              <div>
                <label className={lbl}>Report Format</label>
                <select
                  value={reportFormat}
                  onChange={e => setReportFormat(e.target.value as ReportFormat)}
                  className={`${inp} pr-8`}
                >
                  <option value="standard">Standard Format</option>
                  <option value="with-balance">With Opening &amp; Closing Balance</option>
                </select>
              </div>

              {/* Show All Closing Balances toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer pb-0.5">
                <div
                  onClick={() => { setShowAllClBal(v => !v); setReport(null); }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer ${showAllClBal ? "bg-indigo-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${showAllClBal ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm text-slate-700 select-none">Show non-zero closing balances</span>
              </label>

              {/* Buttons */}
              <button onClick={handleLoad} disabled={loading || !!dateError}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading..." : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => exportToPdf(buildExportConfig(report, reportFormat))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <FileText size={15} /> PDF
                </button>
                <button onClick={() => exportToExcel(buildExportConfig(report, reportFormat))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <FileSpreadsheet size={15} /> Excel
                </button>
              </>}
              <button onClick={() => navigate(-1)} className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer">
                Close
              </button>
            </div>

            {dateError && (
              <p className="px-5 pb-4 text-sm text-red-600 font-medium flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 text-center text-xs leading-4 font-bold">!</span>
                {dateError}
              </p>
            )}
          </div>

          {/* Report Table */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="text-center px-6 py-5 border-b border-slate-200">
                <h1 className="text-base font-bold uppercase tracking-wider text-slate-900 underline">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <p className="text-sm font-semibold text-slate-700 mt-2">
                  RD Financial Report &nbsp;&nbsp; {fmtShort(report.fromDate)} - {fmtShort(report.toDate)}
                </p>
              </div>

              <div className="p-4 overflow-x-auto">
                {report.rows.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No transactions found for this period.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-right w-10">Sr.No.</th>
                        <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-left">Account Name</th>
                        {wb && <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-right w-36">Opening Balance</th>}
                        <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-right w-32">Debit</th>
                        <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-right w-32">Credit</th>
                        {wb && <th className="bg-slate-400 text-white border border-slate-500 px-3 py-2 text-right w-36">Closing Balance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Cash (Cash Head) */}
                      {cashHead && (
                        <tr>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{srNo++}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-800">Opening Cash</td>
                          {wb && <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-500"></td>}
                          <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-800">
                            {cashHead.periodDr > 0 ? fmt(cashHead.periodDr) : ""}
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-800">
                            {cashHead.periodCr > 0 ? fmt(cashHead.periodCr) : ""}
                          </td>
                          {wb && <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-500"></td>}
                        </tr>
                      )}

                      {mainRows.map((r, i) => (
                        <tr key={r.accId ?? `h-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{srNo++}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-800">{r.name}</td>
                          {wb && (
                            <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-700">
                              {fmtBal(openingBal(r))}
                            </td>
                          )}
                          <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-800">
                            {r.periodDr > 0 ? fmt(r.periodDr) : ""}
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-right tabular-nums text-slate-800">
                            {r.periodCr > 0 ? fmt(r.periodCr) : ""}
                          </td>
                          {wb && (
                            <td className="border border-slate-200 px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                              {fmtBal(r.closingBalance)}
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Grand Total */}
                      <tr className="bg-slate-400">
                        <td className="border border-slate-500 px-3 py-2"></td>
                        <td className="border border-slate-500 px-3 py-2 text-right text-white font-bold">Grand Total</td>
                        {wb && <td className="border border-slate-500 px-3 py-2"></td>}
                        <td className="border border-slate-500 px-3 py-2 text-right text-white font-bold tabular-nums">{fmt(report.totalPeriodDr)}</td>
                        <td className="border border-slate-500 px-3 py-2 text-right text-white font-bold tabular-nums">{fmt(report.totalPeriodCr)}</td>
                        {wb && <td className="border border-slate-500 px-3 py-2"></td>}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    } />
  );
};

export default RDFinancialReportPage;
