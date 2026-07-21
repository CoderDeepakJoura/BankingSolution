import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { AlertTriangle, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import loanNpaApi, { LoanNPAProductItem, LoanNPA } from "../../services/reports/loanNpaApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate = (iso: string | null) =>
  iso ? localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtLong = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

const toInputDate = (iso: string) => isoDatePart(iso);

const selectStyles = {
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
  menu: (b: any) => ({ ...b, zIndex: 9999 }),
  control: (b: any) => ({ ...b, cursor: "pointer" }),
};

// NPA category styling
const categoryStyle = (cat: string): { row: string; badge: string } => {
  switch (cat) {
    case "Sub-Standard": return { row: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800 border border-yellow-300" };
    case "Doubtful":     return { row: "bg-orange-50", badge: "bg-orange-100 text-orange-800 border border-orange-300" };
    case "Loss":         return { row: "bg-red-50",    badge: "bg-red-100 text-red-800 border border-red-300" };
    default:             return { row: "",              badge: "bg-green-100 text-green-800 border border-green-300" };
  }
};

const categoryOrder: Record<string, number> = {
  "Standard": 0, "Sub-Standard": 1, "Doubtful": 2, "Loss": 3
};

// ── Export helpers ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: LoanNPA): ExportConfig => {
  const columns = [
    { header: "#",                widthRatio: 0.03, align: "center" as const },
    { header: "Account No",       widthRatio: 0.09, align: "left"   as const },
    { header: "Account / Member", widthRatio: 0.16, align: "left"   as const },
    { header: "Loan Date",        widthRatio: 0.08, align: "center" as const },
    { header: "Loan Advanced",    widthRatio: 0.10, align: "right"  as const },
    { header: "Outstanding",      widthRatio: 0.10, align: "right"  as const },
    { header: "Last Recovery",    widthRatio: 0.08, align: "center" as const },
    { header: "Days OD",          widthRatio: 0.06, align: "right"  as const },
    { header: "OD Inst.",         widthRatio: 0.06, align: "right"  as const },
    { header: "Overdue Amt",      widthRatio: 0.10, align: "right"  as const },
    { header: "Category",         widthRatio: 0.09, align: "center" as const },
  ];

  const rows: ExportRow[] = [];

  // ── Category summary section ──
  rows.push({ style: "group",    spanFirst: 11, cells: ["NPA Category Summary", "", "", "", "", "", "", "", "", "", ""] });
  rows.push({ style: "subtotal", cells:          ["Category", "Accounts", "Outstanding (₹)", "Overdue (₹)", "", "", "", "", "", "", ""] });
  [...report.summary]
    .sort((a, b) => (categoryOrder[a.npaCategory] ?? 99) - (categoryOrder[b.npaCategory] ?? 99))
    .forEach((s) => rows.push({
      style: "normal",
      cells: [s.npaCategory, String(s.count), fmt(s.totalOutstanding), fmt(s.totalOverdue), "", "", "", "", "", "", ""],
    }));

  // blank separator
  rows.push({ style: "normal", cells: Array(11).fill("") });

  // ── Detail section ──
  rows.push({ style: "group", spanFirst: 11, cells: ["Loan Account Details", "", "", "", "", "", "", "", "", "", ""] });
  report.rows.forEach((row, idx) => rows.push({
    style: "normal",
    cells: [
      String(idx + 1),
      row.accountNumber,
      row.memberName ? `${row.accountName} / ${row.memberName}` : row.accountName,
      fmtDate(row.loanDate),
      fmt(row.loanAmountPassed),
      fmt(row.outstandingBalance),
      fmtDate(row.lastRecoveryDate),
      String(row.daysOverdue),
      row.overdueInstallments ? String(row.overdueInstallments) : "—",
      row.overdueAmount > 0 ? fmt(row.overdueAmount) : "—",
      row.npaCategory,
    ],
  }));

  // totals
  rows.push({
    style: "total", spanFirst: 4,
    cells: [`Total (${report.rows.length} accounts)`, "", "", "",
      fmt(report.totalLoanAdvanced), fmt(report.totalOutstanding),
      "", "", "", fmt(report.totalOverdue), ""],
  });

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `Loan NPA Report${report.productName ? ` — ${report.productName}` : ""} | As of ${fmtLong(report.asOfDate)}`,
      fileName: `LoanNPA_${toInputDate(report.asOfDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

const buildPrintHTML = (report: LoanNPA): string => {
  const categoryColors: Record<string, string> = {
    "Standard":     "#dcfce7",
    "Sub-Standard": "#fef9c3",
    "Doubtful":     "#ffedd5",
    "Loss":         "#fee2e2",
  };

  let summaryRows = "";
  [...report.summary]
    .sort((a, b) => (categoryOrder[a.npaCategory] ?? 99) - (categoryOrder[b.npaCategory] ?? 99))
    .forEach((s) => {
      const bg = categoryColors[s.npaCategory] ?? "#fff";
      summaryRows += `<tr style="background:${bg}"><td>${s.npaCategory}</td><td style="text-align:right">${s.count}</td><td style="text-align:right">${fmt(s.totalOutstanding)}</td><td style="text-align:right">${fmt(s.totalOverdue)}</td></tr>`;
    });

  let detailRows = "";
  report.rows.forEach((row, idx) => {
    const bg = categoryColors[row.npaCategory] ?? "#fff";
    detailRows += `<tr style="background:${bg}">
      <td style="text-align:center">${idx + 1}</td>
      <td style="font-family:monospace">${row.accountNumber}</td>
      <td>${row.accountName}${row.memberName ? `<br/><small style="color:#666">${row.memberName}</small>` : ""}</td>
      <td style="text-align:center;white-space:nowrap">${fmtDate(row.loanDate)}</td>
      <td style="text-align:right">${fmt(row.loanAmountPassed)}</td>
      <td style="text-align:right;font-weight:600;color:#1d4ed8">${fmt(row.outstandingBalance)}</td>
      <td style="text-align:center;white-space:nowrap">${fmtDate(row.lastRecoveryDate)}</td>
      <td style="text-align:right;${row.daysOverdue >= 90 ? "color:#b91c1c;font-weight:600" : ""}">${row.daysOverdue}</td>
      <td style="text-align:right">${row.overdueInstallments || "—"}</td>
      <td style="text-align:right;color:#b91c1c;font-weight:500">${row.overdueAmount > 0 ? fmt(row.overdueAmount) : "—"}</td>
      <td style="text-align:center">${row.npaCategory}</td>
    </tr>`;
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loan NPA Report</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:10.5px;color:#000;padding:12px;}
    .rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
    .rh h1{font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
    .rh p{font-size:10px;margin-top:2px;color:#64748b;}
    .rh h2{font-size:11px;font-weight:600;margin-top:5px;color:#7f1d1d;letter-spacing:1px;}
    .chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
    .chip{border:1px solid #e2e8f0;border-radius:4px;padding:5px 10px;min-width:110px;}
    .chip .lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;}
    .chip .val{font-size:12px;font-weight:700;margin-top:1px;}
    h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin:8px 0 4px;}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;}
    th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9.5px;text-transform:uppercase;letter-spacing:0.4px;}
    td{border:1px solid #e2e8f0;padding:2px 4px;font-size:10px;vertical-align:middle;}
    .tfoot-row td{background:#881337;color:#fff;font-weight:700;border-color:#9f1239;}
    .note{font-size:9px;color:#64748b;margin-top:6px;text-align:center;}
    @media print{body{padding:6px;}@page{margin:8mm;size:A4 landscape;}}
  </style></head><body>
  <div class="rh">
    <h1>${report.branchName}</h1>
    ${report.branchAddress ? `<p>${report.branchAddress}</p>` : ""}
    <h2>Loan NPA Report${report.productName ? ` — ${report.productName}` : ""}</h2>
    <p>As of ${fmtLong(report.asOfDate)}</p>
  </div>
  <div class="chips">
    <div class="chip"><div class="lbl">Total Accounts</div><div class="val">${report.rows.length}</div></div>
    <div class="chip"><div class="lbl">Total Outstanding</div><div class="val" style="color:#1d4ed8">₹${fmt(report.totalOutstanding)}</div></div>
    <div class="chip"><div class="lbl">Total Overdue</div><div class="val" style="color:#b91c1c">₹${fmt(report.totalOverdue)}</div></div>
    <div class="chip"><div class="lbl">Total Recovered</div><div class="val" style="color:#065f46">₹${fmt(report.totalRecovered)}</div></div>
  </div>
  <h3>Category Breakdown</h3>
  <table style="width:auto;min-width:360px">
    <thead><tr><th style="text-align:left">NPA Category</th><th>Accounts</th><th>Outstanding (₹)</th><th>Overdue (₹)</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
  <h3>Loan Account Details</h3>
  <table>
    <thead><tr>
      <th style="width:24px">#</th><th style="text-align:left">Account No</th><th style="text-align:left">Account / Member</th>
      <th>Loan Date</th><th>Loan Advanced</th><th>Outstanding</th><th>Last Recovery</th>
      <th>Days OD</th><th>OD Inst.</th><th>Overdue Amt</th><th>Category</th>
    </tr></thead>
    <tbody>${detailRows}
    <tr class="tfoot-row">
      <td colspan="4" style="text-align:right">Total (${report.rows.length} accounts)</td>
      <td style="text-align:right">${fmt(report.totalLoanAdvanced)}</td>
      <td style="text-align:right">${fmt(report.totalOutstanding)}</td>
      <td colspan="3"></td>
      <td style="text-align:right">${fmt(report.totalOverdue)}</td>
      <td></td>
    </tr>
    </tbody>
  </table>
  <div class="note">NPA Classification: Standard (&lt;90 days) · Sub-Standard (90–365 days) · Doubtful (366–730 days) · Loss (&gt;730 days)</div>
</body></html>`;
};

// ── Main Component ─────────────────────────────────────────────────────────────

const LoanNPAPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [products, setProducts]         = useState<LoanNPAProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{ value: number; label: string } | null>(null);
  const [asOfDate, setAsOfDate]         = useState(workingDate);
  const [npaOnly, setNpaOnly]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [report, setReport]             = useState<LoanNPA | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    loanNpaApi.getLoanProducts(user.branchid).then((res) => {
      const data: LoanNPAProductItem[] = (res as any).data ?? (res as any).Data ?? [];
      setProducts(data);
    });
  }, [user.branchid]);

  const productOptions = [
    { value: 0, label: "All Products" },
    ...products.map((p) => ({ value: p.id, label: p.productName })),
  ];

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintHTML(report));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const handleLoad = async () => {
    if (!asOfDate) {
      Swal.fire("Validation", "Please select an As of Date.", "warning");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await loanNpaApi.getLoanNPA(
        user.branchid,
        asOfDate,
        selectedProduct?.value ?? 0,
        npaOnly
      );
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load NPA report.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-4 sm:p-6">
          <div className="w-full space-y-5">

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Loan NPA Report</h2>
                  <p className="text-xs text-gray-500">Non-Performing Assets — loan accounts by overdue status</p>
                </div>
              </div>

              <div className="p-5 flex flex-wrap items-end gap-4">
                <div className="min-w-[240px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product</label>
                  <Select
                    options={productOptions}
                    value={selectedProduct ?? productOptions[0]}
                    onChange={(opt) => { setSelectedProduct(opt?.value === 0 ? null : opt); setReport(null); }}
                    placeholder="All Products"
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
                  <input
                    type="date" value={asOfDate} onChange={(e) => { setAsOfDate(e.target.value); setReport(null); }}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pb-1">
                  <input
                    id="npaOnly" type="checkbox" checked={npaOnly}
                    onChange={(e) => { setNpaOnly(e.target.checked); setReport(null); }}
                    className="w-4 h-4 accent-red-600 cursor-pointer"
                  />
                  <label htmlFor="npaOnly" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    NPA Accounts Only
                  </label>
                </div>

                <button
                  onClick={handleLoad} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                    : <><Search className="w-4 h-4" /> Generate</>
                  }
                </button>

                {report && (
                  <>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => exportToPdf(buildExportConfig(report))}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => exportToExcel(buildExportConfig(report))}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>

            {/* ── Report ──────────────────────────────────────────────────── */}
            {report && (
              <div className="space-y-4">

                {/* Report header */}
                <div className="bg-white rounded-xl shadow border border-gray-200 print:shadow-none print:border-none print:rounded-none">
                  <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50 print:bg-white">
                    <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                    {report.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>}
                    <h2 className="text-base font-semibold text-red-800 mt-2">Loan NPA Report</h2>
                    {report.productName && <p className="text-xs text-gray-500">{report.productName}</p>}
                    <p className="text-sm text-gray-600 mt-0.5">As of {fmtLong(report.asOfDate)}</p>
                  </div>

                  {/* Summary chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
                    <SummaryChip label="Total Accounts" value={`${report.rows.length}`} color="gray" />
                    <SummaryChip label="Total Outstanding" value={`₹${fmt(report.totalOutstanding)}`} color="blue" />
                    <SummaryChip label="Total Overdue" value={`₹${fmt(report.totalOverdue)}`} color="red" />
                    <SummaryChip label="Total Recovered" value={`₹${fmt(report.totalRecovered)}`} color="green" />
                  </div>

                  {/* NPA Category Summary */}
                  {report.summary.length > 0 && (
                    <div className="overflow-x-auto p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Category Breakdown</p>
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-bold text-gray-800">NPA Category</th>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-right font-bold text-gray-800">Accounts</th>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-right font-bold text-gray-800">Outstanding (₹)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-right font-bold text-gray-800">Overdue (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.summary.map((s) => {
                            const { badge } = categoryStyle(s.npaCategory);
                            return (
                              <tr key={s.npaCategory} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-1.5">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>{s.npaCategory}</span>
                                </td>
                                <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-700">{s.count}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-right text-blue-700 font-medium">{fmt(s.totalOutstanding)}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-right text-red-700 font-medium">{fmt(s.totalOverdue)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Detail table */}
                {report.rows.length > 0 ? (
                  <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    <div className="overflow-x-auto p-4">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-left font-bold text-gray-800">#</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-left font-bold text-gray-800">Account No</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-left font-bold text-gray-800">Account / Member</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-left font-bold text-gray-800">Loan Date</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-right font-bold text-gray-800">Loan Advanced (₹)</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-right font-bold text-gray-800">Outstanding (₹)</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-left font-bold text-gray-800">Last Recovery</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-right font-bold text-gray-800">Days Overdue</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-right font-bold text-gray-800">OD Installments</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-right font-bold text-gray-800">Overdue Amt (₹)</th>
                            <th className="border border-gray-300 px-2 py-2 bg-red-50 text-center font-bold text-gray-800">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.rows.map((row, idx) => {
                            const { row: rowBg, badge } = categoryStyle(row.npaCategory);
                            return (
                              <tr key={row.accountId} className={`${rowBg} hover:brightness-95`}>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-500">{idx + 1}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-700 font-mono">{row.accountNumber}</td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <div className="font-medium text-gray-800">{row.accountName}</div>
                                  {row.memberName && <div className="text-gray-500 text-xs">{row.memberName}</div>}
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-600">{fmtDate(row.loanDate)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{fmt(row.loanAmountPassed)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-blue-700">{fmt(row.outstandingBalance)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-600">{fmtDate(row.lastRecoveryDate)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">
                                  <span className={row.daysOverdue >= 90 ? "text-red-700 font-semibold" : "text-gray-600"}>
                                    {row.daysOverdue}
                                  </span>
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-600">{row.overdueInstallments || "—"}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-red-700 font-medium">
                                  {row.overdueAmount > 0 ? fmt(row.overdueAmount) : "—"}
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${badge}`}>
                                    {row.npaCategory}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Totals */}
                          <tr className="bg-rose-700">
                            <td colSpan={4} className="border border-rose-800 px-3 py-2 text-white font-bold text-xs">Total ({report.rows.length} accounts)</td>
                            <td className="border border-rose-800 px-2 py-2 text-right text-white font-bold text-xs">{fmt(report.totalLoanAdvanced)}</td>
                            <td className="border border-rose-800 px-2 py-2 text-right text-white font-bold text-xs">{fmt(report.totalOutstanding)}</td>
                            <td colSpan={3} className="border border-rose-800 px-2 py-2 text-white font-bold text-xs" />
                            <td className="border border-rose-800 px-2 py-2 text-right text-white font-bold text-xs">{fmt(report.totalOverdue)}</td>
                            <td className="border border-rose-800 px-2 py-2 text-white font-bold text-xs" />
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                      NPA Classification: Standard (&lt;90 days) · Sub-Standard (90–365) · Doubtful (366–730) · Loss (&gt;730 days) &nbsp;|&nbsp;
                      Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow border border-gray-200 py-12 text-center text-sm text-gray-400">
                    No loan accounts found matching the selected filters.
                  </div>
                )}
              </div>
            )}

            {!report && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <AlertTriangle className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select filters and click Generate to view the NPA report</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

// ── Small helper ──────────────────────────────────────────────────────────────
const SummaryChip: React.FC<{ label: string; value: string; color: "gray" | "blue" | "red" | "green" }> = ({ label, value, color }) => {
  const colors = {
    gray:  "bg-gray-100 border-gray-200 text-gray-800",
    blue:  "bg-blue-50 border-blue-200 text-blue-800",
    red:   "bg-red-50 border-red-200 text-red-800",
    green: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
};

export default LoanNPAPage;
