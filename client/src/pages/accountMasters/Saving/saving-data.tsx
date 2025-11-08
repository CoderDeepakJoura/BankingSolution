// pages/AccountMasters/SavingAccount/SavingAccountMasterCRUD.tsx
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import SavingAccountTable from "./saving-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { encryptId, decryptId } from '../../../utils/encryption';
import savingAccountService, {
  CompleteSavingAccountDTO,
  accountMasterDTO,
  MemberDetailsDTO,
} from "../../../services/accountMasters/savingaccount/savingaccountapi";
import savingProductService, {SavingAccountFilter} from "../../../services/accountMasters/savingaccount/savingaccountapi";
import commonservice from "../../../services/common/commonservice";

interface SavingProduct {
  id: number;
  productName: string;
  productCode: string;
}

// Enhanced Fetch Saving Accounts function
const fetchSavingAccounts = async (
  filter: SavingAccountFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CompleteSavingAccountDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await savingAccountService.fetchSavingAccounts(filter, branchId);

    return {
      success: res.success ?? false,
      data: res.savingaccountInfo || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch saving accounts",
    };
  }
};

// Helper function to convert DTO to view data
const convertDTOToViewData = (dto: CompleteSavingAccountDTO) => {
  return {
    accountId: dto.accountMasterDTO?.id,
    memberName: dto.accountMasterDTO?.accountName,
    accountNumber: dto.accountMasterDTO?.accountNumber,
    productId: dto.accountMasterDTO?.generalProductId,
    openingDate: dto.accountMasterDTO?.accOpeningDate,
    isJoint: dto.accountMasterDTO?.isJointAccount ? "Yes" : "No",
    status: dto.accountMasterDTO?.isAccClosed ? "Closed" : "Active",
    nomineeCount: dto.AccNomineeDTO?.length || 0,
    jointHolderCount: dto.JointAccountInfoDTO?.length || 0,
  };
};

// View Modal - Read Only
const viewSavingAccount = async (dto: CompleteSavingAccountDTO) => {
  const viewData = convertDTOToViewData(dto);

  await Swal.fire({
    title: "View Saving Account",
    html: `
      <div class="swal2-modal-content p-0 text-left">
        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200 bg-white">
          <nav class="flex space-x-0 overflow-x-auto px-2">
            <button 
              id="view-tab-basic" 
              data-tab-id="basic" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-blue-500 text-blue-600 bg-blue-50 transition-all duration-200 view-tab-button active"
            >
              Basic Information
            </button>
            <button 
              id="view-tab-member" 
              data-tab-id="member" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 view-tab-button"
            >
              Member Details
            </button>
            <button 
              id="view-tab-nominee" 
              data-tab-id="nominee" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 view-tab-button"
            >
              Nominees (${viewData.nomineeCount})
            </button>
            <button 
              id="view-tab-joint" 
              data-tab-id="joint" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 view-tab-button"
            >
              Joint Holders (${viewData.jointHolderCount})
            </button>
          </nav>
        </div>

        <!-- Content Area -->
        <div class="p-6 max-h-[500px] overflow-y-auto bg-gray-50">
          <!-- Basic Info Tab -->
          <div id="basic-tab-view" class="view-tab-content active" style="display: block;">
            <div class="bg-white rounded-lg p-4 shadow-sm space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Number</p>
                  <p class="text-base font-semibold text-gray-900">${viewData.accountNumber}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Name</p>
                  <p class="text-base font-semibold text-gray-900">${viewData.memberName}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                  <span class="inline-block px-2 py-1 text-xs font-bold rounded-full ${
                    viewData.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }">
                    ${viewData.status}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Opening Date</p>
                  <p class="text-base font-semibold text-gray-900">${new Date(
                    viewData.openingDate
                  ).toLocaleDateString()}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Type</p>
                  <p class="text-base font-semibold text-gray-900">${
                    viewData.isJoint === "Yes" ? "Joint Account" : "Single Account"
                  }</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Member Details Tab -->
          <div id="member-tab-view" class="view-tab-content" style="display: none;">
            <div class="bg-white rounded-lg p-4 shadow-sm space-y-3">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Name</p>
                  <p class="text-sm font-semibold text-gray-900">${dto.accountMasterDTO?.accountName}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Relative Name</p>
                  <p class="text-sm font-semibold text-gray-900">${dto.accountMasterDTO?.accountNameSL || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Nominees Tab -->
          <div id="nominee-tab-view" class="view-tab-content" style="display: none;">
            ${
              dto.accNomineeDTO && dto.accNomineeDTO.length > 0
                ? `
              <div class="space-y-3">
                ${dto.accNomineeDTO.map(
                  (nominee, idx) => `
                  <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="font-semibold text-gray-900">Nominee ${idx + 1}</h4>
                      <span class="text-xs px-2 py-1 rounded-full ${
                        nominee.isMinor ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                      }">
                        ${nominee.isMinor ? "Minor" : "Major"}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p class="text-xs text-gray-500">Name</p>
                        <p class="font-medium text-gray-900">${nominee.nomineeName}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">DOB</p>
                        <p class="font-medium text-gray-900">${new Date(
                          nominee.nomineeDob
                        ).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Address</p>
                        <p class="font-medium text-gray-900 col-span-2">${nominee.addressLine}</p>
                      </div>
                      ${
                        nominee.isMinor
                          ? `<div class="col-span-2">
                        <p class="text-xs text-gray-500">Guardian Name</p>
                        <p class="font-medium text-gray-900">${nominee.nameOfGuardian || "N/A"}</p>
                      </div>`
                          : ""
                      }
                    </div>
                  </div>
                `
                ).join("")}
              </div>
            `
                : '<p class="text-gray-500 text-sm">No nominees added</p>'
            }
          </div>

          <!-- Joint Holders Tab -->
          <div id="joint-tab-view" class="view-tab-content" style="display: none;">
            ${
              dto.jointAccountInfoDTO && dto.jointAccountInfoDTO.length > 0
                ? `
              <div class="space-y-3">
                ${dto.jointAccountInfoDTO.map(
                  (holder, idx) => `
                  <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <h4 class="font-semibold text-gray-900 mb-2">Joint Holder ${idx + 1}</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p class="text-xs text-gray-500">Name</p>
                        <p class="font-medium text-gray-900">${holder.accountName}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">DOB</p>
                        <p class="font-medium text-gray-900">${new Date(
                          holder.dob
                        ).toLocaleDateString()}</p>
                      </div>
                      <div class="col-span-2">
                        <p class="text-xs text-gray-500">Address</p>
                        <p class="font-medium text-gray-900">${holder.addressLine}</p>
                      </div>
                    </div>
                  </div>
                `
                ).join("")}
              </div>
            `
                : '<p class="text-gray-500 text-sm">No joint holders</p>'
            }
          </div>
        </div>
      </div>

      <style>
        .swal2-modal-content {
          max-height: 85vh;
          overflow: hidden;
        }
        .swal2-html-container {
          margin: 0 !important;
          padding: 0 !important;
        }
        .view-tab-content {
          display: none;
        }
        .view-tab-content.active {
          display: block !important;
        }
        .swal2-modal-content div::-webkit-scrollbar {
          width: 8px;
        }
        .swal2-modal-content div::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .swal2-modal-content div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .swal2-modal-content div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @media (max-width: 768px) {
          .grid.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Close",
    didOpen: () => {
      // Tab switching
      const tabButtons = document.querySelectorAll(".view-tab-button");
      const tabContents = document.querySelectorAll(".view-tab-content");

      tabButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const tabId = target.getAttribute("data-tab-id");

          tabButtons.forEach((btn) => {
            btn.classList.remove("border-blue-500", "text-blue-600", "bg-blue-50", "active");
            btn.classList.add("border-transparent", "text-gray-500");
          });
          tabContents.forEach((content: any) => {
            (content as HTMLElement).style.display = "none";
            content.classList.remove("active");
          });

          target.classList.remove("border-transparent", "text-gray-500");
          target.classList.add("border-blue-500", "text-blue-600", "bg-blue-50", "active");

          const activeContent = document.getElementById(`${tabId}-tab-view`);
          if (activeContent) {
            activeContent.style.display = "block";
            activeContent.classList.add("active");
          }
        });
      });
    },
  });
};

// Delete function
const deleteSavingAccount = async (
  dto: CompleteSavingAccountDTO,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete Saving Account",
    text: `Are you sure you want to delete account "${dto.accountMasterDTO?.accountName}" (${dto.accountMasterDTO?.accPrefix + "-" + dto.accountMasterDTO?.accSuffix})? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const accountId = dto.accountMasterDTO?.accId;
      if (!accountId) {
        throw new Error("Account ID not found");
      }

      await savingAccountService.deleteSavingAccount(accountId, branchId, 0);
      Swal.fire({
        title: "Deleted!",
        text: `Saving Account "${dto.accountMasterDTO?.accountName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete saving account.", "error");
    }
  }
};

// Main Component
const SavingAccountMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);

  // Fetch saving products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await commonservice.fetch_saving_products(
          user.branchid
        );
        if (!productsRes.success) throw new Error("Failed to load Saving Products");
        setSavingProducts(productsRes.data || []);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Could not load required data", "error");
      }
    };

    if (user.branchid) {
      fetchData();
    }
  }, [user.branchid]);

  // Fetch accounts callback
  const fetchAccountsWithBranch = useCallback(
    async (filter: SavingAccountFilter): Promise<{
      success: boolean;
      data: CompleteSavingAccountDTO[];
      totalCount: number;
      message: string;
    }> => {
      const result = await fetchSavingAccounts(filter, user.branchid);
      console.log(result)
      return result;
    },
    [user.branchid]
  );
  const handleModifyAccount = (dto: CompleteSavingAccountDTO) => {
      navigate(`/saving-acc-master/${encryptId(Number(dto.accountMasterDTO?.accId))}`); // Route with member ID
    };

  return (
    <CRUDMaster<CompleteSavingAccountDTO>
      fetchData={fetchAccountsWithBranch}
      addEntry={() =>
        navigate("/saving-acc-master")
      }
      modifyEntry={handleModifyAccount}
      deleteEntry={(dto) => deleteSavingAccount(dto, user.branchid)}
      pageTitle="Saving Account Master Operations"
      addLabel="Add Saving Account"
      onClose={() => navigate("/account-operations")}
      searchPlaceholder="Search by member name, account number..."
      renderTable={(accounts, handleModify, handleDelete) => (
        <SavingAccountTable
          accounts={accounts}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.accountMasterDTO?.accId || 0}
    />
  );
};

export default SavingAccountMasterCRUD;
