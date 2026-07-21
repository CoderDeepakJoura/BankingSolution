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
  FileText, User, ChevronRight, Loader2, Download,
} from "lucide-react";

const IBIncomingVouchers: React.FC = () => {
  const navigate    = useNavigate();
  const user        = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [vouchers, setVouchers]     = useState<IBVoucherListItem[]>([]);
  const [selected, setSelected]     = useState<IBVoucherListItem | null>(null);
  const [narration, setNarration]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ibVoucherApi.getIncomingForBranch(user.branchid) as any;
      if (res.success) {
        setVouchers(res.data ?? []);
        setSelected(prev =>
          prev ? (res.data ?? []).find((v: IBVoucherListItem) => v.id === prev.id) ?? null : null
        );
      }
    } catch {
      Swal.fire("Error", "Failed to load incoming vouchers.", "error");
    } finally {
      setLoading(false);
    }
  }, [user.branchid]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const isWithdrawal = (v: IBVoucherListItem) => v.voucherType === "IBSavingWithdrawal";

  const handleComplete = async () => {
    if (!selected) return;
    const isHOFlow = selected.flowType === "HOToBranch";
    const wdl = isWithdrawal(selected);
    const confirm = await Swal.fire({
      title: wdl
        ? (isHOFlow ? "Approve HO Withdrawal?" : "Complete IB Withdrawal?")
        : (isHOFlow ? "Approve HO Deposit?" : "Complete IB Voucher?"),
      html: wdl
        ? `Debit <strong>₹${selected.amount.toFixed(2)}</strong> from <strong>${selected.destAccName}</strong>?<br/><small class="text-gray-500">This will debit the customer saving account and credit the HO reference account.</small>`
        : `Credit <strong>₹${selected.amount.toFixed(2)}</strong> to <strong>${selected.destAccName}</strong>?<br/><small class="text-gray-500">This will debit the HO reference account and credit the customer saving account.</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#8b5cf6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: isHOFlow ? "Yes, Approve" : "Yes, Complete",
    });
    if (!confirm.isConfirmed) return;

    setCompleting(true);
    try {
      // Both flows: dest branch always calls step3 — service dispatches by flowType internally
      const res = await ibVoucherApi.completeStep3(selected.id, {
        destBrId: user.branchid,
        workingDate: sessionDate,
        narration: narration.trim() || undefined,
      }) as any;
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Completed!", text: res.message, confirmButtonColor: "#8b5cf6" });
        setSelected(null);
        fetchVouchers();
      } else {
        Swal.fire("Error", res.message || "Could not complete the voucher.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Could not complete the voucher.", "error");
    } finally {
      setCompleting(false);
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
        <div className="bg-gradient-to-br from-gray-100 to-purple-50 p-4 sm:p-6 lg:p-8 h-full">
          <div className="w-full flex flex-col gap-6 h-full">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">IB Incoming Vouchers</h1>
                    <p className="text-sm text-gray-500">Inter-branch vouchers ready to credit customer accounts</p>
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
                <div className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Incoming Vouchers
                    {vouchers.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                        {vouchers.length}
                      </span>
                    )}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                  ) : vouchers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No incoming vouchers</p>
                      <p className="text-xs mt-1">All pending vouchers have been completed</p>
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
                            setNarration(isWithdrawal(v)
                              ? `Saving A/C ${v.destAccNo} (${v.destAccName}) at ${destBr} debited ₹${v.amount.toFixed(2)} via IB withdrawal to ${fromBr}`
                              : `Saving A/C ${v.destAccNo} (${v.destAccName}) at ${destBr} credited ₹${v.amount.toFixed(2)} via IB deposit from ${fromBr}`);
                          }}
                          className={`w-full text-left px-5 py-4 hover:bg-purple-50 transition-colors flex items-start justify-between gap-3 ${
                            selected?.id === v.id ? "bg-purple-50 border-l-4 border-purple-500" : ""
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
                              <span className="text-sm font-bold text-purple-600 ml-2 flex-shrink-0">
                                ₹{v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${selected?.id === v.id ? "text-purple-500" : "text-gray-300"}`} />
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
                      <p className="text-sm mt-1">Click any incoming voucher from the list</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-200 px-6 py-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">Voucher #{selected.id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(selected.status)}`}>
                              {selected.status}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-gray-800">
                            {isWithdrawal(selected) ? "IB Saving Withdrawal" : "IB Saving Deposit"} — ₹{selected.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                        <button
                          onClick={handleComplete}
                          disabled={completing}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-lg font-semibold text-sm transition-all shadow-md disabled:opacity-50"
                        >
                          {completing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />{selected.flowType === "HOToBranch" ? "Approving..." : "Completing..."}</>
                          ) : (
                            <><CheckCircle className="w-4 h-4" />{isWithdrawal(selected)
                              ? (selected.flowType === "HOToBranch" ? "Approve & Debit Account" : "Complete & Debit Account")
                              : (selected.flowType === "HOToBranch" ? "Approve & Credit Account" : "Complete & Credit Account")
                            }</>
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
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-xs text-purple-600 font-medium">IB Transfer</span>
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
                          <User className="w-4 h-4" /> Destination Account ({isWithdrawal(selected) ? "will be debited" : "will be credited"})
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Account No" value={selected.destAccNo} />
                          <InfoRow label="Account Name" value={selected.destAccName} />
                        </div>
                      </div>

                      {/* Step 1 */}
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Step 1 — {selected.flowType === "HOToBranch" ? "HO Origination" : "Source Branch Entry"}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {isWithdrawal(selected) ? (
                            <>
                              <InfoRow label={selected.flowType === "HOToBranch" ? "Dr (Dest-Branch Ref at HO)" : "Dr (HO Ref)"} value={selected.step1DrAccName} />
                              <InfoRow label="Cr (Cash)" value={selected.step1CrAccName} />
                            </>
                          ) : (
                            <>
                              <InfoRow label="Dr (Cash)" value={selected.step1DrAccName} />
                              <InfoRow
                                label={selected.flowType === "HOToBranch" ? "Cr (Dest-Branch Ref at HO)" : "Cr (HO Ref)"}
                                value={selected.step1CrAccName}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 2 — only for BranchToBranch (HO settlement) */}
                      {selected.flowType === "BranchToBranch" && (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                          <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <GitMerge className="w-4 h-4" />
                            Step 2 — HO Settlement
                            {selected.step2VoucherId
                              ? <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Done</span>
                              : <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Pending at HO</span>
                            }
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            {isWithdrawal(selected) ? (
                              <>
                                <InfoRow label="Dr (Dest-Branch Ref at HO)" value={selected.step2DrAccName} />
                                <InfoRow label="Cr (Source-Branch Ref at HO)" value={selected.step2CrAccName} />
                              </>
                            ) : (
                              <>
                                <InfoRow label="Dr (Source-Branch Ref at HO)" value={selected.step2DrAccName} />
                                <InfoRow label="Cr (Dest-Branch Ref at HO)" value={selected.step2CrAccName} />
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Final step — this action */}
                      <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
                        <h3 className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          {selected.flowType === "HOToBranch" ? "Step 2" : "Step 3"} — Dest Branch Approval (This Action)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {isWithdrawal(selected) ? (
                            <>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Dr (Customer Saving Account)</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {selected.destAccName ?? "—"}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cr (HO Ref at Dest Branch)</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {selected.step3DrAccName ?? "—"}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <InfoRow label="Dr (HO Ref at Dest Branch)" value={selected.step3DrAccName} />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cr (Customer Saving Account)</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {selected.step3CrAccName ?? selected.destAccName ?? <em className="text-gray-400 font-normal">Will be resolved on approve</em>}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
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
                            className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all"
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

export default IBIncomingVouchers;
