import React, { useState } from "react";
import AccountHeadTypeApiService, {
  AccountHeadType,
  AccountHeadTypeFilter,
} from "../../../services/accountHead/accountheadtypeapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import AccountHeadTypeTable from "./accountheadtype-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";

// Define the async function to fetch AccountHeadTypes and ensure the return type is correct.
const fetchAccountHeadTypes = async (
  filter: AccountHeadTypeFilter,
  branchId: number
) => {
  const res = await AccountHeadTypeApiService.fetchaccountheadtype(
    filter,
    branchId
  );
  return {
    // Ensure 'success' is a boolean, defaulting to false if undefined.
    success: res.success ?? false,
    // Ensure 'data' is a AccountHeadType array, defaulting to an empty array.
    data: res.accountHeadType ?? [],
    // Ensure 'totalCount' is a number, defaulting to 0.
    totalCount: res.totalCount ?? 0,
    // Ensure 'message' is a string, defaulting to an empty string.
    message: res.message ?? "",
  };
};

// Category options for the dropdown
const getCategoryOptions = () => {
  return [
    { value: "", label: "Select Category" },
    { value: "1", label: "Assets" },
    { value: "2", label: "Liabilities" },
    { value: "3", label: "Indirect Income" },
    { value: "4", label: "Indirect Expense" },
    { value: "5", label: "Direct Income" },
    { value: "6", label: "Direct Expense" },
    { value: "7", label: "Sale Return" },
    { value: "8", label: "Purchase Return" },
    { value: "9", label: "Sale" },
    { value: "10", label: "Purchase" },
  ];
};

// Helper function to get category label by value
const getCategoryLabel = (categoryId: string) => {
  const categories = getCategoryOptions();
  const category = categories.find((cat) => cat.value === categoryId);
  return category ? category.label : "";
};

// Define the async function for adding a AccountHeadType.
const addAccountHeadType = async (branchId: number) => {
  const categories = getCategoryOptions();
  const categoryOptionsHtml = categories
    .map((cat) => `<option value="${cat.value}">${cat.label}</option>`)
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Add New Account Head Type",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Account Head Type Name Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadTypename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Account Head Type Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="AccountHeadTypename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Account Head Type Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus
          required
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Account Head Type Name SL Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadTypenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Account Head Type Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="AccountHeadTypenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Account Head Type Name SL" 
          aria-required="true"
          autocomplete="off"
          lang="si"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Category Dropdown Field -->
    <div class="swal2-input-group">
      <label for="Category" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
        Category
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select
          id="Category"
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50 appearance-none cursor-pointer"
          required
        >
          ${categoryOptionsHtml}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">+</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Creating New AccountHeadType</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Account Head Type.</p>
        </div>
        <div class="text-right">
          <div class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
            <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            New
          </div>
        </div>
      </div>
    </div>

    <!-- Creation Guidelines -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-start gap-2">
        <div class="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
          <span class="text-white text-xs font-bold">i</span>
        </div>
        <div class="text-xs text-slate-600">
          <p class="font-medium text-blue-700">Creation Guidelines:</p>
          <ul class="list-disc list-inside mt-1 space-y-1 text-blue-600">
            <li>Account Head Type name should be descriptive and unique</li>
            <li>Select appropriate category for proper classification</li>
            <li>Fields marked with * are required for successful creation</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <style>
    .swal2-form-container {
      text-align: left;
      max-height: 70vh;
      overflow-y: auto;
    }
    .swal2-input-group {
      margin-bottom: 0 !important;
    }
    .swal2-input-group input:focus, .swal2-input-group select:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover, .swal2-input-group select:hover {
      border-color: rgb(148, 163, 184) !important;
      transform: translateY(-1px);
    }
    .swal2-input-group input[lang="si"] {
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', sans-serif;
    }
    .swal2-popup {
      padding: 2rem !important;
      max-width: 500px !important;
    }
    .swal2-html-container {
      margin: 0 !important;
      padding: 0 !important;
    }
    .swal2-form-container::-webkit-scrollbar {
      width: 6px;
    }
    .swal2-form-container::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 10px;
    }
    .swal2-form-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }
    .swal2-form-container::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  </style>
`,
    showCancelButton: true,
    confirmButtonText: "Add Account Head Type",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const AccountHeadTypenameInput = document.getElementById(
        "AccountHeadTypename"
      ) as HTMLInputElement;
      const AccountHeadTypenameslInput = document.getElementById(
        "AccountHeadTypenamesl"
      ) as HTMLInputElement;
      const CategoryInput = document.getElementById(
        "Category"
      ) as HTMLSelectElement;

      const AccountHeadTypename = AccountHeadTypenameInput?.value.trim();
      const AccountHeadTypenamesl = AccountHeadTypenameslInput?.value.trim();
      const CategoryId = CategoryInput?.value;

      // Keep track of the first empty element
      let firstEmptyElement: HTMLElement | null = null;

      if (!AccountHeadTypename) {
        firstEmptyElement = AccountHeadTypenameInput;
      }
      if (!CategoryId) {
        firstEmptyElement = firstEmptyElement || CategoryInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        AccountHeadTypename,
        AccountHeadTypenamesl: AccountHeadTypenamesl || "",
        CategoryId,
      };
    },
  });

  if (formValues) {
    try {
      await AccountHeadTypeApiService.add_new_accountheadtype(
        formValues.AccountHeadTypename,
        formValues.AccountHeadTypenamesl,
        branchId,
        formValues.CategoryId
      );
      Swal.fire({
        title: "Success!",
        text: "New Account Head Type has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to add Account Head Type.",
        "error"
      );
    }
  }
};

// Define the async function for modifying a AccountHeadType.
const modifyAccountHeadType = async (
  AccountHeadType: AccountHeadType,
  branchId: number
) => {
  const categories = getCategoryOptions();
  const categoryOptionsHtml = categories
    .map(
      (cat) =>
        `<option value="${cat.value}" ${
          cat.value === (AccountHeadType.categoryId?.toString() || "")
            ? "selected"
            : ""
        }>${cat.label}</option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Modify Account Head Type",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Account Head Type Name Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadTypename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Account Head Type Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="AccountHeadTypename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${AccountHeadType.accountHeadTypeName}"
          placeholder="Enter Account Head Type Name" 
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
          required
          autoFocus
          aria-required="true"
          autocomplete="off"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Account Head Type Name SL Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadTypenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Account Head Type Name SL
      </label>
      <div class="relative">
        <input 
          id="AccountHeadTypenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${AccountHeadType.accountHeadTypeNameSL || ""}"
          placeholder="Enter Account Head Type Name SL" 
          aria-required="true"
          autocomplete="off"
          lang="si"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Category Dropdown Field -->
    <div class="swal2-input-group">
      <label for="Category" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
        Category
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select
          id="Category"
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50 appearance-none cursor-pointer"
          required
        >
          ${categoryOptionsHtml}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">✓</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Editing AccountHeadType Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the AccountHeadType details above. Fields marked with * are required.</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions Hint -->
    <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
      <div class="flex items-start gap-2">
        <div class="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
          <span class="text-white text-xs font-bold">!</span>
        </div>
        <div class="text-xs text-slate-600">
          <p class="font-medium text-amber-700">Important Notes:</p>
          <ul class="list-disc list-inside mt-1 space-y-1 text-amber-600">
            <li>Category changes may affect existing records</li>
            <li>Ensure Account Head Type Name is unique in the system</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <style>
    .swal2-form-container {
      text-align: left;
      max-height: 70vh;
      overflow-y: auto;
    }
    .swal2-input-group {
      margin-bottom: 0 !important;
    }
    .swal2-input-group input:focus, .swal2-input-group select:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover, .swal2-input-group select:hover {
      border-color: rgb(148, 163, 184) !important;
      transform: translateY(-1px);
    }
    .swal2-input-group input[lang="si"] {
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', sans-serif;
    }
    .swal2-popup {
      padding: 2rem !important;
      max-width: 500px !important;
    }
    .swal2-html-container {
      margin: 0 !important;
      padding: 0 !important;
    }
    .swal2-form-container::-webkit-scrollbar {
      width: 6px;
    }
    .swal2-form-container::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 10px;
    }
    .swal2-form-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }
    .swal2-form-container::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  </style>
`,
    showCancelButton: true,
    confirmButtonText: "Update Account Head Type",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const AccountHeadTypenameInput = document.getElementById(
        "AccountHeadTypename"
      ) as HTMLInputElement;
      const AccountHeadTypenameslInput = document.getElementById(
        "AccountHeadTypenamesl"
      ) as HTMLInputElement;
      const CategoryInput = document.getElementById(
        "Category"
      ) as HTMLSelectElement;

      const AccountHeadTypename = AccountHeadTypenameInput?.value.trim();
      const AccountHeadTypenamesl = AccountHeadTypenameslInput?.value.trim();
      const CategoryId = CategoryInput?.value;

      // Keep track of the first empty element
      let firstEmptyElement: HTMLElement | null = null;

      if (!AccountHeadTypename) {
        firstEmptyElement = AccountHeadTypenameInput;
      }
      if (!CategoryId) {
        firstEmptyElement = firstEmptyElement || CategoryInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        id: AccountHeadType.accountHeadTypeId,
        AccountHeadTypename,
        AccountHeadTypenamesl: AccountHeadTypenamesl || "",
        CategoryId,
      };
    },
  });

  if (formValues) {
    try {
      await AccountHeadTypeApiService.modify_accountheadtype(
        formValues.id,
        formValues.AccountHeadTypename,
        formValues.AccountHeadTypenamesl,
        branchId,
        formValues.CategoryId
      );
      Swal.fire({
        title: "Success!",
        text: "Account Head Type has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to update Account Head Type.",
        "error"
      );
    }
  }
};

// Define the async function for deleting a AccountHeadType.
const deleteAccountHeadType = async (
  AccountHeadType: AccountHeadType,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete Account Head Type",
    text: `Are you sure you want to delete "${AccountHeadType.accountHeadTypeName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await AccountHeadTypeApiService.delete_accountheadtype(
        AccountHeadType.accountHeadTypeId,
        AccountHeadType.accountHeadTypeName,
        AccountHeadType.accountHeadTypeNameSL,
        branchId
      );
      Swal.fire({
        title: "Deleted!",
        text: `Account Head Type "${AccountHeadType.accountHeadTypeName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to delete Account Head Type.",
        "error"
      );
    }
  }
};

// --- AccountHeadTypeMaster Component ---
const AccountHeadTypeMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchAccountHeadTypesWithBranch = React.useCallback(
    async (filter: AccountHeadTypeFilter) => {
      return await fetchAccountHeadTypes(filter, user.branchid);
    },
    [user.branchid]
  );

  return (
    <CRUDMaster<AccountHeadType>
      fetchData={fetchAccountHeadTypesWithBranch}
      addEntry={() => addAccountHeadType(user.branchid)}
      modifyEntry={(accountheadtypes) =>
        modifyAccountHeadType(accountheadtypes, user.branchid)
      }
      deleteEntry={(accountheadtypes) =>
        deleteAccountHeadType(accountheadtypes, user.branchid)
      }
      pageTitle="Account Head Type Operations"
      addLabel="Add Account Head Type"
      onClose={() => navigate("/AccountHeadType")}
      searchPlaceholder="Search by name or code..."
      renderTable={(AccountHeadTypes, handleModify, handleDelete) => (
        <AccountHeadTypeTable
          AccountHeadTypes={AccountHeadTypes}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(AccountHeadType) => AccountHeadType.accountHeadTypeId}
    />
  );
};

export default AccountHeadTypeMaster;
