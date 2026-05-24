import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookOpen, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import DatePicker from "../../components/DatePicker";
import rdLedgerApi, {
  RDProductItem,
  RDAccountItem,
  RDLedger,
} from "../../services/reports/rdLedgerApi";
import dayBookApi from "../../services/reports/dayBookApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBal = (n: number) => {
  if (n === 0) return "0.00";
  return `${fmt(Math.abs(n))} ${n > 0 ? "Cr" : "Dr"}`;
};

const isoDatePart = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const toInputDate = (iso: string) => isoDatePart(iso);

const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`bg-slate-800 text-white px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap sticky top-0 z-10 border-r border-slate-700 last:border-r-0 ${className}`}>
    {children}
  </th>
);

const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border-b border-slate-100 px-3 py-2 text-xs ${className}`}>
    {children}
  </td>
);

const TDF = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`bg-slate-100 border-t-2 border-slate-400 border-b border-slate-200 px-3 py-2.5 text-xs font-bold sticky bottom-0 z-10 ${className}`}>
    {children}
  </td>
);

const LedgerTable: React.FC<{ data: RDLedger; longNar: boolean }> = ({ data, longNar }) => (
  <table className="w-full border-collapse text-xs">
    <thead>
      <tr>
        <TH className="w-10 text-center">S.No</TH>
        <TH className="w-22 text-center">Date</TH>
        <TH className="w-14 text-center">V.No</TH>
        <TH className="text-left">Particulars</TH>
        <TH className="w-28 text-right">Withdrawals (Dr)</TH>
        <TH className="w-28 text-right">Kist / Deposits (Cr)</TH>
        <TH className="w-28 text-right">Balance</TH>
      </tr>
    </thead>
    <tbody>
      <tr className="bg-amber-50 border-l-4 border-amber-400">
        <TD className="text-center text-amber-800" />
        <TD className="text-center text-amber-800 font-semibold whitespace-nowrap">{fmtShort(data.fromDate)}</TD>
        <TD className="text-amber-800" />
        <TD className="text-amber-800 font-semibold italic">Opening Balance</TD>
        <TD className="text-amber-800" />
        <TD className="text-amber-800" />
        <TD className="text-right text-amber-900 font-bold">{fmtBal(data.openingBalance)}</TD>
      </tr>
      {data.entries.length === 0 ? (
        <tr>
          <td colSpan={7} className="text-center py-10 text-slate-400 italic text-xs">
            No transactions found for the selected period.
          </td>
        </tr>
      ) : data.entries.map((entry, i) => (
        <tr key={i} className={`hover:bg-blue-50/50 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}>
          <TD className="text-center text-slate-500">{i + 1}</TD>
          <TD className="text-center whitespace-nowrap text-slate-600">{fmtShort(entry.voucherDate)}</TD>
          <TD className="text-center text-slate-600">{entry.voucherNo}</TD>
          <TD className="text-slate-800">
            {entry.particulars}
            {longNar && entry.narration && <span className="text-slate-400"> — {entry.narration}</span>}
          </TD>
          <TD className="text-right text-red-700 font-medium">{entry.dr != null ? fmt(entry.dr) : ""}</TD>
          <TD className="text-right text-emerald-700 font-medium">{entry.cr != null ? fmt(entry.cr) : ""}</TD>
          <TD className="text-right font-semibold text-slate-800">{fmtBal(entry.balance)}</TD>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr>
        <TDF colSpan={4} className="text-right text-slate-700">Total</TDF>
        <TDF className="text-right text-red-700">{fmt(data.totalDr)}</TDF>
        <TDF className="text-right text-emerald-700">{fmt(data.totalCr)}</TDF>
        <TDF className="text-right text-slate-800">{fmtBal(data.closingBalance)}</TDF>
      </tr>
    </tfoot>
  </table>
);

const buildExportConfig = (data: RDLedger, longNar: boolean): ExportConfig => {
  const columns = [
    { header: "S.No",          widthRatio: 0.05, align: "center" as const },
    { header: "Date",          widthRatio: 0.10, align: "center" as const },
    { header: "V.No",          widthRatio: 0.07, align: "center" as const },
    { header: "Particulars",   widthRatio: 0.40, align: "left"   as const },
    { header: "Withdrawals",   widthRatio: 0.13, align: "right"  as const },
    { header: "Kist/Deposits", widthRatio: 0.13, align: "right"  as const },
    { header: "Balance",       widthRatio: 0.12, align: "right"  as const },
  ];
  const rows: ExportRow[] = [];
  const info1 = [
    `Name: ${data.accountName}`,
    `Acc No: ${data.accountIdentifier}`,
    data.relativeName && `Relative: ${data.relativeName}`,
    data.contactNo && `Contact: ${data.contactNo}`,
    data.address && `Address: ${data.address}`,
  ].filter(Boolean).join("  |  ");
  const info2 = [
    data.kistAmount != null && `Kist Amt: ${fmt(data.kistAmount)}`,
    data.rdDate && `RD Date: ${fmtShort(data.rdDate)}`,
    data.firstKistDate && `1st Kist: ${fmtShort(data.firstKistDate)}`,
    data.kistInterval && `Kist Interval: ${data.kistInterval}`,
    data.periodMonths != null && `Period: ${data.periodMonths}M`,
    data.interestRate != null && `Int Rate: ${data.interestRate}%`,
    data.maturityDate && `Maturity: ${fmtShort(data.maturityDate)}`,
    data.maturityAmount != null && `Mat Amt: ${fmt(data.maturityAmount)}`,
  ].filter(Boolean).join("  |  ");
  if (info1) rows.push({ style: "info", spanFirst: 7, cells: [info1] });
  if (info2) rows.push({ style: "info", spanFirst: 7, cells: [info2] });
  rows.push({ style: "ob", spanFirst: 4, cells: [`Opening Balance  ${fmtShort(data.fromDate)}`, "", "", "", "", "", fmtBal(data.openingBalance)] });
  data.entries.forEach((e, i) => {
    const par = longNar && e.narration ? `${e.particulars} — ${e.narration}` : e.particulars;
    rows.push({ style: "normal", cells: [String(i + 1), fmtShort(e.voucherDate), String(e.voucherNo), par, e.dr != null ? fmt(e.dr) : "", e.cr != null ? fmt(e.cr) : "", fmtBal(e.balance)] });
  });
  rows.push({ style: "total", spanFirst: 4, cells: ["Closing Balance", "", "", "", fmt(data.totalDr), fmt(data.totalCr), fmtBal(data.closingBalance)] });
  return {
    meta: {
      title: data.branchName, subtitle: data.branchAddress,
      reportTitle: `RD Ledger — ${data.accountIdentifier} ${data.accountName} | ${fmtShort(data.fromDate)} to ${fmtShort(data.toDate)}`,
      fileName: `RDLedger_${data.accountIdentifier}_${isoDatePart(data.fromDate)}_${isoDatePart(data.toDate)}`,
      landscape: true,
    },
    columns, rows,
  };
};

const buildPrintHTML = (data: RDLedger, longNar: boolean): string => {
  let sno = 0;
  let rows = `<tr class="ob-row"><td></td><td style="text-align:center">${fmtShort(data.fromDate)}</td><td></td><td>Opening Balance</td><td></td><td></td><td class="amt">${fmtBal(data.openingBalance)}</td></tr>`;
  data.entries.forEach((e) => {
    sno++;
    const par = longNar && e.narration ? `${e.particulars} — ${e.narration}` : e.particulars;
    rows += `<tr class="${sno % 2 === 0 ? "even" : ""}"><td style="text-align:center">${sno}</td><td style="text-align:center;white-space:nowrap">${fmtShort(e.voucherDate)}</td><td style="text-align:center">${e.voucherNo}</td><td>${par}</td><td class="amt dr">${e.dr != null ? fmt(e.dr) : ""}</td><td class="amt cr">${e.cr != null ? fmt(e.cr) : ""}</td><td class="amt">${fmtBal(e.balance)}</td></tr>`;
  });
  rows += `<tr class="total-row"><td colspan="4" style="text-align:right">Total / Closing Balance</td><td class="amt dr">${fmt(data.totalDr)}</td><td class="amt cr">${fmt(data.totalCr)}</td><td class="amt">${fmtBal(data.closingBalance)}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RD Ledger</title><style>
    *{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:12px;}
    .report-header{text-align:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #334155;}
    .report-header h1{font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#1e293b;}
    .report-header p{font-size:10px;margin-top:3px;color:#64748b;}
    .report-header h2{font-size:11px;font-weight:600;margin-top:6px;color:#475569;letter-spacing:1px;text-transform:uppercase;}
    .acc-info{background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;margin-bottom:10px;font-size:10px;display:flex;gap:16px;flex-wrap:wrap;border-radius:4px;}
    .acc-info .lbl{color:#64748b;font-weight:500;}
    table{width:100%;border-collapse:collapse;}
    thead th{background:#1e293b;color:#fff;border:1px solid #334155;padding:4px 6px;text-align:center;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;}
    tbody td{border:1px solid #e2e8f0;padding:2px 5px;vertical-align:top;font-size:10.5px;}
    tbody tr.even td{background:#f8fafc;}
    .ob-row td{background:#fffbeb;color:#92400e;font-weight:600;border-color:#fde68a;}
    .total-row td{background:#f1f5f9;font-weight:700;border-top:2px solid #64748b;color:#1e293b;}
    .amt{text-align:right;font-variant-numeric:tabular-nums;}.dr{color:#b91c1c;}.cr{color:#065f46;}
    .summary{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;}
    .summary-card{border:1px solid #e2e8f0;padding:6px 12px;border-radius:4px;border-top-width:3px;}
    .summary-card .lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}
    .summary-card .val{font-size:12px;font-weight:700;margin-top:2px;}
    @media print{body{padding:6px;}@page{margin:10mm;size:A4 landscape;}}
  </style></head><body>
  <div class="report-header">
    <h1>${data.branchName}</h1><p>${data.branchAddress}</p><h2>Recurring Deposit (RD) Account Ledger</h2>
  </div>
  <div class="acc-info">
    <span><span class="lbl">Name:</span> <strong>${data.accountName}</strong></span>
    <span><span class="lbl">Acc No:</span> <strong>${data.accountIdentifier}</strong></span>
    <span><span class="lbl">Product:</span> <strong>${data.productName}</strong></span>
    ${data.relativeName ? `<span><span class="lbl">Relative:</span> <strong>${data.relativeName}</strong></span>` : ""}
    ${data.contactNo ? `<span><span class="lbl">Contact:</span> <strong>${data.contactNo}</strong></span>` : ""}
    ${data.address ? `<span><span class="lbl">Address:</span> <strong>${data.address}</strong></span>` : ""}
    ${data.kistAmount != null ? `<span><span class="lbl">Kist Amt:</span> <strong>&#8377;${fmt(data.kistAmount)}</strong></span>` : ""}
    ${data.rdDate ? `<span><span class="lbl">RD Date:</span> <strong>${fmtShort(data.rdDate)}</strong></span>` : ""}
    ${data.firstKistDate ? `<span><span class="lbl">1st Kist:</span> <strong>${fmtShort(data.firstKistDate)}</strong></span>` : ""}
    ${data.kistInterval ? `<span><span class="lbl">Kist Interval:</span> <strong>${data.kistInterval}</strong></span>` : ""}
    ${data.periodMonths != null ? `<span><span class="lbl">Period:</span> <strong>${data.periodMonths}M</strong></span>` : ""}
    ${data.interestRate != null ? `<span><span class="lbl">Int Rate:</span> <strong>${data.interestRate}%</strong></span>` : ""}
    ${data.maturityDate ? `<span><span class="lbl">Maturity:</span> <strong>${fmtShort(data.maturityDate)}</strong></span>` : ""}
    ${data.maturityAmount != null ? `<span><span class="lbl">Mat Amt:</span> <strong>&#8377;${fmt(data.maturityAmount)}</strong></span>` : ""}
    <span><span class="lbl">Period:</span> <strong>${fmtDate(data.fromDate)} to ${fmtDate(data.toDate)}</strong></span>
  </div>
  <table><thead><tr>
    <th style="width:28px">S.No</th><th style="width:72px">Date</th><th style="width:40px">V.No</th>
    <th style="text-align:left">Particulars</th><th style="width:90px">Withdrawals</th><th style="width:90px">Kist/Deposits</th><th style="width:90px">Balance</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <div class="summary">
    <div class="summary-card" style="border-top-color:#3b82f6"><div class="lbl">Opening Balance</div><div class="val" style="color:#1d4ed8">₹${fmtBal(data.openingBalance)}</div></div>
    <div class="summary-card" style="border-top-color:#10b981"><div class="lbl">Total Kist/Deposits</div><div class="val" style="color:#065f46">₹${fmt(data.totalCr)}</div></div>
    <div class="summary-card" style="border-top-color:#ef4444"><div class="lbl">Total Withdrawals</div><div class="val" style="color:#b91c1c">₹${fmt(data.totalDr)}</div></div>
    <div class="summary-card" style="border-top-color:#8b5cf6"><div class="lbl">Closing Balance</div><div class="val" style="color:#6d28d9">₹${fmtBal(data.closingBalance)}</div></div>
  </div>
</body></html>`;
};

const RDLedgerPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : new Date().toISOString().split("T")[0];

  const [sessionMinDate, setSessionMinDate] = useState("");
  const [sessionMaxDate, setSessionMaxDate] = useState(workingDate);
  const [products, setProducts] = useState<RDProductItem[]>([]);
  const [accounts, setAccounts] = useState<RDAccountItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | "">("");
  const [selectedAccount, setSelectedAccount] = useState<number | "">("");
  const [tillDateOnly, setTillDateOnly] = useState(false);
  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate] = useState(workingDate);
  const [withLongNarration, setWithLongNarration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RDLedger | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    dayBookApi.getSessionDates(user.branchid).then((res) => {
      if (res.success && res.data) {
        const minD = toInputDate(res.data.fromDate);
        const maxD = workingDate < toInputDate(res.data.toDate) ? workingDate : toInputDate(res.data.toDate);
        setSessionMinDate(minD); setSessionMaxDate(maxD);
        if (!tillDateOnly) setFromDate(minD);
        setToDate(maxD);
      }
    }).catch(() => {});
    rdLedgerApi.getRDProducts(user.branchid).then((res) => {
      if (res.success && res.data) setProducts(res.data);
    }).catch(() => {});
  }, [user.branchid]);

  useEffect(() => {
    setData(null);
    if (!user.branchid || selectedProduct === "") { setAccounts([]); setSelectedAccount(""); return; }
    rdLedgerApi.getRDAccounts(user.branchid, selectedProduct).then((res) => {
      if (res.success && res.data) { setAccounts(res.data); setSelectedAccount(""); }
    }).catch(() => {});
  }, [selectedProduct]);

  useEffect(() => {
    if (tillDateOnly && sessionMinDate) setFromDate(sessionMinDate);
  }, [tillDateOnly, sessionMinDate]);

  const effectiveFromDate = tillDateOnly ? sessionMinDate || fromDate : fromDate;

  const handleShow = async () => {
    if (selectedProduct === "") { Swal.fire("Validation", "Please select an RD Product.", "warning"); return; }
    if (selectedAccount === "") { Swal.fire("Validation", "Please select an Account.", "warning"); return; }
    if (!effectiveFromDate || !toDate) { Swal.fire("Validation", "Please select the date range.", "warning"); return; }
    if (effectiveFromDate > toDate) { Swal.fire("Validation", "From Date cannot be after To Date.", "warning"); return; }
    setLoading(true); setData(null);
    try {
      const res = await rdLedgerApi.getRDLedger(user.branchid, selectedAccount as number, effectiveFromDate, toDate);
      if (res.success && res.data) setData(res.data);
      else Swal.fire("Error", res.message || "Failed to load ledger.", "error");
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Unable to reach server.", "error");
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintHTML(data, withLongNarration));
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const selectClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm bg-white text-slate-800 shadow-sm disabled:bg-slate-50 disabled:text-slate-400";
  const dateClass  = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm shadow-sm";
  const labelClass = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
          <div className="w-full space-y-5">

            {/* ── Filter Card ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
                <div className="w-1 self-stretch bg-blue-600 rounded-full" />
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">RD Account Ledger</h2>
                  <p className="text-xs text-slate-500">Transaction history for a recurring deposit account</p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Account Selection</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>RD Product <span className="text-red-500 normal-case">*</span></label>
                      <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value === "" ? "" : Number(e.target.value))} className={selectClass}>
                        <option value="">— Select Product —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.productCode} — {p.productName}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelClass}>Account <span className="text-red-500 normal-case">*</span></label>
                      <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value === "" ? "" : Number(e.target.value)); setData(null); }} disabled={accounts.length === 0} className={selectClass}>
                        <option value="">— Select Account —</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountIdentifier} — {a.accountName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Date Range</p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                      <input type="checkbox" checked={tillDateOnly} onChange={(e) => setTillDateOnly(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                      Till Date Only
                    </label>
                    {!tillDateOnly && (
                      <div className="w-44">
                        <label className={labelClass}>From Date <span className="text-red-500 normal-case">*</span></label>
                        <DatePicker value={fromDate} onChange={setFromDate} min={sessionMinDate || undefined} max={workingDate} workingDate={workingDate} className={dateClass} />
                      </div>
                    )}
                    <div className="w-44">
                      <label className={labelClass}>{tillDateOnly ? "Till Date" : "To Date"} <span className="text-red-500 normal-case">*</span></label>
                      <DatePicker value={toDate} onChange={setToDate} min={tillDateOnly ? undefined : (sessionMinDate || undefined)} max={workingDate} workingDate={workingDate} className={dateClass} />
                    </div>
                    {sessionMinDate && (
                      <div className="text-xs text-slate-400 pb-1">
                        Session: <span className="text-slate-600 font-medium">{fmtDate(sessionMinDate)}</span> — <span className="text-slate-600 font-medium">{fmtDate(sessionMaxDate)}</span>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none pb-1">
                      <input type="checkbox" checked={withLongNarration} onChange={(e) => setWithLongNarration(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                      With Long Narration
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-400">Fields marked <span className="text-red-500">*</span> are mandatory</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleShow} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                    {loading ? "Loading…" : "Show"}
                  </button>
                  {data && (
                    <>
                      <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
                        <Printer size={15} /> Print
                      </button>
                      <button onClick={() => exportToPdf(buildExportConfig(data, withLongNarration))} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                        <FileText size={15} /> PDF
                      </button>
                      <button onClick={() => exportToExcel(buildExportConfig(data, withLongNarration))} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                        <FileSpreadsheet size={15} /> Excel
                      </button>
                    </>
                  )}
                  <button onClick={() => navigate("/dashboard")} className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* ── Ledger Report ── */}
            {data && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="text-center px-6 py-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">Statement of Account</p>
                  <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">{data.branchName}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">{data.branchAddress}</p>
                  <div className="flex items-center gap-3 justify-center mt-3">
                    <div className="h-px bg-slate-200 flex-1 max-w-16" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-600 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">Recurring Deposit (RD) Account Ledger</span>
                    <div className="h-px bg-slate-200 flex-1 max-w-16" />
                  </div>
                </div>

                {/* Account info panel */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                    {[
                      { label: "Name",           value: data.accountName },
                      { label: "Acc. No.",        value: data.accountIdentifier },
                      { label: "Address",         value: data.address },
                      { label: "Relative Name",   value: data.relativeName },
                      { label: "Contact No.",     value: data.contactNo },
                      { label: "Product",         value: data.productName },
                      { label: "Period",          value: `${fmtDate(data.fromDate)} to ${fmtDate(data.toDate)}` },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="flex gap-1 min-w-0">
                        <span className="text-slate-400 font-medium shrink-0">{label}:</span>
                        <span className="font-semibold text-slate-800 truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  {(data.kistAmount != null || data.rdDate || data.periodMonths != null || data.interestRate != null) && (
                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                      {[
                        { label: "Kist Amount",     value: data.kistAmount != null ? `₹${data.kistAmount.toLocaleString("en-IN")}` : null },
                        { label: "RD Date",         value: data.rdDate ? fmtShort(data.rdDate) : null },
                        { label: "First Kist Date", value: data.firstKistDate ? fmtShort(data.firstKistDate) : null },
                        { label: "Kist Interval",   value: data.kistInterval != null ? `${data.kistInterval} Month(s)` : null },
                        { label: "Period",          value: data.periodMonths != null ? `${data.periodMonths} Months` : null },
                        { label: "Int. Rate",       value: data.interestRate != null ? `${data.interestRate}%` : null },
                        { label: "Maturity Date",   value: data.maturityDate ? fmtShort(data.maturityDate) : null },
                        { label: "Maturity Amt.",   value: data.maturityAmount != null ? `₹${data.maturityAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null },
                      ].filter(f => f.value).map(({ label, value }) => (
                        <div key={label} className="flex gap-1 min-w-0">
                          <span className="text-slate-400 font-medium shrink-0">{label}:</span>
                          <span className="font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto overflow-y-auto max-h-[58vh]">
                    <LedgerTable data={data} longNar={withLongNarration} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-4 border-t-blue-500">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Opening Balance</p>
                      <p className="text-lg font-bold text-blue-700 mt-1">₹{fmtBal(data.openingBalance)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-4 border-t-emerald-500">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total Kist / Deposits</p>
                      <p className="text-lg font-bold text-emerald-700 mt-1">₹{fmt(data.totalCr)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-4 border-t-red-500">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total Withdrawals</p>
                      <p className="text-lg font-bold text-red-700 mt-1">₹{fmt(data.totalDr)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-4 border-t-violet-500">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Closing Balance</p>
                      <p className="text-lg font-bold text-violet-700 mt-1">₹{fmtBal(data.closingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

export default RDLedgerPage;
