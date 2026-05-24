import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { FileText, Search, Printer, FileSpreadsheet } from "lucide-react";
import generalLedgerApi, { GeneralLedgerAccountItem, GeneralLedger } from "../../services/reports/generalLedgerApi";
import headLedgerApi, { AccountHeadItem, HeadLedger } from "../../services/reports/headLedgerApi";
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

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtLong  = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput  = (iso: string) => isoDatePart(iso);
const balCls   = (n: number)   => n >= 0 ? "text-blue-700" : "text-red-600";

const selectStyles = {
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
  menu:       (b: any) => ({ ...b, zIndex: 9999 }),
};

// ── Export builders ────────────────────────────────────────────────────────────

const buildAcExportConfig = (data: GeneralLedger, isConsolidate: boolean): ExportConfig => {
  if (isConsolidate) {
    const rows: ExportRow[] = [
      { style: "info", cells: [`Account: ${data.accountName}`, `No: ${data.accountNo}`, `Head: ${data.headName || "-"}`, `Period: ${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`] },
      { style: "ob", spanFirst: 2, cells: ["Opening Balance", "", "", "", fmt(data.openingBalance)] },
      ...data.rows.map(r => ({ cells: [fmtDate(r.valueDate), "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmt(r.runningBalance)] })),
      { style: "total", spanFirst: 2, cells: ["Total", "", fmt(data.totalDr), fmt(data.totalCr), ""] },
      { style: "cb",    spanFirst: 2, cells: ["Closing Balance", "", "", "", fmt(data.closingBalance)] },
    ];
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `General Ledger (Consolidated) - ${data.accountName}`, fileName: `gl-consolidated-${data.accountNo}-${isoDatePart(data.fromDate)}-${isoDatePart(data.toDate)}`, landscape: false },
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
    { style: "ob", spanFirst: 3, cells: ["Opening Balance", "", "", "", "", fmt(data.openingBalance)] },
    ...data.rows.map(r => ({ cells: [fmtDate(r.valueDate), String(r.voucherNo), r.narration || "", r.dr != null ? fmt(r.dr) : "", r.cr != null ? fmt(r.cr) : "", fmt(r.runningBalance)] })),
    { style: "total", spanFirst: 3, cells: ["Total", "", "", fmt(data.totalDr), fmt(data.totalCr), ""] },
    { style: "cb",    spanFirst: 3, cells: ["Closing Balance", "", "", "", "", fmt(data.closingBalance)] },
  ];
  return {
    meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `General Ledger - ${data.accountName}`, fileName: `gl-${data.accountNo}-${isoDatePart(data.fromDate)}-${isoDatePart(data.toDate)}`, landscape: true },
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

const buildHeadExportConfig = (data: HeadLedger, mode: LedgerMode): ExportConfig => {
  const period = `${fmtLong(data.fromDate)} to ${fmtLong(data.toDate)}`;
  const infoRow: ExportRow = { style: "info", cells: [`Head: ${data.headName}`, `Type: ${data.typeName}`, `Period: ${period}`] };

  if (mode === "head-consolidate") {
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (Consolidated) - ${data.headName}`, fileName: `hl-consolidated-${data.headCode}-${isoDatePart(data.fromDate)}-${isoDatePart(data.toDate)}`, landscape: false },
      columns: [
        { header: "Head Name",        widthRatio: 0.32, align: "left" },
        { header: "Opening Balance",  widthRatio: 0.17, align: "right" },
        { header: "Dr",               widthRatio: 0.17, align: "right" },
        { header: "Cr",               widthRatio: 0.17, align: "right" },
        { header: "Closing Balance",  widthRatio: 0.17, align: "right" },
      ],
      rows: [infoRow, { cells: [data.headName, fmt(data.totalOpeningBalance), fmt(data.totalPeriodDr), fmt(data.totalPeriodCr), fmt(data.totalClosingBalance)] }],
    };
  }

  if (mode === "head-accounts") {
    return {
      meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (Accounts) - ${data.headName}`, fileName: `hl-accounts-${data.headCode}-${isoDatePart(data.fromDate)}-${isoDatePart(data.toDate)}`, landscape: false },
      columns: [
        { header: "#",            widthRatio: 0.07, align: "center" },
        { header: "Account Name", widthRatio: 0.43, align: "left" },
        { header: "Account No",   widthRatio: 0.24, align: "left" },
        { header: "Balance",      widthRatio: 0.26, align: "right" },
      ],
      rows: [infoRow, ...data.accounts.map((a, i) => ({ cells: [String(i + 1), a.accountName, a.accountNo, fmt(a.closingBalance)] }))],
    };
  }

  // head-detail
  return {
    meta: { title: data.branchName, subtitle: data.branchAddress, reportTitle: `Head Ledger (In Detail) - ${data.headName}`, fileName: `hl-detail-${data.headCode}-${isoDatePart(data.fromDate)}-${isoDatePart(data.toDate)}`, landscape: true },
    columns: [
      { header: "#",                widthRatio: 0.05, align: "center" },
      { header: "Account Name",     widthRatio: 0.25, align: "left" },
      { header: "Account No",       widthRatio: 0.14, align: "left" },
      { header: "Opening Balance",  widthRatio: 0.14, align: "right" },
      { header: "Dr",               widthRatio: 0.12, align: "right" },
      { header: "Cr",               widthRatio: 0.12, align: "right" },
      { header: "Closing Balance",  widthRatio: 0.14, align: "right" },
    ],
    rows: [
      infoRow,
      ...data.accounts.map((a, i) => ({ cells: [String(i + 1), a.accountName, a.accountNo, fmt(a.openingBalance), fmt(a.periodDr), fmt(a.periodCr), fmt(a.closingBalance)] })),
      { style: "total" as const, cells: ["Total", "", "", fmt(data.totalOpeningBalance), fmt(data.totalPeriodDr), fmt(data.totalPeriodCr), fmt(data.totalClosingBalance)] },
    ],
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
  const [accounts, setAccounts]                 = useState<GeneralLedgerAccountItem[]>([]);
  const [selectedAccount, setSelectedAccount]   = useState<{ value: number; label: string } | null>(null);
  const [fromDate, setFromDate]                 = useState(workingDate);
  const [toDate, setToDate]                     = useState(workingDate);
  const [consolidate, setConsolidate]           = useState(false);
  const [nonZero, setNonZero]                   = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [acReport, setAcReport]                 = useState<GeneralLedger | null>(null);
  const [headReport, setHeadReport]             = useState<HeadLedger | null>(null);

  const isHeadMode = mode !== "ac";
  const hasReport  = acReport !== null || headReport !== null;

  useEffect(() => {
    if (!user.branchid) return;
    headLedgerApi.getAccountHeads(user.branchid).then((res) => {
      setHeads((res as any).data ?? (res as any).Data ?? []);
    });
  }, [user.branchid]);

  useEffect(() => {
    if (isHeadMode || !selectedHead) {
      setAccounts([]);
      setSelectedAccount(null);
      return;
    }
    generalLedgerApi.getAccountsForHead(user.branchid, selectedHead.value).then((res) => {
      setAccounts((res as any).data ?? (res as any).Data ?? []);
      setSelectedAccount(null);
    });
  }, [selectedHead, isHeadMode]);

  const handleModeChange = (m: LedgerMode) => {
    setMode(m);
    setAcReport(null);
    setHeadReport(null);
    setSelectedAccount(null);
    setAccounts([]);
  };

  const headOptions    = heads.map((h) => ({ value: h.headCode,    label: `${h.name} (${h.typeName})` }));
  const accountOptions = accounts.map((a) => ({ value: a.accountId, label: `${a.accountNo} — ${a.accountName}` }));

  const handleLoad = async () => {
    if (!selectedHead) { Swal.fire("Validation", "Please select an account head.", "warning"); return; }
    if (!isHeadMode && !selectedAccount) { Swal.fire("Validation", "Please select an account.", "warning"); return; }
    if (!fromDate || !toDate) { Swal.fire("Validation", "Please select both dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From Date must be on or before To Date.", "warning"); return; }

    setLoading(true);
    setAcReport(null);
    setHeadReport(null);
    try {
      if (mode === "ac") {
        const res  = await generalLedgerApi.getGeneralLedger(user.branchid, selectedAccount!.value, fromDate, toDate, consolidate, nonZero);
        const data = (res as any).data ?? (res as any).Data;
        if (!data) throw new Error((res as any).message ?? "No data returned.");
        setAcReport(data);
      } else {
        const res  = await headLedgerApi.getHeadLedger(user.branchid, selectedHead.value, fromDate, toDate);
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

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
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

                <div className="min-w-[260px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Head</label>
                  <Select
                    options={headOptions} value={selectedHead}
                    onChange={(opt) => { setSelectedHead(opt); setAcReport(null); setHeadReport(null); }}
                    placeholder="Select account head…" isClearable
                    menuPortalTarget={document.body} menuPosition="fixed" styles={selectStyles}
                  />
                </div>

                {!isHeadMode && (
                  <div className="min-w-[260px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                    <Select
                      options={accountOptions} value={selectedAccount}
                      onChange={(opt) => { setSelectedAccount(opt); setAcReport(null); }}
                      placeholder={selectedHead ? "Select account…" : "Select a head first…"}
                      isClearable isDisabled={!selectedHead}
                      menuPortalTarget={document.body} menuPosition="fixed" styles={selectStyles}
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

                {!isHeadMode && (
                  <div className="flex items-center gap-5 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={consolidate}
                        onChange={(e) => { setConsolidate(e.target.checked); setAcReport(null); }}
                        className="w-4 h-4 accent-amber-600" />
                      <span className="text-sm font-medium text-gray-700">Consolidate</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={nonZero}
                        onChange={(e) => { setNonZero(e.target.checked); setAcReport(null); }}
                        className="w-4 h-4 accent-amber-600" />
                      <span className="text-sm font-medium text-gray-700">Non Zero</span>
                    </label>
                  </div>
                )}

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
                      onClick={() => { if (acReport) exportToPdf(buildAcExportConfig(acReport, consolidate)); if (headReport) exportToPdf(buildHeadExportConfig(headReport, mode)); }}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-sm transition-all">
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => { if (acReport) exportToExcel(buildAcExportConfig(acReport, consolidate)); if (headReport) exportToExcel(buildHeadExportConfig(headReport, mode)); }}
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
                  <span className={`font-bold text-sm ${balCls(acReport.openingBalance)}`}>₹{fmt(acReport.openingBalance)}</span>
                </div>

                {acReport.rows.length > 0 ? (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Date</th>
                          {!consolidate && <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Voucher No</th>}
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left font-bold text-gray-800">Narration</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right font-bold text-gray-800">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acReport.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-700">{fmtDate(row.valueDate)}</td>
                            {!consolidate && <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{row.voucherNo}</td>}
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600 max-w-xs truncate">{row.narration || "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-blue-700">{row.dr != null ? fmt(row.dr) : "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">{row.cr != null ? fmt(row.cr) : "—"}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${balCls(row.runningBalance)}`}>{fmt(row.runningBalance)}</td>
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
                  <span className={`font-bold text-sm ${balCls(acReport.closingBalance)}`}>₹{fmt(acReport.closingBalance)}</span>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {/* ── Head Ledger Report ────────────────────────────────────────── */}
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

                <div className="overflow-x-auto p-4">
                  {/* ── Head Ledger (Accounts) ── */}
                  {mode === "head-accounts" && (
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">#</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account Name</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account No</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headReport.accounts.map((acc, idx) => (
                          <tr key={acc.accountId} className="hover:bg-purple-50/40">
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{idx + 1}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{acc.accountName}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{acc.accountNo}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${balCls(acc.closingBalance)}`}>{fmt(acc.closingBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-purple-700">
                          <td colSpan={3} className="border border-purple-800 px-3 py-2 text-white font-bold">Total</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalClosingBalance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* ── Head Ledger (Consolidate On Accounts) ── */}
                  {mode === "head-consolidate" && (
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Head Name</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Opening Balance (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Closing Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-purple-50/40">
                          <td className="border border-gray-300 px-3 py-1.5 font-medium text-gray-800">{headReport.headName}</td>
                          <td className={`border border-gray-300 px-3 py-1.5 text-right font-medium ${balCls(headReport.totalOpeningBalance)}`}>{fmt(headReport.totalOpeningBalance)}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right text-blue-700">{fmt(headReport.totalPeriodDr)}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">{fmt(headReport.totalPeriodCr)}</td>
                          <td className={`border border-gray-300 px-3 py-1.5 text-right font-bold ${balCls(headReport.totalClosingBalance)}`}>{fmt(headReport.totalClosingBalance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* ── Head Ledger (In Detail) ── */}
                  {mode === "head-detail" && (
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">#</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account Name</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left font-bold text-gray-800">Account No</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Opening Balance (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right font-bold text-gray-800">Closing Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headReport.accounts.map((acc, idx) => (
                          <tr key={acc.accountId} className="hover:bg-purple-50/40">
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{idx + 1}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{acc.accountName}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{acc.accountNo}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-medium ${balCls(acc.openingBalance)}`}>{fmt(acc.openingBalance)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-700">{acc.periodDr !== 0 ? fmt(acc.periodDr) : "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-700">{acc.periodCr !== 0 ? fmt(acc.periodCr) : "—"}</td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-bold ${balCls(acc.closingBalance)}`}>{fmt(acc.closingBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-purple-700">
                          <td colSpan={3} className="border border-purple-800 px-3 py-2 text-white font-bold">Total</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalOpeningBalance)}</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalPeriodDr)}</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalPeriodCr)}</td>
                          <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold">{fmt(headReport.totalClosingBalance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
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
