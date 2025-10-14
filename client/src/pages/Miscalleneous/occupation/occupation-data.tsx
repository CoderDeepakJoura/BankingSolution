import React from "react";
import OccupationApiService, {
  Occupation,
  OccupationFilter,
} from "../../../services/Occupation/Occupationapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import OccupationTable from "./occupation-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
const fetchOccupations = async (filter: OccupationFilter, branchId: number) => {
  const res = await OccupationApiService.fetchOccupation(filter, branchId);
  return {
    success: res.success ?? false,
    data: res.occupations ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Define the async function for adding a Occupation.
const addOccupation = async (branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Add New Occupation",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Occupation Name Field -->
    <div class="swal2-input-group">
      <label for="Occupationname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Occupation Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Occupationname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Occupation Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus={true}
          required
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Occupation Name SL Field -->
    <div class="swal2-input-group">
      <label for="Occupationnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Occupation Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
      </label>
      <div class="relative">
        <input 
          id="Occupationnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Occupation Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Creating New Occupation</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Occupation.</p>
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
            <li>Occupation name should be descriptive and unique</li>
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
    confirmButtonText: "Add Occupation",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const OccupationnameInput = document.getElementById(
        "Occupationname"
      ) as HTMLInputElement;

      const Occupationname = OccupationnameInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Occupationname) {
        firstEmptyElement = OccupationnameInput;
      }
      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        Occupationname,
        Occupationnamesl: (
          document.getElementById("Occupationnamesl") as HTMLInputElement
        ).value.trim(),
      };
    },
  });

  if (formValues) {
    try {
      await OccupationApiService.add_new_Occupation(
        formValues.Occupationname,
        formValues.Occupationnamesl || "",
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "New Occupation has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add Occupation.", "error");
    }
  }
};

// Define the async function for modifying a Occupation.
const modifyOccupation = async (Occupation: Occupation, branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Modify Occupation",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Occupation Name Field -->
    <div class="swal2-input-group">
      <label for="Occupationname" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Occupation Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Occupationname" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Occupation.description}"
          placeholder="Enter Occupation Name" 
          pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
          required
          aria-required="true"
          autocomplete="off"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Occupation Name SL Field -->
    <div class="swal2-input-group">
      <label for="Occupationnamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Occupation Name SL
        
      </label>
      <div class="relative">
        <input 
          id="Occupationnamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${Occupation.descriptionSL || ""}"
          placeholder="Enter Occupation Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Editing Occupation Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Occupation details above. Fields marked with * are required.</p>
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
            <li>Occupation code changes may affect existing records</li>
            <li>Ensure Occupation Name and Occupation Code is unique in the system</li>
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
    confirmButtonText: "Update Occupation",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const OccupationnameInput = document.getElementById(
        "Occupationname"
      ) as HTMLInputElement;

      const Occupationname = OccupationnameInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!Occupationname) {
        firstEmptyElement = OccupationnameInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return {
        id: Occupation.occupationId,
        Occupationname,
        Occupationnamesl: (
          document.getElementById("Occupationnamesl") as HTMLInputElement
        ).value.trim(),
      };
    },
  });

  if (formValues) {
    try {
      await OccupationApiService.modify_Occupation(
        formValues.id,
        formValues.Occupationname,
        formValues.Occupationnamesl || "",
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "Occupation has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to update Occupation.", "error");
    }
  }
};

// Define the async function for deleting a Occupation.
const deleteOccupation = async (Occupation: Occupation, branchId: number) => {
  const result = await Swal.fire({
    title: "Delete Occupation",
    text: `Are you sure you want to delete "${Occupation.description}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await OccupationApiService.delete_Occupation(
        Occupation.occupationId,
        branchId
      );
      Swal.fire({
        title: "Deleted!",
        text: `Occupation "${Occupation.description}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete Occupation.", "error");
    }
  }
};

// --- OccupationMaster Component ---

const OccupationMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const fetchOccupationWithBranch = React.useCallback(
    async (filter: OccupationFilter) => {
      return await fetchOccupations(filter, user.branchid);
    },
    [user.branchid]
  );
  return (
    <CRUDMaster<Occupation>
      fetchData={fetchOccupationWithBranch}
      addEntry={() => addOccupation(user.branchid)}
      modifyEntry={(occupation) => modifyOccupation(occupation, user.branchid)}
      deleteEntry={(occupation) => deleteOccupation(occupation, user.branchid)}
      pageTitle="Occupation Operations"
      addLabel="Add Occupation"
      onClose={() => navigate("/Occupation")}
      searchPlaceholder="Search by name or code..."
      renderTable={(Occupations, handleModify, handleDelete) => (
        <OccupationTable
          Occupations={Occupations}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(Occupation) => Occupation.occupationId}
    />
  );
};

export default OccupationMaster;
