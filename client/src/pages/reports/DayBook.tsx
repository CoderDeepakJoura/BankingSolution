import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { BookOpen, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import dayBookApi, { DayBook, DayBookEntry, DayBookGroup } from "../../services/reports/dayBookApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";
import DatePicker from "../../components/DatePicker";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Extract date part without any UTC conversion — avoids day-shift in UTC+5:30
const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d); // local time — no UTC shift
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

const fmtShort = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB");

const fmtDateKey = (iso: string) => isoDatePart(iso);

const toInputDate = (iso: string) => isoDatePart(iso);

const particulars = (e: DayBookEntry, longNar: boolean) => {
  const base = `V.No.:- ${e.voucherNo} ${e.accountName} - ${e.accountIdentifier}`;
  return longNar && e.narration ? `${base}- ${e.narration}` : base;
};

// Group entries by date, preserving order
const groupByDate = (entries: DayBookEntry[]) => {
  const map = new Map<string, DayBookEntry[]>();
  for (const e of entries) {
    const key = fmtDateKey(e.voucherDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
};

// ── TD helpers for screen ─────────────────────────────────────────────────────
const TD = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs ${className}`}>{children}</td>
);
const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`border border-gray-400 px-2 py-1 text-xs font-bold bg-blue-100 text-gray-800 sticky top-0 z-10 ${className}`}>{children}</th>
);
// Sticky tfoot cell — always visible at bottom of scroll container
const TDF = ({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`border border-gray-400 px-2 py-1 text-xs sticky bottom-0 z-10 ${className}`}>{children}</td>
);

// ── Screen: LR side ───────────────────────────────────────────────────────────
const LRSide: React.FC<{
  groups: DayBookGroup[];
  side: "receipts" | "payments";
  openingBalance: number;
  closingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  fromDate: string;
  longNar: boolean;
  filterMode: "date" | "head";
}> = ({ groups, side, openingBalance, closingBalance, totalReceipts, totalPayments, fromDate, longNar, filterMode }) => {
  let sno = 0;
  const grandTotal = side === "receipts"
    ? openingBalance + totalReceipts
    : totalPayments + closingBalance;

  // ── Date-wise body ─────────────────────────────────────────────────────────
  const renderDateBody = () => {
    const all = groups.flatMap((g) => g.entries);
    all.sort((a, b) => {
      const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
      return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
    });
    return groupByDate(all).map(({ date, items }) => {
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
    });
  };

  // ── Head-wise body (5 cols: SNo | Date | Particulars | Amount | Head Amt.) ──
  // Flatten all entries and group by actual AccountHead (accHeadCode → accHeadName)
  const renderHeadBody = () => {
    const all = groups.flatMap((g) => g.entries);
    const headMap = new Map<number, { name: string; entries: DayBookEntry[] }>();
    for (const e of all) {
      if (!headMap.has(e.accHeadCode))
        headMap.set(e.accHeadCode, { name: e.accHeadName || "Unknown", entries: [] });
      headMap.get(e.accHeadCode)!.entries.push(e);
    }
    const headGroups = Array.from(headMap.entries())
      .sort(([a], [b]) => a - b) // sort by headcode order
      .map(([code, { name, entries }]) => ({
        code,
        name,
        total: entries.reduce((s, e) => s + e.amount, 0),
        entries: [...entries].sort((a, b) => {
          const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
          return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
        }),
      }));

    return headGroups.map(({ code, name, total, entries }) => (
      <React.Fragment key={code}>
        {/* Head header spans all 5 columns */}
        <tr className="bg-blue-50">
          <TD colSpan={4} className="font-bold text-blue-900">{name}</TD>
          <TD className="text-right font-bold text-blue-900">{fmt(total)}</TD>
        </tr>
        {entries.map((entry) => {
          sno++;
          return (
            <tr key={`${entry.voucherNo}-${sno}`} className="hover:bg-gray-50">
              <TD className="text-center">{sno}</TD>
              <TD className="text-center text-gray-600 whitespace-nowrap">{fmtShort(entry.voucherDate)}</TD>
              <TD>{particulars(entry, longNar)}</TD>
              <TD className="text-right">{fmt(entry.amount)}</TD>
              <TD className="text-right text-gray-400">0.00</TD>
            </tr>
          );
        })}
      </React.Fragment>
    ));
  };

  const isHead = filterMode === "head";

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <TH className="w-8 text-center">SNo</TH>
          {isHead && <TH className="w-20 text-center">Date</TH>}
          <TH className="text-left">Particulars</TH>
          <TH className="w-24 text-right">Amount</TH>
          <TH className="w-24 text-right">{isHead ? "Head Amt." : "Date Total"}</TH>
        </tr>
      </thead>
      <tbody>
        {/* Opening Balance — Receipts only */}
        {side === "receipts" && (
          <tr className="bg-red-50">
            <TD className="text-center" />
            {isHead && <TD />}
            <TD className="text-red-700 font-semibold">Opening Balance on {fmtDate(fromDate)}</TD>
            <TD className="text-right text-red-700 font-semibold">{fmt(openingBalance)}</TD>
            <TD />
          </tr>
        )}

        {isHead ? renderHeadBody() : renderDateBody()}

        {/* Closing Balance — Payments only */}
        {side === "payments" && (
          <tr className="bg-green-50">
            <TD className="text-center" />
            {isHead && <TD />}
            <TD className="font-bold text-green-800">Closing Balance</TD>
            <TD className="text-right font-bold text-green-800">{fmt(closingBalance)}</TD>
            <TD />
          </tr>
        )}

      </tbody>
      {/* Sticky total row — always visible at the bottom of the scroll container */}
      <tfoot>
        <tr className="border-t-2 border-gray-500">
          <TDF className="text-center bg-gray-200 font-bold" />
          {isHead && <TDF className="bg-gray-200" />}
          <TDF className="bg-gray-200 font-bold">Total</TDF>
          <TDF className="bg-gray-200 text-right font-bold">{fmt(grandTotal)}</TDF>
          <TDF className="bg-gray-200 text-right font-bold">{fmt(grandTotal)}</TDF>
        </tr>
      </tfoot>
    </table>
  );
};

// ── Screen: Simple format ─────────────────────────────────────────────────────
const SimpleTable: React.FC<{ data: DayBook; longNar: boolean }> = ({ data, longNar }) => {
  const rows: { entry: DayBookEntry; side: "Dr" | "Cr" }[] = [];
  data.paymentGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Dr" })));
  data.receiptGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Cr" })));
  rows.sort((a, b) => {
    const dateDiff = fmtDateKey(a.entry.voucherDate).localeCompare(fmtDateKey(b.entry.voucherDate));
    return dateDiff !== 0 ? dateDiff : a.entry.voucherNo - b.entry.voucherNo;
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
          <TH className="w-28 text-right">Dr Amount</TH>
          <TH className="w-28 text-right">Cr Amount</TH>
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
                <TD className="text-right text-red-700">{side === "Dr" ? fmt(entry.amount) : ""}</TD>
                <TD className="text-right text-green-700">{side === "Cr" ? fmt(entry.amount) : ""}</TD>
              </tr>
            </React.Fragment>
          );
        })}
        <tr className="bg-gray-200 border-t-2 border-gray-500 font-bold">
          <TD colSpan={3} className="text-right font-bold">Total</TD>
          <TD className="text-right font-bold text-red-700">{fmt(data.totalPayments)}</TD>
          <TD className="text-right font-bold text-green-700">{fmt(data.totalReceipts)}</TD>
        </tr>
      </tbody>
    </table>
  );
};

// ── Export config builder (used by PDF + Excel) ───────────────────────────────
const buildExportConfig = (data: DayBook, longNar: boolean): ExportConfig => {
  const columns = [
    { header: "S.No",        widthRatio: 0.05, align: "center" as const },
    { header: "Date",        widthRatio: 0.11, align: "center" as const },
    { header: "V.No.",       widthRatio: 0.07, align: "center" as const },
    { header: "Particulars", widthRatio: 0.47, align: "left"   as const },
    { header: "Dr Amount",   widthRatio: 0.15, align: "right"  as const },
    { header: "Cr Amount",   widthRatio: 0.15, align: "right"  as const },
  ];

  const rows: ExportRow[] = [];

  // Opening balance
  rows.push({
    style: "ob",
    spanFirst: 4,
    cells: [`Opening Balance on ${fmtDate(data.fromDate)}`, "", "", "", "", fmt(data.openingBalance)],
  });

  // Build receipt rows (Cr)
  data.receiptGroups.forEach((g) => {
    rows.push({ style: "group", spanFirst: 6, cells: [`RECEIPTS — ${g.groupName}`, "", "", "", "", fmt(g.groupTotal)] });
    groupByDate(g.entries).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e, i) => {
        rows.push({
          style: "normal",
          cells: [String(i + 1), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), "", fmt(e.amount)],
        });
      });
    });
  });

  // Build payment rows (Dr)
  data.paymentGroups.forEach((g) => {
    rows.push({ style: "group", spanFirst: 6, cells: [`PAYMENTS — ${g.groupName}`, "", "", "", fmt(g.groupTotal), ""] });
    groupByDate(g.entries).forEach(({ date, items }) => {
      rows.push({ style: "date", spanFirst: 6, cells: [fmtDate(date), "", "", "", "", ""] });
      items.forEach((e, i) => {
        rows.push({
          style: "normal",
          cells: [String(i + 1), fmtDate(e.voucherDate), String(e.voucherNo), particulars(e, longNar), fmt(e.amount), ""],
        });
      });
    });
  });

  // Closing balance
  rows.push({
    style: "cb",
    spanFirst: 4,
    cells: ["Closing Balance", "", "", "", "", fmt(data.closingBalance)],
  });

  // Totals
  rows.push({
    style: "total",
    spanFirst: 4,
    cells: ["Total", "", "", "", fmt(data.totalPayments), fmt(data.totalReceipts)],
  });

  return {
    meta: {
      title: data.branchName,
      subtitle: data.branchAddress,
      reportTitle: `Day Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}`,
      fileName: `DayBook_${fmtDateKey(data.fromDate)}_${fmtDateKey(data.toDate)}`,
      landscape: true,
    },
    columns,
    rows,
  };
};

// ── Print HTML generator ──────────────────────────────────────────────────────
const buildPrintHTML = (
  data: DayBook,
  withLeftRight: boolean,
  longNar: boolean,
  filterMode: "date" | "head" = "head"
): string => {
  const par = (e: DayBookEntry) => {
    const base = `V.No.:- ${e.voucherNo} ${e.accountName} - ${e.accountIdentifier}`;
    return longNar && e.narration ? `${base}- ${e.narration}` : base;
  };

  const buildLRTable = (groups: DayBookGroup[], side: "receipts" | "payments"): string => {
    const total =
      side === "receipts"
        ? data.openingBalance + data.totalReceipts
        : data.totalPayments + data.closingBalance;

    let sno = 0;
    let rows = "";
    const isHead = filterMode === "head";
    // date mode = 4 cols, head mode = 5 cols (adds Date column)
    const spanAll = isHead ? 5 : 4;

    if (side === "receipts") {
      rows += isHead
        ? `<tr class="ob-row">
            <td class="sno"></td><td></td>
            <td>Opening Balance on ${fmtDate(data.fromDate)}</td>
            <td class="amt">${fmt(data.openingBalance)}</td><td class="amt"></td>
           </tr>`
        : `<tr class="ob-row">
            <td class="sno"></td>
            <td>Opening Balance on ${fmtDate(data.fromDate)}</td>
            <td class="amt">${fmt(data.openingBalance)}</td><td class="amt"></td>
           </tr>`;
    }

    if (!isHead) {
      // Date-wise: flatten + sort, one date header then entries
      const all = groups.flatMap((g) => g.entries);
      all.sort((a, b) => {
        const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
        return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
      });
      groupByDate(all).forEach(({ date, items }) => {
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
    } else {
      // Head-wise: flatten + group by accHeadCode, sort by headcode order
      const allEntries = groups.flatMap((g) => g.entries);
      const headMap = new Map<number, { name: string; entries: typeof allEntries }>();
      for (const e of allEntries) {
        if (!headMap.has(e.accHeadCode))
          headMap.set(e.accHeadCode, { name: e.accHeadName || "Unknown", entries: [] });
        headMap.get(e.accHeadCode)!.entries.push(e);
      }
      const headGroups = Array.from(headMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, { name, entries }]) => ({
          name,
          total: entries.reduce((s, e) => s + e.amount, 0),
          entries: [...entries].sort((a, b) => {
            const dd = fmtDateKey(a.voucherDate).localeCompare(fmtDateKey(b.voucherDate));
            return dd !== 0 ? dd : a.voucherNo - b.voucherNo;
          }),
        }));

      headGroups.forEach(({ name, total, entries }) => {
        rows += `<tr class="group-row">
          <td colspan="4" style="font-weight:bold">${name}</td>
          <td class="amt">${fmt(total)}</td>
        </tr>`;
        entries.forEach((e) => {
          sno++;
          rows += `<tr>
            <td class="sno">${sno}</td>
            <td style="text-align:center;white-space:nowrap">${fmtShort(e.voucherDate)}</td>
            <td>${par(e)}</td>
            <td class="amt">${fmt(e.amount)}</td>
            <td class="amt">0.00</td>
          </tr>`;
        });
      });
    }

    if (side === "payments") {
      rows += isHead
        ? `<tr class="cb-row">
            <td class="sno"></td><td></td>
            <td>Closing Balance</td>
            <td class="amt">${fmt(data.closingBalance)}</td><td class="amt"></td>
           </tr>`
        : `<tr class="cb-row">
            <td class="sno"></td>
            <td>Closing Balance</td>
            <td class="amt">${fmt(data.closingBalance)}</td><td class="amt"></td>
           </tr>`;
    }

    rows += isHead
      ? `<tr class="total-row">
          <td class="sno"></td><td></td>
          <td>Total</td>
          <td class="amt">${fmt(total)}</td>
          <td class="amt">${fmt(total)}</td>
         </tr>`
      : `<tr class="total-row">
          <td class="sno"></td>
          <td>Total</td>
          <td class="amt">${fmt(total)}</td>
          <td class="amt">${fmt(total)}</td>
         </tr>`;

    const thead = isHead
      ? `<tr>
          <th style="width:28px">SNo</th>
          <th style="width:70px">Date</th>
          <th style="text-align:left">Particulars</th>
          <th style="width:90px">Amount</th>
          <th style="width:90px">Head Amt.</th>
         </tr>`
      : `<tr>
          <th style="width:28px">SNo</th>
          <th style="text-align:left">Particulars</th>
          <th style="width:90px">Amount</th>
          <th style="width:90px">Date Total</th>
         </tr>`;

    return `<table>
      <thead>${thead}</thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  const buildSimpleTable = (): string => {
    const rows: { entry: DayBookEntry; side: "Dr" | "Cr" }[] = [];
    data.paymentGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Dr" })));
    data.receiptGroups.forEach((g) => g.entries.forEach((e) => rows.push({ entry: e, side: "Cr" })));
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
        <td class="amt" style="color:${side === "Dr" ? "#900" : ""}">${side === "Dr" ? fmt(entry.amount) : ""}</td>
        <td class="amt" style="color:${side === "Cr" ? "#060" : ""}">${side === "Cr" ? fmt(entry.amount) : ""}</td>
      </tr>`;
    });

    trs += `<tr class="total-row">
      <td colspan="3" style="text-align:right">Total</td>
      <td class="amt">${fmt(data.totalPayments)}</td>
      <td class="amt">${fmt(data.totalReceipts)}</td>
    </tr>`;

    return `<table>
      <thead><tr>
        <th style="width:32px">S.No</th>
        <th style="width:48px">Vr.No</th>
        <th style="text-align:left">Particulars</th>
        <th style="width:90px">Dr Amount</th>
        <th style="width:90px">Cr Amount</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
  };

  const bodyContent = withLeftRight
    ? `<div class="lr-wrapper">
        <div class="lr-col">
          <div class="col-hdr receipts-hdr">Receipts</div>
          ${buildLRTable(data.receiptGroups, "receipts")}
        </div>
        <div class="lr-divider"></div>
        <div class="lr-col">
          <div class="col-hdr payments-hdr">Payments</div>
          ${buildLRTable(data.paymentGroups, "payments")}
        </div>
       </div>`
    : buildSimpleTable();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Day Book</title>
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
    .group-row td { background:#dbeafe; font-weight:bold; }
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
    <h2>Day Book From: ${fmtDate(data.fromDate)} To ${fmtDate(data.toDate)}</h2>
  </div>

  <div class="day-label">
    DayBook on : ${fmtShort(data.fromDate)}${data.fromDate !== data.toDate ? " — " + fmtShort(data.toDate) : ""}
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
const DayBookPage: React.FC = () => {
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
  const [lrFilter, setLrFilter] = useState<"date" | "head">("date");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DayBook | null>(null);

  // Fetch session dates on mount to constrain date pickers
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
        // Clamp current dates within session
        if (fromDate < minD) setFromDate(minD);
        if (toDate < minD) setToDate(minD);
      }
    }).catch(() => {/* silently ignore — date pickers still work without bounds */});
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
      const res = await dayBookApi.getDayBook(user.branchid, fromDate, toDate);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        Swal.fire("Error", res.message || "Failed to load day book.", "error");
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
    const html = buildPrintHTML(data, withLeftRight, withLongNarration, lrFilter);
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
                  <h2 className="text-xl font-bold text-gray-800">Day Book</h2>
                  <p className="text-sm text-gray-600">View all transactions for a date range</p>
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
                    {withLeftRight && (
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-lg p-1 text-xs">
                        <button
                          onClick={() => setLrFilter("date")}
                          className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            lrFilter === "date"
                              ? "bg-blue-600 text-white shadow"
                              : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Date Wise
                        </button>
                        <button
                          onClick={() => setLrFilter("head")}
                          className={`px-3 py-1 rounded-md font-semibold transition-all ${
                            lrFilter === "head"
                              ? "bg-blue-600 text-white shadow"
                              : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Head Wise
                        </button>
                      </div>
                    )}
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
                {/* Report header */}
                <div className="text-center py-4 border-b border-gray-200 px-4 bg-gray-50">
                  <h1 className="text-base font-bold uppercase underline tracking-wide text-gray-900">
                    {data.branchName}
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">{data.branchAddress}</p>
                  <h2 className="text-sm font-bold text-gray-800 mt-2">
                    Day Book From: {fmtDate(data.fromDate)} To {fmtDate(data.toDate)}
                  </h2>
                </div>

                <div className="p-4">
                  {/* Day label */}
                  <div className="text-center border border-gray-400 bg-gray-100 py-1.5 mb-3 text-sm font-semibold text-gray-800 rounded">
                    DayBook on : {fmtShort(data.fromDate)}
                    {data.fromDate !== data.toDate && ` — ${fmtShort(data.toDate)}`}
                  </div>

                  {withLeftRight ? (
                    /* ── Left / Right ── */
                    <div className="border border-gray-400 rounded overflow-hidden">
                      {/* Column headers — sticky above scroll area */}
                      <div className="flex gap-1">
                        <div className="flex-1 text-center bg-blue-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Receipts
                        </div>
                        <div className="w-0.5 bg-gray-500" />
                        <div className="flex-1 text-center bg-rose-700 text-white font-bold py-1.5 text-sm tracking-wide">
                          Payments
                        </div>
                      </div>
                      {/* Scrollable body */}
                      <div className="overflow-y-auto max-h-[65vh] overflow-x-auto">
                        <div className="flex gap-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <LRSide
                              groups={data.receiptGroups}
                              side="receipts"
                              openingBalance={data.openingBalance}
                              closingBalance={data.closingBalance}
                              totalReceipts={data.totalReceipts}
                              totalPayments={data.totalPayments}
                              fromDate={data.fromDate}
                              longNar={withLongNarration}
                              filterMode={lrFilter}
                            />
                          </div>
                          <div className="w-0.5 bg-gray-500 self-stretch" />
                          <div className="flex-1 min-w-0">
                            <LRSide
                              groups={data.paymentGroups}
                              side="payments"
                              openingBalance={data.openingBalance}
                              closingBalance={data.closingBalance}
                              totalReceipts={data.totalReceipts}
                              totalPayments={data.totalPayments}
                              fromDate={data.fromDate}
                              longNar={withLongNarration}
                              filterMode={lrFilter}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Simple / sequential ── */
                    <div className="border border-gray-400 rounded overflow-hidden overflow-y-auto max-h-[65vh] overflow-x-auto">
                      <SimpleTable data={data} longNar={withLongNarration} />
                    </div>
                  )}

                  {/* Summary bar */}
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

export default DayBookPage;
