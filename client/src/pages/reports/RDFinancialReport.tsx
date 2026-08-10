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

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDt = (iso: string) => {
  const [y, m, d] = isoDate(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtShort = (iso: string) =>
  localDt(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtLong = (iso: string) =>
  localDt(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput = (iso: string) => isoDate(iso);

const TYPE_ORDER: Record<string, number> = {
  Assets: 1, Liabilities: 2, Income: 3, Expenditure: 4,
};

const closingLabel = (bal: number): string => {
  if (bal === 0) return "—";
  return `${fmt(Math.abs(bal))} ${bal > 0 ? "Cr" : "Dr"}`;
};

// ── Group the rows by TypeName then by HeadName ───────────────────────────────

interface GroupedSection {
  typeName: string;
  heads: {
    headId: number;
    headName: string;
    rows: RDFinRow[];
    subDr: number;
    subCr: number;
    subClBal: number;
  }[];
  totalDr: number;
  totalCr: number;
  totalClBal: number;
}

const groupRows = (rows: RDFinRow[]): GroupedSection[] => {
  const typeMap = new Map<string, Map<string, RDFinRow[]>>();
  for (const r of rows) {
    if (r.accOrHead === "") continue; // Cash Head special row — rendered separately
    if (!typeMap.has(r.typeName)) typeMap.set(r.typeName, new Map());
    const headMap = typeMap.get(r.typeName)!;
    if (!headMap.has(r.headName)) headMap.set(r.headName, []);
    headMap.get(r.headName)!.push(r);
  }

  const sections: GroupedSection[] = [];
  for (const [typeName, headMap] of typeMap) {
    const heads: GroupedSection["heads"] = [];
    for (const [headName, hRows] of headMap) {
      const subDr    = hRows.reduce((s, r) => s + r.periodDr, 0);
      const subCr    = hRows.reduce((s, r) => s + r.periodCr, 0);
      const subClBal = hRows.reduce((s, r) => s + r.closingBalance, 0);
      heads.push({ headId: hRows[0].headId, headName, rows: hRows, subDr, subCr, subClBal });
    }
    const totalDr    = heads.reduce((s, h) => s + h.subDr, 0);
    const totalCr    = heads.reduce((s, h) => s + h.subCr, 0);
    const totalClBal = heads.reduce((s, h) => s + h.subClBal, 0);
    sections.push({ typeName, heads, totalDr, totalCr, totalClBal });
  }
  return sections.sort((a, b) => (TYPE_ORDER[a.typeName] ?? 9) - (TYPE_ORDER[b.typeName] ?? 9));
};

// ── Export config ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: RDFinancialReport): ExportConfig => {
  const columns = [
    { header: "Name",            widthRatio: 0.50, align: "left"   as const },
    { header: "Dr",              widthRatio: 0.15, align: "right"  as const },
    { header: "Cr",              widthRatio: 0.15, align: "right"  as const },
    { header: "Closing Balance", widthRatio: 0.20, align: "right"  as const },
  ];

  const rows: ExportRow[] = [];
  const sections = groupRows(report.rows);

  rows.push({
    style: "info",
    cells: [`Branch: ${report.branchName}`, `Period: ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`],
  });

  for (const sec of sections) {
    rows.push({ style: "group", spanFirst: 4, cells: [sec.typeName, "", "", ""] });
    for (const head of sec.heads) {
      if (head.rows.some(r => r.accOrHead === "A")) {
        // Non-annexure: show head subheader then accounts
        rows.push({ style: "date", spanFirst: 4, cells: [head.headName, "", "", ""] });
        for (const r of head.rows) {
          rows.push({
            style: "normal",
            cells: [r.name, r.periodDr > 0 ? fmt(r.periodDr) : "", r.periodCr > 0 ? fmt(r.periodCr) : "", closingLabel(r.closingBalance)],
          });
        }
        rows.push({
          style: "subtotal",
          cells: [`Total — ${head.headName}`, head.subDr > 0 ? fmt(head.subDr) : "", head.subCr > 0 ? fmt(head.subCr) : "", closingLabel(head.subClBal)],
        });
      } else {
        // Annexure: single head-level row
        rows.push({
          style: "normal",
          cells: [head.headName, head.subDr > 0 ? fmt(head.subDr) : "", head.subCr > 0 ? fmt(head.subCr) : "", closingLabel(head.subClBal)],
        });
      }
    }
    rows.push({
      style: "subtotal",
      cells: [`Sub-Total — ${sec.typeName}`, sec.totalDr > 0 ? fmt(sec.totalDr) : "", sec.totalCr > 0 ? fmt(sec.totalCr) : "", closingLabel(sec.totalClBal)],
    });
  }

  rows.push({
    style: "total",
    cells: [
      "Grand Total",
      fmt(report.totalPeriodDr),
      fmt(report.totalPeriodCr),
      (() => {
        const net = report.totalClosingCr - report.totalClosingDr;
        return net === 0 ? "—" : `${fmt(Math.abs(net))} ${net > 0 ? "Cr" : "Dr"}`;
      })(),
    ],
  });

  // Cash Head special row — Dr col = Closing Balance at ToDate, Cr col = Opening Balance at FromDate
  for (const r of report.rows.filter(x => x.accOrHead === "")) {
    rows.push({
      style: "info",
      cells: [
        `${r.name}  (Dr = Closing Balance | Cr = Opening Balance)`,
        closingLabel(r.periodDr),
        closingLabel(r.periodCr),
        "—",
      ],
    });
  }

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `RD Financial Report | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `RDFinancialReport_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: false,
    },
    columns,
    rows,
  };
};

// ── Print HTML ────────────────────────────────────────────────────────────────

const buildPrintHTML = (report: RDFinancialReport): string => {
  const sections = groupRows(report.rows);
  let tbody = "";

  for (const sec of sections) {
    tbody += `<tr class="group-row"><td colspan="4">${sec.typeName}</td></tr>`;
    for (const head of sec.heads) {
      if (head.rows.some(r => r.accOrHead === "A")) {
        tbody += `<tr class="head-row"><td colspan="4">${head.headName}</td></tr>`;
        head.rows.forEach((r, i) => {
          tbody += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
            <td class="name-col">${r.name}</td>
            <td class="amt">${r.periodDr > 0 ? fmt(r.periodDr) : ""}</td>
            <td class="amt">${r.periodCr > 0 ? fmt(r.periodCr) : ""}</td>
            <td class="amt bal ${r.closingBalance > 0 ? "cr" : r.closingBalance < 0 ? "dr" : ""}">${closingLabel(r.closingBalance)}</td>
          </tr>`;
        });
        tbody += `<tr class="sub-row">
          <td style="text-align:right">Total — ${head.headName}</td>
          <td class="amt">${head.subDr > 0 ? fmt(head.subDr) : ""}</td>
          <td class="amt">${head.subCr > 0 ? fmt(head.subCr) : ""}</td>
          <td class="amt bal ${head.subClBal > 0 ? "cr" : head.subClBal < 0 ? "dr" : ""}">${closingLabel(head.subClBal)}</td>
        </tr>`;
      } else {
        tbody += `<tr>
          <td class="name-col"><strong>${head.headName}</strong></td>
          <td class="amt">${head.subDr > 0 ? fmt(head.subDr) : ""}</td>
          <td class="amt">${head.subCr > 0 ? fmt(head.subCr) : ""}</td>
          <td class="amt bal ${head.subClBal > 0 ? "cr" : head.subClBal < 0 ? "dr" : ""}">${closingLabel(head.subClBal)}</td>
        </tr>`;
      }
    }
    tbody += `<tr class="sub-row">
      <td style="text-align:right">Sub-Total — ${sec.typeName}</td>
      <td class="amt">${sec.totalDr > 0 ? fmt(sec.totalDr) : ""}</td>
      <td class="amt">${sec.totalCr > 0 ? fmt(sec.totalCr) : ""}</td>
      <td class="amt bal ${sec.totalClBal > 0 ? "cr" : sec.totalClBal < 0 ? "dr" : ""}">${closingLabel(sec.totalClBal)}</td>
    </tr>`;
  }

  const netCl = report.totalClosingCr - report.totalClosingDr;
  tbody += `<tr class="total-row">
    <td style="text-align:right">Grand Total</td>
    <td class="amt">${fmt(report.totalPeriodDr)}</td>
    <td class="amt">${fmt(report.totalPeriodCr)}</td>
    <td class="amt">${netCl === 0 ? "—" : `${fmt(Math.abs(netCl))} ${netCl > 0 ? "Cr" : "Dr"}`}</td>
  </tr>`;

  // Cash Head special row (Dr = Closing Balance at ToDate, Cr = Opening Balance at FromDate)
  for (const r of report.rows.filter(x => x.accOrHead === "")) {
    tbody += `<tr class="cash-head-row">
      <td class="name-col">${r.name}<br/><span style="font-size:8px;font-style:italic;color:#93c5fd">Dr = Closing Balance &nbsp;|&nbsp; Cr = Opening Balance</span></td>
      <td class="amt">${closingLabel(r.periodDr)}</td>
      <td class="amt">${closingLabel(r.periodCr)}</td>
      <td class="amt">—</td>
    </tr>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RD Financial Report</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:10.5px;padding:12px;}
.rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
.rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;}
.rh p{font-size:10px;color:#64748b;}
.rh h2{font-size:11px;font-weight:600;margin-top:4px;}
.acc-info{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:9px;color:#64748b;margin-top:4px;}
.acc-info span{display:flex;gap:5px;align-items:center;}
table{width:100%;border-collapse:collapse;}
th{background:#475569;color:#fff;border:1px solid #64748b;padding:3px 6px;font-size:9.5px;text-transform:uppercase;}
td{border:1px solid #e2e8f0;padding:2px 5px;font-size:10px;}
.name-col{min-width:220px;}
.group-row td{background:#dbeafe;color:#1e40af;font-weight:700;padding:4px 5px;}
.head-row td{background:#fef3c7;color:#92400e;font-weight:600;padding:3px 5px;font-style:italic;}
.sub-row td{background:#f1f5f9;font-weight:600;border-top:1px solid #94a3b8;}
.total-row td{background:#475569;color:#fff;font-weight:700;}
.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
.bal.cr{color:#166534;}
.bal.dr{color:#b91c1c;}
.cash-head-row td{background:#e0e7ff;color:#312e81;font-weight:600;}
@media print{body{padding:6px;}@page{margin:10mm;size:A4 portrait;}}
</style></head><body>
<div class="rh">
  <h1>${report.branchName}</h1>
  ${report.branchAddress ? `<p>${report.branchAddress}</p>` : ""}
  <h2>RD Financial Report</h2>
  <div class="acc-info">
    <span><b>Period:</b> ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}</span>
    ${report.showAllClBal ? "<span><b>Mode:</b> All Closing Balances</span>" : ""}
  </div>
</div>
<table>
  <thead>
    <tr>
      <th style="text-align:left">Name</th>
      <th style="width:110px">Dr</th>
      <th style="width:110px">Cr</th>
      <th style="width:130px">Closing Balance</th>
    </tr>
  </thead>
  <tbody>${tbody}</tbody>
</table>
</body></html>`;
};

// ── Page Component ────────────────────────────────────────────────────────────

const RDFinancialReportPage: React.FC = () => {
  const user      = useSelector((state: RootState) => state.user);
  const navigate  = useNavigate();
  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [fromDate,     setFromDate]     = useState(workingDate);
  const [toDate,       setToDate]       = useState(workingDate);
  const [showAllClBal, setShowAllClBal] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [report,       setReport]       = useState<RDFinancialReport | null>(null);
  const [dateError,    setDateError]    = useState("");

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
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
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

  const sections     = report ? groupRows(report.rows) : [];
  const cashHeadRows = report ? report.rows.filter(r => r.accOrHead === "") : [];
  const netCl = report ? report.totalClosingCr - report.totalClosingDr : 0;

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* ── Filter Card ── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">RD Financial Report</h2>
                <p className="text-xs text-slate-500">Account head-wise Dr/Cr movements and closing balance for a period</p>
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
                {loading ? "Loading…" : "Show"}
              </button>
              {report && <>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => exportToPdf(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
                  <FileText size={15} /> PDF
                </button>
                <button onClick={() => exportToExcel(buildExportConfig(report))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer">
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

          {/* ── Summary Cards ── */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Period Dr",     value: fmt(report.totalPeriodDr),  color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"   },
                { label: "Period Cr",     value: fmt(report.totalPeriodCr),  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
                { label: "Closing Cr",   value: fmt(report.totalClosingCr), color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
                { label: "Closing Dr",   value: fmt(report.totalClosingDr), color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"   },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className={`${bg} ${border} border rounded-xl p-4`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                  <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Report Table ── */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Report header */}
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <div className="flex items-center gap-3 justify-center mt-3">
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-indigo-700 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">RD Financial Report</span>
                  <div className="h-px bg-slate-200 flex-1 max-w-16" />
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Period: {fmtLong(report.fromDate)} to {fmtLong(report.toDate)}
                  {report.showAllClBal && <span className="ml-2 text-xs text-indigo-600 font-medium">(Incl. non-zero closing balances)</span>}
                </p>
              </div>

              <div className="p-4 overflow-x-auto">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="bg-slate-600 text-white px-3 py-3 text-left font-semibold uppercase tracking-wider border-r border-slate-500">Name</th>
                        <th className="bg-slate-600 text-white px-3 py-3 text-right font-semibold uppercase tracking-wider border-r border-slate-500 w-32">Dr</th>
                        <th className="bg-slate-600 text-white px-3 py-3 text-right font-semibold uppercase tracking-wider border-r border-slate-500 w-32">Cr</th>
                        <th className="bg-slate-600 text-white px-3 py-3 text-right font-semibold uppercase tracking-wider w-36">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(sec => (
                        <React.Fragment key={sec.typeName}>
                          {/* Type group header */}
                          <tr className="bg-indigo-50 border-l-4 border-indigo-400">
                            <td colSpan={4} className="px-3 py-2 font-bold text-indigo-800 uppercase tracking-wide">{sec.typeName}</td>
                          </tr>

                          {sec.heads.map(head => (
                            <React.Fragment key={head.headId}>
                              {head.rows.some(r => r.accOrHead === "A") ? (
                                <>
                                  {/* Non-annexure: head subheader */}
                                  <tr className="bg-amber-50 border-l-2 border-amber-300">
                                    <td colSpan={4} className="px-4 py-1.5 font-semibold text-amber-800 text-xs italic">{head.headName}</td>
                                  </tr>
                                  {/* Individual account rows */}
                                  {head.rows.map((r, i) => (
                                    <tr key={r.accId ?? i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                                      <td className="border-b border-slate-100 px-5 py-2 text-slate-800">{r.name}</td>
                                      <td className="border-b border-slate-100 px-3 py-2 text-right text-red-700 font-medium tabular-nums">{r.periodDr > 0 ? fmt(r.periodDr) : ""}</td>
                                      <td className="border-b border-slate-100 px-3 py-2 text-right text-emerald-700 font-medium tabular-nums">{r.periodCr > 0 ? fmt(r.periodCr) : ""}</td>
                                      <td className={`border-b border-slate-100 px-3 py-2 text-right font-medium tabular-nums ${r.closingBalance > 0 ? "text-emerald-700" : r.closingBalance < 0 ? "text-red-700" : "text-slate-400"}`}>
                                        {closingLabel(r.closingBalance)}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Head subtotal */}
                                  <tr className="bg-amber-50/60 border-t border-amber-200">
                                    <td className="px-3 py-1.5 text-right text-amber-900 font-semibold text-xs">Total — {head.headName}</td>
                                    <td className="px-3 py-1.5 text-right text-red-700 font-bold tabular-nums">{head.subDr > 0 ? fmt(head.subDr) : ""}</td>
                                    <td className="px-3 py-1.5 text-right text-emerald-700 font-bold tabular-nums">{head.subCr > 0 ? fmt(head.subCr) : ""}</td>
                                    <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${head.subClBal > 0 ? "text-emerald-700" : head.subClBal < 0 ? "text-red-700" : "text-slate-400"}`}>
                                      {closingLabel(head.subClBal)}
                                    </td>
                                  </tr>
                                </>
                              ) : (
                                /* Annexure: single head row */
                                <tr className="bg-white hover:bg-slate-50/50">
                                  <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-800">{head.headName}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-right text-red-700 font-medium tabular-nums">{head.subDr > 0 ? fmt(head.subDr) : ""}</td>
                                  <td className="border-b border-slate-100 px-3 py-2 text-right text-emerald-700 font-medium tabular-nums">{head.subCr > 0 ? fmt(head.subCr) : ""}</td>
                                  <td className={`border-b border-slate-100 px-3 py-2 text-right font-medium tabular-nums ${head.subClBal > 0 ? "text-emerald-700" : head.subClBal < 0 ? "text-red-700" : "text-slate-400"}`}>
                                    {closingLabel(head.subClBal)}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}

                          {/* Type subtotal */}
                          <tr className="bg-slate-100 border-t border-slate-300">
                            <td className="px-3 py-2 text-right text-slate-700 font-semibold text-xs">Sub-Total — {sec.typeName}</td>
                            <td className="px-3 py-2 text-right text-red-700 font-bold tabular-nums">{sec.totalDr > 0 ? fmt(sec.totalDr) : ""}</td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-bold tabular-nums">{sec.totalCr > 0 ? fmt(sec.totalCr) : ""}</td>
                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${sec.totalClBal > 0 ? "text-emerald-700" : sec.totalClBal < 0 ? "text-red-700" : "text-slate-400"}`}>
                              {closingLabel(sec.totalClBal)}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}

                      {/* Grand total */}
                      <tr className="bg-slate-600">
                        <td className="px-3 py-2.5 text-right text-white font-bold">Grand Total</td>
                        <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{fmt(report.totalPeriodDr)}</td>
                        <td className="px-3 py-2.5 text-right text-white font-bold tabular-nums">{fmt(report.totalPeriodCr)}</td>
                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${netCl > 0 ? "text-emerald-200" : netCl < 0 ? "text-red-200" : "text-slate-200"}`}>
                          {netCl === 0 ? "—" : `${fmt(Math.abs(netCl))} ${netCl > 0 ? "Cr" : "Dr"}`}
                        </td>
                      </tr>

                      {/* Cash Head special row — Dr col = Closing Balance at ToDate, Cr col = Opening Balance at FromDate */}
                      {cashHeadRows.length > 0 && cashHeadRows.map((r, i) => (
                        <tr key={`cash-${i}`} className="bg-indigo-100 border-t-2 border-indigo-300">
                          <td className="px-3 py-2.5 text-indigo-900 font-semibold">
                            {r.name}
                            <span className="block text-xs text-indigo-500 font-normal italic">Dr = Closing Balance &nbsp;|&nbsp; Cr = Opening Balance</span>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${r.periodDr > 0 ? "text-emerald-700" : r.periodDr < 0 ? "text-red-700" : "text-slate-400"}`}>
                            {closingLabel(r.periodDr)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${r.periodCr > 0 ? "text-emerald-700" : r.periodCr < 0 ? "text-red-700" : "text-slate-400"}`}>
                            {closingLabel(r.periodCr)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-indigo-400">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {report.rows.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No transactions found for this period.</p>
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

export default RDFinancialReportPage;
