import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Gift, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import salaryApi, { BonusReportResponse, BonusReportRow } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";
import { getSessionFromDate } from "../../utils/sessionUtils";

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

// ── Print HTML ────────────────────────────────────────────────────────────────

const buildPrintHTML = (report: BonusReportResponse): string => {
  let tbody = "";
  report.rows.forEach((r, i) => {
    tbody += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
      <td class="sr">${r.srNo}</td>
      <td>${r.empName}</td>
      <td>${r.designation}</td>
      <td class="amt">${fmt(r.basicSalary)}</td>
      <td class="amt">${r.leaveCount > 0 ? fmt(r.leaveCount) : ""}</td>
      <td class="amt">${fmt(r.bonusDays)}</td>
      <td class="amt">${fmt(r.bonus)}</td>
    </tr>`;
  });
  tbody += `<tr class="total-row">
    <td class="sr"></td>
    <td colspan="5" style="text-align:right">Total Bonus</td>
    <td class="amt">${fmt(report.totalBonus)}</td>
  </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Bonus Report</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:10.5px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:13px;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
.rh h3{font-size:10px;color:#555;margin-top:2px;}
table{width:100%;border-collapse:collapse;}
th{background:#c0c0c0;border:1px solid #999;padding:4px 6px;font-size:10px;text-align:center;}
td{border:1px solid #ccc;padding:2px 5px;font-size:10px;}
.sr{width:36px;text-align:right;}
.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
.total-row td{background:#c0c0c0;font-weight:700;}
@media print{body{padding:6px;}@page{margin:10mm;size:A4 landscape;}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  <h2>Bonus Report &nbsp;&nbsp; ${fmtDate(report.fromDate)} - ${fmtDate(report.toDate)}</h2>
  <h3>Bonus Days: ${report.days}</h3>
</div>
<table>
  <thead>
    <tr>
      <th style="width:36px">Sr.No.</th>
      <th style="text-align:left">Employee Name</th>
      <th style="text-align:left;width:140px">Designation</th>
      <th style="width:90px">Basic Salary</th>
      <th style="width:80px">LWP Days</th>
      <th style="width:80px">Bonus Days</th>
      <th style="width:90px">Bonus Amount</th>
    </tr>
  </thead>
  <tbody>${tbody}</tbody>
</table>
</body></html>`;
};

// ── Export Config ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: BonusReportResponse): ExportConfig => {
  const columns = [
    { header: "Sr.No.",        widthRatio: 0.05, align: "right" as const },
    { header: "Employee Name", widthRatio: 0.25, align: "left"  as const },
    { header: "Designation",   widthRatio: 0.18, align: "left"  as const },
    { header: "Basic Salary",  widthRatio: 0.13, align: "right" as const },
    { header: "LWP Days",      widthRatio: 0.10, align: "right" as const },
    { header: "Bonus Days",    widthRatio: 0.12, align: "right" as const },
    { header: "Bonus Amount",  widthRatio: 0.17, align: "right" as const },
  ];

  const rows: ExportRow[] = [];

  report.rows.forEach((r: BonusReportRow) => {
    rows.push({
      style: "normal",
      cells: [
        String(r.srNo),
        r.empName,
        r.designation,
        fmt(r.basicSalary),
        r.leaveCount > 0 ? fmt(r.leaveCount) : "",
        fmt(r.bonusDays),
        fmt(r.bonus),
      ],
    });
  });

  rows.push({
    style: "total",
    cells: ["", "", "", "", "", "Total Bonus", fmt(report.totalBonus)],
  });

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `Bonus Report  ${fmtDate(report.fromDate)} – ${fmtDate(report.toDate)}  |  Days: ${report.days}`,
      fileName: `BonusReport_${report.fromDate}_${report.toDate}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

// ── Page Component ────────────────────────────────────────────────────────────

const BonusReport: React.FC = () => {
  const user         = useSelector((state: RootState) => state.user);
  const navigate     = useNavigate();
  const workingDate  = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : new Date().toISOString().split("T")[0];

  const [fromDate,  setFromDate]  = useState(getSessionFromDate(user.sessionInfo, workingDate));
  const [toDate,    setToDate]    = useState(workingDate);
  const [days,      setDays]      = useState(30);
  const [loading,   setLoading]   = useState(false);
  const [report,    setReport]    = useState<BonusReportResponse | null>(null);
  const [dateError, setDateError] = useState("");

  const validate = (): boolean => {
    if (!fromDate) { setDateError("From Date is required."); return false; }
    if (!toDate)   { setDateError("To Date is required.");   return false; }
    if (fromDate > workingDate) { setDateError("From Date cannot be greater than working date."); return false; }
    if (toDate > workingDate)   { setDateError("To Date cannot be greater than working date.");   return false; }
    if (fromDate > toDate)      { setDateError("From Date cannot be greater than To Date.");      return false; }
    setDateError("");
    return true;
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setReport(null);
    if (val > workingDate) setDateError("From Date cannot be greater than working date.");
    else if (val > toDate) setDateError("From Date cannot be greater than To Date.");
    else setDateError("");
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    setReport(null);
    if (val > workingDate) setDateError("To Date cannot be greater than working date.");
    else if (fromDate > val) setDateError("From Date cannot be greater than To Date.");
    else setDateError("");
  };

  const handleLoad = async () => {
    if (!validate()) return;
    setLoading(true);
    setReport(null);
    try {
      const res = await salaryApi.getBonusReport({
        branchId: user.branchid,
        fromDate,
        toDate,
        days,
      });
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
    win.document.write(buildPrintHTML(report));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Bonus Report</h2>
                <p className="text-xs text-slate-500">Employee-wise bonus calculation for a period</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              {/* From Date */}
              <div>
                <label className={lbl}>From Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={fromDate}
                  max={workingDate}
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
                  max={workingDate}
                  onChange={e => handleToDateChange(e.target.value)}
                  className={`${inp} ${dateError ? "border-red-400 bg-red-50" : ""}`}
                />
              </div>

              {/* Bonus Days */}
              <div>
                <label className={lbl}>Bonus Days <span className="text-red-500">*</span></label>
                <input
                  type="text" inputMode="numeric" maxLength={3}
                  value={days}
                  onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !["ArrowLeft","ArrowRight","Delete","Backspace","Tab"].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                  onChange={e => { const n = Math.max(1, Math.min(365, Number(e.target.value) || 1)); setDays(n); setReport(null); }}
                  className={`${inp} w-24`}
                />
              </div>

              {/* Buttons */}
              <button onClick={handleLoad} disabled={loading || !!dateError}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading..." : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => exportToPdf(buildExportConfig(report))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <FileText size={15} /> PDF
                </button>
                <button onClick={() => exportToExcel(buildExportConfig(report))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <FileSpreadsheet size={15} /> Excel
                </button>
              </>}
              <button onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer">
                Close
              </button>
            </div>

            {dateError && (
              <p className="px-5 pb-4 text-sm text-red-600 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-red-100 inline-flex items-center justify-center text-xs">!</span>
                {dateError}
              </p>
            )}
          </div>

          {/* Results */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{report.branchName}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-sm text-slate-500">{fmtDate(report.fromDate)} – {fmtDate(report.toDate)}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-sm text-slate-500">Days: {report.days}</span>
                </div>
                <span className="text-xs text-slate-400">{report.rows.length} employee{report.rows.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                      <th className="border border-slate-200 px-3 py-2 text-right w-10">Sr.</th>
                      <th className="border border-slate-200 px-3 py-2 text-left">Employee Name</th>
                      <th className="border border-slate-200 px-3 py-2 text-left">Designation</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Basic Salary</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">LWP Days</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Bonus Days</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">Bonus Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={r.empId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">{r.srNo}</td>
                        <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{r.empName}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-slate-600">{r.designation}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700">{fmt(r.basicSalary)}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-500">
                          {r.leaveCount > 0 ? fmt(r.leaveCount) : ""}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-slate-700">{fmt(r.bonusDays)}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{fmt(r.bonus)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-200 font-bold">
                      <td className="border border-slate-300 px-3 py-2"></td>
                      <td colSpan={5} className="border border-slate-300 px-3 py-2 text-right text-slate-700">Total Bonus</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-slate-900">{fmt(report.totalBonus)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    } />
  );
};

export default BonusReport;
