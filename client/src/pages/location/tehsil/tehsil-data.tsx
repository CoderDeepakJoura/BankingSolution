import React from "react";
import TehsilApiService, {
  Tehsil,
  TehsilFilter,
} from "../../../services/location/tehsil/tehsilapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import TehsilTable from "./tehsil-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
// Define the async function to fetch Tehsils and ensure the return type is correct.
const fetchTehsils = async (filter: TehsilFilter, branchId: number) => {
  const res = await TehsilApiService.fetchtehsils(filter, branchId);
  return {
    success: res.success ?? false, 
    data: res.tehsils ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Define the async function for adding a Tehsil.
const addTehsil = async (branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Add New Tehsil",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Tehsil Name Field -->
    <div class="swal2-input-group">
      <label for="Tehsilname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Tehsil Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Tehsilname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Tehsil Name" 
          aria-required="true"
          autocomplete="off"
          maxlength="50"
          required
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
          autoFocus={true}
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Tehsil Code Field -->
    <div class="swal2-input-group">
      <label for="Tehsilcode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Tehsil Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Tehsilcode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 font-mono" 
          placeholder="Enter Tehsil Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          pattern="[a-zA-Z0-9]{1,10}"
          "
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Tehsil Name SL Field -->
    <div class="swal2-input-group">
      <label for="Tehsilnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Tehsil Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Tehsilnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Tehsil Name SL" 
          aria-required="true"
          autocomplete="off"
          autoFocus={true}
          lang="si"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">+</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Creating New Tehsil</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Tehsil.</p>
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
            <li>Tehsil name should be descriptive and unique</li>
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
    .swal2-input-group input:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover {
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
    confirmButtonText: "Add Tehsil",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const TehsilnameInput = document.getElementById(
        "Tehsilname"
      ) as HTMLInputElement;
      const TehsilcodeInput = document.getElementById(
        "Tehsilcode"
      ) as HTMLInputElement;
      const TehsilnameslInput = document.getElementById(
        "Tehsilnamesl"
      ) as HTMLInputElement;

      const Tehsilname = TehsilnameInput.value.trim();
      const Tehsilcode = TehsilcodeInput.value.trim();
      const Tehsilnamesl = TehsilnameslInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Tehsilname) {
        firstEmptyElement = TehsilnameInput;
      } else if (!Tehsilcode) {
        firstEmptyElement = TehsilcodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }

      return { Tehsilname, Tehsilcode, Tehsilnamesl };
    },
  });

  if (formValues) {
    try {
      await TehsilApiService.add_new_tehsil(
        formValues.Tehsilname,
        formValues.Tehsilcode,
        formValues.Tehsilnamesl,
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "New Tehsil has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add Tehsil.", "error");
    }
  }
};

// Define the async function for modifying a Tehsil.
const modifyTehsil = async (Tehsil: Tehsil, branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Modify Tehsil",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Tehsil Name Field -->
    <div class="swal2-input-group">
      <label for="Tehsilname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Tehsil Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Tehsilname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Tehsil.tehsilName}"
          placeholder="Enter Tehsil Name" 
          aria-required="true"
          autocomplete="off"
          maxlength="50"
          required
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
          autoFocus={true}
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Tehsil Code Field -->
    <div class="swal2-input-group">
      <label for="Tehsilcode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Tehsil Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Tehsilcode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 font-mono" 
          value="${Tehsil.tehsilCode || ""}"
          placeholder="Enter Tehsil Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Tehsil Name SL Field -->
    <div class="swal2-input-group">
      <label for="Tehsilnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Tehsil Name SL
        
      </label>
      <div class="relative">
        <input 
          id="Tehsilnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Tehsil.tehsilNameSL || ""}"
          placeholder="Enter Tehsil Name SL" 
          aria-required="true"
          autocomplete="off"
          lang="si"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">✓</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Editing Tehsil Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Tehsil details above. Fields marked with * are required.</p>
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
            <li>Tehsil code changes may affect existing records</li>
            <li>Ensure Tehsil Name and Tehsil Code is unique in the system</li>
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
    .swal2-input-group input:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover {
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
    confirmButtonText: "Update Tehsil",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const TehsilnameInput = document.getElementById(
        "Tehsilname"
      ) as HTMLInputElement;
      const TehsilcodeInput = document.getElementById(
        "Tehsilcode"
      ) as HTMLInputElement;
      const TehsilnameslInput = document.getElementById(
        "Tehsilnamesl"
      ) as HTMLInputElement;

      const Tehsilname = TehsilnameInput.value.trim();
      const Tehsilcode = TehsilcodeInput.value.trim();
      const Tehsilnamesl = TehsilnameslInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Tehsilname) {
        firstEmptyElement = TehsilnameInput;
      } else if (!Tehsilcode) {
        firstEmptyElement = TehsilcodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }
      return { id: Tehsil.tehsilId, Tehsilname, Tehsilcode, Tehsilnamesl };
    },
  });

  if (formValues) {
    try {
      await TehsilApiService.modify_tehsil(
        formValues.id,
        formValues.Tehsilname,
        formValues.Tehsilcode,
        formValues.Tehsilnamesl,
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "Tehsil has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to update Tehsil.", "error");
    }
  }
};

// Define the async function for deleting a Tehsil.
const deleteTehsil = async (Tehsil: Tehsil, branchid: number) => {
  const result = await Swal.fire({
    title: "Delete Tehsil",
    text: `Are you sure you want to delete "${Tehsil.tehsilName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await TehsilApiService.delete_tehsil(
        Tehsil.tehsilId,
        Tehsil.tehsilName,
        Tehsil.tehsilCode,
        Tehsil.tehsilNameSL,
        branchid
      );
      Swal.fire({
        title: "Deleted!",
        text: `Tehsil "${Tehsil.tehsilName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete Tehsil.", "error");
    }
  }
};

// --- TehsilMaster Component ---

const TehsilMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const fetchTehsilsWithBranch = React.useCallback(
    async (filter: TehsilFilter) => {
      return await fetchTehsils(filter, user.branchid);
    },
    [user.branchid]
  );
  return (
    <CRUDMaster<Tehsil>
      fetchData={fetchTehsilsWithBranch}
      addEntry={() => addTehsil(user.branchid)}
      modifyEntry={(tehsil) => modifyTehsil(tehsil, user.branchid)}
      deleteEntry={(tehsil) => deleteTehsil(tehsil, user.branchid)}
      pageTitle="Tehsil Operations"
      addLabel="Add Tehsil"
      onClose={() => navigate("/Tehsil")}
      searchPlaceholder="Search by name or code..."
      renderTable={(Tehsils, handleModify, handleDelete) => (
        <TehsilTable
          Tehsils={Tehsils}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(Tehsil) => Tehsil.tehsilId}
    />
  );
};

export default TehsilMaster;
