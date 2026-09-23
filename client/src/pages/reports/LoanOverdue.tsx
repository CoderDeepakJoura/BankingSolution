import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { AlertTriangle, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import loanOverdueApi, { LoanOverdueProductItem, LoanOverdueReport, LoanOverdueRow } from "../../services/reports/loanOverdueApi";
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
  menu:        (b: any) => ({ ...b, zIndex: 9999 }),
  control:     (b: any) => ({ ...b, cursor: "pointer" }),
};

// ── Export helpers ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: LoanOverdueReport): ExportConfig => {
  const columns = [
    { header: "#",            widthRatio: 0.03, align: "center" as const },
    { header: "Account No",   widthRatio: 0.08, align: "left"   as const },
    { header: "Account Name", widthRatio: 0.15, align: "left"   as const },
    { header: "Opening Date", widthRatio: 0.09, align: "center" as const },
    { header: "Principal",    widthRatio: 0.09, align: "right"  as const },
    { header: "Interest",     widthRatio: 0.09, align: "right"  as const },
    { header: "Overdue",      widthRatio: 0.09, align: "right"  as const },
    { header: "Instt",        widthRatio: 0.08, align: "right"  as const },
    { header: "OD Inst.",     widthRatio: 0.05, align: "center" as const },
    { header: "Guarantor 1",  widthRatio: 0.12, align: "left"   as const },
    { header: "Guarantor 2",  widthRatio: 0.12, align: "left"   as const },
  ];

  const rows: ExportRow[] = report.rows.map((r, i) => ({
    style: "normal" as const,
    cells: [
      String(i + 1),
      r.accountNumber,
      r.accountName,
      fmtDate(r.openingDate),
      fmt(r.outstandingPrincipal),
      fmt(r.outstandingInterest),
      fmt(r.overdueAmount),
      fmt(r.kistAmount),
      String(r.overdueInstallments),
      r.guarantor1,
      r.guarantor2,
    ],
  }));

  rows.push({
    style: "total",
    cells: [
      "", "TOTAL", "",  "",
      fmt(report.totalPrincipal),
      fmt(report.totalInterest),
      fmt(report.totalOverdue),
      "", "", "", "",
    ],
  });

  return {
    title: `Loan Overdue Report${report.productName ? ` — ${report.productName}` : ""}`,
    subtitle: `As of ${fmtLong(report.asOfDate)} | ${report.branchName}`,
    infoRows: [],
    columns,
    rows,
    orientation: "landscape",
    fileName: `LoanOverdue_${toInputDate(report.asOfDate)}`,
  };
};

const buildPrintHTML = (report: LoanOverdueReport): string => {
  const rowsHtml = report.rows
    .map(
      (r, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${r.accountNumber}</td>
        <td>${r.accountName}</td>
        <td class="center">${fmtDate(r.openingDate)}</td>
        <td class="right">${fmt(r.outstandingPrincipal)}</td>
        <td class="right">${fmt(r.outstandingInterest)}</td>
        <td class="right overdue">${r.overdueAmount > 0 ? fmt(r.overdueAmount) : "—"}</td>
        <td class="right">${fmt(r.kistAmount)}</td>
        <td class="center">${r.overdueInstallments > 0 ? r.overdueInstallments : "—"}</td>
        <td>${r.guarantor1}</td>
        <td>${r.guarantor2}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Loan Overdue Report</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; }
  h2  { text-align: center; font-size: 13px; margin: 0 0 2px; }
  p.sub { text-align: center; font-size: 10px; color: #555; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  th { background: #1e40af; color: #fff; font-size: 10px; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .overdue { color: #b91c1c; font-weight: 600; }
  .total td { background: #eff6ff; font-weight: bold; }
</style></head>
<body>
<h2>Loan Overdue Report${report.productName ? ` — ${report.productName}` : ""}</h2>
<p class="sub">${report.branchName} | As of ${fmtLong(report.asOfDate)} | Total Accounts: ${report.totalAccounts}</p>
<table>
  <thead>
    <tr>
      <th>#</th><th>Account No</th><th>Account Name</th><th>Opening Date</th>
      <th>Principal</th><th>Interest</th><th>Overdue</th>
      <th>Instt</th><th>OD Inst.</th><th>Guarantor 1</th><th>Guarantor 2</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot>
    <tr class="total">
      <td colspan="4" class="center">TOTAL</td>
      <td class="right">${fmt(report.totalPrincipal)}</td>
      <td class="right">${fmt(report.totalInterest)}</td>
      <td class="right overdue">${fmt(report.totalOverdue)}</td>
      <td colspan="4"></td>
    </tr>
  </tfoot>
</table>
</body></html>`;
};

// ── Component ──────────────────────────────────────────────────────────────────

const LoanOverdue: React.FC = () => {
  const navigate  = useNavigate();
  const user      = useSelector((s: RootState) => s.user);
  const branchId  = user.branchid;
  const workingDate = user.workingdate ? commonservice.parseWorkingDate(user.workingdate) : new Date().toISOString().split("T")[0];

  const [asOfDate,    setAsOfDate]    = useState(workingDate);
  const [products,    setProducts]    = useState<LoanOverdueProductItem[]>([]);
  const [productId,   setProductId]   = useState(0);
  const [overdueOnly, setOverdueOnly] = useState(true);
  const [report,      setReport]      = useState<LoanOverdueReport | null>(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    loanOverdueApi.getLoanProducts(branchId).then((r) => {
      if (r.success && r.data) setProducts(r.data);
    });
  }, [branchId]);

  const productOptions = [
    { value: 0, label: "All Products" },
    ...products.map((p) => ({ value: p.id, label: p.productName })),
  ];

  const handleSearch = async () => {
    if (!asOfDate) {
      Swal.fire("Validation", "Please select a date.", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await loanOverdueApi.getLoanOverdue(branchId, asOfDate, productId, overdueOnly);
      if (res.success && res.data) {
        setReport(res.data);
        if (res.data.rows.length === 0)
          Swal.fire("No Data", "No overdue accounts found for the selected filters.", "info");
      } else {
        Swal.fire("Error", res.message || "Failed to fetch report.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "An unexpected error occurred.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank");
    if (win) { win.document.write(buildPrintHTML(report)); win.document.close(); win.print(); }
  };

  const handleExportPdf = () => {
    if (!report) return;
    exportToPdf(buildExportConfig(report));
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportToExcel(buildExportConfig(report));
  };

  return (
    <DashboardLayout>
      <div className="w-full min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        {/* Header */}
        <div className="w-full bg-gradient-to-r from-red-700 via-red-600 to-orange-500 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-lg">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white transition-colors text-sm font-medium px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
          >
            ← Back
          </button>
          <AlertTriangle className="text-white/90" size={26} />
          <div>
            <h1 className="text-xl font-bold text-white">Loan Overdue Report</h1>
            <p className="text-red-100 text-sm">Outstanding principal, interest &amp; overdue instalments per account</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">As of Date</label>
              <input
                type="date"
                value={asOfDate}
                max={workingDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Loan Product</label>
              <Select
                options={productOptions}
                value={productOptions.find((o) => o.value === productId) ?? productOptions[0]}
                onChange={(o) => setProductId(o?.value ?? 0)}
                styles={selectStyles}
                menuPortalTarget={document.body}
                isSearchable
              />
            </div>

            <div className="flex items-center gap-2 pb-1">
              <input
                id="overdueOnly"
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-4 h-4 accent-red-600 cursor-pointer"
              />
              <label htmlFor="overdueOnly" className="text-sm font-medium text-gray-700 cursor-pointer">
                Overdue accounts only
              </label>
            </div>

            <div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2.5 transition-colors"
              >
                <Search size={16} />
                {loading ? "Loading…" : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Report */}
        {report && report.rows.length > 0 && (
          <div className="bg-white rounded-2xl shadow">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800 text-base">
                  {report.productName ? report.productName : "All Products"} — As of {fmtLong(report.asOfDate)}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {report.branchName} | {report.totalAccounts} account{report.totalAccounts !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint}       className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"><Printer size={14} /> Print</button>
                <button onClick={handleExportPdf}   className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"><FileText size={14} /> PDF</button>
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors"><FileSpreadsheet size={14} /> Excel</button>
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-3 bg-red-50 border-b border-red-100">
              <div className="text-center">
                <p className="text-xs text-gray-500">Accounts</p>
                <p className="font-bold text-gray-800 text-lg">{report.totalAccounts}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Principal</p>
                <p className="font-bold text-blue-700 text-lg">₹{fmt(report.totalPrincipal)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Interest</p>
                <p className="font-bold text-orange-600 text-lg">₹{fmt(report.totalInterest)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Total Overdue</p>
                <p className="font-bold text-red-700 text-lg">₹{fmt(report.totalOverdue)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-3 py-2.5 text-center font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Account No</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Account Name</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Opening Date</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Principal (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Interest (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Overdue (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Instt (₹)</th>
                    <th className="px-3 py-2.5 text-center font-semibold">OD Inst.</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Guarantor 1</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Guarantor 2</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr
                      key={r.accountId}
                      className={`border-b border-gray-100 ${r.overdueAmount > 0 ? "bg-red-50/40" : ""} hover:bg-orange-50/50 transition-colors`}
                    >
                      <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-sm font-semibold text-blue-700">{r.accountNumber}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.accountName}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{fmtDate(r.openingDate)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(r.outstandingPrincipal)}</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-700">{r.outstandingInterest > 0 ? fmt(r.outstandingInterest) : <span className="text-gray-400">—</span>}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${r.overdueAmount > 0 ? "text-red-700" : "text-gray-400"}`}>
                        {r.overdueAmount > 0 ? fmt(r.overdueAmount) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">{r.kistAmount > 0 ? fmt(r.kistAmount) : <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-center">
                        {r.overdueInstallments > 0
                          ? <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{r.overdueInstallments}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.guarantor1 || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{r.guarantor2 || <span className="text-gray-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td colSpan={4} className="px-3 py-2.5 text-center text-gray-700">TOTAL</td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-800">₹{fmt(report.totalPrincipal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-700">₹{fmt(report.totalInterest)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-700">₹{fmt(report.totalOverdue)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LoanOverdue;
