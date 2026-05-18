import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookOpen, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import cashBookApi, { CashBook, CashBookEntry } from "../../services/reports/cashBookApi";
import dayBookApi from "../../services/reports/dayBookApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";
import DatePicker from "../../components/DatePicker";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

const fmtShort = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB");

const fmtDateKey = (iso: string) => isoDatePart(iso);

const toInputDate = (iso: string) => isoDatePart(iso);

const particulars = (e: CashBookEntry, longNar: boolean) => {
  const base = `V.No.:- ${e.voucherNo} ${e.contraAccountName} - ${e.contraAccountIdentifier}`;
  return longNar && e.narration ? `${base} - ${e.narration}` : base;
};

const groupByDate = (entries: CashBookEntry[]) => {
  const map = new Map<string, CashBookEntry[]>();
  for (const e of entries) {
    const key = fmtDateKey(e.voucherDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
};

// ── TD helpers ─────────────────────────────────────────────────────────────────
const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs ${className}`}>{children}</td>
);
const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`border border-gray-400 px-2 py-1 text-xs font-bold bg-blue-100 text-gray-800 sticky top-0 z-10 ${className}`}>{children}</th>
);
const TDF = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs sticky bottom-0 z-10 ${className}`}>{children}</td>
);

// ── LR Side component ─────────────────────────────────────────────────────────
const LRSide: React.FC<{
  entries: CashBookEntry[];
  side: "receipts" | "payments";
  openingBalance: number;
  closingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  fromDate: string;
  longNar: boolean;
}> = ({ entries, side, openingBalance, closingBalance, totalReceipts, totalPayments, fromDate, longNar }) => {
  let sno = 0;
  const grandTotal = side === "receipts"
    ? openingBalance + totalReceipts
    : totalPayments + closingBalance;

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <TH className="w-8 text-center">SNo</TH>
          <TH className="text-left">Particulars</TH>
          <TH className="w-24 text-right">Amount</TH>
          <TH className="w-24 text-right">Date Total</TH>
        </tr>
      </thead>
      <tbody>
        {/* Opening Balance — Receipts only */}
        {side === "receipts" && (
          <tr className="bg-red-50">
            <TD className="text-center" />
            <TD className="text-red-700 font-semibold">Opening Balance on {fmtDate(fromDate)}</TD>
            <TD className="text-right text-red-700 font-semibold">{fmt(openingBalance)}</TD>
            <TD />
          </tr>
        )}

        {groupByDate(entries).map(({ date, items }) => {
          const dateTotal = items.reduce((s, e) => s + e.amount, 0);
          return (
            <React.Fragment key={date}>
              <tr className="bg-yellow-50">
                <TD className="text-center" />
                <TD className="font-semibold text-yellow-800 text-center">{fmtDate(date)}</TD>
                <TD className="text-right font-semibold text-yellow-800">{fmt(dateTotal)}</TD>
                <TD className="text-right font-semibold text-yellow-800">{fmt(dateTotal)}</TD>
              </tr>
              {items.map((entry) => {
                sno++;
                return (
                  <tr key={`${entry.voucherNo}-${sno}`} className="hover:bg-gray-50">
                    <TD className="text-center">{sno}</TD>
                    <TD>{particulars(entry, longNar)}</TD>
                    <TD className="text-right">{fmt(entry.amount)}</TD>
                    <TD className="text-right text-gray-400">—</TD>
                  </tr>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Closing Balance — Payments only */}
        {side === "payments" && (
          <tr className="bg-green-50">
            <TD className="text-center" />
            <TD className="font-bold text-green-800">Closing Balance</TD>
            <TD className="text-right font-bold text-green-800">{fmt(closingBalance)}</TD>
            <TD />
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-gray-500">
          <TDF className="text-center bg-gray-200 font-bold" />
          <TDF className="bg-gray-200 font-bold">Total</TDF>
          <TDF className="bg-gray-200 text-right font-bold">{fmt(grandTotal)}</TDF>
          <TDF className="bg-gray-200 text-right font-bold">{fmt(grandTotal)}</TDF>
        </tr>
      </tfoot>
    </table>
  );
};

// ── Simple table ──────────────────────────────────────────────────────────────
const SimpleTable: React.FC<{ data: CashBook; longNar: boolean }> = ({ data, longNar }) => {
  const rows: { entry: CashBookEntry; side: "Dr" | "Cr" }[] = [
    ...data.receipts.map((e) => ({ entry: e, side: "Dr" as const })),
    ...data.payments.map((e) => ({ entry: e, side: "Cr" as const })),
  ];
  rows.sort((a, b) => {
    const dd = fmtDateKey(a.entry.voucherDate).localeCompare(fmtDateKey(b.entry.voucherDate));
    return dd !== 0 ? dd : a.entry.voucherNo - b.entry.voucherNo;
  });

  let sno = 0;
  let lastDate = "";

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <TH className="w-10 text-center">S.No</TH>
          <TH className="w-16 text-center">Vr.No</TH>
          <TH className="text-left">Particulars</TH>
          <TH className="w-28 text-right">Receipts (Dr)</TH>
          <TH className="w-28 text-right">Payments (Cr)</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ entry, side }, i) => {
          const dateKey = fmtDateKey(entry.voucherDate);
          const showDateRow = dateKey !== lastDate;
          if (showDateRow) lastDate = dateKey;
          sno++;
          return (
            <React.Fragment key={i}>
              {showDateRow && (
                <tr className="bg-yellow-50">
                  <TD colSpan={5} className="text-center font-semibold text-yellow-800 py-0.5">
                    {fmtDate(entry.voucherDate)}
                  </TD>
                </tr>
              )}
              <tr className="hover:bg-gray-50">
                <TD className="text-center">{sno}</TD>
                <TD className="text-center">{entry.voucherNo}</TD>
                <TD>{particulars(entry, longNar)}</TD>
                <TD className="text-right text-green-700">{side === "Dr" ? fmt(entry.amount) : ""}</TD>
                <TD className="text-right text-red-700">{side === "Cr" ? fmt(entry.amount) : ""}</TD>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="bg-gray-200 border-t-2 border-gray-500 font-bold">
          <TD colSpan={3} className="text-right font-bold">Total</TD>
          <TD className="text-right font-bold text-green-700">{fmt(data.totalReceipts)}</TD>
          <TD className="text-right font-bold text-red-700">{fmt(data.totalPayments)}</TD>
        </tr>
      </tbody>
    </table>
  );
};

// ── Export config ─────────────────────────────────────────────────────────────
const buildExportConfig = (data: CashBook, longNar: boolean): ExportConfig => {
  const columns = [
    { header: "S.No",        widthRatio: 0.05, align: "center" as const },
    { header: "Date",        widthRatio: 0.11, align: "center" as const },
    { header: "V.No.",       widthRatio: 0.07, align: "center" as const },
    { header: "Particulars", widthRatio: 0.47, align: "left"   as const },
    { header: "Receipts",    widthRatio: 0.15, align: "right"  as const },
    { header: "Payments",    widthRatio: 0.15, align: "right"  as const },
  ];

  const rows: ExportRow[] = [];

  rows.push({
    style: "ob",
    spanFirst: 4,
    cells: [`Opening Balance on ${fmtDate(data.fromDate)}`, "", "", "", fmt(data.openingBalance), ""],
  });

  if (data.receipts.length > 0) {
    rows.push({ style: "group", spanFirst: 6, cells: ["RECEIPTS", "", "", "", "", ""] });
    groupByDate(data.receipts).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e, i) => {
        rows.push({
          style: "normal",
          cells: [String(i + 1), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), fmt(e.amount), ""],
        });
      });
    });
    rows.push({ style: "subtotal", spanFirst: 4, cells: ["Total Receipts", "", "", "", fmt(data.totalReceipts), ""] });
  }

  if (data.payments.length > 0) {
    rows.push({ style: "group", spanFirst: 6, cells: ["PAYMENTS", "", "", "", "", ""] });
    groupByDate(data.payments).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e, i) => {
        rows.push({
          style: "normal",
          cells: [String(i + 1), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), "", fmt(e.amount)],
        });
      });
    });
    rows.push({ style: "subtotal", spanFirst: 4, cells: ["Total Payments", "", "", "", "", fmt(data.totalPayments)] });
  }

  rows.push({ style: "cb", spanFirst: 4, cells: ["Closing Balance", "", "", "", fmt(data.closingBalance), ""] });
  rows.push({
    style: "total",
    spanFirst: 4,
    cells: ["Total", "", "", "", fmt(data.totalReceipts + data.openingBalance), fmt(data.totalPayments + data.closingBalance)],
  });

  return {
    meta: {
      title: data.branchName,
      subtitle: data.branchAddress,
      reportTitle: `Cash Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}`,
      fileName: `CashBook_${fmtDateKey(data.fromDate)}_${fmtDateKey(data.toDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

// ── Print HTML ────────────────────────────────────────────────────────────────
const buildPrintHTML = (data: CashBook, withLeftRight: boolean, longNar: boolean): string => {
  const par = (e: CashBookEntry) => {
    const base = `V.No.:- ${e.voucherNo} ${e.contraAccountName} - ${e.contraAccountIdentifier}`;
    return longNar && e.narration ? `${base} - ${e.narration}` : base;
  };

  const buildLRTable = (entries: CashBookEntry[], side: "receipts" | "payments"): string => {
    const total =
      side === "receipts"
        ? data.openingBalance + data.totalReceipts
        : data.totalPayments + data.closingBalance;

    let sno = 0;
    let rows = "";

    if (side === "receipts") {
      rows += `<tr class="ob-row">
        <td class="sno"></td>
        <td>Opening Balance on ${fmtDate(data.fromDate)}</td>
        <td class="amt">${fmt(data.openingBalance)}</td>
        <td class="amt"></td>
      </tr>`;
    }

    groupByDate(entries).forEach(({ date, items }) => {
      const dateTotal = items.reduce((s, e) => s + e.amount, 0);
      rows += `<tr class="date-row">
        <td class="sno"></td>
        <td>${fmtDate(date)}</td>
        <td class="amt">${fmt(dateTotal)}</td>
        <td class="amt">${fmt(dateTotal)}</td>
      </tr>`;
      items.forEach((e) => {
        sno++;
        rows += `<tr>
          <td class="sno">${sno}</td>
          <td>${par(e)}</td>
          <td class="amt">${fmt(e.amount)}</td>
          <td class="amt">—</td>
        </tr>`;
      });
    });

    if (side === "payments") {
      rows += `<tr class="cb-row">
        <td class="sno"></td>
        <td>Closing Balance</td>
        <td class="amt">${fmt(data.closingBalance)}</td>
        <td class="amt"></td>
      </tr>`;
    }

    rows += `<tr class="total-row">
      <td class="sno"></td>
      <td>Total</td>
      <td class="amt">${fmt(total)}</td>
      <td class="amt">${fmt(total)}</td>
    </tr>`;

    return `<table>
      <thead><tr>
        <th style="width:28px">SNo</th>
        <th style="text-align:left">Particulars</th>
        <th style="width:90px">Amount</th>
        <th style="width:90px">Date Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const buildSimpleTable = (): string => {
    const rows: { entry: CashBookEntry; side: "Dr" | "Cr" }[] = [
      ...data.receipts.map((e) => ({ entry: e, side: "Dr" as const })),
      ...data.payments.map((e) => ({ entry: e, side: "Cr" as const })),
    ];
    rows.sort((a, b) => {
      const dd = fmtDateKey(a.entry.voucherDate).localeCompare(fmtDateKey(b.entry.voucherDate));
      return dd !== 0 ? dd : a.entry.voucherNo - b.entry.voucherNo;
    });

    let trs = "";
    let sno = 0;
    let lastDate = "";

    rows.forEach(({ entry, side }) => {
      const dateKey = fmtDateKey(entry.voucherDate);
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        trs += `<tr class="date-row"><td colspan="5">${fmtDate(entry.voucherDate)}</td></tr>`;
      }
      sno++;
      trs += `<tr>
        <td style="text-align:center">${sno}</td>
        <td style="text-align:center">${entry.voucherNo}</td>
        <td>${par(entry)}</td>
        <td class="amt" style="color:${side === "Dr" ? "#060" : ""}">${side === "Dr" ? fmt(entry.amount) : ""}</td>
        <td class="amt" style="color:${side === "Cr" ? "#900" : ""}">${side === "Cr" ? fmt(entry.amount) : ""}</td>
      </tr>`;
    });

    trs += `<tr class="total-row">
      <td colspan="3" style="text-align:right">Total</td>
      <td class="amt">${fmt(data.totalReceipts)}</td>
      <td class="amt">${fmt(data.totalPayments)}</td>
    </tr>`;

    return `<table>
      <thead><tr>
        <th style="width:32px">S.No</th>
        <th style="width:48px">Vr.No</th>
        <th style="text-align:left">Particulars</th>
        <th style="width:90px">Receipts (Dr)</th>
        <th style="width:90px">Payments (Cr)</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
  };

  const bodyContent = withLeftRight
    ? `<div class="lr-wrapper">
        <div class="lr-col">
          <div class="col-hdr receipts-hdr">Receipts</div>
          ${buildLRTable(data.receipts, "receipts")}
        </div>
        <div class="lr-divider"></div>
        <div class="lr-col">
          <div class="col-hdr payments-hdr">Payments</div>
          ${buildLRTable(data.payments, "payments")}
        </div>
       </div>`
    : buildSimpleTable();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cash Book</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 12px; }

    .report-header { text-align:center; margin-bottom:10px; }
    .report-header h1 { font-size:14px; font-weight:bold; text-decoration:underline; text-transform:uppercase; }
    .report-header p  { font-size:11px; margin-top:2px; }
    .report-header h2 { font-size:12px; font-weight:bold; margin-top:6px; }

    .day-label { text-align:center; border:1px solid #aaa; background:#f5f5f5;
                 padding:3px; font-weight:bold; margin-bottom:6px; }

    .lr-wrapper { display:flex; gap:0; width:100%; }
    .lr-col     { flex:1; min-width:0; }
    .lr-divider { width:2px; background:#888; margin:0 4px; }

    .col-hdr { text-align:center; font-weight:bold; padding:4px;
               font-size:12px; border:1px solid #555; }
    .receipts-hdr { background:#1e40af; color:#fff; }
    .payments-hdr { background:#9f1239; color:#fff; }

    table { width:100%; border-collapse:collapse; }
    th { border:1px solid #666; padding:3px 4px; background:#d0d8f0;
         text-align:center; font-weight:bold; }
    td { border:1px solid #aaa; padding:2px 4px; vertical-align:top; }

    .date-row td  { background:#fefce8; color:#854d0e; font-weight:bold; text-align:center; font-size:10px; }
    .ob-row td    { background:#fef2f2; color:#b91c1c; font-weight:bold; }
    .cb-row td    { background:#f0fdf4; color:#166534; font-weight:bold; }
    .total-row td { background:#e5e7eb; font-weight:bold; border-top:2px solid #555; }
    .amt          { text-align:right; }
    .sno          { text-align:center; width:28px; }

    .summary { display:flex; gap:12px; justify-content:flex-end; margin-top:10px;
               flex-wrap:wrap; font-size:11px; }
    .summary-box { border:1px solid #ccc; padding:4px 10px; }
    .summary-box strong { font-weight:bold; }

    @media print {
      body { padding:6px; }
      @page { margin:10mm; size:A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${data.branchName}</h1>
    <p>${data.branchAddress}</p>
    <h2>Cash Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}</h2>
  </div>

  <div class="day-label">
    Cash Book on : ${fmtShort(data.fromDate)}${data.fromDate !== data.toDate ? " — " + fmtShort(data.toDate) : ""}
  </div>

  ${bodyContent}

  <div class="summary">
    <div class="summary-box">Opening Balance: <strong>${fmt(data.openingBalance)}</strong></div>
    <div class="summary-box">Total Receipts: <strong>${fmt(data.totalReceipts)}</strong></div>
    <div class="summary-box">Total Payments: <strong>${fmt(data.totalPayments)}</strong></div>
    <div class="summary-box">Closing Balance: <strong>${fmt(data.closingBalance)}</strong></div>
  </div>
</body>
</html>`;
};

// ── Main Component ────────────────────────────────────────────────────────────
const CashBookPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);

  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : new Date().toISOString().split("T")[0];

  const [sessionMinDate, setSessionMinDate] = useState("");
  const [sessionMaxDate, setSessionMaxDate] = useState(workingDate);
  const [fromDate, setFromDate] = useState(workingDate);
  const [toDate, setToDate] = useState(workingDate);
  const [withLongNarration, setWithLongNarration] = useState(false);
  const [withLeftRight, setWithLeftRight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBook | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    dayBookApi.getSessionDates(user.branchid).then((res) => {
      if (res.success && res.data) {
        const minD = toInputDate(res.data.fromDate);
        const maxD = workingDate < toInputDate(res.data.toDate)
          ? workingDate
          : toInputDate(res.data.toDate);
        setSessionMinDate(minD);
        setSessionMaxDate(maxD);
        if (fromDate < minD) setFromDate(minD);
        if (toDate < minD) setToDate(minD);
      }
    }).catch(() => {});
  }, [user.branchid]);

  const handleShow = async () => {
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select both From Date and To Date.", "warning");
      return;
    }
    if (fromDate > toDate) {
      Swal.fire("Validation", "From Date cannot be after To Date.", "warning");
      return;
    }
    if (sessionMinDate && fromDate < sessionMinDate) {
      Swal.fire("Validation", "From Date is before the current session start date.", "warning");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await cashBookApi.getCashBook(user.branchid, fromDate, toDate);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        Swal.fire("Error", res.message || "Failed to load cash book.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Unable to reach server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    exportToPdf(buildExportConfig(data, withLongNarration));
  };

  const handleExportExcel = () => {
    if (!data) return;
    exportToExcel(buildExportConfig(data, withLongNarration));
  };

  const handlePrint = () => {
    if (!data) return;
    const html = buildPrintHTML(data, withLeftRight, withLongNarration);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Form Card ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Cash Book</h2>
                  <p className="text-sm text-gray-600">View all cash transactions for a date range</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      min={sessionMinDate || undefined}
                      max={sessionMaxDate}
                      workingDate={workingDate}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg w-44"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={toDate}
                      onChange={setToDate}
                      min={sessionMinDate || undefined}
                      max={sessionMaxDate}
                      workingDate={workingDate}
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg w-44"
                    />
                  </div>
                  {sessionMinDate && (
                    <div className="text-xs text-gray-500 pb-1">
                      Session: {fmtDate(sessionMinDate)} — {fmtDate(sessionMaxDate)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-0.5">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={withLongNarration}
                        onChange={(e) => setWithLongNarration(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      With Long Narration
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={withLeftRight}
                        onChange={(e) => setWithLeftRight(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      With Left Right Format
                    </label>
                  </div>
                  <div className="flex gap-3 pb-0.5">
                    <button
                      onClick={handleShow}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-sm"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Search className="w-4 h-4" />}
                      {loading ? "Loading..." : "Show"}
                    </button>
                    {data && (
                      <>
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        <button
                          onClick={handleExportPdf}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                        <button
                          onClick={handleExportExcel}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setData(null)}
                      className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-medium mt-3 text-right">
                  Fields marked with * are mandatory
                </p>
              </div>
            </div>

            {/* ── Report ── */}
            {data && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="text-center py-4 border-b border-gray-200 px-4 bg-gray-50">
                  <h1 className="text-base font-bold uppercase underline tracking-wide text-gray-900">
                    {data.branchName}
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">{data.branchAddress}</p>
                  <h2 className="text-sm font-bold text-gray-800 mt-2">
                    Cash Book From: {fmtDate(data.fromDate)} To {fmtDate(data.toDate)}
                  </h2>
                </div>

                <div className="p-4">
                  <div className="text-center border border-gray-400 bg-gray-100 py-1.5 mb-3 text-sm font-semibold text-gray-800 rounded">
                    Cash Book on : {fmtShort(data.fromDate)}
                    {data.fromDate !== data.toDate && ` — ${fmtShort(data.toDate)}`}
                  </div>

                  {withLeftRight ? (
                    <div className="border border-gray-400 rounded overflow-hidden">
                      <div className="flex gap-1">
                        <div className="flex-1 text-center bg-blue-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Receipts
                        </div>
                        <div className="w-0.5 bg-gray-500" />
                        <div className="flex-1 text-center bg-rose-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Payments
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-[65vh] overflow-x-auto">
                        <div className="flex gap-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <LRSide
                              entries={data.receipts}
                              side="receipts"
                              openingBalance={data.openingBalance}
                              closingBalance={data.closingBalance}
                              totalReceipts={data.totalReceipts}
                              totalPayments={data.totalPayments}
                              fromDate={data.fromDate}
                              longNar={withLongNarration}
                            />
                          </div>
                          <div className="w-0.5 bg-gray-500 self-stretch" />
                          <div className="flex-1 min-w-0">
                            <LRSide
                              entries={data.payments}
                              side="payments"
                              openingBalance={data.openingBalance}
                              closingBalance={data.closingBalance}
                              totalReceipts={data.totalReceipts}
                              totalPayments={data.totalPayments}
                              fromDate={data.fromDate}
                              longNar={withLongNarration}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-gray-400 rounded overflow-hidden overflow-y-auto max-h-[65vh] overflow-x-auto">
                      <SimpleTable data={data} longNar={withLongNarration} />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: "Opening Balance", value: data.openingBalance, color: "blue" },
                      { label: "Total Receipts",  value: data.totalReceipts,  color: "green" },
                      { label: "Total Payments",  value: data.totalPayments,  color: "red" },
                      { label: "Closing Balance", value: data.closingBalance, color: "purple" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg px-4 py-2.5 flex flex-col`}>
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className={`font-bold text-${color}-700 text-base`}>₹{fmt(value)}</span>
                      </div>
                    ))}
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

export default CashBookPage;
