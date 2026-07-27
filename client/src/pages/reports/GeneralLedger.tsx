import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { FileText, Search, Printer, FileSpreadsheet } from "lucide-react";
import generalLedgerApi, { GeneralLedgerAccountItem, GeneralLedger } from "../../services/reports/generalLedgerApi";
import headLedgerApi, { AccountHeadItem, HeadLedger, HeadInDetail } from "../../services/reports/headLedgerApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

type LedgerMode = "ac" | "head-detail" | "head-consolidate" | "head-accounts";

const MODES: { value: LedgerMode; label: string }[] = [
  { value: "ac",               label: "A/C Ledger" },
  { value: "head-detail",      label: "Head Ledger (In Detail)" },
  { value: "head-consolidate", label: "Head Ledger (Consolidate On Accounts)" },
  { value: "head-accounts",    label: "Head Ledger (Accounts)" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mirrors SP display: ABS(value) + "Dr"/"Cr" label — never shows a raw negative sign
const fmtBal = (n: number) =>
  `${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${n < 0 ? "Cr" : "Dr"}`;

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDatePart(iso);
const balCls   = (n: number)   => n >= 0 ? "text-red-600" : "text-green-700";

// "01-Apr-2021" — safe and readable in a filename
const fileDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

// Strip characters that are illegal in file names on Windows / macOS / Linux
const fileSafe = (s: string) => s.replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();

const selectStyles = {
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
  menu:       (b: any) => ({ ...b, zIndex: 9999 }),
  control:    (b: any) => ({ ...b, cursor: "pointer" }),
};

// ── Export builders ────────────────────────────────────────────────────────────

const buildAcExportConfig = (data: GeneralLedger, isConsolidate: boolean): ExportConfig => {
  if (isConsolidate) {
    const rows: ExportRow[] = [
      { style: "info", cells: [`Account: ${data.accountName}`, `No: ${data.accountNo}`, `Head: ${data.headName || "-"}`, `Period: ${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`] },
      { style: "ob", spanFirst: 2, cells: ["Opening Balance", "", "", "", fmtBal(data.openingBalance)] },
      ...data.rows.map(r => ({ cells: [fmtDate(r.valueDate), "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmtBal(r.runningBalance)] })),
      { style: "total", spanFirst: 2, cells: ["Total", "", fmt(data.totalDr), fmt(data.totalCr), ""] },
      { style: "cb",    spanFirst: 2, cells: ["Closing Balance", "", "", "", fmtBal(data.closingBalance)] },
    ];
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `General Ledger (Consolidated) - ${data.accountName}`, fileName: `General Ledger (Consolidated) - ${fileSafe(data.accountName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: false },
      columns: [
        { header: "Date",        widthRatio: 0.18, align: "center" },
        { header: "Particulars", widthRatio: 0.34, align: "left" },
        { header: "Dr",          widthRatio: 0.16, align: "right" },
        { header: "Cr",          widthRatio: 0.16, align: "right" },
        { header: "Balance",     widthRatio: 0.16, align: "right" },
      ],
      rows,
    };
  }
  const rows: ExportRow[] = [
    { style: "info", cells: [`Account: ${data.accountName}`, `No: ${data.accountNo}`, `Head: ${data.headName || "-"}`, `Period: ${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`] },
    { style: "ob", spanFirst: 3, cells: ["Opening Balance", "", "", "", "", fmtBal(data.openingBalance)] },
    ...data.rows.map(r => ({ cells: [fmtDate(r.valueDate), String(r.voucherNo), r.narration || "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmtBal(r.runningBalance)] })),
    { style: "total", spanFirst: 3, cells: ["Total", "", "", fmt(data.totalDr), fmt(data.totalCr), ""] },
    { style: "cb",    spanFirst: 3, cells: ["Closing Balance", "", "", "", "", fmtBal(data.closingBalance)] },
  ];
  return {
    meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `General Ledger - ${data.accountName}`, fileName: `General Ledger - ${fileSafe(data.accountName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: true },
    columns: [
      { header: "Date",       widthRatio: 0.11, align: "center" },
      { header: "Voucher No", widthRatio: 0.11, align: "center" },
      { header: "Narration",  widthRatio: 0.36, align: "left" },
      { header: "Dr",         widthRatio: 0.13, align: "right" },
      { header: "Cr",         widthRatio: 0.13, align: "right" },
      { header: "Balance",    widthRatio: 0.16, align: "right" },
    ],
    rows,
  };
};

// Head Ledger (In Detail) export — flat combined list
const buildHeadInDetailExportConfig = (data: HeadInDetail, isConsolidate: boolean): ExportConfig => {
  const period  = `${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`;
  const infoRow: ExportRow = { style: "info", cells: [`Head: ${data.headName}`, `Type: ${data.typeName}`, `Period: ${period}`] };

  if (isConsolidate) {
    const rows: ExportRow[] = [
      infoRow,
      { style: "ob", spanFirst: 1, cells: ["Opening Balance", "", "", fmtBal(data.openingBalance)] },
      ...data.rows.map(r => ({ cells: [fmtDate(r.valueDate), r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmtBal(r.runningBalance)] })),
      { style: "total", cells: ["Total", fmt(data.totalDr), fmt(data.totalCr), ""] },
      { style: "cb",    spanFirst: 1, cells: ["Closing Balance", "", "", fmtBal(data.closingBalance)] },
    ];
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (In Detail, Consolidated) - ${data.headName}`, fileName: `Head Ledger In Detail (Consolidated) - ${fileSafe(data.headName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: false },
      columns: [
        { header: "Date",    widthRatio: 0.22, align: "center" },
        { header: "Dr",      widthRatio: 0.25, align: "right" },
        { header: "Cr",      widthRatio: 0.25, align: "right" },
        { header: "Balance", widthRatio: 0.28, align: "right" },
      ],
      rows,
    };
  }

  const rows: ExportRow[] = [
    infoRow,
    { style: "ob", spanFirst: 2, cells: ["Opening Balance", "", "", "", "", fmtBal(data.openingBalance)] },
    ...data.rows.map((r, i) => ({ cells: [String(i + 1), fmtDate(r.valueDate), r.particulars || "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmtBal(r.runningBalance)] })),
    { style: "total", spanFirst: 2, cells: ["Total", "", "", fmt(data.totalDr), fmt(data.totalCr), ""] },
    { style: "cb",    spanFirst: 2, cells: ["Closing Balance", "", "", "", "", fmtBal(data.closingBalance)] },
  ];
  return {
    meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (In Detail) - ${data.headName}`, fileName: `Head Ledger In Detail - ${fileSafe(data.headName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: true },
    columns: [
      { header: "#",           widthRatio: 0.05, align: "center" },
      { header: "Date",        widthRatio: 0.12, align: "center" },
      { header: "Particulars", widthRatio: 0.40, align: "left" },
      { header: "Dr",          widthRatio: 0.13, align: "right" },
      { header: "Cr",          widthRatio: 0.13, align: "right" },
      { header: "Balance",     widthRatio: 0.17, align: "right" },
    ],
    rows,
  };
};

// Head Ledger (Consolidate On Accounts) and Head Ledger (Accounts) export
const buildHeadExportConfig = (data: HeadLedger, mode: LedgerMode): ExportConfig => {
  const period  = `${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`;
  const infoRow: ExportRow = { style: "info", cells: [`Head: ${data.headName}`, `Type: ${data.typeName}`, `Period: ${period}`] };

  // Head Ledger (Consolidate On Accounts) — summary table with cumulative Balance column
  if (mode === "head-consolidate") {
    let running = 0;
    const accountRows: ExportRow[] = data.accounts.map((a, i) => {
      running += a.closingBalance;
      return { cells: [String(i + 1), a.accountName, a.accountNo, fmtBal(a.openingBalance), fmt(a.periodDr), fmt(a.periodCr), fmtBal(a.closingBalance), fmtBal(running)] };
    });
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (Consolidate On Accounts) - ${data.headName}`, fileName: `Head Ledger Consolidate On Accounts - ${fileSafe(data.headName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: true },
      columns: [
        { header: "#",               widthRatio: 0.05, align: "center" },
        { header: "Account Name",    widthRatio: 0.28, align: "left" },
        { header: "Account No",      widthRatio: 0.12, align: "left" },
        { header: "Opening Balance", widthRatio: 0.12, align: "right" },
        { header: "Dr",              widthRatio: 0.10, align: "right" },
        { header: "Cr",              widthRatio: 0.10, align: "right" },
        { header: "Closing Balance", widthRatio: 0.12, align: "right" },
        { header: "Balance",         widthRatio: 0.11, align: "right" },
      ],
      rows: [
        infoRow,
        ...accountRows,
        { style: "total" as const, cells: ["Total", "", "", fmtBal(data.totalOpeningBalance), fmt(data.totalPeriodDr), fmt(data.totalPeriodCr), fmtBal(data.totalClosingBalance), ""] },
      ],
    };
  }

  // Head Ledger (Accounts) — per-account sections
  const rows: ExportRow[] = [infoRow];
  for (const a of data.accounts) {
    rows.push({ style: "info", cells: [`Account: ${a.accountName}`, `No: ${a.accountNo}`] });
    rows.push({ style: "ob", spanFirst: 2, cells: ["Opening Balance", "", "", "", "", fmtBal(a.openingBalance)] });
    for (const r of (a.rows ?? [])) {
      rows.push({ cells: [fmtDate(r.valueDate), String(r.voucherNo || ""), r.narration || "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmtBal(r.runningBalance)] });
    }
    rows.push({ style: "cb", spanFirst: 2, cells: ["Closing Balance", "", "", "", "", fmtBal(a.closingBalance)] });
  }
  rows.push({ style: "total" as const, cells: ["Grand Total", "", "", fmt(data.totalPeriodDr), fmt(data.totalPeriodCr), fmtBal(data.totalClosingBalance)] });
  return {
    meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (Accounts) - ${data.headName}`, fileName: `Head Ledger Accounts - ${fileSafe(data.headName)} - ${fileDate(data.fromDate)} to ${fileDate(data.toDate)}`, landscape: true },
    columns: [
      { header: "Date",       widthRatio: 0.12, align: "center" },
      { header: "Voucher No", widthRatio: 0.10, align: "center" },
      { header: "Narration",  widthRatio: 0.36, align: "left" },
      { header: "Dr",         widthRatio: 0.13, align: "right" },
      { header: "Cr",         widthRatio: 0.13, align: "right" },
      { header: "Balance",    widthRatio: 0.16, align: "right" },
    ],
    rows,
  };
};

// ── Component ──────────────────────────────────────────────────────────────────

const GeneralLedgerPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [mode, setMode]                         = useState<LedgerMode>("ac");
  const [heads, setHeads]                       = useState<AccountHeadItem[]>([]);
  const [selectedHead, setSelectedHead]         = useState<{ value: number; label: string } | null>(null);
  const [generalAccounts, setGeneralAccounts]   = useState<GeneralLedgerAccountItem[]>([]);
  const [selectedAccount, setSelectedAccount]   = useState<{ value: number; label: string } | null>(null);
  const [fromDate, setFromDate]                 = useState(workingDate);
  const [toDate, setToDate]                     = useState(workingDate);
  const [consolidate, setConsolidate]           = useState(false);
  const [nonZero, setNonZero]                   = useState(false);
  const [ledgerOnDiffPage, setLedgerOnDiffPage] = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [acReport, setAcReport]                 = useState<GeneralLedger | null>(null);
  const [headReport, setHeadReport]             = useState<HeadLedger | null>(null);
  const [headInDetailReport, setHeadInDetailReport] = useState<HeadInDetail | null>(null);

  const isHeadMode = mode !== "ac";
  const hasReport  = acReport !== null || headReport !== null || headInDetailReport !== null;

  // Load account heads
  useEffect(() => {
    if (!user.branchid) return;
    headLedgerApi.getAccountHeads(user.branchid).then((res) => {
      setHeads((res as any).data ?? (res as any).Data ?? []);
    });
  }, [user.branchid]);

  // Load all General type accounts (for A/C Ledger mode)
  useEffect(() => {
    if (!user.branchid) return;
    generalLedgerApi.getGeneralAccounts(user.branchid).then((res) => {
      setGeneralAccounts((res as any).data ?? (res as any).Data ?? []);
    });
  }, [user.branchid]);

  const clearReports = () => {
    setAcReport(null);
    setHeadReport(null);
    setHeadInDetailReport(null);
  };

  const handleModeChange = (m: LedgerMode) => {
    setMode(m);
    clearReports();
    setSelectedAccount(null);
    if (m !== "ac") setSelectedHead(null);
  };

  const headOptions    = heads.map((h) => ({ value: h.headCode,    label: `${h.headCode} — ${h.name} (${h.typeName})` }));
  const accountOptions = generalAccounts.map((a) => ({ value: a.accountId, label: `${a.accountNo} — ${a.accountName}` }));

  const handleLoad = async () => {
    if (!isHeadMode && !selectedAccount) { Swal.fire("Validation", "Please select an account.", "warning"); return; }
    if (isHeadMode && !selectedHead) { Swal.fire("Validation", "Please select an account head.", "warning"); return; }
    if (!fromDate || !toDate) { Swal.fire("Validation", "Please select both dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From Date must be on or before To Date.", "warning"); return; }

    setLoading(true);
    clearReports();
    try {
      if (mode === "ac") {
        const res  = await generalLedgerApi.getGeneralLedger(user.branchid, selectedAccount!.value, fromDate, toDate, consolidate, nonZero);
        const data = (res as any).data ?? (res as any).Data;
        if (!data) throw new Error((res as any).message ?? "No data returned.");
        setAcReport(data);
      } else if (mode === "head-detail") {
        const res  = await headLedgerApi.getHeadInDetail(user.branchid, selectedHead!.value, fromDate, toDate, consolidate, nonZero);
        const data = (res as any).data ?? (res as any).Data;
        if (!data) throw new Error((res as any).message ?? "No data returned.");
        setHeadInDetailReport(data);
      } else {
        // head-consolidate or head-accounts
        const res  = await headLedgerApi.getHeadLedger(user.branchid, selectedHead!.value, fromDate, toDate,
          mode === "head-consolidate" ? "consolidate" : "accounts", nonZero);
        const data = (res as any).data ?? (res as any).Data;
        if (!data) throw new Error((res as any).message ?? "No data returned.");
        setHeadReport(data);
      }
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = MODES.find((m) => m.value === mode)?.label ?? "";

  // Checkbox visibility flags
  const showConsolidate    = mode === "ac" || mode === "head-detail";
  const showNonZero        = mode === "ac" || mode === "head-consolidate" || mode === "head-accounts";
  const showLedgerDiffPage = mode === "head-accounts";

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 print:min-h-0 print:bg-white print:p-0">
          <div className="w-full space-y-5">

            {/* ── Filter Card ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">

              {/* Title bar */}
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">General Ledger</h2>
                  <p className="text-xs text-gray-500">Full transaction detail for any account or head</p>
                </div>
              </div>

              {/* Mode selector */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-x-6 gap-y-2">
                {MODES.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio" name="ledger-mode" value={m.value}
                      checked={mode === m.value}
                      onChange={() => handleModeChange(m.value)}
                      className="accent-amber-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{m.label}</span>
                  </label>
                ))}
              </div>

              {/* Filters */}
              <div className="p-5 flex flex-wrap items-end gap-4">

                {!isHeadMode && (
                  <div className="min-w-[300px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <Select
                      options={accountOptions} value={selectedAccount}
                      onChange={(opt) => { setSelectedAccount(opt); clearReports(); }}
                      placeholder="Search account…"
                      isClearable styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                )}

                {isHeadMode && (
                  <div className="min-w-[300px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Head
                      {mode === "head-accounts" && (
                        <span className="ml-2 text-xs text-violet-600 font-normal">(personal accounts only)</span>
                      )}
                    </label>
                    <Select
                      options={headOptions} value={selectedHead}
                      onChange={(opt) => { setSelectedHead(opt); clearReports(); }}
                      placeholder="Select account head…" isClearable styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" />
                </div>

                <div className="flex items-center gap-5 pb-1">
                  {showConsolidate && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={consolidate}
                        onChange={(e) => { setConsolidate(e.target.checked); clearReports(); }}
                        className="w-4 h-4 accent-amber-600" />
                      <span className="text-sm font-medium text-gray-700">Consolidate</span>
                    </label>
                  )}
                  {showNonZero && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={nonZero}
                        onChange={(e) => { setNonZero(e.target.checked); clearReports(); }}
                        className="w-4 h-4 accent-amber-600" />
                      <span className="text-sm font-medium text-gray-700">Non Zero</span>
                    </label>
                  )}
                  {showLedgerDiffPage && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={ledgerOnDiffPage}
                        onChange={(e) => setLedgerOnDiffPage(e.target.checked)}
                        className="w-4 h-4 accent-violet-600" />
                      <span className="text-sm font-medium text-gray-700">Ledger on Diff Page</span>
                    </label>
                  )}
                </div>

                <button onClick={handleLoad} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                    : <><Search className="w-4 h-4" /> Generate</>}
                </button>

                {hasReport && (
                  <>
                    <button onClick={() => window.print()}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => {
                        if (acReport)            exportToPdf(buildAcExportConfig(acReport, consolidate));
                        if (headInDetailReport)  exportToPdf(buildHeadInDetailExportConfig(headInDetailReport, consolidate));
                        if (headReport)          exportToPdf(buildHeadExportConfig(headReport, mode));
                      }}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-sm transition-all">
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => {
                        if (acReport)            exportToExcel(buildAcExportConfig(acReport, consolidate));
                        if (headInDetailReport)  exportToExcel(buildHeadInDetailExportConfig(headInDetailReport, consolidate));
                        if (headReport)          exportToExcel(buildHeadExportConfig(headReport, mode));
                      }}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm transition-all">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                  </>
                )}

                <button onClick={() => navigate("/dashboard")}
                  className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all">
                  Close
                </button>
              </div>
            </div>

            {/* ── A/C Ledger Report ─────────────────────────────────────────── */}
            {acReport && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{acReport.branchName}</h1>
                  {acReport.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{acReport.branchAddress}</p>}
                  <h2 className="text-base font-semibold text-amber-800 mt-2">General Ledger{consolidate ? " (Consolidated)" : ""}</h2>
                  <p className="text-sm text-gray-700 mt-0.5 font-medium">{acReport.accountName}</p>
                  {acReport.headName && <p className="text-xs text-gray-500">Head: {acReport.headName}</p>}
                  <p className="text-sm text-gray-600 mt-0.5">{fmtLong(acReport.fromDate)} to {fmtLong(acReport.toDate)}</p>
                </div>

                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Opening Balance</span>
                  <span className={`font-bold text-sm ${balCls(acReport.openingBalance)}`}>{fmtBal(acReport.openingBalance)}</span>
                </div>

                {acReport.rows.length > 0 ? (
                  <div className="overflow-auto max-h-[calc(100vh-320px)] p-4 print:max-h-none print:overflow-visible">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Date</th>
                          {!consolidate && <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Voucher No</th>}
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Narration</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acReport.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-700">{fmtDate(row.valueDate)}</td>
                            {!consolidate && <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{row.voucherNo}</td>}
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600 max-w-xs truncate">{row.narration || "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">{row.dr != null ? fmt(row.dr) : "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-green-700">{row.cr != null ? fmt(row.cr) : "—"}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${balCls(row.runningBalance)}`}>{fmtBal(row.runningBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-amber-700">
                          <td colSpan={consolidate ? 2 : 3} className="border border-amber-800 px-3 py-2 text-white font-bold">Total</td>
                          <td className="border border-amber-800 px-3 py-2 text-right text-white font-bold">₹{fmt(acReport.totalDr)}</td>
                          <td className="border border-amber-800 px-3 py-2 text-right text-white font-bold">₹{fmt(acReport.totalCr)}</td>
                          <td className="border border-amber-800 px-3 py-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-400 py-10">No transactions in this period.</p>
                )}

                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Closing Balance</span>
                  <span className={`font-bold text-sm ${balCls(acReport.closingBalance)}`}>{fmtBal(acReport.closingBalance)}</span>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {/* ── Head Ledger (In Detail) Report — flat combined list ──────────── */}
            {headInDetailReport && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{headInDetailReport.branchName}</h1>
                  {headInDetailReport.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{headInDetailReport.branchAddress}</p>}
                  <h2 className="text-base font-semibold text-purple-800 mt-2">
                    Head Ledger (In Detail){consolidate ? " — Consolidated" : ""}
                  </h2>
                  <p className="text-sm text-gray-700 mt-0.5 font-medium">{headInDetailReport.headName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{headInDetailReport.typeName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{fmtLong(headInDetailReport.fromDate)} to {fmtLong(headInDetailReport.toDate)}</p>
                </div>

                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Opening Balance</span>
                  <span className={`font-bold text-sm ${balCls(headInDetailReport.openingBalance)}`}>{fmtBal(headInDetailReport.openingBalance)}</span>
                </div>

                {headInDetailReport.rows.length > 0 ? (
                  <div className="overflow-auto max-h-[calc(100vh-320px)] p-4 print:max-h-none print:overflow-visible">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {!consolidate && <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-center font-bold text-gray-800">#</th>}
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Date</th>
                          {!consolidate && <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Particulars</th>}
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headInDetailReport.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-purple-50/40">
                            {!consolidate && <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-500">{idx + 1}</td>}
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-700 whitespace-nowrap">{fmtDate(row.valueDate)}</td>
                            {!consolidate && (
                              <td className="border border-gray-300 px-3 py-1.5 text-gray-600 max-w-sm truncate">{row.particulars || "—"}</td>
                            )}
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">{row.dr != null ? fmt(row.dr) : "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-green-700">{row.cr != null ? fmt(row.cr) : "—"}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${balCls(row.runningBalance)}`}>{fmtBal(row.runningBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-purple-700">
                          <td colSpan={consolidate ? 1 : 2} className="border border-purple-800 px-3 py-2 text-white font-bold">Total</td>
                          {!consolidate && <td className="border border-purple-800 px-3 py-2" />}
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">₹{fmt(headInDetailReport.totalDr)}</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">₹{fmt(headInDetailReport.totalCr)}</td>
                          <td className="border border-purple-800 px-3 py-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-400 py-10">No transactions in this period.</p>
                )}

                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Closing Balance</span>
                  <span className={`font-bold text-sm ${balCls(headInDetailReport.closingBalance)}`}>{fmtBal(headInDetailReport.closingBalance)}</span>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {/* ── Head Ledger (Consolidate On Accounts) + Head Ledger (Accounts) ─ */}
            {headReport && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{headReport.branchName}</h1>
                  {headReport.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{headReport.branchAddress}</p>}
                  <h2 className="text-base font-semibold text-purple-800 mt-2">{modeLabel}</h2>
                  <p className="text-sm text-gray-700 mt-0.5 font-medium">{headReport.headName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{headReport.typeName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{fmtLong(headReport.fromDate)} to {fmtLong(headReport.toDate)}</p>
                </div>

                <div className="overflow-auto max-h-[calc(100vh-320px)] p-4 space-y-1 print:max-h-none print:overflow-visible">

                  {/* ── Head Ledger (Consolidate On Accounts) — summary table with cumulative Balance ── */}
                  {mode === "head-consolidate" && (() => {
                    let running = 0;
                    return (
                      <table className="min-w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">#</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account Name</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account No</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Op. Balance</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Dr (₹)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Cr (₹)</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Cl. Balance</th>
                            <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {headReport.accounts.map((acc, idx) => {
                            running += acc.closingBalance;
                            const rowRunning = running;
                            return (
                              <tr key={acc.accountId} className="hover:bg-purple-50/40">
                                <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{idx + 1}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{acc.accountName}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{acc.accountNo}</td>
                                <td className={`border border-gray-300 px-3 py-1.5 text-right font-medium ${balCls(acc.openingBalance)}`}>{fmtBal(acc.openingBalance)}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">{acc.periodDr !== 0 ? fmt(acc.periodDr) : "—"}</td>
                                <td className="border border-gray-300 px-3 py-1.5 text-right text-green-700">{acc.periodCr !== 0 ? fmt(acc.periodCr) : "—"}</td>
                                <td className={`border border-gray-300 px-3 py-1.5 text-right font-bold ${balCls(acc.closingBalance)}`}>{fmtBal(acc.closingBalance)}</td>
                                <td className={`border border-gray-300 px-3 py-1.5 text-right font-bold ${balCls(rowRunning)}`}>{fmtBal(rowRunning)}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-purple-700">
                            <td colSpan={3} className="border border-purple-800 px-3 py-2 text-white font-bold">Total</td>
                            <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmtBal(headReport.totalOpeningBalance)}</td>
                            <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalPeriodDr)}</td>
                            <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalPeriodCr)}</td>
                            <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmtBal(headReport.totalClosingBalance)}</td>
                            <td className="border border-purple-800 px-3 py-2" />
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* ── Head Ledger (Accounts) — per-account individual sections ── */}
                  {mode === "head-accounts" && headReport.accounts.map((acc, accIdx) => (
                    <div
                      key={acc.accountId}
                      className={`mb-5 border border-purple-200 rounded-lg overflow-hidden${ledgerOnDiffPage && accIdx > 0 ? " print:break-before-page" : ""}`}
                    >
                      <div className="flex items-center justify-between px-4 py-2 bg-purple-50 border-b border-purple-200">
                        <span className="font-semibold text-purple-900 text-xs">{acc.accountName}</span>
                        <span className="text-xs text-purple-600">{acc.accountNo}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-200 text-xs">
                        <span className="text-gray-600 font-medium">Opening Balance</span>
                        <span className={`font-bold ${balCls(acc.openingBalance)}`}>{fmtBal(acc.openingBalance)}</span>
                      </div>
                      {(acc.rows ?? []).length > 0 ? (
                        <table className="min-w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-left font-bold text-gray-700">Date</th>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-left font-bold text-gray-700">Voucher No</th>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-left font-bold text-gray-700">Narration</th>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-right font-bold text-gray-700">Dr (₹)</th>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-right font-bold text-gray-700">Cr (₹)</th>
                              <th className="border border-gray-200 px-3 py-1.5 bg-purple-50/60 text-right font-bold text-gray-700">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(acc.rows ?? []).map((row, ri) => (
                              <tr key={ri} className="hover:bg-purple-50/30">
                                <td className="border border-gray-200 px-3 py-1 text-gray-700 whitespace-nowrap">{fmtDate(row.valueDate)}</td>
                                <td className="border border-gray-200 px-3 py-1 text-gray-600">{row.voucherNo || "—"}</td>
                                <td className="border border-gray-200 px-3 py-1 text-gray-600 max-w-xs truncate">{row.narration || "—"}</td>
                                <td className="border border-gray-200 px-3 py-1 text-right text-red-600">{row.dr != null ? fmt(row.dr) : "—"}</td>
                                <td className="border border-gray-200 px-3 py-1 text-right text-green-700">{row.cr != null ? fmt(row.cr) : "—"}</td>
                                <td className={`border border-gray-200 px-3 py-1 text-right font-semibold ${balCls(row.runningBalance)}`}>{fmtBal(row.runningBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-gray-400 px-4 py-2">No transactions in this period.</p>
                      )}
                      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-t border-gray-200 text-xs">
                        <span className="text-gray-600 font-medium">Closing Balance</span>
                        <span className={`font-bold ${balCls(acc.closingBalance)}`}>{fmtBal(acc.closingBalance)}</span>
                      </div>
                    </div>
                  ))}

                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {!hasReport && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <FileText className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select options above and click Generate</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default GeneralLedgerPage;
