import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { BookOpen, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import headLedgerApi, { AccountHeadItem, HeadLedger } from "../../services/reports/headLedgerApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

const toInputDate = (iso: string) => isoDatePart(iso);

const balanceClass = (n: number) =>
  n >= 0 ? "text-blue-700" : "text-red-600";

const buildExportConfig = (data: HeadLedger): ExportConfig => {
  const rows: ExportRow[] = [
    {
      style: "info",
      cells: [
        `Head: ${data.headName}`,
        `Type: ${data.typeName}`,
        `Period: ${fmtDate(data.fromDate)} to ${fmtDate(data.toDate)}`,
      ],
    },
    ...data.accounts.map((acc, idx) => ({
      cells: [
        String(idx + 1),
        acc.accountName,
        acc.accountNo,
        fmt(acc.openingBalance),
        acc.periodDr !== 0 ? fmt(acc.periodDr) : "",
        acc.periodCr !== 0 ? fmt(acc.periodCr) : "",
        fmt(acc.closingBalance),
      ],
    })),
    {
      style: "total",
      cells: [
        "Total",
        "",
        "",
        fmt(data.totalOpeningBalance),
        fmt(data.totalPeriodDr),
        fmt(data.totalPeriodCr),
        fmt(data.totalClosingBalance),
      ],
    },
  ];

  return {
    meta: {
      title: data.branchName,
      subtitle: data.branchAddress,
      reportTitle: `Head Ledger - ${data.headName}`,
      fileName: `head-ledger-${data.headCode}-${isoDatePart(data.fromDate)}-to-${isoDatePart(data.toDate)}`,
      landscape: true,
    },
    columns: [
      { header: "#", widthRatio: 0.05, align: "center" },
      { header: "Account Name", widthRatio: 0.25, align: "left" },
      { header: "Account No", widthRatio: 0.14, align: "left" },
      { header: "Opening Balance", widthRatio: 0.14, align: "right" },
      { header: "Dr", widthRatio: 0.12, align: "right" },
      { header: "Cr", widthRatio: 0.12, align: "right" },
      { header: "Closing Balance", widthRatio: 0.14, align: "right" },
    ],
    rows,
  };
};

// ── Main Component ─────────────────────────────────────────────────────────────

const HeadLedgerPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [heads, setHeads]           = useState<AccountHeadItem[]>([]);
  const [selectedHead, setSelectedHead] = useState<{ value: number; label: string } | null>(null);
  const [fromDate, setFromDate]     = useState(workingDate);
  const [toDate, setToDate]         = useState(workingDate);
  const [loading, setLoading]       = useState(false);
  const [report, setReport]         = useState<HeadLedger | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    headLedgerApi.getAccountHeads(user.branchid).then((res) => {
      const data: AccountHeadItem[] = (res as any).data ?? (res as any).Data ?? [];
      setHeads(data);
    });
  }, [user.branchid]);

  const headOptions = heads.map((h) => ({
    value: h.headCode,
    label: `${h.name} (${h.typeName})`,
  }));

  const handleLoad = async () => {
    if (!selectedHead) {
      Swal.fire("Validation", "Please select an account head.", "warning");
      return;
    }
    if (!fromDate || !toDate) {
      Swal.fire("Validation", "Please select both From Date and To Date.", "warning");
      return;
    }
    if (fromDate > toDate) {
      Swal.fire("Validation", "From Date must be on or before To Date.", "warning");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await headLedgerApi.getHeadLedger(user.branchid, selectedHead.value, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load head ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
          <div className="w-full space-y-5">

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Head Ledger</h2>
                  <p className="text-xs text-gray-500">Account-wise summary under an account head</p>
                </div>
              </div>

              <div className="p-5 flex flex-wrap items-end gap-4">
                <div className="min-w-[280px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Head</label>
                  <Select
                    options={headOptions}
                    value={selectedHead}
                    onChange={(opt) => { setSelectedHead(opt); setReport(null); }}
                    placeholder="Select account head…"
                    isClearable
                    styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }), menu: (b) => ({ ...b, zIndex: 9999 }), control: (b: any) => ({ ...b, cursor: "pointer" }) }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleLoad} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                    : <><Search className="w-4 h-4" /> Generate</>
                  }
                </button>

                {report && (
                  <>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                      onClick={() => exportToPdf(buildExportConfig(report))}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => exportToExcel(buildExportConfig(report))}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>

            {/* ── Report ──────────────────────────────────────────────────── */}
            {report && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

                {/* Header */}
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                  {report.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>}
                  <h2 className="text-base font-semibold text-purple-800 mt-2">Head Ledger — {report.headName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{report.typeName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {fmtDate(report.fromDate)} to {fmtDate(report.toDate)}
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto p-4">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left text-gray-800 font-bold">#</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left text-gray-800 font-bold">Account Name</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-left text-gray-800 font-bold">Account No</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right text-gray-800 font-bold">Opening Balance</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right text-gray-800 font-bold">Dr (₹)</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right text-gray-800 font-bold">Cr (₹)</th>
                        <th className="border border-gray-300 px-3 py-2 bg-purple-50 text-right text-gray-800 font-bold">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.accounts.map((acc, idx) => (
                        <tr key={acc.accountId} className="hover:bg-purple-50/40">
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{idx + 1}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{acc.accountName}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{acc.accountNo}</td>
                          <td className={`border border-gray-300 px-3 py-1.5 text-right font-medium ${balanceClass(acc.openingBalance)}`}>
                            {fmt(acc.openingBalance)}
                          </td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-700">{acc.periodDr !== 0 ? fmt(acc.periodDr) : "—"}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-700">{acc.periodCr !== 0 ? fmt(acc.periodCr) : "—"}</td>
                          <td className={`border border-gray-300 px-3 py-1.5 text-right font-bold ${balanceClass(acc.closingBalance)}`}>
                            {fmt(acc.closingBalance)}
                          </td>
                        </tr>
                      ))}

                      {/* Totals */}
                      <tr className="bg-purple-700">
                        <td colSpan={3} className="border border-purple-800 px-3 py-2 text-white font-bold text-xs">Total</td>
                        <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold text-xs">
                          {fmt(report.totalOpeningBalance)}
                        </td>
                        <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold text-xs">
                          {fmt(report.totalPeriodDr)}
                        </td>
                        <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold text-xs">
                          {fmt(report.totalPeriodCr)}
                        </td>
                        <td className="border border-purple-800 px-3 py-2 text-right text-white font-bold text-xs">
                          {fmt(report.totalClosingBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {!report && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <BookOpen className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select a head and date range, then click Generate</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default HeadLedgerPage;
