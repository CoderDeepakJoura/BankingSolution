// pages/AccountMasters/FDAccount/FDAccountMasterCRUD.tsx
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import FDAccountTable from "./fd-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { encryptId, decryptId } from '../../../utils/encryption';
import fdAccountService, {
  CommonAccMasterDTO,
  FDAccountFilter,
} from "../../../services/accountMasters/fdaccount/fdaccountapi";
import commonservice from "../../../services/common/commonservice";

interface FDProduct {
  id: number;
  productName: string;
  productCode: string;
}

// Enhanced Fetch FD Accounts function
const fetchFDAccounts = async (
  filter: FDAccountFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CommonAccMasterDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await fdAccountService.fetchFDAccounts(filter, branchId);
    return {
      success: res.success ?? false,
      data: res.fdaccountInfo || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch FD accounts",
    };
  }
};

// Helper function to convert DTO to view data
const convertDTOToViewData = (dto: CommonAccMasterDTO) => {
  const fdDetails = dto.fdAccountDetailDTO || [];
  const totalFDAmount = fdDetails.reduce((sum, fd) => sum + (fd.fdAmount || 0), 0);
  const totalMaturityAmount = fdDetails.reduce((sum, fd) => sum + (fd.maturityAmount || 0), 0);

  return {
    accountId: dto.accountMasterDTO?.accId,
    memberName: dto.accountMasterDTO?.accountName,
    accountNumber: `${dto.accountMasterDTO?.accPrefix}-${dto.accountMasterDTO?.accSuffix}`,
    productId: dto.accountMasterDTO?.generalProductId,
    productName: dto.productName,
    openingDate: dto.accountMasterDTO?.accOpeningDate,
    status: dto.accountMasterDTO?.isAccClosed ? "Closed" : "Active",
    nomineeCount: dto.accNomineeDTO?.length || 0,
    fdCount: fdDetails.length,
    totalFDAmount: totalFDAmount,
    totalMaturityAmount: totalMaturityAmount,
  };
};

// View Modal - Read Only
const viewFDAccount = async (dto: CommonAccMasterDTO) => {
  const viewData = convertDTOToViewData(dto);

  await Swal.fire({
    title: "View FD Account",
    html: `
      <div class="swal2-modal-content p-0 text-left">
        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200 bg-white">
          <nav class="flex space-x-0 overflow-x-auto px-2">
            <button 
              id="view-tab-basic" 
              data-tab-id="basic" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-purple-500 text-purple-600 bg-purple-50 transition-all duration-200 view-tab-button active"
            >
              Basic Information
            </button>
            <button 
              id="view-tab-fd-details" 
              data-tab-id="fd-details" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 view-tab-button"
            >
              FD Details (${viewData.fdCount})
            </button>
            <button 
              id="view-tab-nominee" 
              data-tab-id="nominee" 
              class="flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 view-tab-button"
            >
              Nominees (${viewData.nomineeCount})
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
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">FD Account Number</p>
                  <p class="text-base font-semibold text-purple-600">${viewData.accountNumber}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Holder</p>
                  <p class="text-base font-semibold text-gray-900">${viewData.memberName}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">FD Product</p>
                  <p class="text-base font-semibold text-gray-900">${viewData.productName}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Opening Date</p>
                  <p class="text-base font-semibold text-gray-900">${new Date(
                    viewData.openingDate
                  ).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Total FD Amount</p>
                  <p class="text-base font-semibold text-green-700">₹ ${viewData.totalFDAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Maturity Amount</p>
                  <p class="text-base font-semibold text-blue-700">₹ ${viewData.totalMaturityAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Number of FDs</p>
                  <p class="text-base font-semibold text-gray-900">${viewData.fdCount} FD(s)</p>
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
              </div>
            </div>
          </div>

          <!-- FD Details Tab -->
          <div id="fd-details-tab-view" class="view-tab-content" style="display: none;">
            ${
              dto.fdAccountDetailDTO && dto.fdAccountDetailDTO.length > 0
                ? `
              <div class="space-y-3">
                ${dto.fdAccountDetailDTO.map(
                  (fd, idx) => `
                  <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <div class="flex justify-between items-start mb-3">
                      <h4 class="font-semibold text-gray-900">FD ${idx + 1}</h4>
                      <span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                        ${fd.fdAccountNo}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p class="text-xs text-gray-500">FD Date</p>
                        <p class="font-medium text-gray-900">${new Date(fd.fdDate).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Receipt No</p>
                        <p class="font-medium text-gray-900">${fd.receiptNo}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">FD Amount</p>
                        <p class="font-medium text-green-700">₹ ${fd.fdAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Maturity Amount</p>
                        <p class="font-medium text-blue-700">₹ ${fd.maturityAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Period</p>
                        <p class="font-medium text-gray-900">${fd.fdPeriodMonths} months ${fd.fdPeriodDays} days</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Interest Rate</p>
                        <p class="font-medium text-gray-900">${fd.intRate}% p.a.</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Compounding</p>
                        <p class="font-medium text-gray-900">${fd.compoundingIntervalDisplay || fd.compoundingInterval}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Maturity Date</p>
                        <p class="font-medium text-gray-900">${new Date(fd.fdmaturityDate).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                `
                ).join("")}
              </div>
            `
                : '<p class="text-gray-500 text-sm">No FD details available</p>'
            }
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
                        <p class="text-xs text-gray-500">Relation</p>
                        <p class="font-medium text-gray-900">${nominee.relationWithAccHolder}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">DOB</p>
                        <p class="font-medium text-gray-900">${new Date(
                          nominee.nomineeDob
                        ).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500">Nominee Date</p>
                        <p class="font-medium text-gray-900">${new Date(
                          nominee.nomineeDate
                        ).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div class="col-span-2">
                        <p class="text-xs text-gray-500">Address</p>
                        <p class="font-medium text-gray-900">${nominee.addressLine}</p>
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
    width: '800px',
    didOpen: () => {
      // Tab switching
      const tabButtons = document.querySelectorAll(".view-tab-button");
      const tabContents = document.querySelectorAll(".view-tab-content");

      tabButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const tabId = target.getAttribute("data-tab-id");

          tabButtons.forEach((btn) => {
            btn.classList.remove("border-purple-500", "text-purple-600", "bg-purple-50", "active");
            btn.classList.add("border-transparent", "text-gray-500");
          });
          tabContents.forEach((content: any) => {
            (content as HTMLElement).style.display = "none";
            content.classList.remove("active");
          });

          target.classList.remove("border-transparent", "text-gray-500");
          target.classList.add("border-purple-500", "text-purple-600", "bg-purple-50", "active");

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
const deleteFDAccount = async (
  dto: CommonAccMasterDTO,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete FD Account",
    text: `Are you sure you want to delete FD account "${dto.accountMasterDTO?.accountName}" (${dto.accountMasterDTO?.accPrefix}-${dto.accountMasterDTO?.accSuffix})? This action cannot be undone.`,
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

      await fdAccountService.deleteFDAccount(accountId, branchId);
      Swal.fire({
        title: "Deleted!",
        text: `FD Account "${dto.accountMasterDTO?.accountName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete FD account.", "error");
    }
  }
};

// Main Component
const FDAccountMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [fdProducts, setFDProducts] = useState<FDProduct[]>([]);

  // Fetch FD products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await commonservice.fetch_fd_products(
          user.branchid
        );
        if (!productsRes.success) throw new Error("Failed to load FD Products");
        setFDProducts(productsRes.data || []);
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
    async (filter: FDAccountFilter): Promise<{
      success: boolean;
      data: CommonAccMasterDTO[];
      totalCount: number;
      message: string;
    }> => {
      const result = await fetchFDAccounts(filter, user.branchid);
      return result;
    },
    [user.branchid]
  );

  const handleModifyAccount = (dto: CommonAccMasterDTO) => {
    navigate(`/fd-acc-master/${encryptId(Number(dto.accountMasterDTO?.accId))}`);
  };

  return (
    <CRUDMaster<CommonAccMasterDTO>
      fetchData={fetchAccountsWithBranch}
      addEntry={() => navigate("/fd-acc-master")}
      modifyEntry={handleModifyAccount}
      deleteEntry={(dto) => deleteFDAccount(dto, user.branchid)}
      viewEntry={viewFDAccount}
      pageTitle="FD Account Master Operations"
      addLabel="Add FD Account"
      onClose={() => navigate("/account-operations")}
      searchPlaceholder="Search by member name, FD account number..."
      renderTable={(accounts, handleModify, handleDelete, handleView) => (
        <FDAccountTable
          accounts={accounts}
          handleModify={handleModify}
          handleDelete={handleDelete}
          handleView={handleView}
        />
      )}
      getKey={(dto) => dto.accountMasterDTO?.accId || 0}
    />
  );
};

export default FDAccountMasterCRUD;
