import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import ibVoucherApi, { IBVoucherListItem } from "../../services/interbranch/ibVoucherApi";
import commonservice from "../../services/common/commonservice";
import {
  ArrowLeft, RefreshCw, CheckCircle, GitMerge,
  Building2, ArrowRight, CreditCard, Calendar,
  FileText, User, ChevronRight, Loader2,
} from "lucide-react";

const IBPendingVouchers: React.FC = () => {
  const navigate  = useNavigate();
  const user      = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [vouchers, setVouchers]       = useState<IBVoucherListItem[]>([]);
  const [selected, setSelected]       = useState<IBVoucherListItem | null>(null);
  const [narration, setNarration]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [confirming, setConfirming]   = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ibVoucherApi.getPendingForHO(user.branchid) as any;
      if (res.success) {
        setVouchers(res.data ?? []);
        // keep selected in sync after refresh
        setSelected(prev => prev ? (res.data ?? []).find((v: IBVoucherListItem) => v.id === prev.id) ?? null : null);
      }
    } catch {
      Swal.fire("Error", "Failed to load pending vouchers.", "error");
    } finally {
      setLoading(false);
    }
  }, [user.branchid]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleConfirm = async () => {
    if (!selected) return;
    const confirm = await Swal.fire({
      title: "Confirm HO Settlement?",
      html: `Settle <strong>₹${selected.amount.toFixed(2)}</strong> from <strong>${selected.fromBrName}</strong> to <strong>${selected.destBrName}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Confirm",
    });
    if (!confirm.isConfirmed) return;

    setConfirming(true);
    try {
      const res = await ibVoucherApi.confirmStep2(selected.id, {
        hoBrId: user.branchid,
        workingDate: sessionDate,
        narration: narration.trim() || undefined,
      }) as any;
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Settled!", text: res.message, confirmButtonColor: "#10b981" });
        setSelected(null);
        fetchVouchers();
      } else {
        Swal.fire("Error", res.message || "Settlement failed.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Settlement failed.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending:          "bg-amber-100 text-amber-700",
      HOConfirmed:      "bg-blue-100 text-blue-700",
      BranchCompleted:  "bg-violet-100 text-violet-700",
      BranchProcessed:  "bg-purple-100 text-purple-700",
      Completed:        "bg-emerald-100 text-emerald-700",
    };
    return map[status] ?? "bg-gray-100 text-gray-700";
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value || "—"}</span>
    </div>
  );

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-emerald-50 p-4 sm:p-6 lg:p-8 h-full">
          <div className="w-full flex flex-col gap-6 h-full">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                    <GitMerge className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">IB Pending Vouchers</h1>
                    <p className="text-sm text-gray-500">Branch-to-Branch vouchers awaiting HO settlement (Step 2 of 3)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchVouchers}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Split panel */}
            <div className="flex gap-6 flex-1 min-h-0">

              {/* Left — voucher list */}
              <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Pending Vouchers
                    {vouchers.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        {vouchers.length}
                      </span>
                    )}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                  ) : vouchers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No pending vouchers</p>
                      <p className="text-xs mt-1">All inter-branch transactions are settled</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {vouchers.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelected(v);
                            const fromBr = `${v.fromBrCode ? v.fromBrCode + '-' : ''}${v.fromBrName}`;
                            const destBr = `${v.destBrCode ? v.destBrCode + '-' : ''}${v.destBrName}`;
                            const isWdl = v.voucherType === "IBSavingWithdrawal";
                            setNarration(isWdl
                              ? `HO settlement for IB withdrawal of ₹${v.amount.toFixed(2)} from ${destBr} to ${fromBr} for A/C ${v.destAccNo} (${v.destAccName})`
                              : `HO settlement for IB deposit of ₹${v.amount.toFixed(2)} from ${fromBr} to ${destBr} for A/C ${v.destAccNo} (${v.destAccName})`);
                          }}
                          className={`w-full text-left px-5 py-4 hover:bg-emerald-50 transition-colors flex items-start justify-between gap-3 ${
                            selected?.id === v.id ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">#{v.id}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(v.status)}`}>
                                {v.status}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-sky-100 text-sky-700">
                                {v.voucherType.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1">
                              <span className="truncate">{v.fromBrName}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{v.destBrName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 truncate">{v.destAccName}</span>
                              <span className="text-sm font-bold text-emerald-600 ml-2 flex-shrink-0">
                                ₹{v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${selected?.id === v.id ? "text-emerald-500" : "text-gray-300"}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — detail panel */}
              <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
                {!selected ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <GitMerge className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                      <p className="font-medium">Select a voucher to view details</p>
                      <p className="text-sm mt-1">Click any pending voucher from the list</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-6 py-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">Voucher #{selected.id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(selected.status)}`}>
                              {selected.status}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-gray-800">
                            {selected.voucherType === "IBSavingWithdrawal" ? "IB Saving Withdrawal" : "IB Saving Deposit"} — ₹{selected.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                        <button
                          onClick={handleConfirm}
                          disabled={confirming}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-semibold text-sm transition-all shadow-md disabled:opacity-50"
                        >
                          {confirming ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Confirming...</>
                          ) : (
                            <><CheckCircle className="w-4 h-4" />Confirm Settlement</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detail body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                      {/* Branch flow */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex-1 text-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <p className="text-xs text-gray-400 mb-0.5">From Branch</p>
                          <p className="text-sm font-bold text-gray-800">{selected.fromBrName}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-xs text-emerald-600 font-medium">IB Transfer</span>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                          <p className="text-xs text-gray-400 mb-0.5">To Branch</p>
                          <p className="text-sm font-bold text-gray-800">{selected.destBrName}</p>
                        </div>
                      </div>

                      {/* Destination account */}
                      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                        <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" /> Destination Account
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Account No" value={selected.destAccNo} />
                          <InfoRow label="Account Name" value={selected.destAccName} />
                        </div>
                      </div>

                      {/* Step 1 — originating branch */}
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Step 1 — Originating Branch Entry
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selected.voucherType === "IBSavingWithdrawal" ? (
                            <>
                              <InfoRow label="Dr (HO Ref)" value={selected.step1DrAccName} />
                              <InfoRow label="Cr (Cash)" value={selected.step1CrAccName} />
                            </>
                          ) : (
                            <>
                              <InfoRow label="Dr (Cash)" value={selected.step1DrAccName} />
                              <InfoRow label="Cr (HO Ref)" value={selected.step1CrAccName} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 2 — HO settlement preview */}
                      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                        <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <GitMerge className="w-4 h-4" /> Step 2 — HO Settlement (This Action)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selected.voucherType === "IBSavingWithdrawal" ? (
                            <>
                              <InfoRow label="Dr (Dest-Branch Ref at HO)" value={selected.step2DrAccName} />
                              <InfoRow label="Cr (From-Branch Ref at HO)" value={selected.step2CrAccName} />
                            </>
                          ) : (
                            <>
                              <InfoRow label="Dr (From-Branch Ref at HO)" value={selected.step2DrAccName} />
                              <InfoRow label="Cr (Dest-Branch Ref at HO)" value={selected.step2CrAccName} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 3 status at dest branch */}
                      <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
                        <h3 className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Step 3 — Dest Branch Completion
                          {selected.step3VoucherId
                            ? <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Done</span>
                            : <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Pending at Branch</span>
                          }
                        </h3>
                        {selected.step3DrAccName && (
                          <div className="grid grid-cols-2 gap-4">
                            {selected.voucherType === "IBSavingWithdrawal" ? (
                              <>
                                <InfoRow label="Dr (Customer Saving Account)" value={selected.step3DrAccName} />
                                <InfoRow label="Cr (HO Ref at Dest Branch)" value={selected.step3CrAccName} />
                              </>
                            ) : (
                              <>
                                <InfoRow label="Dr (HO Ref at Dest Branch)" value={selected.step3DrAccName} />
                                <InfoRow label="Cr (Customer Saving Account)" value={selected.step3CrAccName} />
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Narration & date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Narration
                            <span className="text-xs font-normal text-gray-400 normal-case tracking-normal">(editable)</span>
                          </h3>
                          <textarea
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                            rows={3}
                            className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all"
                            placeholder="Enter narration…"
                          />
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Entry Date
                          </h3>
                          <p className="text-sm text-gray-700">
                            {new Date(selected.entryDate).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      }
    />
  );
};

export default IBPendingVouchers;
