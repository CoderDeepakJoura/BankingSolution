import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ArrowLeft, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import commonservice from "../../services/common/commonservice";
import { voucherVerifyApi, UnverifiedVoucherDTO } from "../../services/voucherVerifyApi";

const VOUCHER_TYPE_LABEL: Record<string, string> = {
  "1-1": "Share Money", "2-2": "Saving Deposit", "2-3": "Saving Withdrawal",
  "2-29": "Account Closure", "3-2": "FD Deposit", "3-4": "FD Interest Posting",
  "3-5": "FD Maturity", "3-6": "FD Renewal", "3-7": "FD Pre-Mature",
  "4-8": "RD Kist", "4-16": "RD Multi-Kist", "5-9": "Loan Advancement",
  "5-10": "Loan Recovery", "5-14": "Loan Expense", "6-11": "Cash Voucher",
  "7-12": "Journal Voucher",
};

const typeLabel = (vt: number, vs: number) =>
  VOUCHER_TYPE_LABEL[`${vt}-${vs}`] ?? `Type ${vt}/${vs}`;

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VoucherVerify: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const workingDateISO = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [vouchers, setVouchers] = useState<UnverifiedVoucherDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await voucherVerifyApi.getUnverified(user.branchid, workingDateISO);
      setVouchers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vouchers.");
    } finally {
      setLoading(false);
    }
  }, [user.branchid, workingDateISO]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (v: UnverifiedVoucherDTO) => {
    const isSelf = user.userId > 0 && v.addedBy === user.userId;
    if (isSelf) {
      Swal.fire("Not Allowed", "You cannot verify your own voucher.", "warning");
      return;
    }
    const confirm = await Swal.fire({
      title: "Verify Voucher?",
      html: `<span>Voucher <b>No. ${v.voucherNo}</b> — <b>${typeLabel(v.voucherType, v.voucherSubType)}</b><br/>Added by: <b>${v.addedByName}</b></span>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Yes, Verify",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setVerifyingId(v.voucherId);
    try {
      const msg = await voucherVerifyApi.verify(user.branchid, v.voucherId);
      Swal.fire("Verified!", msg, "success");
      setVouchers((prev) => prev.filter((x) => x.voucherId !== v.voucherId));
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Verification failed.", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Verify Vouchers</h2>
                      <p className="text-sm text-gray-600">
                        Unverified vouchers for {new Date(workingDateISO).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={load}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => navigate("/voucher-operations")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                </div>
              </div>

              {/* Info bar */}
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <span>You cannot verify vouchers that you added yourself (maker-checker rule).</span>
              </div>
            </div>

            {/* Content */}
            {loading && (
              <div className="bg-white rounded-xl shadow border border-gray-200 py-16 text-center text-gray-400 text-sm">
                Loading vouchers...
              </div>
            )}

            {!loading && error && (
              <div className="bg-white rounded-xl shadow border border-red-200 px-6 py-5 flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {!loading && !error && vouchers.length === 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-200 py-20 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold text-base">All vouchers are verified</p>
                <p className="text-gray-400 text-sm mt-1">No pending vouchers for today's working date.</p>
              </div>
            )}

            {!loading && vouchers.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    {vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} pending verification
                  </span>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        {["#", "Voucher No", "Type", "Amount", "Narration", "Added By", "Action"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vouchers.map((v, i) => {
                        const isSelf = user.userId > 0 && v.addedBy === user.userId;
                        const isVerifying = verifyingId === v.voucherId;
                        return (
                          <tr key={v.voucherId} className={`transition-colors ${isSelf ? "bg-gray-50" : "hover:bg-green-50/40"}`}>
                            <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm font-semibold text-blue-700">
                                {String(v.voucherNo).padStart(6, "0")}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                                {typeLabel(v.voucherType, v.voucherSubType)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800 font-mono whitespace-nowrap">
                              {fmt(v.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-[220px] truncate">
                              {v.narration || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {v.addedByName}
                              {isSelf && (
                                <span className="ml-1 text-xs text-amber-600 font-medium">(you)</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isSelf ? (
                                <span className="text-xs text-gray-400 italic">Cannot verify own</span>
                              ) : (
                                <button
                                  onClick={() => handleVerify(v)}
                                  disabled={isVerifying}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 border border-green-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  {isVerifying ? "Verifying..." : "Verify"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default VoucherVerify;
