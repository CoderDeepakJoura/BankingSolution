import React from "react";
import PatwarApiService, {
  Patwar,
  PatwarFilter,
} from "../../../services/location/Patwar/Patwarapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import PatwarTable from "./patwar-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
const fetchPatwars = async (filter: PatwarFilter, branchId: number) => {
  const res = await PatwarApiService.fetchPatwar(filter, branchId);
  return {
    success: res.success ?? false,
    data: res.patwars ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Define the async function for adding a Patwar.
const addPatwar = async (branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Add New Patwar",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Patwar Name Field -->
    <div class="swal2-input-group">
      <label for="Patwarname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Patwar Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Patwarname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Patwar Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus={true}
          required
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Patwar Name SL Field -->
    <div class="swal2-input-group">
      <label for="Patwarnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Patwar Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
      </label>
      <div class="relative">
        <input 
          id="Patwarnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Patwar Name SL" 
          autocomplete="off"
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
          <p class="text-sm font-semibold text-slate-700">Creating New Patwar</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Patwar.</p>
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
            <li>Patwar name should be descriptive and unique</li>
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
    confirmButtonText: "Add Patwar",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const PatwarnameInput = document.getElementById(
        "Patwarname"
      ) as HTMLInputElement;

      const Patwarname = PatwarnameInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Patwarname) {
        firstEmptyElement = PatwarnameInput;
      }
      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        Patwarname,
        Patwarnamesl: (
          document.getElementById("Patwarnamesl") as HTMLInputElement
        ).value.trim(),
      };
    },
  });

  if (formValues) {
    try {
      await PatwarApiService.add_new_Patwar(
        formValues.Patwarname,
        formValues.Patwarnamesl || "",
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "New Patwar has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add Patwar.", "error");
    }
  }
};

// Define the async function for modifying a Patwar.
const modifyPatwar = async (Patwar: Patwar, branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Modify Patwar",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Patwar Name Field -->
    <div class="swal2-input-group">
      <label for="Patwarname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Patwar Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Patwarname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Patwar.description}"
          placeholder="Enter Patwar Name" 
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
          required
          aria-required="true"
          autocomplete="off"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Patwar Name SL Field -->
    <div class="swal2-input-group">
      <label for="Patwarnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Patwar Name SL
        
      </label>
      <div class="relative">
        <input 
          id="Patwarnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Patwar.descriptionSL || ""}"
          placeholder="Enter Patwar Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Editing Patwar Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Patwar details above. Fields marked with * are required.</p>
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
            <li>Patwar code changes may affect existing records</li>
            <li>Ensure Patwar Name and Patwar Code is unique in the system</li>
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
    confirmButtonText: "Update Patwar",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const PatwarnameInput = document.getElementById(
        "Patwarname"
      ) as HTMLInputElement;

      const Patwarname = PatwarnameInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Patwarname) {
        firstEmptyElement = PatwarnameInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        id: Patwar.patwarId,
        Patwarname,
        Patwarnamesl: (
          document.getElementById("Patwarnamesl") as HTMLInputElement
        ).value.trim(),
      };
    },
  });

  if (formValues) {
    try {
      await PatwarApiService.modify_Patwar(
        formValues.id,
        formValues.Patwarname,
        formValues.Patwarnamesl || "",
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "Patwar has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to update Patwar.", "error");
    }
  }
};

// Define the async function for deleting a Patwar.
const deletePatwar = async (Patwar: Patwar, branchId: number) => {
  const result = await Swal.fire({
    title: "Delete Patwar",
    text: `Are you sure you want to delete "${Patwar.description}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await PatwarApiService.delete_Patwar(
        Patwar.patwarId,
        branchId
      );
      Swal.fire({
        title: "Deleted!",
        text: `Patwar "${Patwar.description}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete Patwar.", "error");
    }
  }
};

// --- PatwarMaster Component ---

const PatwarMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const fetchPatwarWithBranch = React.useCallback(
    async (filter: PatwarFilter) => {
      return await fetchPatwars(filter, user.branchid);
    },
    [user.branchid]
  );
  return (
    <CRUDMaster<Patwar>
      fetchData={fetchPatwarWithBranch}
      addEntry={() => addPatwar(user.branchid)}
      modifyEntry={(patwar) => modifyPatwar(patwar, user.branchid)}
      deleteEntry={(patwar) => deletePatwar(patwar, user.branchid)}
      pageTitle="Patwar Operations"
      addLabel="Add Patwar"
      onClose={() => navigate("/Patwar")}
      searchPlaceholder="Search by name or code..."
      renderTable={(Patwars, handleModify, handleDelete) => (
        <PatwarTable
          Patwars={Patwars}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(Patwar) => Patwar.patwarId}
    />
  );
};

export default PatwarMaster;
