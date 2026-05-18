import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { FileText, Search, Printer } from "lucide-react";
import generalLedgerApi, { GeneralLedgerAccountItem, GeneralLedger } from "../../services/reports/generalLedgerApi";
import headLedgerApi, { AccountHeadItem } from "../../services/reports/headLedgerApi";
import commonservice from "../../services/common/commonservice";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDatePart = (iso: string) => iso.split("T")[0];

const localDate = (iso: string) => {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtDate = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtLong = (iso: string) =>
  localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

const toInputDate = (iso: string) => isoDatePart(iso);

const balanceClass = (n: number) => n >= 0 ? "text-blue-700" : "text-red-600";

const selectStyles = {
  menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
  menu: (b: any) => ({ ...b, zIndex: 9999 }),
};

// ── Main Component ─────────────────────────────────────────────────────────────

const GeneralLedgerPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate
    ? toInputDate(commonservice.splitDate(user.workingdate))
    : toInputDate(new Date().toISOString());

  const [heads, setHeads]               = useState<AccountHeadItem[]>([]);
  const [selectedHead, setSelectedHead] = useState<{ value: number; label: string } | null>(null);
  const [accounts, setAccounts]         = useState<GeneralLedgerAccountItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<{ value: number; label: string } | null>(null);
  const [fromDate, setFromDate]         = useState(workingDate);
  const [toDate, setToDate]             = useState(workingDate);
  const [loading, setLoading]           = useState(false);
  const [report, setReport]             = useState<GeneralLedger | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    headLedgerApi.getAccountHeads(user.branchid).then((res) => {
      const data: AccountHeadItem[] = (res as any).data ?? (res as any).Data ?? [];
      setHeads(data);
    });
  }, [user.branchid]);

  useEffect(() => {
    if (!selectedHead) { setAccounts([]); setSelectedAccount(null); return; }
    generalLedgerApi.getAccountsForHead(user.branchid, selectedHead.value).then((res) => {
      const data: GeneralLedgerAccountItem[] = (res as any).data ?? (res as any).Data ?? [];
      setAccounts(data);
      setSelectedAccount(null);
    });
  }, [selectedHead]);

  const headOptions    = heads.map((h) => ({ value: h.headCode, label: `${h.name} (${h.typeName})` }));
  const accountOptions = accounts.map((a) => ({ value: a.accountId, label: `${a.accountNo} — ${a.accountName}` }));

  const handleLoad = async () => {
    if (!selectedAccount) {
      Swal.fire("Validation", "Please select an account.", "warning");
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
      const res = await generalLedgerApi.getGeneralLedger(user.branchid, selectedAccount.value, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to load general ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-5">

            {/* ── Filter Card ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">General Ledger</h2>
                  <p className="text-xs text-gray-500">Full transaction detail for any account</p>
                </div>
              </div>

              <div className="p-5 flex flex-wrap items-end gap-4">
                <div className="min-w-[260px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Head</label>
                  <Select
                    options={headOptions}
                    value={selectedHead}
                    onChange={(opt) => { setSelectedHead(opt); setReport(null); }}
                    placeholder="Select head to filter…"
                    isClearable
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={selectStyles}
                  />
                </div>

                <div className="min-w-[260px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <Select
                    options={accountOptions}
                    value={selectedAccount}
                    onChange={(opt) => { setSelectedAccount(opt); setReport(null); }}
                    placeholder={selectedHead ? "Select account…" : "Select a head first…"}
                    isClearable
                    isDisabled={!selectedHead}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={selectStyles}
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
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading…</>
                    : <><Search className="w-4 h-4" /> Generate</>
                  }
                </button>

                {report && (
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg cursor-pointer shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
              </div>
            </div>

            {/* ── Report ──────────────────────────────────────────────────── */}
            {report && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

                {/* Header */}
                <div className="text-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 print:bg-white">
                  <h1 className="text-xl font-bold text-gray-900">{report.branchName}</h1>
                  {report.branchAddress && <p className="text-xs text-gray-500 mt-0.5">{report.branchAddress}</p>}
                  <h2 className="text-base font-semibold text-amber-800 mt-2">General Ledger</h2>
                  <p className="text-sm text-gray-700 mt-0.5 font-medium">{report.accountName}</p>
                  {report.headName && <p className="text-xs text-gray-500">Head: {report.headName}</p>}
                  <p className="text-sm text-gray-600 mt-0.5">
                    {fmtLong(report.fromDate)} to {fmtLong(report.toDate)}
                  </p>
                </div>

                {/* Opening balance chip */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Opening Balance</span>
                  <span className={`font-bold text-sm ${balanceClass(report.openingBalance)}`}>
                    ₹{fmt(report.openingBalance)}
                  </span>
                </div>

                {/* Table */}
                {report.rows.length > 0 ? (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left text-gray-800 font-bold">Date</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left text-gray-800 font-bold">Voucher No</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-left text-gray-800 font-bold">Narration</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right text-gray-800 font-bold">Dr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right text-gray-800 font-bold">Cr (₹)</th>
                          <th className="border border-gray-300 px-3 py-2 bg-amber-50 text-right text-gray-800 font-bold">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/40">
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-700">{fmtDate(row.valueDate)}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600">{row.voucherNo}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-600 max-w-xs truncate">{row.narration || "—"}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-blue-700">
                              {row.dr != null ? fmt(row.dr) : "—"}
                            </td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right text-red-600">
                              {row.cr != null ? fmt(row.cr) : "—"}
                            </td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${balanceClass(row.runningBalance)}`}>
                              {fmt(row.runningBalance)}
                            </td>
                          </tr>
                        ))}

                        {/* Totals */}
                        <tr className="bg-amber-700">
                          <td colSpan={3} className="border border-amber-800 px-3 py-2 text-white font-bold text-xs">Total</td>
                          <td className="border border-amber-800 px-3 py-2 text-right text-white font-bold text-xs">
                            ₹{fmt(report.totalDr)}
                          </td>
                          <td className="border border-amber-800 px-3 py-2 text-right text-white font-bold text-xs">
                            ₹{fmt(report.totalCr)}
                          </td>
                          <td className="border border-amber-800 px-3 py-2 text-right text-white font-bold text-xs" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-400 py-10">No transactions in this period.</p>
                )}

                {/* Closing balance */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs">
                  <span className="font-semibold text-gray-600">Closing Balance</span>
                  <span className={`font-bold text-sm ${balanceClass(report.closingBalance)}`}>
                    ₹{fmt(report.closingBalance)}
                  </span>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400 print:hidden">
                  Generated on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            )}

            {!report && !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <FileText className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">Select a head, account and date range, then click Generate</p>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default GeneralLedgerPage;
