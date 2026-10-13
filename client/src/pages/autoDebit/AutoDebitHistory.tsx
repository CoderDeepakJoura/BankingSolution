import React, { useState, useEffect } from "react";
import { ArrowLeft, ClipboardList, ChevronDown, ChevronRight, RefreshCw, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import autoDebitApi, { AutoDebitRunDTO, AutoDebitRunDetailDTO } from "../../services/autoDebit/autoDebitApi";

const statusBadge = (s: string) => {
  if (s === "Completed") return "bg-green-100 text-green-700";
  if (s === "Running")   return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
};
const detailBadge = (s: string) => {
  if (s === "Success") return "bg-green-100 text-green-700";
  if (s === "Failed")  return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500";
};
const DetailIcon = ({ s }: { s: string }) => {
  if (s === "Success") return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (s === "Failed")  return <XCircle className="w-4 h-4 text-red-500" />;
  return <MinusCircle className="w-4 h-4 text-gray-400" />;
};

const AutoDebitHistory = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);

  const [runs, setRuns] = useState<AutoDebitRunDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);
  const [runDetails, setRunDetails] = useState<Record<number, AutoDebitRunDetailDTO[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res: any = await autoDebitApi.getHistory(user.branchid, p, 20);
      if (res.success) { setRuns(res.data ?? []); setTotal(res.total ?? 0); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(page); }, [page, user.branchid]);

  const toggleRun = async (runId: number) => {
    if (expandedRun === runId) { setExpandedRun(null); return; }
    setExpandedRun(runId);
    if (runDetails[runId]) return;
    setLoadingDetails(runId);
    try {
      const res: any = await autoDebitApi.getRunDetails(user.branchid, runId);
      if (res.success) setRunDetails((prev) => ({ ...prev, [runId]: res.details ?? [] }));
    } catch { /* ignore */ }
    finally { setLoadingDetails(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-slate-700 via-blue-800 to-indigo-800 px-8 py-6 shadow-lg">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-white/5 rounded-full" />
            </div>
            <div className="relative flex items-center gap-4">
              <button onClick={() => navigate("/dashboard")}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Auto-Debit History</h2>
                <p className="text-blue-200 text-sm">Daily batch run results for this branch</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No auto-debit runs yet.</p>
              </div>
            ) : (
              <>
                {runs.map((run) => (
                  <div key={run.id} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                    {/* Run header row */}
                    <button
                      onClick={() => toggleRun(run.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 w-28 flex-shrink-0">{run.runDate}</div>
                        <div className="text-xs text-gray-400">{run.startTime} — {run.endTime || "…"}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(run.status)}`}>{run.status}</span>
                        <div className="flex items-center gap-3 text-xs ml-2">
                          <span className="text-gray-500">Total: <b className="text-gray-700">{run.totalAccounts}</b></span>
                          <span className="text-green-600">✅ {run.successCount}</span>
                          {run.failCount > 0 && <span className="text-red-500">❌ {run.failCount}</span>}
                        </div>
                      </div>
                      {expandedRun === run.id
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {/* Expanded details */}
                    {expandedRun === run.id && (
                      <div className="border-t border-gray-100">
                        {loadingDetails === run.id ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                          </div>
                        ) : (runDetails[run.id] ?? []).length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-6">No detail records.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  {["Account No", "Name", "Type", "Amount", "Status", "Note / Error"].map(h => (
                                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {(runDetails[run.id] ?? []).map((d) => (
                                  <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-mono text-gray-600">{d.accountNo}</td>
                                    <td className="px-4 py-2 text-gray-800">{d.accountName}</td>
                                    <td className="px-4 py-2">
                                      <span className="text-xs text-gray-500">{d.accountType}</span>
                                    </td>
                                    <td className="px-4 py-2 font-medium tabular-nums text-right">₹{d.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <DetailIcon s={d.status} />
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${detailBadge(d.status)}`}>{d.status}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-400 max-w-xs truncate">{d.errorMessage || ((d as any).voucherNo ? `Voucher No. ${(d as any).voucherNo}` : "—")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-50">← Prev</button>
                    <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-50">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      }
    />
  );
};

export default AutoDebitHistory;
