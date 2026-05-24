import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { FileSpreadsheet, FileText, Printer, Search, ShieldAlert } from "lucide-react";
import npaLedgerApi, {
  NpaLedgerPlanItem,
  NpaLedgerCategoryItem,
  NpaLedgerData,
  NpaLedgerRow,
} from "../../services/reports/npaLedgerApi";
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

// ── Group rows by category ─────────────────────────────────────────────────────

interface CategoryGroup {
  categoryId: number;
  categoryName: string;
  rows: NpaLedgerRow[];
  totalOb: number;
  totalAdvanced: number;
  totalRepaid: number;
  totalClosing: number;
  totalNpa: number;
}

const groupByCategory = (rows: NpaLedgerRow[]): CategoryGroup[] => {
  const map = new Map<number, CategoryGroup>();
  for (const row of rows) {
    let g = map.get(row.categoryId);
    if (!g) {
      g = { categoryId: row.categoryId, categoryName: row.categoryName, rows: [], totalOb: 0, totalAdvanced: 0, totalRepaid: 0, totalClosing: 0, totalNpa: 0 };
      map.set(row.categoryId, g);
    }
    g.rows.push(row);
    g.totalOb       += row.openingBalance;
    g.totalAdvanced += row.loanAdvanced;
    g.totalRepaid   += row.repaid;
    g.totalClosing  += row.closingBalance;
    g.totalNpa      += row.npaAmount;
  }
  return Array.from(map.values());
};

// ── Export helpers ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: NpaLedgerData): ExportConfig => {
  const columns = [
    { header: "#",               widthRatio: 0.03, align: "center" as const },
    { header: "Account No",      widthRatio: 0.09, align: "left"   as const },
    { header: "Member / Account",widthRatio: 0.14, align: "left"   as const },
    { header: "Product",         widthRatio: 0.10, align: "left"   as const },
    { header: "Loan Date",       widthRatio: 0.07, align: "center" as const },
    { header: "Loan Amt",        widthRatio: 0.08, align: "right"  as const },
    { header: "Opening Bal",     widthRatio: 0.08, align: "right"  as const },
    { header: "Advanced",        widthRatio: 0.08, align: "right"  as const },
    { header: "Repaid",          widthRatio: 0.08, align: "right"  as const },
    { header: "Closing Bal",     widthRatio: 0.08, align: "right"  as const },
    { header: "NPA Amount",      widthRatio: 0.08, align: "right"  as const },
    { header: "Days OD",         widthRatio: 0.06, align: "right"  as const },
    { header: "OD Inst.",        widthRatio: 0.05, align: "right"  as const },
  ];

  const rows: ExportRow[] = [];
  const groups = groupByCategory(report.rows);

  for (const g of groups) {
    rows.push({ style: "group", spanFirst: 13, cells: [g.categoryName, ...Array(12).fill("")] });
    g.rows.forEach((row, idx) => rows.push({
      style: "normal",
      cells: [
        String(idx + 1),
        row.accountNumber,
        row.memberName ? `${row.memberName} / ${row.accountName}` : row.accountName,
        row.loanProductName,
        fmtDate(row.loanDate),
        fmt(row.loanAmount),
        fmt(row.openingBalance),
        fmt(row.loanAdvanced),
        fmt(row.repaid),
        fmt(row.closingBalance),
        fmt(row.npaAmount),
        String(row.daysOverdue),
        String(row.overdueInstallments),
      ],
    }));
    rows.push({
      style: "subtotal",
      cells: [`Sub-Total (${g.rows.length})`, "", "", "", "", fmt(g.rows.reduce((s, r) => s + r.loanAmount, 0)), fmt(g.totalOb), fmt(g.totalAdvanced), fmt(g.totalRepaid), fmt(g.totalClosing), fmt(g.totalNpa), "", ""],
    });
  }

  rows.push({
    style: "total",
    cells: [`Grand Total (${report.rows.length})`, "", "", "", "", "", fmt(report.totalOpeningBalance), fmt(report.totalLoanAdvanced), fmt(report.totalRepaid), fmt(report.totalClosingBalance), fmt(report.totalNpa), "", ""],
  });

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress || undefined,
      reportTitle: `NPA Ledger — ${report.planName} | ${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}`,
      fileName: `NpaLedger_${toInputDate(report.fromDate)}_${toInputDate(report.toDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

const buildPrintHTML = (report: NpaLedgerData): string => {
  const groups = groupByCategory(report.rows);
  let bodyRows = "";

  for (const g of groups) {
    bodyRows += `<tr><td colspan="13" style="background:#1e3a5f;color:#fff;font-weight:700;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">${g.categoryName}</td></tr>`;
    g.rows.forEach((row, idx) => {
      bodyRows += `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="font-family:monospace">${row.accountNumber}</td>
        <td>${row.memberName ? `${row.memberName}<br/><small style="color:#666">${row.accountName}</small>` : row.accountName}</td>
        <td>${row.loanProductName}</td>
        <td style="text-align:center;white-space:nowrap">${fmtDate(row.loanDate)}</td>
        <td style="text-align:right">${fmt(row.loanAmount)}</td>
        <td style="text-align:right">${fmt(row.openingBalance)}</td>
        <td style="text-align:right">${fmt(row.loanAdvanced)}</td>
        <td style="text-align:right">${fmt(row.repaid)}</td>
        <td style="text-align:right;font-weight:600;color:#1d4ed8">${fmt(row.closingBalance)}</td>
        <td style="text-align:right;color:#b91c1c;font-weight:600">${row.npaAmount > 0 ? fmt(row.npaAmount) : "—"}</td>
        <td style="text-align:right">${row.daysOverdue}</td>
        <td style="text-align:right">${row.overdueInstallments}</td>
      </tr>`;
    });
    bodyRows += `<tr style="background:#f1f5f9;font-weight:700">
      <td colspan="6" style="text-align:right;padding:3px 8px">Sub-Total (${g.rows.length})</td>
      <td style="text-align:right">${fmt(g.totalOb)}</td>
      <td style="text-align:right">${fmt(g.totalAdvanced)}</td>
      <td style="text-align:right">${fmt(g.totalRepaid)}</td>
      <td style="text-align:right;color:#1d4ed8">${fmt(g.totalClosing)}</td>
      <td style="text-align:right;color:#b91c1c">${fmt(g.totalNpa)}</td>
      <td colspan="2"></td>
    </tr>`;
  }

  bodyRows += `<tr style="background:#7f1d1d;color:#fff;font-weight:700">
    <td colspan="6" style="text-align:right;padding:4px 8px">Grand Total (${report.rows.length})</td>
    <td style="text-align:right">${fmt(report.totalOpeningBalance)}</td>
    <td style="text-align:right">${fmt(report.totalLoanAdvanced)}</td>
    <td style="text-align:right">${fmt(report.totalRepaid)}</td>
    <td style="text-align:right">${fmt(report.totalClosingBalance)}</td>
    <td style="text-align:right">${fmt(report.totalNpa)}</td>
    <td colspan="2"></td>
  </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>NPA Ledger</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:9.5px;color:#000;padding:10px;}
    .rh{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
    .rh h1{font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
    .rh p{font-size:10px;margin-top:2px;color:#64748b;}
    .rh h2{font-size:11px;font-weight:600;margin-top:5px;color:#7f1d1d;letter-spacing:1px;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th{background:#1e293b;color:#fff;border:1px solid #334155;padding:3px 5px;font-size:9px;text-transform:uppercase;letter-spacing:0.4px;}
    td{border:1px solid #e2e8f0;padding:2px 4px;font-size:9px;vertical-align:middle;}
    tr:nth-child(even){background:#f8fafc;}
    @media print{body{padding:4px;}@page{margin:6mm;size:A4 landscape;}}
  </style></head><body>
  <div class="rh">
    <h1>${report.branchName}</h1>
    ${report.branchAddress ? `<p>${report.branchAddress}</p>` : ""}
    <h2>NPA Ledger — ${report.planName}</h2>
    <p>${fmtLong(report.fromDate)} to ${fmtLong(report.toDate)}</p>
  </div>
  <table>
    <thead><tr>
      <th style="width:22px">#</th>
      <th style="text-align:left">Account No</th>
      <th style="text-align:left">Member / Account</th>
      <th style="text-align:left">Product</th>
      <th>Loan Date</th>
      <th>Loan Amt</th>
      <th>Opening Bal</th>
      <th>Advanced</th>
      <th>Repaid</th>
      <th>Closing Bal</th>
      <th>NPA Amount</th>
      <th>Days OD</th>
      <th>OD Inst.</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body></html>`;
};

// ── Main Component ─────────────────────────────────────────────────────────────

const NpaLedgerPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate]     = useState(workingDate);

  const [plans, setPlans]               = useState<NpaLedgerPlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(0);

  const [categories, setCategories]     = useState<NpaLedgerCategoryItem[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);

  const [loading, setLoading]           = useState(false);
  const [report, setReport]             = useState<NpaLedgerData | null>(null);

  // Load plans on mount
  useEffect(() => {
    if (!user.branchid) return;
    npaLedgerApi.getPlans(user.branchid).then((res) => {
      const data: NpaLedgerPlanItem[] = (res as any).data ?? [];
      setPlans(data);
      if (data.length > 0) setSelectedPlanId(data[0].id);
    });
  }, [user.branchid]);

  // Load categories when plan changes
  useEffect(() => {
    if (!user.branchid || !selectedPlanId) return;
    setCategories([]);
    setSelectedCatIds([]);
    npaLedgerApi.getCategories(user.branchid, selectedPlanId).then((res) => {
      const data: NpaLedgerCategoryItem[] = (res as any).data ?? [];
      setCategories(data);
    });
  }, [user.branchid, selectedPlanId]);

  const toggleCategory = (id: number) => {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllCategories = () => setSelectedCatIds(categories.map((c) => c.id));
  const clearAllCategories  = () => setSelectedCatIds([]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select both dates.", "warning");
      return;
    }
    if (!selectedPlanId) {
      Swal.fire("Validation", "Please select an NPA Plan.", "warning");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await npaLedgerApi.getReport({
        branchId: user.branchid,
        fromDate,
        toDate,
        planId: selectedPlanId,
        categoryIds: selectedCatIds,
      });
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
      if ((data as NpaLedgerData).rows.length === 0) {
        Swal.fire("No Data", "No NPA accounts found for the selected criteria.", "info");
      }
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load NPA Ledger.", "error");
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

  const groups = report ? groupByCategory(report.rows) : [];

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-4 sm:p-6">
          <div className="w-full space-y-5">

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-red-600 to-rose-700 rounded-lg flex items-center justify-center shadow">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">NPA Ledger</h2>
                  <p className="text-xs text-gray-500">Non-Performing Assets — loan account ledger by NPA category</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Date + Plan row */}
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date" value={fromDate} max={workingDate}
                      onChange={(e) => { setFromDate(e.target.value); setReport(null); }}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date" value={toDate} max={workingDate}
                      onChange={(e) => { setToDate(e.target.value); setReport(null); }}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none text-sm"
                    />
                  </div>
                  <div className="min-w-[220px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">NPA Plan</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => { setSelectedPlanId(Number(e.target.value)); setReport(null); }}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none text-sm bg-white"
                    >
                      <option value={0}>-- Select Plan --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category checkboxes */}
                {categories.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-sm font-medium text-gray-700">NPA Categories</label>
                      <button onClick={selectAllCategories} className="text-xs text-blue-600 hover:underline cursor-pointer">Select All</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={clearAllCategories} className="text-xs text-gray-500 hover:underline cursor-pointer">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCatIds.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="w-4 h-4 accent-red-600 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">{cat.description}</span>
                          {cat.periodFrom !== null && (
                            <span className="text-xs text-gray-400">
                              ({cat.periodFrom}
                              {cat.periodTo && cat.periodTo > 0 ? `–${cat.periodTo}` : "+"}
                              )
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Leave all unchecked to include all categories.</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleLoad} disabled={loading || !selectedPlanId}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                      : <><Search className="w-4 h-4" /> Show</>
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
            </div>

            {/* ── Report ──────────────────────────────────────────────────── */}
            {report && report.rows.length > 0 && (
              <div className="space-y-4">
                {/* Report header */}
                <div className="bg-white rounded-xl shadow border border-gray-200 print:shadow-none">
                  <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50 print:bg-white">
                    <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                    {report.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>}
                    <h2 className="text-base font-semibold text-red-800 mt-2">NPA Ledger — {report.planName}</h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {fmtLong(report.fromDate)} to {fmtLong(report.toDate)}
                    </p>
                  </div>

                  {/* Summary chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-gray-50">
                    <SummaryChip label="Total Accounts" value={`${report.rows.length}`} color="gray" />
                    <SummaryChip label="Opening Balance" value={`₹${fmt(report.totalOpeningBalance)}`} color="blue" />
                    <SummaryChip label="Loan Advanced" value={`₹${fmt(report.totalLoanAdvanced)}`} color="blue" />
                    <SummaryChip label="Closing Balance" value={`₹${fmt(report.totalClosingBalance)}`} color="blue" />
                    <SummaryChip label="Total NPA" value={`₹${fmt(report.totalNpa)}`} color="red" />
                  </div>
                </div>

                {/* Detail table */}
                <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-left">#</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-left">Account No</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-left">Member / Account</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-left">Product</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-center">Loan Date</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Loan Amt (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Opening Bal (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Advanced (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Repaid (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Closing Bal (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">NPA Amount (₹)</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">Days OD</th>
                          <th className="border border-gray-300 px-2 py-2 bg-red-800 text-white text-right">OD Inst.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g) => (
                          <React.Fragment key={g.categoryId}>
                            {/* Category header row */}
                            <tr>
                              <td colSpan={13} className="border border-gray-300 px-3 py-1.5 bg-blue-900 text-white font-bold text-xs uppercase tracking-wide">
                                {g.categoryName}
                              </td>
                            </tr>

                            {/* Account rows */}
                            {g.rows.map((row, idx) => (
                              <tr key={row.accountId} className="hover:bg-red-50">
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-500 text-center">{idx + 1}</td>
                                <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-700">{row.accountNumber}</td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  {row.memberName && <div className="font-medium text-gray-800">{row.memberName}</div>}
                                  <div className={row.memberName ? "text-gray-500" : "font-medium text-gray-800"}>{row.accountName}</div>
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-700">{row.loanProductName}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-gray-600 text-center whitespace-nowrap">{fmtDate(row.loanDate)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{fmt(row.loanAmount)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{fmt(row.openingBalance)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{fmt(row.loanAdvanced)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{fmt(row.repaid)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-blue-700">{fmt(row.closingBalance)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-red-700">{row.npaAmount > 0 ? fmt(row.npaAmount) : "—"}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{row.daysOverdue}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-700">{row.overdueInstallments}</td>
                              </tr>
                            ))}

                            {/* Sub-total row */}
                            <tr className="bg-slate-100">
                              <td colSpan={6} className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 text-right">
                                Sub-Total ({g.rows.length})
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-gray-800">{fmt(g.totalOb)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-gray-800">{fmt(g.totalAdvanced)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-gray-800">{fmt(g.totalRepaid)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-blue-700">{fmt(g.totalClosing)}</td>
                              <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-red-700">{fmt(g.totalNpa)}</td>
                              <td colSpan={2} className="border border-gray-300" />
                            </tr>
                          </React.Fragment>
                        ))}

                        {/* Grand total */}
                        <tr className="bg-red-800">
                          <td colSpan={6} className="border border-red-900 px-3 py-2 text-white font-bold text-right">
                            Grand Total ({report.rows.length} accounts)
                          </td>
                          <td className="border border-red-900 px-2 py-2 text-right text-white font-bold">{fmt(report.totalOpeningBalance)}</td>
                          <td className="border border-red-900 px-2 py-2 text-right text-white font-bold">{fmt(report.totalLoanAdvanced)}</td>
                          <td className="border border-red-900 px-2 py-2 text-right text-white font-bold">{fmt(report.totalRepaid)}</td>
                          <td className="border border-red-900 px-2 py-2 text-right text-white font-bold">{fmt(report.totalClosingBalance)}</td>
                          <td className="border border-red-900 px-2 py-2 text-right text-white font-bold">{fmt(report.totalNpa)}</td>
                          <td colSpan={2} className="border border-red-900" />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                    Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            )}

            {!report && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <ShieldAlert className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select filters and click Show to view the NPA Ledger</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

// ── Helper component ───────────────────────────────────────────────────────────

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

export default NpaLedgerPage;
