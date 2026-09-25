import React, { useState } from "react";
import { Printer, ArrowLeft, Search, Download, AlertCircle } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import commonservice from "../../services/common/commonservice";
import { getSessionFromDate } from "../../utils/sessionUtils";
import DatePicker from "../../components/DatePicker";
import { voucherPrintApi, VoucherSummaryDTO } from "../../services/voucherPrintApi";

const VOUCHER_TYPE_OPTIONS = [
  { voucherType: 0, voucherSubType: 0, label: "All Types" },
  { voucherType: 1, voucherSubType: 1, label: "Share Money Voucher" },
  { voucherType: 2, voucherSubType: 2, label: "Saving Deposit Voucher" },
  { voucherType: 2, voucherSubType: 3, label: "Saving Withdrawal Voucher" },
  { voucherType: 2, voucherSubType: 29, label: "Account Closure Voucher" },
  { voucherType: 3, voucherSubType: 2, label: "FD Deposit Voucher" },
  { voucherType: 3, voucherSubType: 4, label: "FD Interest Posting" },
  { voucherType: 3, voucherSubType: 5, label: "FD Maturity Voucher" },
  { voucherType: 3, voucherSubType: 6, label: "FD Renewal Voucher" },
  { voucherType: 3, voucherSubType: 7, label: "FD Pre-Mature Voucher" },
  { voucherType: 4, voucherSubType: 8, label: "RD Kist Voucher" },
  { voucherType: 4, voucherSubType: 16, label: "RD Multiple Kist Voucher" },
  { voucherType: 5, voucherSubType: 9, label: "Loan Advancement Voucher" },
  { voucherType: 5, voucherSubType: 10, label: "Loan Recovery Voucher" },
  { voucherType: 5, voucherSubType: 14, label: "Loan Expense Voucher" },
  { voucherType: 6, voucherSubType: 11, label: "Cash Voucher" },
  { voucherType: 7, voucherSubType: 12, label: "Journal Voucher" },
];

const statusLabel = (s: string) => {
  if (s === "V") return { text: "Verified", cls: "bg-green-100 text-green-700" };
  if (s === "A") return { text: "Pending", cls: "bg-yellow-100 text-yellow-700" };
  return { text: s, cls: "bg-gray-100 text-gray-600" };
};

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const VoucherReprint: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const workingDateISO = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();
  const sessionFrom = getSessionFromDate(user.sessionInfo, workingDateISO);

  const [fromDate, setFromDate] = useState(workingDateISO);
  const [toDate, setToDate] = useState(workingDateISO);
  const [typeKey, setTypeKey] = useState("0-0");
  const [voucherNo, setVoucherNo] = useState("");
  const [results, setResults] = useState<VoucherSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);

  const selectedType = VOUCHER_TYPE_OPTIONS.find(
    (o) => `${o.voucherType}-${o.voucherSubType}` === typeKey
  ) ?? VOUCHER_TYPE_OPTIONS[0];

  const handleSearch = async () => {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) {
      setError("From Date cannot be after To Date.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(false);
    try {
      const data = await voucherPrintApi.searchVouchers(
        user.branchid,
        fromDate,
        toDate,
        selectedType.voucherType,
        selectedType.voucherSubType,
        voucherNo ? Number(voucherNo) : 0
      );
      setResults(data);
      setSearched(true);
    } catch {
      setError("Failed to load vouchers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (row: VoucherSummaryDTO) => {
    setPrintingId(row.voucherId);
    try {
      await voucherPrintApi.downloadVoucherPdf(
        user.branchid,
        row.voucherType,
        row.voucherSubType,
        row.voucherNo,
        1,
        undefined,
        row.voucherDate
      );
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <Printer className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Voucher Re-Print</h2>
                      <p className="text-sm text-gray-600">Search and re-download voucher PDFs</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                    <DatePicker
                      value={fromDate}
                      min={sessionFrom}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      onChange={(v) => { setFromDate(v); setSearched(false); }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                    <DatePicker
                      value={toDate}
                      min={fromDate}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      onChange={(v) => { setToDate(v); setSearched(false); }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher Type</label>
                    <select
                      value={typeKey}
                      onChange={(e) => { setTypeKey(e.target.value); setSearched(false); }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer text-sm"
                    >
                      {VOUCHER_TYPE_OPTIONS.map((o) => (
                        <option key={`${o.voucherType}-${o.voucherSubType}`} value={`${o.voucherType}-${o.voucherSubType}`}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher No (optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={voucherNo}
                        placeholder="e.g. 42"
                        onChange={(e) => {
                          setVoucherNo(e.target.value.replace(/\D/g, ""));
                          setSearched(false);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-400 text-sm"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                        {loading ? "..." : "Search"}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {searched && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {results.length === 0
                      ? "No vouchers found"
                      : `${results.length} voucher${results.length !== 1 ? "s" : ""} found`}
                  </span>
                  {results.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {fmtDate(fromDate)} — {fmtDate(toDate)}
                    </span>
                  )}
                </div>

                {results.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">
                    No vouchers match the selected criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {["#", "Voucher No", "Date", "Type", "Amount", "Status", ""].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {results.map((row, i) => {
                          const badge = statusLabel(row.status);
                          const isPrinting = printingId === row.voucherId;
                          return (
                            <tr key={row.voucherId} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm font-semibold text-blue-700">
                                  {row.prefix}-{String(row.voucherNo).padStart(6, "0")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {fmtDate(row.voucherDate)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-block text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded capitalize">
                                  {row.typeLabel.replace(/ VOUCHER$/, "").replace(/ POSTING$/, " Posting")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-800 font-mono">
                                {fmt(row.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.cls}`}>
                                  {badge.text}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handlePrint(row)}
                                  disabled={isPrinting}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {isPrinting ? "Generating..." : "Print PDF"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default VoucherReprint;
