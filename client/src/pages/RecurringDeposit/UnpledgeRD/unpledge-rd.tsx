import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { Unlock, Lock, ArrowLeft } from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import commonservice from "../../../services/common/commonservice";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { useNavigate } from "react-router-dom";

interface PledgedRDOption {
  pledgeId: number;
  rdAccId: number;
  rdAccDetId: number | null;
  accountNumber: string;
  accountName: string;
  status: number; // 1=Pledge, 3=Lock
  loanAccId: number | null;
  date: string | null;
}

const PLEDGE_STATUS = 1;
const LOCK_STATUS = 3;
const UNPLEDGE_ACTION = 2;
const UNLOCK_ACTION = 4;

const UnpledgeRDPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const today = commonservice.getTodaysDate();

  const [fromDate, setFromDate] = useState<string>(today);
  const [rdOptions, setRdOptions] = useState<{ value: number; label: string; data: PledgedRDOption }[]>([]);
  const [selectedOption, setSelectedOption] = useState<{ value: number; label: string; data: PledgedRDOption } | null>(null);
  const [loanBalance, setLoanBalance] = useState<number | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (fromDate) loadPledgedAccounts();
  }, [fromDate]);

  const loadPledgedAccounts = async () => {
    setLoadingAccounts(true);
    setSelectedOption(null);
    setLoanBalance(null);
    try {
      const res = await commonservice.fetch_rd_accounts_pledged_locked(user.branchid, fromDate);
      const data: PledgedRDOption[] = (res as any)?.data ?? (res as any)?.Data ?? [];
      setRdOptions(
        data.map((item) => ({
          value: item.pledgeId,
          label: `${item.accountNumber} - ${item.accountName} [${item.status === LOCK_STATUS ? "Locked" : "Pledged"}]`,
          data: item,
        }))
      );
    } catch {
      setRdOptions([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleRDSelect = async (opt: { value: number; label: string; data: PledgedRDOption } | null) => {
    setSelectedOption(opt);
    setLoanBalance(null);

    if (!opt) return;

    const rd = opt.data;
    if (rd.status === PLEDGE_STATUS && rd.loanAccId) {
      setLoadingBalance(true);
      try {
        const balRes = await commonservice.get_account_balance(user.branchid, rd.loanAccId);
        const bal = (balRes as any)?.data ?? (balRes as any)?.Data ?? 0;
        setLoanBalance(typeof bal === "number" ? bal : 0);
      } catch {
        setLoanBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    }
  };

  const handleAction = async (action: number) => {
    if (!selectedOption) return;

    const actionLabel = action === UNPLEDGE_ACTION ? "Unpledge" : "Unlock";
    const confirm = await Swal.fire({
      icon: "question",
      title: `${actionLabel} RD?`,
      text: `Are you sure you want to ${actionLabel.toLowerCase()} RD ${selectedOption.data.accountNumber}?`,
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionLabel}`,
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await commonservice.unpledge_unlock_rd({
        brId: user.branchid,
        pledgeId: selectedOption.data.pledgeId,
        action,
        date: today,
      });

      if ((res as any)?.success || (res as any)?.Success) {
        await Swal.fire({
          icon: "success",
          title: "Success",
          text: `RD ${actionLabel.toLowerCase()}d successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
        setSelectedOption(null);
        setLoanBalance(null);
        loadPledgedAccounts();
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: (res as any)?.message || (res as any)?.Message || `Failed to ${actionLabel.toLowerCase()} RD.`,
        });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const selected = selectedOption?.data ?? null;
  const isLocked = selected?.status === LOCK_STATUS;
  const isPledged = selected?.status === PLEDGE_STATUS;
  const loanCleared = loanBalance !== null && loanBalance >= 0;

  const pageContent = (
    <div className="-mt-3 bg-gradient-to-br from-gray-100 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Unlock className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Unpledge / Unlock RD
              </h1>
              <p className="text-gray-600 text-sm">Release pledged or locked Recurring Deposits</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Operations
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              max={today}
              onChange={(e) => {
                const val = e.target.value;
                if (val > today) {
                  Swal.fire({ icon: "warning", title: "Invalid Date", text: "From date cannot exceed today's date.", timer: 2000, showConfirmButton: false });
                  return;
                }
                setFromDate(val);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RD Account</label>
            <Select
              options={rdOptions}
              value={selectedOption}
              onChange={handleRDSelect}
              isLoading={loadingAccounts}
              placeholder="Select pledged / locked RD..."
              isClearable
              classNamePrefix="react-select"
              noOptionsMessage={() => "No pledged/locked RDs found for this date"}


            />
          </div>
        </div>

        {selected && (
          <div className="mt-6 border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">RD Account:</span>{" "}
                <span className="font-semibold text-gray-800">{selected.accountNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Account Holder:</span>{" "}
                <span className="font-semibold text-gray-800">{selected.accountName}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span className={`font-semibold ${isLocked ? "text-orange-600" : "text-blue-600"}`}>
                  {isLocked ? "Locked" : "Pledged"}
                </span>
              </div>
              {selected.date && (
                <div>
                  <span className="text-gray-500">Pledge/Lock Date:</span>{" "}
                  <span className="font-semibold text-gray-800">
                    {commonservice.splitDate(selected.date)}
                  </span>
                </div>
              )}
              {isPledged && selected.loanAccId && (
                <div>
                  <span className="text-gray-500">Associated Loan Account ID:</span>{" "}
                  <span className="font-semibold text-gray-800">{selected.loanAccId}</span>
                </div>
              )}
              {isPledged && (
                <div>
                  <span className="text-gray-500">Loan Balance (Cr - Dr):</span>{" "}
                  {loadingBalance ? (
                    <span className="text-gray-400 italic">Checking...</span>
                  ) : loanBalance !== null ? (
                    <span className={`font-semibold ${loanCleared ? "text-green-600" : "text-red-600"}`}>
                      {loanBalance < 0
                        ? `₹${Math.abs(loanBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })} outstanding`
                        : `₹${loanBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (cleared)`}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {isLocked && (
                <button
                  onClick={() => handleAction(UNLOCK_ACTION)}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Unlock size={16} />
                  Unlock RD
                </button>
              )}

              {isPledged && !loadingBalance && loanBalance !== null && loanCleared && (
                <button
                  onClick={() => handleAction(UNPLEDGE_ACTION)}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Lock size={16} />
                  Unpledge RD
                </button>
              )}

              {isPledged && !loadingBalance && loanBalance !== null && !loanCleared && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                  Cannot unpledge. The associated loan account has an outstanding balance of{" "}
                  ₹{Math.abs(loanBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}.
                </div>
              )}

              {isPledged && !loadingBalance && loanBalance === null && selected.loanAccId && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700">
                  Could not fetch loan balance. Please try again.
                </div>
              )}

              {isPledged && !selected.loanAccId && (
                <button
                  onClick={() => handleAction(UNPLEDGE_ACTION)}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Lock size={16} />
                  Unpledge RD
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  return <DashboardLayout mainContent={pageContent} />;
};

export default UnpledgeRDPage;
