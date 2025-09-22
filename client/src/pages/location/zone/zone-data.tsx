import React from "react";
import ZoneApiService, {
  Zone,
  ZoneFilter,
} from "../../../services/location/zone/zoneapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import ZoneTable from "./zone-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
// Define the async function to fetch zones and ensure the return type is correct.
const fetchZones = async (filter: ZoneFilter, branchId: number) => {
  const res = await ZoneApiService.fetchZones(filter, branchId);

  return {
    success: res.success ?? false,
    data: res.zones ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Define the async function for adding a zone.
const addZone = async (branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Add New Zone",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Zone Name Field -->
    <div class="swal2-input-group">
      <label for="zonename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Zone Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="zonename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Zone Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus= "true"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Zone Code Field -->
    <div class="swal2-input-group">
      <label for="zonecode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Zone Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="zonecode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 font-mono" 
          placeholder="Enter Zone Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          "
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Zone Name SL Field -->
    <div class="swal2-input-group">
      <label for="zonenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Zone Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="zonenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Zone Name SL" 
          aria-required="true"
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
          <p class="text-sm font-semibold text-slate-700">Creating New Zone</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new zone.</p>
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
            <li>Zone name should be descriptive and unique</li>
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
    confirmButtonText: "Add Zone",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const zonenameInput = document.getElementById(
        "zonename"
      ) as HTMLInputElement;
      const zonenameslInput = document.getElementById(
        "zonenamesl"
      ) as HTMLInputElement;
      const zonecodeInput = document.getElementById(
        "zonecode"
      ) as HTMLInputElement;

      const zonename = zonenameInput.value.trim();
      const zonenamesl = zonenameslInput.value.trim();
      const zonecode = zonecodeInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!zonename) {
        firstEmptyElement = zonenameInput;
      } else if (!zonecode) {
        firstEmptyElement = zonecodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }
      return { zonename, zonecode, zonenamesl };
    },
  });

  if (formValues) {
    try {
      await ZoneApiService.add_new_zone(
        formValues.zonename,
        formValues.zonecode,
        formValues.zonenamesl,
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "New zone has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add zone.", "error");
    }
  }
};

// Define the async function for modifying a zone.
const modifyZone = async (zone: Zone, branchId: number) => {
  const { value: formValues } = await Swal.fire({
    title: "Modify Zone",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Zone Name Field -->
    <div class="swal2-input-group">
      <label for="zonename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Zone Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="zonename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${zone.zoneName}"
          placeholder="Enter Zone Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus= "true"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Zone Code Field -->
    <div class="swal2-input-group">
      <label for="zonecode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Zone Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="zonecode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 uppercase font-mono" 
          value="${zone.zoneCode || ""}"
          placeholder="Enter Zone Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          style="text-transform: uppercase;"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- Zone Name SL Field -->
    <div class="swal2-input-group">
      <label for="zonenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Zone Name SL
        
      </label>
      <div class="relative">
        <input 
          id="zonenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${zone.zoneNameSL || ""}"
          placeholder="Enter Zone Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Editing Zone Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the zone details above. Fields marked with * are required.</p>
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
            <li>Zone code changes may affect existing records</li>
            <li>Ensure Zone Name and Zone Code is unique in the system</li>
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
    confirmButtonText: "Update Zone",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const zonenameInput = document.getElementById(
        "zonename"
      ) as HTMLInputElement;
      const zonecodeInput = document.getElementById(
        "zonecode"
      ) as HTMLInputElement;
      const zonenameslInput = document.getElementById(
        "zonenamesl"
      ) as HTMLInputElement;

      const zonename = zonenameInput.value.trim();
      const zonenamesl = zonenameslInput.value.trim();
      const zonecode = zonecodeInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!zonename) {
        firstEmptyElement = zonenameInput;
      } else if (!zonecode) {
        firstEmptyElement = zonecodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }
      return { id: zone.zoneId, zonename, zonecode, zonenamesl };
    },
  });

  if (formValues) {
    try {
      await ZoneApiService.modify_zone(
        formValues.id,
        formValues.zonename,
        formValues.zonecode,
        formValues.zonenamesl,
        branchId
      );
      Swal.fire({
        title: "Success!",
        text: "Zone has been updated successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to update zone.", "error");
    }
  }
};

// Define the async function for deleting a zone.
const deleteZone = async (zone: Zone, branchId: number) => {
  const result = await Swal.fire({
    title: "Delete Zone",
    text: `Are you sure you want to delete "${zone.zoneName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await ZoneApiService.delete_zone(
        zone.zoneId,
        zone.zoneName,
        zone.zoneCode,
        zone.zoneNameSL,
        branchId
      );
      Swal.fire({
        title: "Deleted!",
        text: `Zone "${zone.zoneName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete zone.", "error");
    }
  }
};

// --- ZoneMaster Component ---

const ZoneMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const fetchZonesWithBranch = React.useCallback(
    async (filter: ZoneFilter) => {
      return await fetchZones(filter, user.branchid);
    },
    [user.branchid]
  );
  return (
    <CRUDMaster<Zone>
      fetchData={fetchZonesWithBranch}
      addEntry={() => addZone(user.branchid)}
      modifyEntry={(zones) => modifyZone(zones, user.branchid)}
      deleteEntry={(zones) => deleteZone(zones, user.branchid)}
      pageTitle="Zone Operations"
      addLabel="Add Zone"
      searchPlaceholder="Search by name or code..."
      onClose={() => navigate("/zone")}
      renderTable={(zones, handleModify, handleDelete) => (
        <ZoneTable
          zones={zones}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(zone) => zone.zoneId}
    />
  );
};

export default ZoneMaster;
