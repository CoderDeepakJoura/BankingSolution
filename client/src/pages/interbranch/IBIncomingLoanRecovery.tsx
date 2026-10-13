import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import ibVoucherApi, { IBVoucherListItem } from "../../services/interbranch/ibVoucherApi";
import loanRecoveryApi, { LoanRecoveryBalanceDTO } from "../../services/vouchers/loan/loanRecoveryApi";
import commonservice from "../../services/common/commonservice";
import {
  ArrowLeft, RefreshCw, CheckCircle, GitMerge,
  Building2, ArrowRight, CreditCard, FileText,
  TrendingDown, ChevronRight, Loader2, Download,
  AlertCircle, BarChart2,
} from "lucide-react";

const fmt  = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtW = (n: number) => Math.round(n).toLocaleString("en-IN");

const INT_NAMES: Record<number, string> = {
  1: "Standard Interest",
  2: "Penal Interest",
  3: "Std. Recoverable",
  4: "Overdue Recoverable",
};

interface IntAlloc { catId: number; catName: string; outstanding: number; recovering: number }

function computeAlloc(total: number, bal: LoanRecoveryBalanceDTO): IntAlloc[] {
  const out: Record<number, number> = { 1: 0, 2: 0, 3: bal.stdRecoverableOutstanding, 4: bal.overdueRecoverableOutstanding };
  const seq = bal.recoverySeq.split(",").map(s => parseInt(s.trim())).filter(v => v >= 1 && v <= 4);
  let rem = total;
  const result: IntAlloc[] = [];
  const done = new Set<number>();
  for (const catId of seq) {
    const o = out[catId] || 0;
    const rec = o > 0 ? Math.min(rem, o) : 0;
    result.push({ catId, catName: INT_NAMES[catId], outstanding: o, recovering: rec });
    rem -= rec;
    done.add(catId);
    if (rem <= 0) break;
  }
  for (const catId of [1, 2, 3, 4]) {
    if (!done.has(catId) && (out[catId] || 0) > 0)
      result.push({ catId, catName: INT_NAMES[catId], outstanding: out[catId], recovering: 0 });
  }
  return result;
}

const IBIncomingLoanRecovery: React.FC = () => {
  const navigate    = useNavigate();
  const user        = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [vouchers,    setVouchers]    = useState<IBVoucherListItem[]>([]);
  const [selected,    setSelected]    = useState<IBVoucherListItem | null>(null);
  const [narration,   setNarration]   = useState("");
  const [intAmount,   setIntAmount]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [completing,  setCompleting]  = useState(false);
  const [loanBal,     setLoanBal]     = useState<LoanRecoveryBalanceDTO | null>(null);
  const [balLoading,  setBalLoading]  = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ibVoucherApi.getLoanRecoveryIncomingForBranch(user.branchid) as any;
      setVouchers(res?.success ? (res.data ?? []) : []);
      setSelected(prev => prev ? (res?.data ?? []).find((v: IBVoucherListItem) => v.id === prev.id) ?? null : null);
    } catch {
      Swal.fire("Error", "Failed to load incoming vouchers.", "error");
    } finally {
      setLoading(false);
    }
  }, [user.branchid]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleSelect = async (v: IBVoucherListItem) => {
    setSelected(v);
    setLoanBal(null);
    setIntAmount("");
    const fromBr = `${v.fromBrCode ? v.fromBrCode + "-" : ""}${v.fromBrName}`;
    const destBr = `${v.destBrCode ? v.destBrCode + "-" : ""}${v.destBrName}`;
    setNarration(
      `Loan recovery ₹${v.amount.toFixed(2)} for loan A/C ${v.destAccNo} (${v.destAccName}) at ${destBr} received from ${fromBr} via IB`
    );
    // Load loan balance from dest branch
    if (v.destAccId) {
      setBalLoading(true);
      loanRecoveryApi.getBalance(v.destAccId, user.branchid)
        .then(res => {
          if (res.success && res.data) {
            const bal = res.data;
            setLoanBal(bal);
            // Auto-fill interest
            if (bal.actOnIntPosting !== 1 && v.amount > 0) {
              const alloc = computeAlloc(v.amount, bal);
              const computedInt = alloc.reduce((s, a) => s + a.recovering, 0);
              setIntAmount(computedInt > 0 ? String(Math.round(computedInt)) : "");
            }
          }
        })
        .finally(() => setBalLoading(false));
    }
  };

  // Re-compute allocation when intAmount changes
  const totalAmt = selected ? selected.amount : 0;
  const intAmtParsed = parseFloat(intAmount) || 0;
  const isStandLoan = loanBal && loanBal.actOnIntPosting !== 1;
  const allocation = (isStandLoan && loanBal && totalAmt > 0) ? computeAlloc(totalAmt, loanBal) : [];
  const computedIntTotal = allocation.reduce((s, a) => s + a.recovering, 0);
  const intTotal = isStandLoan && intAmtParsed > 0 ? intAmtParsed : computedIntTotal;
  const principalRec = Math.max(0, Math.min(totalAmt - intTotal, loanBal?.principalBalance ?? 0));

  const handleComplete = async () => {
    if (!selected) return;
    const confirm = await Swal.fire({
      title: selected.flowType === "HOToBranch" ? "Apply Loan Recovery — Approve?" : "Complete IB Loan Recovery?",
      html: `Apply recovery of <strong>₹${selected.amount.toFixed(2)}</strong> to loan account <strong>${selected.destAccName}</strong>?<br/><small class="text-gray-500">This will debit the IB reference account and credit the loan account (+ interest entries if applicable).</small>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      confirmButtonText: selected.flowType === "HOToBranch" ? "Yes, Approve" : "Yes, Complete",
    });
    if (!confirm.isConfirmed) return;

    setCompleting(true);
    try {
      const payload: { destBrId: number; workingDate: string; narration?: string; intAmount?: number } = {
        destBrId: user.branchid,
        workingDate: sessionDate,
        narration: narration.trim() || undefined,
      };
      if (isStandLoan && intAmtParsed > 0) payload.intAmount = intAmtParsed;

      const res = await ibVoucherApi.completeLoanRecoveryStep3(selected.id, payload) as any;
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Recovery Applied!", text: res.message, confirmButtonColor: "#f97316" });
        setSelected(null);
        setLoanBal(null);
        setIntAmount("");
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

  if (!user.enableIBTransactions) return (
    <DashboardLayout enableScroll mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">IB Transactions Disabled</h2>
          <p className="text-sm text-gray-400">Inter-Branch transactions have been disabled for this branch.</p>
        </div>
      </div>
    } />
  );

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-orange-50 p-4 sm:p-6 lg:p-8 h-full">
          <div className="w-full flex flex-col gap-6 h-full">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">IB Incoming Loan Recovery</h1>
                    <p className="text-sm text-gray-500">Apply loan recovery received from another branch</p>
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
                <div className="bg-gradient-to-r from-gray-50 to-orange-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Incoming Recoveries
                    {vouchers.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        {vouchers.length}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                  ) : vouchers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No incoming recoveries</p>
                      <p className="text-xs mt-1">All pending vouchers have been completed</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {vouchers.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => handleSelect(v)}
                          className={`w-full text-left px-5 py-4 hover:bg-orange-50 transition-colors flex items-start justify-between gap-3 ${
                            selected?.id === v.id ? "bg-orange-50 border-l-4 border-orange-500" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">#{v.id}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(v.status)}`}>
                                {v.status}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-100 text-orange-700">
                                {v.flowType === "HOToBranch" ? "HO→Br" : "Br→Br"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1">
                              <span className="truncate">{v.fromBrName}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{v.destBrName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 truncate">{v.destAccName}</span>
                              <span className="text-sm font-bold text-orange-600 ml-2 flex-shrink-0">
                                ₹{v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${selected?.id === v.id ? "text-orange-500" : "text-gray-300"}`} />
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
                      <p className="text-sm mt-1">Click any incoming recovery from the list</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200 px-6 py-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">Voucher #{selected.id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusBadge(selected.status)}`}>
                              {selected.status}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-gray-800">
                            IB Loan Recovery — ₹{selected.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                        <button
                          onClick={handleComplete}
                          disabled={completing}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold text-sm transition-all shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {completing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />
                              {selected.flowType === "HOToBranch" ? "Approving..." : "Completing..."}
                            </>
                          ) : (
                            <><CheckCircle className="w-4 h-4" />
                              {selected.flowType === "HOToBranch" ? "Approve & Apply Recovery" : "Complete & Apply Recovery"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detail body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                      {/* Branch flow */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex-1 text-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <p className="text-xs text-gray-400 mb-0.5">From Branch</p>
                          <p className="text-sm font-bold text-gray-800">{selected.fromBrCode ? `${selected.fromBrCode} - ` : ""}{selected.fromBrName}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="text-xs text-orange-600 font-medium">IB Recovery</span>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Building2 className="w-5 h-5 text-orange-600" />
                          </div>
                          <p className="text-xs text-gray-400 mb-0.5">Dest Branch</p>
                          <p className="text-sm font-bold text-gray-800">{selected.destBrCode ? `${selected.destBrCode} - ` : ""}{selected.destBrName}</p>
                        </div>
                      </div>

                      {/* Loan account */}
                      <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                        <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Loan Account (will receive recovery Cr entry)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Account No" value={selected.destAccNo} />
                          <InfoRow label="Account Name" value={selected.destAccName} />
                          {balLoading && (
                            <div className="col-span-2 flex items-center gap-2 text-xs text-gray-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> Loading balance...
                            </div>
                          )}
                          {loanBal && !balLoading && (
                            <>
                              <InfoRow label="Total Outstanding" value={`₹${fmt(loanBal.totalOutstanding)}`} />
                              <InfoRow label="Principal Balance" value={`₹${fmt(loanBal.principalBalance)}`} />
                              {loanBal.actOnIntPosting !== 1 && (
                                <>
                                  <InfoRow label="Std. Recoverable Int" value={`₹${fmtW(loanBal.stdRecoverableOutstanding)}`} />
                                  <InfoRow label="Overdue Recoverable Int" value={`₹${fmtW(loanBal.overdueRecoverableOutstanding)}`} />
                                </>
                              )}
                              <InfoRow label="Loan Type" value={loanBal.actOnIntPosting === 1 ? "Add in Balance" : "Stand"} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 1 */}
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Step 1 — {selected.flowType === "HOToBranch" ? "HO Origination" : "Source Branch Entry"}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Dr (Cash/Saving — Multiple)" value={selected.step1DrAccName} />
                          <InfoRow label={selected.flowType === "HOToBranch" ? "Cr (Dest-Branch Ref at HO)" : "Cr (HO Ref)"} value={selected.step1CrAccName} />
                        </div>
                      </div>

                      {/* Step 2 — BranchToBranch only */}
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
                            <InfoRow label="Dr (Source-Branch Ref at HO)" value={selected.step2DrAccName} />
                            <InfoRow label="Cr (Dest-Branch Ref at HO)" value={selected.step2CrAccName} />
                          </div>
                        </div>
                      )}

                      {/* Final step — this action */}
                      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                        <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          {selected.flowType === "HOToBranch" ? "Step 2" : "Step 3"} — Dest Branch Applies Recovery (This Action)
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Dr (HO-Ref / IB Ref Account)</span>
                            <span className="text-sm font-semibold text-gray-800">
                              {selected.step3DrAccName || selected.step1CrAccName || "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cr (Loan Account + Interest Entries)</span>
                            <span className="text-sm font-semibold text-gray-800">{selected.destAccName || "—"}</span>
                          </div>
                        </div>

                        {/* Interest amount override for Stand loans */}
                        {loanBal && loanBal.actOnIntPosting !== 1 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-800">
                                <strong>Stand Loan</strong> — interest is tracked separately.
                                Auto-filled below; adjust if needed. Only Cat 3 (formally posted) + Cat 4 (overdue) are recoverable.
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Intt (₹)
                                  <span className="ml-1 text-amber-600">
                                    (Max: ₹{fmtW(loanBal.stdRecoverableOutstanding + loanBal.overdueRecoverableOutstanding)})
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={intAmount}
                                  onChange={e => setIntAmount(e.target.value.replace(/[^0-9]/g, ""))}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 rounded-lg outline-none text-sm"
                                />
                              </div>
                              <div className="flex flex-col gap-1 justify-end pb-2">
                                {intTotal > 0 && (
                                  <span className="text-xs font-medium text-amber-700">Interest: ₹{fmtW(intTotal)}</span>
                                )}
                                <span className="text-xs font-medium text-blue-700">Principal: ₹{fmt(principalRec)}</span>
                                <span className="text-xs font-medium text-green-700">Total: ₹{fmt(selected.amount)}</span>
                              </div>
                            </div>
                            {allocation.length > 0 && (
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Category</th>
                                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Outstanding</th>
                                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Recovering</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[3, 4].map(catId => {
                                      const row = allocation.find(a => a.catId === catId);
                                      if (!row || row.outstanding <= 0) return null;
                                      return (
                                        <tr key={catId} className="border-b border-gray-100">
                                          <td className="px-3 py-1.5 text-gray-700">{INT_NAMES[catId]}</td>
                                          <td className="px-3 py-1.5 text-right text-amber-700">₹{fmtW(row.outstanding)}</td>
                                          <td className={`px-3 py-1.5 text-right font-semibold ${row.recovering > 0 ? "text-green-700" : "text-gray-400"}`}>
                                            ₹{fmtW(row.recovering)}
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

                        {/* Interest detail ledger for Stand loans */}
                        {loanBal && loanBal.actOnIntPosting !== 1 && (loanBal.intRecDetail ?? []).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                              <BarChart2 className="w-3.5 h-3.5" /> Interest Posting Ledger
                            </p>
                            <div className="overflow-x-auto overflow-y-auto max-h-48 rounded-lg border border-gray-200">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Date</th>
                                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Category</th>
                                    <th className="px-3 py-2 text-right text-gray-600 font-semibold">Posted Dr</th>
                                    <th className="px-3 py-2 text-right text-gray-600 font-semibold">Recovered Cr</th>
                                    <th className="px-3 py-2 text-center text-gray-600 font-semibold">V.No</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loanBal.intRecDetail.map((row, idx) => (
                                    <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {row.entryDate ? new Date(row.entryDate).toLocaleDateString("en-GB") : "—"}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700">{row.intCatName}</td>
                                      <td className={`px-3 py-1.5 text-right ${row.intDr > 0 ? "text-rose-700" : "text-gray-400"}`}>
                                        {row.intDr > 0 ? `₹${fmtW(row.intDr)}` : "—"}
                                      </td>
                                      <td className={`px-3 py-1.5 text-right ${row.intCr > 0 ? "text-green-700" : "text-gray-400"}`}>
                                        {row.intCr > 0 ? `₹${fmtW(row.intCr)}` : "—"}
                                      </td>
                                      <td className="px-3 py-1.5 text-center text-gray-500 font-mono">{row.voucherNo}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Narration */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Narration (editable)
                        </label>
                        <textarea
                          value={narration}
                          onChange={e => setNarration(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-lg outline-none text-sm resize-none transition-all"
                        />
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

export default IBIncomingLoanRecovery;
