import React from "react";
import AccountHeadApiService, {
  AccountHead,
  AccountHeadFilter,
} from "../../../services/accountHead/accountheadapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import AccountHeadTable from "./accounthead-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";

// Define the async function to fetch AccountHeads and ensure the return type is correct.
// In your CRUD component (accounthead-data.tsx), update the fetchAccountHeads function:
const fetchAccountHeads = async (
  filter: AccountHeadFilter,
  branchId: number
) => {
  const res = await AccountHeadApiService.fetchaccounthead(filter, branchId);

  return {
    success: res.success ?? false,
    // Your backend returns 'accountHead' (lowercase 'h') - FIXED
    data: res.accountHead ?? [],
    // Your backend returns 'totalCount' (lowercase 't') - FIXED
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Define the async function for adding a AccountHead.
const addAccountHead = async (
  branchId: number,
  accountHeadTypes: any[],
  parents: AccountHead[]
) => {
  // Create options for account head types
  const typeOptions = accountHeadTypes
    .map(
      (type) =>
        `<option value="${type.accountHeadTypeId}">${type.accountHeadTypeName}</option>`
    )
    .join("");

  // Create options for parent heads
  const parentOptions = parents
    .map(
      (parent) =>
        `<option value="${parent.accountHeadId}">${parent.accountHeadName}</option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Add New Account Head",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Account Head Name Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Account Head Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="AccountHeadName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Account Head Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus = {true}
          required
          maxlength="50"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Account Head Name SL Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Account Head Name SL (Hindi)
      </label>
      <div class="relative">
        <input 
          id="AccountHeadNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Hindi Name" 
          autocomplete="off"
          lang="hi"
          maxlength="50"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Account Head Type Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadType" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Account Head Type
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="AccountHeadType" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Account Head Type</option>
          ${typeOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Head Code Field -->
    <div class="swal2-input-group">
      <label for="HeadCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        Head Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="HeadCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Head Code" 
          required
          pattern="^\d{12}$"
          maxlength="12"
          minlength="12"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-orange-200"></div>
      </div>
    </div>

    <!-- Parent Head Field -->
    <div class="swal2-input-group">
      <label for="ParentHeadCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Parent Head
      </label>
      <div class="relative">
        <select 
          id="ParentHeadCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
        >
          <option value="">Select Parent Head (Optional)</option>
          ${parentOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-teal-200"></div>
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="grid grid-cols-2 gap-4">
      <div class="swal2-input-group">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="IsAnnexure" class="w-4 h-4 text-blue-600 border-gray-300 rounded">
          <span class="text-sm font-medium text-slate-700">Show in Annexure</span>
        </label>
      </div>
      <div class="swal2-input-group">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="ShowInReport" class="w-4 h-4 text-blue-600 border-gray-300 rounded">
          <span class="text-sm font-medium text-slate-700">Show in Report</span>
        </label>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">+</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Creating New Account Head</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Account Head.</p>
        </div>
        <div class="text-right">
          <div class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
            <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            New
          </div>
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
    .swal2-popup {
      padding: 2rem !important;
      max-width: 600px !important;
    }
    .swal2-html-container {
      margin: 0 !important;
      padding: 0 !important;
    }
  </style>
`,

    showCancelButton: true,
    confirmButtonText: "Add Account Head",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    didOpen: () => {
      const input = document.getElementById("HeadCode") as HTMLInputElement;

      // Restrict input to digits only
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, ""); // remove non-digits
        if (input.value.length > 12) {
          input.value = input.value.slice(0, 12); // max 12 digits
        }
      });
    },
    preConfirm: () => {
      const AccountHeadName = (
        document.getElementById("AccountHeadName") as HTMLInputElement
      ).value.trim();
      const AccountHeadNameSL = (
        document.getElementById("AccountHeadNameSL") as HTMLInputElement
      ).value.trim();
      const AccountHeadType = (
        document.getElementById("AccountHeadType") as HTMLSelectElement
      ).value;
      const HeadCode = (
        document.getElementById("HeadCode") as HTMLInputElement
      ).value.trim();
      const ParentHeadCode = (
        document.getElementById("ParentHeadCode") as HTMLSelectElement
      ).value;
      const IsAnnexure = (
        document.getElementById("IsAnnexure") as HTMLInputElement
      ).checked;
      const ShowInReport = (
        document.getElementById("ShowInReport") as HTMLInputElement
      ).checked;

      if (!AccountHeadName) {
        Swal.showValidationMessage("Account Head Name is required");
        (
          document.getElementById("AccountHeadName") as HTMLInputElement
        ).focus();
        return null;
      }
      if (!AccountHeadType) {
        Swal.showValidationMessage("Account Head Type is required");
        (
          document.getElementById("AccountHeadType") as HTMLInputElement
        ).focus();
        return null;
      }
      if (!HeadCode) {
        Swal.showValidationMessage("Head Code is required");
        (document.getElementById("HeadCode") as HTMLInputElement).focus();
        return null;
      }
      else if (!/^\d{12}$/.test(HeadCode)) {
        Swal.showValidationMessage("Head Code must be exactly 12 digits");
        (document.getElementById("HeadCode") as HTMLInputElement).focus();
        return false;
      }

      return {
        AccountHeadName,
        AccountHeadNameSL,
        AccountHeadType,
        HeadCode,
        ParentHeadCode,
        IsAnnexure,
        ShowInReport,
      };
    },
  });

  if (formValues) {
    try {
      // Create the payload matching your backend DTO structure
      const payload = {
        AccountHeadName: formValues.AccountHeadName,
        AccountHeadNameSL: formValues.AccountHeadNameSL || "",
        ParentHeadCode: formValues.ParentHeadCode || "",
        AccountHeadType: formValues.AccountHeadType,
        HeadCode: formValues.HeadCode,
        IsAnnexure: formValues.IsAnnexure ? "1" : "0",
        ShowInReport: formValues.ShowInReport ? "1" : "0",
        BranchID: branchId,
        AccountHeadId: 0,
      };

      console.log("Adding account head with payload:", payload);
      await AccountHeadApiService.add_new_accounthead(payload as any);

      Swal.fire({
        title: "Success!",
        text: "New Account Head has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error adding account head:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to add Account Head.",
        "error"
      );
    }
  }
};

// Define the async function for modifying a AccountHead.
const modifyAccountHead = async (
  AccountHead: AccountHead,
  accountHeadTypes: any[],
  parents: AccountHead[],
  branchid: number
) => {
  // Create options for account head types
  const typeOptions = accountHeadTypes
    .map((type) => {
      // Compare type.accountHeadTypeId with AccountHead.accountHeadType
      // Both should be converted to strings for safe comparison
      const typeId = type.accountHeadTypeId?.toString();
      const accountType = AccountHead.accountHeadType?.toString();
      const isSelected = typeId === accountType;

      return `<option value="${type.accountHeadTypeId}" ${
        isSelected ? "selected" : ""
      }>${type.accountHeadTypeName}</option>`;
    })
    .join("");
  // Create options for parent heads
  const parentOptions = parents
    .filter((parent) => parent.accountHeadId !== AccountHead.accountHeadId) // remove current row
    .map(
      (parent) =>
        `<option value="${parent.accountHeadId}" ${
          parent.accountHeadId === AccountHead.parentId ? "selected" : ""
        }>
       ${parent.accountHeadName}
     </option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Modify Account Head",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Account Head Name Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Account Head Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="AccountHeadName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${AccountHead.accountHeadName || ""}"
          placeholder="Enter Account Head Name" 
          required
          autoFocus={true}
          maxlength="50"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Account Head Name SL Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Account Head Name SL (Hindi)
      </label>
      <div class="relative">
        <input 
          id="AccountHeadNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${AccountHead.accountHeadNameSL || ""}"
          placeholder="Enter Hindi Name" 
          lang="hi"
          maxlength="50"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Account Head Type Field -->
    <div class="swal2-input-group">
      <label for="AccountHeadType" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Account Head Type
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="AccountHeadType" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Account Head Type</option>
          ${typeOptions}
        </select>
      </div>
    </div>

    <!-- Head Code Field -->
    <div class="swal2-input-group">
      <label for="HeadCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        Head Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="HeadCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${AccountHead.headCode || AccountHead.HeadCode || ""}"
          placeholder="Enter Head Code" 
          required
          pattern="^\d{12}$"
          maxlength="12"
          minlength="12"
        >
      </div>
    </div>

    <!-- Parent Head Field -->
    <div class="swal2-input-group">
      <label for="ParentHeadCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Parent Head
      </label>
      <div class="relative">
        <select 
          id="ParentHeadCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
        >
          <option value="">Select Parent Head (Optional)</option>
          ${parentOptions}
        </select>
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="grid grid-cols-2 gap-4">
      <div class="swal2-input-group">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="IsAnnexure" class="w-4 h-4 text-blue-600 border-gray-300 rounded" ${
            AccountHead.isAnnexure === true ||
            AccountHead.isAnnexure === "1" ||
            AccountHead.isAnnexure === 1
              ? "checked"
              : ""
          }>
          <span class="text-sm font-medium text-slate-700">Show in Annexure</span>
        </label>
      </div>
      <div class="swal2-input-group">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="ShowInReport" class="w-4 h-4 text-blue-600 border-gray-300 rounded" ${
            AccountHead.showInReport === true ||
            AccountHead.showInReport === "1" ||
            AccountHead.showInReport === 1
              ? "checked"
              : ""
          }>
          <span class="text-sm font-medium text-slate-700">Show in Report</span>
        </label>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">✓</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Editing Account Head Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Account Head details above. Fields marked with * are required.</p>
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
    .swal2-popup {
      max-width: 600px !important;
    }
  </style>
`,
    showCancelButton: true,
    confirmButtonText: "Update Account Head",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    didOpen: () => {
      const input = document.getElementById("HeadCode") as HTMLInputElement;

      // Restrict input to digits only
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, ""); // remove non-digits
        if (input.value.length > 12) {
          input.value = input.value.slice(0, 12); // max 12 digits
        }
      });
    },
    preConfirm: () => {
      const AccountHeadName = (
        document.getElementById("AccountHeadName") as HTMLInputElement
      ).value.trim();
      const AccountHeadNameSL = (
        document.getElementById("AccountHeadNameSL") as HTMLInputElement
      ).value.trim();
      const AccountHeadType = (
        document.getElementById("AccountHeadType") as HTMLSelectElement
      ).value;
      const HeadCode = (
        document.getElementById("HeadCode") as HTMLInputElement
      ).value.trim();
      const ParentHeadCode = (
        document.getElementById("ParentHeadCode") as HTMLSelectElement
      ).value;
      const IsAnnexure = (
        document.getElementById("IsAnnexure") as HTMLInputElement
      ).checked;
      const ShowInReport = (
        document.getElementById("ShowInReport") as HTMLInputElement
      ).checked;

      if (!AccountHeadName) {
        Swal.showValidationMessage("Account Head Name is required");
        (
          document.getElementById("AccountHeadName") as HTMLInputElement
        ).focus();
        return null;
      }
      if (!AccountHeadType) {
        Swal.showValidationMessage("Account Head Type is required");
        (
          document.getElementById("AccountHeadType") as HTMLInputElement
        ).focus();
        return null;
      }
      if (!HeadCode) {
        Swal.showValidationMessage("Head Code is required");
        (document.getElementById("HeadCode") as HTMLInputElement).focus();
        return null;
      }
      else if (!/^\d{12}$/.test(HeadCode)) {
        Swal.showValidationMessage("Head Code must be exactly 12 digits");
        (document.getElementById("HeadCode") as HTMLInputElement).focus();
        return false;
      }

      return {
        id: AccountHead.accountHeadId,
        AccountHeadName,
        AccountHeadNameSL,
        AccountHeadType,
        HeadCode,
        ParentHeadCode,
        IsAnnexure,
        ShowInReport,
      };
    },
  });

  if (formValues) {
    try {
      // console.log("Updating account head with values:", formValues);
      await AccountHeadApiService.modify_accounthead(
        formValues.id,
        formValues.AccountHeadName,
        formValues.AccountHeadNameSL || "",
        formValues.HeadCode,
        formValues.ParentHeadCode || "",
        Number(formValues.AccountHeadType),
        formValues.IsAnnexure,
        formValues.ShowInReport,
        branchid
      );

      Swal.fire({
        title: "Success!",
        text: "Account Head has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error updating account head:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to update Account Head.",
        "error"
      );
    }
  }
};

// Define the async function for deleting a AccountHead.
const deleteAccountHead = async (
  AccountHead: AccountHead,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete Account Head",
    text: `Are you sure you want to delete "${AccountHead.accountHeadName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      console.log("Deleting account head with ID:", AccountHead.accountHeadId);
      await AccountHeadApiService.delete_accounthead(
        AccountHead.accountHeadId,
        AccountHead.accountHeadName,
        AccountHead.accountHeadNameSL || "",
        AccountHead.headCode || AccountHead.HeadCode || "",
        AccountHead.parentHeadCode || "",
        Number(AccountHead.accountHeadType),
        AccountHead.isAnnexure === true ||
          AccountHead.isAnnexure === "1" ||
          AccountHead.isAnnexure === 1
          ? true
          : false,
        AccountHead.showInReport === true ||
          AccountHead.showInReport === "1" ||
          AccountHead.showInReport === 1
          ? true
          : false,
        branchId
      );

      Swal.fire({
        title: "Deleted!",
        text: `Account Head "${AccountHead.accountHeadName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error deleting account head:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to delete Account Head.",
        "error"
      );
    }
  }
};

// --- AccountHeadMaster Component ---
const AccountHeadMaster: React.FC = () => {
  const navigate = useNavigate();
  var user = useSelector((state: RootState) => state.user);
  const [accountHeadTypes, setAccountHeadTypes] = React.useState<any[]>([]);
  const [parents, setParents] = React.useState<AccountHead[]>([]);

  // Fetch account head types and parents on component mount
  React.useEffect(() => {
    const fetchTypesAndParents = async () => {
      try {
        const typesRes = await AccountHeadApiService.fetchaccountheadtypes(
          user.branchid
        );
        if (typesRes.success) {
          setAccountHeadTypes(typesRes.data || []);
        }

        const parentsRes = await AccountHeadApiService.fetchaccountheads(
          user.branchid
        );
        if (parentsRes.success) {
          setParents(parentsRes.data || []);
        }
      } catch (error) {
        console.error("Error fetching types and parents:", error);
      }
    };

    fetchTypesAndParents();
  }, [user.branchid]);

  return (
    <CRUDMaster<AccountHead>
      fetchData={(accountheads) =>
        fetchAccountHeads(accountheads, user.branchid)
      }
      addEntry={() => addAccountHead(user.branchid, accountHeadTypes, parents)}
      modifyEntry={(accountHead) =>
        modifyAccountHead(accountHead, accountHeadTypes, parents, user.branchid)
      }
      deleteEntry={(accountHead) =>
        deleteAccountHead(accountHead, user.branchid)
      }
      pageTitle="Account Head Operations"
      addLabel="Add Account Head"
      onClose={() => navigate("/AccountHead")}
      searchPlaceholder="Search by name or code..."
      renderTable={(AccountHeads, handleModify, handleDelete) => (
        <AccountHeadTable
          AccountHeads={AccountHeads}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(AccountHead) => AccountHead.accountHeadId}
    />
  );
};

export default AccountHeadMaster;
