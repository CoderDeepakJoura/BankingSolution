import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { RefreshCw, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import rdKistReceiveApi, {
  RDKistReceive,
  RDKistProductItem,
} from "../../services/reports/rdKistReceiveApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt     = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDate(iso);

// ── Export helpers ─────────────────────────────────────────────────────────────

const buildExportConfig = (report: RDKistReceive): ExportConfig => {
  const rows: ExportRow[] = [];

  if (!report.showDatewise) {
    // Non-datewise columns
    const columns = [
      { header: "S.No",          widthRatio: 0.06, align: "center" as const },
      { header: "Account Name",  widthRatio: 0.55, align: "left"   as const },
      { header: "Credit Amount", widthRatio: 0.22, align: "right"  as const },
      { header: "No. of Kist",   widthRatio: 0.17, align: "center" as const },
    ];
    report.summaryRows.forEach(r => rows.push({
      style: "normal",
      cells: [String(r.sNo), r.accountName + (r.accountNumber ? `  Acc No. ${r.accountNumber}` : ""), fmt(r.creditAmount), String(r.noOfKist)],
    }));
    rows.push({ style: "total", spanFirst: 2, cells: [`Total (${report.totalCount})`, "", fmt(report.grandTotal), ""] });

    return {
      meta: {
        title: report.branchName, subtitle: report.branchAddress,
        reportTitle: `RD Kist Receive | ${fmtLong(report.fromDate)} To ${fmtLong(report.toDate)}${report.productName !== "All Products" ? ` | ${report.productName}` : ""}`,
        fileName: `RDKistReceive_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
        landscape: false,
      },
      columns, rows,
    };
  } else {
    // Datewise columns
    const columns = [
      { header: "S.No",          widthRatio: 0.06, align: "center" as const },
      { header: "Account Name",  widthRatio: 0.45, align: "left"   as const },
      { header: "Credit Amount", widthRatio: 0.18, align: "right"  as const },
      { header: "Voucher No.",   widthRatio: 0.14, align: "center" as const },
      { header: "No. of Kist",   widthRatio: 0.17, align: "center" as const },
    ];
    report.dateGroups.forEach(g => {
      rows.push({ style: "date", spanFirst: 5, cells: [fmtShort(g.date), "", "", "", ""] });
      g.rows.forEach(r => rows.push({
        style: "normal",
        cells: [String(r.sNo), r.accountName + (r.accountNumber ? `  Acc No. ${r.accountNumber}` : ""), fmt(r.creditAmount), String(r.voucherNo), String(r.noOfKist)],
      }));
      rows.push({ style: "subtotal", spanFirst: 2, cells: ["Date Wise Total :", "", fmt(g.dateTotal), "", ""] });
    });
    rows.push({ style: "total", spanFirst: 2, cells: [`Grand Total (${report.totalCount})`, "", fmt(report.grandTotal), "", ""] });

    return {
      meta: {
        title: report.branchName, subtitle: report.branchAddress,
        reportTitle: `RD Kist Receive (Date Wise) | ${fmtLong(report.fromDate)} To ${fmtLong(report.toDate)}${report.productName !== "All Products" ? ` | ${report.productName}` : ""}`,
        fileName: `RDKistReceive_Datewise_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
        landscape: true,
      },
      columns, rows,
    };
  }
};

const buildPrintHTML = (report: RDKistReceive): string => {
  const title = `RD Kist Receive${report.showDatewise ? " (Date Wise)" : ""}`;
  const subtitle = `Report as on Date: ${fmtLong(report.fromDate)} To Date ${fmtLong(report.toDate)}${report.productName !== "All Products" ? ` for : ${report.productName}` : ""}`;

  let bodyRows = "";

  if (!report.showDatewise) {
    report.summaryRows.forEach((r, i) => {
      bodyRows += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="text-align:center">${r.sNo}</td>
        <td>${r.accountName}${r.accountNumber ? ` Acc No. ${r.accountNumber}` : ""}</td>
        <td class="amt">${fmt(r.creditAmount)}</td>
        <td style="text-align:center">${r.noOfKist}</td>
      </tr>`;
    });
    bodyRows += `<tr class="total-row">
      <td colspan="2" style="text-align:right">Total (${report.totalCount})</td>
      <td class="amt">${fmt(report.grandTotal)}</td>
      <td></td>
    </tr>`;
  } else {
    report.dateGroups.forEach(g => {
      bodyRows += `<tr class="date-row"><td colspan="5">${fmtShort(g.date)}</td></tr>`;
      g.rows.forEach((r, i) => {
        bodyRows += `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
          <td style="text-align:center">${r.sNo}</td>
          <td>${r.accountName}${r.accountNumber ? ` Acc No. ${r.accountNumber}` : ""}</td>
          <td class="amt">${fmt(r.creditAmount)}</td>
          <td style="text-align:center">${r.voucherNo}</td>
          <td style="text-align:center">${r.noOfKist}</td>
        </tr>`;
      });
      bodyRows += `<tr class="subtotal-row">
        <td colspan="2" style="text-align:right">Date Wise Total :</td>
        <td class="amt">${fmt(g.dateTotal)}</td>
        <td colspan="2"></td>
      </tr>`;
    });
    bodyRows += `<tr class="total-row">
      <td colspan="2" style="text-align:right">Grand Total (${report.totalCount})</td>
      <td class="amt">${fmt(report.grandTotal)}</td>
      <td colspan="2"></td>
    </tr>`;
  }

  const nonDatewiseCols = `
    <th style="width:40px">S.No</th>
    <th style="text-align:left">Account Name</th>
    <th style="width:110px">Credit Amount</th>
    <th style="width:80px">No. Of Kist</th>`;

  const datewiseCols = `
    <th style="width:40px">S.No</th>
    <th style="text-align:left">Account Name</th>
    <th style="width:110px">Credit Amount</th>
    <th style="width:80px">Voucher No.</th>
    <th style="width:80px">No. Of Kist</th>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;font-size:10.5px;padding:14px;}
    .rh{text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #334155;}
    .rh h1{font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;}
    .rh h2{font-size:11px;font-weight:700;margin-top:5px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#4a5568;color:#fff;border:1px solid #2d3748;padding:4px 6px;font-size:9.5px;text-transform:uppercase;}
    td{border:1px solid #e2e8f0;padding:3px 5px;font-size:10px;}
    .date-row td{background:#2d3748;color:#fff;font-weight:700;padding:4px 6px;font-size:10px;}
    .subtotal-row td{background:#e2e8f0;font-weight:700;border-top:1px solid #94a3b8;}
    .total-row td{background:#1e293b;color:#fff;font-weight:700;border-top:2px solid #0f172a;}
    .amt{text-align:right;}
    @media print{body{padding:6px;}@page{margin:8mm;size:A4 ${report.showDatewise ? "landscape" : "portrait"};}}
  </style></head><body>
  <div class="rh">
    <h1>${report.branchName}</h1>
    ${report.branchAddress ? `<p style="font-size:10px;color:#555;margin-top:2px">${report.branchAddress}</p>` : ""}
    <h2>${subtitle}</h2>
  </div>
  <table>
    <thead><tr>${report.showDatewise ? datewiseCols : nonDatewiseCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  </body></html>`;
};

// ── Main Component ─────────────────────────────────────────────────────────────

const RDKistReceivePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [fromDate, setFromDate]       = useState(workingDate);
  const [toDate, setToDate]           = useState(workingDate);
  const [products, setProducts]       = useState<RDKistProductItem[]>([]);
  const [productId, setProductId]     = useState(0);
  const [showDatewise, setShowDatewise] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [report, setReport]           = useState<RDKistReceive | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    rdKistReceiveApi.getRDProducts(user.branchid).then(res => {
      setProducts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select both dates.", "warning"); return; }
    if (fromDate > toDate)    { Swal.fire("Validation", "From date cannot be after To date.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await rdKistReceiveApi.getRDKistReceive(user.branchid, fromDate, toDate, productId, showDatewise);
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

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 shadow-sm bg-white";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* ── Filter card ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">RD Kist Receive</h2>
                <p className="text-xs text-slate-500">RD instalment collections for the selected date range</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>Product</label>
                <select
                  value={productId}
                  onChange={e => { setProductId(Number(e.target.value)); setReport(null); }}
                  className={inp}
                >
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>From Date</label>
                <input type="date" value={fromDate} max={workingDate}
                  onChange={e => { setFromDate(e.target.value); setReport(null); }}
                  className={inp}
                />
              </div>

              <div>
                <label className={lbl}>To Date</label>
                <input type="date" value={toDate} max={workingDate}
                  onChange={e => { setToDate(e.target.value); setReport(null); }}
                  className={inp}
                />
              </div>

              {/* Datewise checkbox */}
              <div className="flex items-center gap-2 pb-0.5">
                <input
                  id="datewise" type="checkbox" checked={showDatewise}
                  onChange={e => { setShowDatewise(e.target.checked); setReport(null); }}
                  className="w-4 h-4 accent-teal-600 cursor-pointer"
                />
                <label htmlFor="datewise" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                  Show Datewise
                </label>
              </div>

              <button
                onClick={handleLoad} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                  : <><Search size={15} /> Show</>
                }
              </button>

              {report && (
                <>
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition shadow-sm cursor-pointer">
                    <Printer size={15} /> Print
                  </button>
                  <button onClick={() => exportToPdf(buildExportConfig(report))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition shadow-sm cursor-pointer">
                    <FileText size={15} /> PDF
                  </button>
                  <button onClick={() => exportToExcel(buildExportConfig(report))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition shadow-sm cursor-pointer">
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                </>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-slate-600 text-sm font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* ── Report ─────────────────────────────────────────────────────── */}
          {report && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Report header */}
              <div className="text-center px-6 py-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{report.branchName}</h1>
                {report.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{report.branchAddress}</p>}
                <p className="text-sm font-semibold text-slate-700 mt-2">
                  Report as on Date: {fmtLong(report.fromDate)} To Date {fmtLong(report.toDate)}
                  {report.productName !== "All Products" ? ` for : ${report.productName}` : ""}
                </p>
              </div>

              {/* Summary chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <Chip label="Total Entries"  value={String(report.totalCount)}       color="slate" />
                <Chip label="Grand Total"    value={`₹${fmt(report.grandTotal)}`}    color="teal"  />
                {report.showDatewise && (
                  <Chip label="Date Groups"  value={String(report.dateGroups.length)} color="blue"  />
                )}
              </div>

              {/* Table */}
              <div className="p-4 overflow-x-auto">
                {report.showDatewise ? (
                  /* ── Datewise table ──────────────────────────────────────── */
                  <DatewiseTable report={report} />
                ) : (
                  /* ── Non-datewise table ──────────────────────────────────── */
                  <SummaryTable report={report} />
                )}
              </div>
            </div>
          )}

          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <RefreshCw className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select filters and click Show to view the report</p>
            </div>
          )}

        </div>
      </div>
    } />
  );
};

// ── Non-datewise table ─────────────────────────────────────────────────────────

const SummaryTable: React.FC<{ report: RDKistReceive }> = ({ report }) => {
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (report.summaryRows.length === 0)
    return <p className="text-center py-12 text-slate-400 text-sm">No RD kist collections found.</p>;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <Th center>S.No</Th>
            <Th>Account Name</Th>
            <Th right>Credit Amount</Th>
            <Th center>No. Of Kist</Th>
          </tr>
        </thead>
        <tbody>
          {report.summaryRows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
              <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500">{r.sNo}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                {r.accountName}
                {r.accountNumber && <span className="text-slate-500"> Acc No. {r.accountNumber}</span>}
              </td>
              <td className="border-b border-slate-100 px-3 py-2 text-right font-medium text-teal-700">{fmt(r.creditAmount)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">{r.noOfKist}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-800">
            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-white">
              Total ({report.totalCount} entries)
            </td>
            <td className="px-3 py-2.5 text-right text-xs font-bold text-teal-300">{fmt(report.grandTotal)}</td>
            <td className="px-3 py-2.5" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Datewise table ─────────────────────────────────────────────────────────────

const DatewiseTable: React.FC<{ report: RDKistReceive }> = ({ report }) => {
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtS = (iso: string) => {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB");
  };

  if (report.dateGroups.length === 0)
    return <p className="text-center py-12 text-slate-400 text-sm">No RD kist collections found.</p>;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-y-auto max-h-[65vh]">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <Th center sticky>S.No</Th>
            <Th sticky>Account Name</Th>
            <Th right sticky>Credit Amount</Th>
            <Th center sticky>Voucher No.</Th>
            <Th center sticky>No. Of Kist</Th>
          </tr>
        </thead>
        <tbody>
          {report.dateGroups.map((g) => (
            <React.Fragment key={g.date}>
              {/* Date header row */}
              <tr>
                <td colSpan={5} className="bg-slate-700 text-white font-bold px-4 py-2 text-xs tracking-wide">
                  {fmtS(g.date)}
                </td>
              </tr>

              {/* Account rows */}
              {g.rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-500">{r.sNo}</td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.accountName}
                    {r.accountNumber && <span className="text-slate-500"> Acc No. {r.accountNumber}</span>}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-right font-medium text-teal-700">{fmt(r.creditAmount)}</td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-600">{r.voucherNo}</td>
                  <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">{r.noOfKist}</td>
                </tr>
              ))}

              {/* Date wise total */}
              <tr className="bg-slate-100">
                <td colSpan={2} className="px-3 py-2 text-right font-bold text-slate-700 border-t border-slate-300">
                  Date Wise Total :
                </td>
                <td className="px-3 py-2 text-right font-bold text-teal-700 border-t border-slate-300">{fmt(g.dateTotal)}</td>
                <td colSpan={2} className="border-t border-slate-300" />
              </tr>
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-800">
            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-bold text-white">
              Grand Total ({report.totalCount} entries)
            </td>
            <td className="px-3 py-2.5 text-right text-xs font-bold text-teal-300">{fmt(report.grandTotal)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Small helpers ──────────────────────────────────────────────────────────────

const Th: React.FC<{ children: React.ReactNode; center?: boolean; right?: boolean; sticky?: boolean }> = ({ children, center, right, sticky }) => (
  <th className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider border-r border-slate-700 last:border-r-0 whitespace-nowrap
    ${center ? "text-center" : right ? "text-right" : "text-left"}
    ${sticky ? "sticky top-0 z-10" : ""}`}>
    {children}
  </th>
);

const Chip: React.FC<{ label: string; value: string; color: "slate" | "teal" | "blue" }> = ({ label, value, color }) => {
  const c = { slate: "border-t-slate-400 text-slate-700", teal: "border-t-teal-500 text-teal-700", blue: "border-t-blue-500 text-blue-700" }[color];
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-3 shadow-sm border-t-4 ${c} text-center`}>
      <p className="text-xs text-slate-500 uppercase font-medium">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
};

export default RDKistReceivePage;
