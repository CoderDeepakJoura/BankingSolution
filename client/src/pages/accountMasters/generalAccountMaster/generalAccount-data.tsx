import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import GeneralAccountTable from "./generalAccount-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import GeneralAccountApiService, {
  GeneralAccountFilter,
  CommonAccMasterDTO,
  AccountMasterDTO,
  GSTInfoDTO,
} from "../../../services/accountMasters/generalAccountMaster/generalAccServiceapi";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import commonservice from "../../../services/common/commonservice";
import { State } from "../../../services/common/commonservice";

// Enhanced Fetch General Accounts function with proper data transformation
const fetchGeneralAccounts = async (
  filter: GeneralAccountFilter,
  branchId: number  
): Promise<{
  success: boolean;
  data: CommonAccMasterDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await GeneralAccountApiService.fetchGeneralAccounts(filter, branchId);
    
    return {
      success: res.success ?? false,
      data: res.accounts || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch accounts",
    };
  }
};

// Helper function to convert DTO to edit form data
const convertDTOToFormData = (dto: CommonAccMasterDTO) => {
  return {
    accId: dto.accountMasterDTO?.accId,
    accountName: dto.accountMasterDTO?.accountName,
    accountNameSL: dto.accountMasterDTO?.accountNameSL,
    accountNumber: dto.accountMasterDTO?.accountNumber,
    headId: dto.accountMasterDTO?.headId,
    headCode: dto.accountMasterDTO?.headCode,
    branchId: dto.accountMasterDTO?.branchId,
    isAccClosed: dto.accountMasterDTO?.isAccClosed,
    gstInNo: dto.gstInfoDTO?.gstInNo,
    stateId: dto.gstInfoDTO?.stateId,
  };
};

// Enhanced Add/Modify Modal with single account name field
const addOrModifyAccountMaster = async (
  accountMasterDTO: CommonAccMasterDTO | null = null,
  branchId: number,
  accountHeads: any[],
  states: State[]
) => {
  const isEdit = !!accountMasterDTO;
  const formData = isEdit ? convertDTOToFormData(accountMasterDTO) : null;
  
  // Account Head Options
  const accountHeadOptions = accountHeads
    .map(head => 
      `<option value="${head.accountHeadId}" ${
        isEdit && formData?.headId == head.accountHeadId ? "selected" : ""
      }>${head.accountHeadName}</option>`
    ).join("");

  // State Options for Select
  const stateOptions = states
    .map(state => 
      `<option value="${state.stateId}" ${
        isEdit && formData?.stateId == state.stateId ? "selected" : ""
      }>${state.stateName}</option>`
    ).join("");

  const { value: formValues } = await Swal.fire({
    title: isEdit ? "Modify General Account Master" : "Add New General Account Master",
    html: `
      <div class="swal2-modal-content p-0">
        <!-- Wide Tabs Navigation -->
        <div class="border-b border-gray-200 bg-white">
          <nav class="flex space-x-0 overflow-x-auto px-2">
            <button 
              id="tab-basic" 
              data-tab-id="basic" 
              class="flex items-center gap-2 px-8 py-4 text-sm font-medium whitespace-nowrap border-b-2 border-blue-500 text-blue-600 bg-blue-50 transition-all duration-200 tab-button active"
            >
              Basic Information
            </button>
            <button 
              id="tab-gst" 
              data-tab-id="GSTInfo" 
              class="flex items-center gap-2 px-8 py-4 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 tab-button"
            >
              GST Information
            </button>
          </nav>
        </div>

        <!-- Wide Content Area -->
        <div class="p-8 max-h-[600px] overflow-y-auto bg-gray-50">
          <!-- Basic Info Tab - Initially Visible -->
          <div id="basic-tab" class="tab-content active" style="display: block;">
            <div class="bg-white rounded-lg p-6 shadow-sm">
              <!-- Account Head - Full Width -->
              <div class="mb-6">
                <div class="swal2-input-group">
                  <label for="accounthead" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                    Account Head
                    <span class="text-red-500 text-xs">*</span>
                  </label>
                  <div class="relative">
                    <select 
                      id="accounthead" 
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50" 
                      required
                      autoFocus
                    >
                      <option value="">Select Account Head</option>
                      ${accountHeadOptions}
                    </select>
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
                  </div>
                </div>
              </div>

              <!-- Account Number - Full Width -->
              <div class="mb-6">
                <div class="swal2-input-group">
                  <label for="accountNumber" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                    Account Number
                    <span class="text-red-500 text-xs">*</span>
                  </label>
                  <div class="relative">
                    <input 
                      id="accountNumber" 
                      type="text"
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
                      placeholder="Enter Account Number" 
                      value="${isEdit ? (formData?.accountNumber || "") : ""}"
                      maxLength="20"
                      required
                    />
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
                  </div>
                </div>
              </div>

              <!-- Account Name - Full Width -->
              <div class="mb-6">
                <div class="swal2-input-group">
                  <label for="accountName" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                    Account Name
                    <span class="text-red-500 text-xs">*</span>
                  </label>
                  <div class="relative">
                    <input 
                      id="accountName" 
                      type="text"
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
                      placeholder="Enter Account Name" 
                      value="${isEdit ? (formData?.accountName || "") : ""}"
                      maxLength="100"
                      required
                    />
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
                  </div>
                </div>
              </div>

              <!-- Account Name (Hindi) - Full Width -->
              <div class="mb-6">
                <div class="swal2-input-group">
                  <label for="accountNameSL" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"></div>
                    Account Name (Hindi)
                    <span class="text-emerald-600 text-xs font-medium">Optional</span>
                  </label>
                  <div class="relative">
                    <input 
                      id="accountNameSL" 
                      type="text"
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
                      placeholder="हिंदी में खाता नाम" 
                      value="${isEdit ? (formData?.accountNameSL || "") : ""}"
                      lang="hi"
                      maxLength="100"
                    />
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- GST Info Tab - Initially Hidden -->
          <div id="gst-tab" class="tab-content" style="display: none;">
            <div class="bg-white rounded-lg p-6 shadow-sm">
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <div class="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  GST Information
                </h3>
                <p class="text-sm text-slate-600 mt-1">Optional tax-related information for compliance</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- State Selection -->
                <div class="swal2-input-group">
                  <label for="stateId" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                    State
                    <span class="text-emerald-600 text-xs font-medium">Optional</span>
                  </label>
                  <div class="relative">
                    <select 
                      id="stateId" 
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
                    >
                      <option value="">Select State</option>
                      ${stateOptions}
                    </select>
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-orange-200"></div>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Select state for GST compliance</p>
                </div>

                <!-- GSTIN -->
                <div class="swal2-input-group">
                  <label for="gstInNo" class="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                    GSTIN Number
                    <span class="text-emerald-600 text-xs font-medium">Optional</span>
                  </label>
                  <div class="relative">
                    <input 
                      id="gstInNo" 
                      type="text"
                      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
                      placeholder="Enter GSTIN Number" 
                      value="${isEdit ? (formData?.gstInNo || "") : ""}"
                      maxLength="15"
                    />
                    <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Example: 29ABCDE1234F1Z5</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Indicator -->
        <div class="bg-gradient-to-r ${
          isEdit ? "from-slate-50 to-blue-50 border border-slate-200" : "from-emerald-50 to-green-50 border border-emerald-200"
        } rounded-lg p-4 mx-8 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-r ${
              isEdit ? "from-blue-500 to-purple-500" : "from-emerald-500 to-green-500"
            } rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">${isEdit ? "✓" : "+"}</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-700">
                ${isEdit ? "Editing General Account Master" : "Creating New General Account Master"}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                ${isEdit ? "Update the account details above." : "Fill in all the required information to add a new account."} 
                Fields marked with * are required.
              </p>
            </div>
            <div class="text-right">
              <div class="inline-flex items-center gap-1 ${
                isEdit ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
              } px-3 py-1 rounded-full text-xs font-medium">
                <div class="w-1.5 h-1.5 ${
                  isEdit ? "bg-blue-500" : "bg-emerald-500 animate-pulse"
                } rounded-full"></div>
                ${isEdit ? "Edit Mode" : "Create Mode"}
              </div>
            </div>
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
        .swal2-input-group {
          margin-bottom: 0 !important;
        }
        .swal2-input-group input:focus,
        .swal2-input-group select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }
        .swal2-input-group input:hover,
        .swal2-input-group select:hover {
          border-color: rgb(148, 163, 184) !important;
          transform: translateY(-1px);
        }
        .swal2-input-group input[lang="hi"] {
          font-family: 'Noto Sans Devanagari', 'Mangal', sans-serif;
        }
        .swal2-popup {
          padding: 1rem !important;
          max-width: 900px !important;
          width: 95% !important;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block !important;
        }
        /* Custom scrollbar */
        .swal2-modal-content div::-webkit-scrollbar {
          width: 8px;
        }
        .swal2-modal-content div::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .swal2-modal-content div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .swal2-modal-content div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Responsive breakpoints */
        @media (max-width: 768px) {
          .grid.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .swal2-popup {
            max-width: 95% !important;
          }
        }
      </style>
    `,
    showCancelButton: true,
    confirmButtonText: isEdit ? "Update Account Master" : "Add Account Master",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    allowOutsideClick: false,
    didOpen: () => {
      // Tab switching functionality
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');

      // Ensure basic tab is initially visible
      const basicTab = document.getElementById('basic-tab');
      if (basicTab) {
        basicTab.style.display = 'block';
      }

      tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const tabId = target.getAttribute('data-tab-id');

          // Remove active from all tabs and contents
          tabButtons.forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600', 'bg-blue-50', 'active');
            btn.classList.add('border-transparent', 'text-gray-500');
          });
          tabContents.forEach((content: any) => {
            (content as HTMLElement).style.display = 'none';
            content.classList.remove('active');
          });

          // Add active to clicked tab
          target.classList.remove('border-transparent', 'text-gray-500');
          target.classList.add('border-blue-500', 'text-blue-600', 'bg-blue-50', 'active');
          
          // Show corresponding content
          const activeContent = document.getElementById(`${tabId === 'basic' ? 'basic' : 'gst'}-tab`);
          if (activeContent) {
            activeContent.style.display = 'block';
            activeContent.classList.add('active');
          }
        });
      });

      // GSTIN validation - uppercase
      const gstInput = document.getElementById('gstInNo') as HTMLInputElement;
      if (gstInput) {
        gstInput.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          target.value = target.value.toUpperCase();
        });
      }
    },
    preConfirm: () => {
      const accounthead = (document.getElementById("accounthead") as HTMLSelectElement).value;
      const accountNumber = (document.getElementById("accountNumber") as HTMLInputElement).value.trim();
      const accountName = (document.getElementById("accountName") as HTMLInputElement).value.trim();
      const accountNameSL = (document.getElementById("accountNameSL") as HTMLInputElement).value.trim();
      const stateId = (document.getElementById("stateId") as HTMLSelectElement).value;
      const gstInNo = (document.getElementById("gstInNo") as HTMLInputElement).value.trim();

      // Validation
      if (!accounthead) {
        Swal.showValidationMessage("Please select an Account Head");
        setTimeout(() => {
          const accountHeadField = document.getElementById("accounthead");
          if (accountHeadField) accountHeadField.focus();
        }, 100);
        return null;
      }

      if (!accountNumber) {
        Swal.showValidationMessage("Account Number is required");
        setTimeout(() => {
          const accountNumberField = document.getElementById("accountNumber");
          if (accountNumberField) accountNumberField.focus();
        }, 100);
        return null;
      }

      if (!accountName) {
        Swal.showValidationMessage("Account Name is required");
        setTimeout(() => {
          const accountNameField = document.getElementById("accountName");
          if (accountNameField) accountNameField.focus();
        }, 100);
        return null;
      }

      return {
        id: isEdit ? formData?.accId : null,
        accounthead: accounthead,
        accountNumber,
        accountName,
        accountNameSL,
        stateId: stateId ? parseInt(stateId) : null,
        gstInNo,
      };
    },
  });

  if (formValues) {
    try {
      // Get selected account head for head code
      const selectedAccountHead = accountHeads.find(
        head => head.accountHeadId === Number(formValues.accounthead)
      );

      if (isEdit) {
        // Update existing account
        const updateDTO: CommonAccMasterDTO = {
          accountMasterDTO: {
            accId: formValues.id,
            branchId: branchId,
            headId: selectedAccountHead?.accountHeadId,
            headCode: selectedAccountHead?.accountHeadName.split('-')[0] || "",
            accTypeId: 3,
            accountNumber: formValues.accountNumber,
            accountName: formValues.accountName,
            accountNameSL: formValues.accountNameSL || undefined,
            memberId: 0,
            memberBranchId: 0,
            accOpeningDate: new Date().toISOString(),
            isAccClosed: false
          },
          gstInfoDTO: formValues.gstInNo || formValues.stateId ? {
            branchId: branchId,
            accId: formValues.id,
            stateId: formValues.stateId || 0,
            gstInNo: formValues.gstInNo,
          } : undefined,
        };
        
        await GeneralAccountApiService.updateGeneralAccount(updateDTO);
      } else {
        // Create new account
        const createDTO: CommonAccMasterDTO = {
          accountMasterDTO: {
            branchId: branchId,
            headId: selectedAccountHead?.accountHeadId,
            headCode: selectedAccountHead?.accountHeadName.split('-')[0] || "",
            accTypeId: 3,
            accountNumber: formValues.accountNumber,
            accountName: formValues.accountName,
            accountNameSL: formValues.accountNameSL || undefined,
            memberId: 0,
            memberBranchId: 0,
            accOpeningDate: new Date().toISOString()
          },
          gstInfoDTO: formValues.gstInNo || formValues.stateId ? {
            branchId: branchId,
            accId: 0, // Will be set by backend
            stateId: formValues.stateId || 0,
            gstInNo: formValues.gstInNo,
          } : undefined,
        };

        await GeneralAccountApiService.createGeneralAccount(createDTO);
      }

      Swal.fire({
        title: "Success!",
        text: `General Account Master ${isEdit ? 'updated' : 'created'} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || `Failed to ${isEdit ? 'update' : 'create'} General Account Master.`, "error");
    }
  }
};

// Fixed Delete function
const deleteGeneralAccount = async (dto: CommonAccMasterDTO, branchId: number) => {
  const result = await Swal.fire({
    title: "Delete General Account Master",
    text: `Are you sure you want to delete "${dto.accountMasterDTO?.accountName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const accId = dto.accountMasterDTO?.accId;
      if (!accId) {
        throw new Error("Account ID not found");
      }
      
      await GeneralAccountApiService.deleteGeneralAccount(accId, branchId);
      Swal.fire({
        title: "Deleted!",
        text: `General Account Master "${dto.accountMasterDTO?.accountName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete General Account Master.", "error");
    }
  }
};

// Main Component
const GeneralAccountMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [accountHeads, setAccountHeads] = useState([]);
  const [states, setStates] = useState<State[]>([]);
  
  // Fetch account heads and states
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Account Heads
        const accountHeadRes = await AccountHeadApiService.fetchaccountheads(user.branchid);
        if (!accountHeadRes.success) throw new Error("Failed to load Account Heads");
        setAccountHeads(accountHeadRes.data || []);

        // Fetch States
        const stateRes = await commonservice.get_states();
        if (!stateRes.success) throw new Error("Failed to load States");
        setStates(stateRes.data || []);
        
      } catch (err: any) {
        Swal.fire("Error", err.message || "Could not load required data", "error");
      }
    };
    
    if (user.branchid) {
      fetchData();
    }
  }, [user.branchid]);

  // Fixed callback using CommonAccMasterDTO
  const fetchAccountsWithBranch = useCallback(
    async (filter: GeneralAccountFilter): Promise<{
      success: boolean;
      data: CommonAccMasterDTO[];
      totalCount: number;
      message: string;
    }> => {
      return await fetchGeneralAccounts(filter, user.branchid);
    },
    [user.branchid]
  );

  return (
    <CRUDMaster<CommonAccMasterDTO>
      fetchData={fetchAccountsWithBranch}
      addEntry={() => addOrModifyAccountMaster(null, user.branchid, accountHeads, states)}
      modifyEntry={(dto) => addOrModifyAccountMaster(dto, user.branchid, accountHeads, states)}
      deleteEntry={(dto) => deleteGeneralAccount(dto, user.branchid)}
      pageTitle="General Account Master Operations"
      addLabel="Add General Account Master"
      onClose={() => navigate("/account-operations")}
      searchPlaceholder="Search by account name, number..."
      renderTable={(accounts, handleModify, handleDelete) => (
        <GeneralAccountTable
          accounts={accounts}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.accountMasterDTO?.accId || 0}
    />
  );
};

export default GeneralAccountMasterCRUD;