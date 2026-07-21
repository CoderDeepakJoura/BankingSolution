import React, { useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import LoanAccountTable from "./loan-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { encryptId } from "../../../utils/encryption";
import { loanAccountApi, LoanAccountFilter, LoanAccListItemDTO } from "../../../services/accountMasters/loanaccount/loanaccountapi";

const fetchLoanAccounts = async (
  filter: LoanAccountFilter,
  branchId: number
): Promise<{ success: boolean; data: LoanAccListItemDTO[]; totalCount: number; message: string }> => {
  try {
    return await loanAccountApi.fetchLoanAccounts(filter, branchId);
  } catch (error: any) {
    return { success: false, data: [], totalCount: 0, message: error.message || "Failed to fetch loan accounts" };
  }
};

const viewLoanAccount = async (dto: LoanAccListItemDTO) => {
  await Swal.fire({
    title: "View Loan Account",
    html: `
      <div class="text-left p-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Number</p>
            <p class="text-base font-semibold text-blue-700 font-mono">${dto.accountNumber || "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Name</p>
            <p class="text-base font-semibold text-gray-900">${dto.accountName || "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Product</p>
            <p class="text-base font-semibold text-gray-900">${dto.productName || "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Loan Type</p>
            <p class="text-base font-semibold text-purple-700">${dto.loanType || "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Opening Date</p>
            <p class="text-base font-semibold text-gray-900">${dto.accOpeningDate ? new Date(dto.accOpeningDate).toLocaleDateString() : "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Status</p>
            <span class="inline-block px-2 py-1 text-xs font-bold rounded-full ${dto.isAccClosed ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}">${dto.isAccClosed ? "Closed" : "Active"}</span>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Loan Amount</p>
            <p class="text-base font-semibold text-gray-900">₹ ${dto.loanAmountPassed?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">EMI / Kist Amount</p>
            <p class="text-base font-semibold text-gray-900">₹ ${dto.kistAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Interest Rate</p>
            <p class="text-base font-semibold text-indigo-700">${dto.standardInterestRate != null ? dto.standardInterestRate + "%" : "N/A"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Loan Period</p>
            <p class="text-base font-semibold text-gray-900">${dto.loanPeriod != null ? dto.loanPeriod + " Months" : "N/A"}</p>
          </div>
          ${dto.relativeName ? `
          <div class="col-span-2">
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Relative Name</p>
            <p class="text-base font-semibold text-gray-900">${dto.relativeName}</p>
          </div>` : ""}
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Close",
    width: "600px",
  });
};

const LoanAccountMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchAccountsWithBranch = useCallback(
    async (filter: LoanAccountFilter) => {
      return fetchLoanAccounts(filter, user.branchid);
    },
    [user.branchid]
  );

  const handleModifyAccount = async (dto: LoanAccListItemDTO) => {
    navigate(`/loan-acc-master/${encryptId(dto.accId)}`);
  };

  const handleDeleteAccount = async (dto: LoanAccListItemDTO) => {
    const result = await Swal.fire({
      title: "Delete Loan Account",
      text: `Are you sure you want to delete account "${dto.accountName}" (${dto.accountNumber})? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await loanAccountApi.deleteLoanAccount(dto.accId, user.branchid);
        Swal.fire({ title: "Deleted!", text: `Loan account "${dto.accountName}" has been deleted.`, icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire("Error!", err.message || "Failed to delete loan account.", "error");
      }
    }
  };

  return (
    <CRUDMaster<LoanAccListItemDTO>
      fetchData={fetchAccountsWithBranch}
      addEntry={() => navigate("/loan-acc-master")}
      modifyEntry={handleModifyAccount}
      deleteEntry={handleDeleteAccount}
      pageTitle="Loan Account Master Operations"
      addLabel="Add Loan Account"
      onClose={() => navigate("/account-operations")}
      searchPlaceholder="Search by member name, account number..."
      renderTable={(accounts, handleModify, handleDelete) => (
        <LoanAccountTable
          accounts={accounts}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.accId}
    />
  );
};

export default LoanAccountMasterCRUD;
