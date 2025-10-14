import React from "react";
import VillageApiService, {
  Village,
  VillageFilter,
} from "../../../services/location/village/villageapi";
import ZoneApiService from "../../../services/location/zone/zoneapi";
import ThanaApiService from "../../../services/location/thana/thanaapi";
import PostOfficeApiService from "../../../services/location/PostOffice/postOfficeapi";
import TehsilApiService from "../../../services/location/tehsil/tehsilapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import VillageTable from "./village-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";

// Fetch Villages function
const fetchVillages = async (filter: VillageFilter, branchId: number) => {
  try {
    const res = await VillageApiService.fetchVillages(filter, branchId);

    return {
      success: res.success ?? false,
      data: res.villages ?? [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error) {
    console.error("Error in fetchVillages:", error);

    return {
      success: false,
      data: [],
      totalCount: 0,
      message:
        "Unable to connect to server. Please check if the API is running.",
    };
  }
};

// Add Village function with Pincode
const addVillage = async (
  branchId: number,
  zones: any[],
  thanas: any[],
  postOffices: any[],
  tehsils: any[]
) => {
  const zoneOptions = zones
    .map(
      (zone) =>
        `<option value="${zone.zoneId || zone.id}">${
          zone.zoneName || zone.name
        }</option>`
    )
    .join("");
  const thanaOptions = thanas
    .map(
      (thana) =>
        `<option value="${thana.thanaId || thana.id}">${
          thana.thanaName || thana.name
        }</option>`
    )
    .join("");
  const postOfficeOptions = postOffices
    .map(
      (postOffice) =>
        `<option value="${postOffice.postOfficeId || postOffice.id}">${
          postOffice.postOfficeName || postOffice.name
        }</option>`
    )
    .join("");
  const tehsilOptions = tehsils
    .map(
      (tehsil) =>
        `<option value="${tehsil.tehsilId || tehsil.id}">${
          tehsil.tehsilName || tehsil.name
        }</option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Add New Village",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Village Name Field -->
    <div class="swal2-input-group">
      <label for="VillageName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Village Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="VillageName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Village Name" 
          aria-required="true"
          autocomplete="off"
          autoFocus="true"
          required
          maxlength="100"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Village Name SL Field -->
    <div class="swal2-input-group">
      <label for="VillageNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Village Name SL
      </label>
      <div class="relative">
        <input 
          id="VillageNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Village Name SL" 
          autocomplete="off"
          lang="hi"
          maxlength="100"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Zone Field -->
    <div class="swal2-input-group">
      <label for="ZoneId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
        Zone
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="ZoneId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Zone</option>
          ${zoneOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-yellow-200"></div>
      </div>
    </div>

    <!-- Thana Field -->
    <div class="swal2-input-group">
      <label for="ThanaId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
        Thana
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="ThanaId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Thana</option>
          ${thanaOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-pink-200"></div>
      </div>
    </div>

    <!-- Post Office Field -->
    <div class="swal2-input-group">
      <label for="PostOfficeId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-lime-500 rounded-full"></div>
        Post Office
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="PostOfficeId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Post Office</option>
          ${postOfficeOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-green-200"></div>
      </div>
    </div>

    <!-- Tehsil Field -->
    <div class="swal2-input-group">
      <label for="TehsilId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
        Tehsil
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="TehsilId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Tehsil</option>
          ${tehsilOptions}
        </select>
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-cyan-200"></div>
      </div>
    </div>

    <!-- Pincode Field - NEW -->
    <div class="swal2-input-group">
      <label for="Pincode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
        Pincode
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Pincode" 
          type="text"
          inputmode="numeric"
          pattern="\\d{6}"
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter 6-digit Pincode" 
          required
          maxlength="6"
          oninput="this.value = this.value.replace(/[^0-9]/g, '')"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-red-200"></div>
      </div>
      <p class="text-xs text-slate-500 mt-1">6-digit postal code (numbers only)</p>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">+</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Creating New Village</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Village.</p>
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
    confirmButtonText: "Add Village",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    preConfirm: () => {
      const VillageName = (
        document.getElementById("VillageName") as HTMLInputElement
      ).value.trim();
      const VillageNameSL = (
        document.getElementById("VillageNameSL") as HTMLInputElement
      ).value.trim();
      const ZoneId = (document.getElementById("ZoneId") as HTMLSelectElement)
        .value;
      const ThanaId = (document.getElementById("ThanaId") as HTMLSelectElement)
        .value;
      const PostOfficeId = (
        document.getElementById("PostOfficeId") as HTMLSelectElement
      ).value;
      const TehsilId = (
        document.getElementById("TehsilId") as HTMLSelectElement
      ).value;
      const Pincode = (
        document.getElementById("Pincode") as HTMLInputElement
      ).value.trim();

      if (!VillageName) {
        Swal.showValidationMessage("Village Name is required");
        (document.getElementById("VillageName") as HTMLInputElement).focus();
        return null;
      }
      if (!ZoneId) {
        Swal.showValidationMessage("Zone selection is required");
        (document.getElementById("ZoneId") as HTMLInputElement).focus();
        return null;
      }
      if (!ThanaId) {
        Swal.showValidationMessage("Thana selection is required");
        (document.getElementById("ThanaId") as HTMLInputElement).focus();
        return null;
      }
      if (!PostOfficeId) {
        Swal.showValidationMessage("Post Office selection is required");
        (document.getElementById("PostOfficeId") as HTMLInputElement).focus();
        return null;
      }
      if (!TehsilId) {
        Swal.showValidationMessage("Tehsil selection is required");
        (document.getElementById("TehsilId") as HTMLInputElement).focus();
        return null;
      }
      if (!Pincode || Pincode.length !== 6) {
        Swal.showValidationMessage("Pincode must be exactly 6 digits");
        (document.getElementById("Pincode") as HTMLInputElement).focus();
        return null;
      }

      return {
        VillageName,
        VillageNameSL,
        ZoneId,
        ThanaId,
        PostOfficeId,
        TehsilId,
        Pincode,
      };
    },
  });

  if (formValues) {
    try {
      await VillageApiService.add_new_village(
        formValues.VillageName,
        formValues.VillageNameSL || "",
        Number(formValues.ZoneId),
        Number(formValues.ThanaId),
        Number(formValues.PostOfficeId),
        Number(formValues.TehsilId),
        branchId,
        Number(formValues.Pincode)
      );

      Swal.fire({
        title: "Success!",
        text: "New Village has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error adding village:", err);
      Swal.fire("Error!", err.message || "Failed to add Village.", "error");
    }
  }
};

// Modify Village function with Pincode
const modifyVillage = async (
  village: Village,
  zones: any[],
  thanas: any[],
  postOffices: any[],
  tehsils: any[],
  branchId: number
) => {
  const zoneOptions = zones
    .map((zone) => {
      const zoneId = (zone.zoneId || zone.id)?.toString();
      const villageZoneId = village.zoneId?.toString();
      const isSelected = zoneId === villageZoneId;

      return `<option value="${zone.zoneId || zone.id}" ${
        isSelected ? "selected" : ""
      }>${zone.zoneName || zone.name}</option>`;
    })
    .join("");

  const thanaOptions = thanas
    .map((thana) => {
      const thanaId = (thana.thanaId || thana.id)?.toString();
      const villageThanaId = village.thanaId?.toString();
      const isSelected = thanaId === villageThanaId;

      return `<option value="${thana.thanaId || thana.id}" ${
        isSelected ? "selected" : ""
      }>${thana.thanaName || thana.name}</option>`;
    })
    .join("");

  const postOfficeOptions = postOffices
    .map((postOffice) => {
      const postOfficeId = (
        postOffice.postOfficeId || postOffice.id
      )?.toString();
      const villagePostOfficeId = village.postOfficeId?.toString();
      const isSelected = postOfficeId === villagePostOfficeId;

      return `<option value="${postOffice.postOfficeId || postOffice.id}" ${
        isSelected ? "selected" : ""
      }>${postOffice.postOfficeName || postOffice.name}</option>`;
    })
    .join("");

  const tehsilOptions = tehsils
    .map((tehsil) => {
      const tehsilId = (tehsil.tehsilId || tehsil.id)?.toString();
      const villageTehsilId = village.tehsilId?.toString();
      const isSelected = tehsilId === villageTehsilId;

      return `<option value="${tehsil.tehsilId || tehsil.id}" ${
        isSelected ? "selected" : ""
      }>${tehsil.tehsilName || tehsil.name}</option>`;
    })
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Modify Village",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Village Name Field -->
    <div class="swal2-input-group">
      <label for="VillageName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Village Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="VillageName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${village.villageName || ""}"
          placeholder="Enter Village Name" 
          required
          autoFocus="true"
          maxlength="100"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- Village Name SL Field -->
    <div class="swal2-input-group">
      <label for="VillageNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Village Name SL
      </label>
      <div class="relative">
        <input 
          id="VillageNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${village.villageNameSL || ""}"
          placeholder="Enter Village Name SL" 
          lang="hi"
          maxlength="100"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
      </div>
    </div>

    <!-- Zone Field -->
    <div class="swal2-input-group">
      <label for="ZoneId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
        Zone
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="ZoneId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Zone</option>
          ${zoneOptions}
        </select>
      </div>
    </div>

    <!-- Thana Field -->
    <div class="swal2-input-group">
      <label for="ThanaId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
        Thana
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="ThanaId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Thana</option>
          ${thanaOptions}
        </select>
      </div>
    </div>

    <!-- Post Office Field -->
    <div class="swal2-input-group">
      <label for="PostOfficeId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-lime-500 rounded-full"></div>
        Post Office
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="PostOfficeId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Post Office</option>
          ${postOfficeOptions}
        </select>
      </div>
    </div>

    <!-- Tehsil Field -->
    <div class="swal2-input-group">
      <label for="TehsilId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
        Tehsil
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <select 
          id="TehsilId" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
          required
        >
          <option value="">Select Tehsil</option>
          ${tehsilOptions}
        </select>
      </div>
    </div>

    <!-- Pincode Field - NEW -->
    <div class="swal2-input-group">
      <label for="Pincode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
        Pincode
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="Pincode" 
          type="text"
          inputmode="numeric"
          pattern="\\d{6}"
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${village.pinCode || ""}"
          placeholder="Enter 6-digit Pincode" 
          required
          maxlength="6"
          oninput="this.value = this.value.replace(/[^0-9]/g, '')"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-red-200"></div>
      </div>
      <p class="text-xs text-slate-500 mt-1">6-digit postal code (numbers only)</p>
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">✓</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Editing Village Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Village details above. Fields marked with * are required.</p>
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
    confirmButtonText: "Update Village",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    preConfirm: () => {
      const VillageName = (
        document.getElementById("VillageName") as HTMLInputElement
      ).value.trim();
      const VillageNameSL = (
        document.getElementById("VillageNameSL") as HTMLInputElement
      ).value.trim();
      const ZoneId = (document.getElementById("ZoneId") as HTMLSelectElement)
        .value;
      const ThanaId = (document.getElementById("ThanaId") as HTMLSelectElement)
        .value;
      const PostOfficeId = (
        document.getElementById("PostOfficeId") as HTMLSelectElement
      ).value;
      const TehsilId = (
        document.getElementById("TehsilId") as HTMLSelectElement
      ).value;
      const Pincode = (
        document.getElementById("Pincode") as HTMLInputElement
      ).value.trim();

      if (!VillageName) {
        Swal.showValidationMessage("Village Name is required");
        (document.getElementById("VillageName") as HTMLInputElement).focus();
        return null;
      }
      if (!ZoneId) {
        Swal.showValidationMessage("Zone selection is required");
        (document.getElementById("ZoneId") as HTMLInputElement).focus();
        return null;
      }
      if (!ThanaId) {
        Swal.showValidationMessage("Thana selection is required");
        (document.getElementById("ThanaId") as HTMLInputElement).focus();
        return null;
      }
      if (!PostOfficeId) {
        Swal.showValidationMessage("Post Office selection is required");
        (document.getElementById("PostOfficeId") as HTMLInputElement).focus();
        return null;
      }
      if (!TehsilId) {
        Swal.showValidationMessage("Tehsil selection is required");
        (document.getElementById("TehsilId") as HTMLInputElement).focus();
        return null;
      }
      if (!Pincode || Pincode.length !== 6) {
        Swal.showValidationMessage("Pincode must be exactly 6 digits");
        (document.getElementById("Pincode") as HTMLInputElement).focus();
        return null;
      }

      return {
        id: village.villageId,
        VillageName,
        VillageNameSL,
        ZoneId,
        ThanaId,
        PostOfficeId,
        TehsilId,
        Pincode,
      };
    },
  });

  if (formValues) {
    try {
      await VillageApiService.modifyVillage(
        formValues.id,
        formValues.VillageName,
        formValues.VillageNameSL || "",
        Number(formValues.ZoneId),
        Number(formValues.ThanaId),
        Number(formValues.PostOfficeId),
        Number(formValues.TehsilId),
        branchId,
        Number(formValues.Pincode)
      );

      Swal.fire({
        title: "Success!",
        text: "Village has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error updating village:", err);
      Swal.fire("Error!", err.message || "Failed to update Village.", "error");
    }
  }
};

// Delete Village function (unchanged)
const deleteVillage = async (village: Village, branchId: number) => {
  const result = await Swal.fire({
    title: "Delete Village",
    text: `Are you sure you want to delete "${village.villageName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await VillageApiService.deleteVillage(
        village.villageId,
        village.villageName,
        village.villageCode || "AUTO",
        village.villageNameSL || "",
        branchId
      );

      Swal.fire({
        title: "Deleted!",
        text: `Village "${village.villageName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Error deleting village:", err);
      Swal.fire("Error!", err.message || "Failed to delete Village.", "error");
    }
  }
};

// VillageMaster Component
const VillageMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [zones, setZones] = React.useState<any[]>([]);
  const [thanas, setThanas] = React.useState<any[]>([]);
  const [postOffices, setPostOffices] = React.useState<any[]>([]);
  const [tehsils, setTehsils] = React.useState<any[]>([]);

  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    let isCancelled = false;

    const fetchLocationData = async () => {
      loadingRef.current = true;

      try {
        const [zonesRes, thanasRes, postOfficesRes, tehsilsRes] =
          await Promise.all([
            ZoneApiService.getAllZones(user.branchid),
            ThanaApiService.getAllThanas(user.branchid),
            PostOfficeApiService.getAllPostOffices(user.branchid),
            TehsilApiService.getAllTehsils(user.branchid),
          ]);
        console.log("data", zonesRes, thanasRes, postOfficesRes, tehsilsRes);

        if (!isCancelled) {
          if (zonesRes.success) setZones(zonesRes.data || []);
          if (thanasRes.success) setThanas(thanasRes.data || []);
          if (postOfficesRes.success) setPostOffices(postOfficesRes.data || []);
          if (tehsilsRes.success) setTehsils(tehsilsRes.data || []);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error fetching location data:", error);
        }
      } finally {
        loadingRef.current = false;
      }
    };

    fetchLocationData();

    return () => {
      isCancelled = true;
    };
  }, [user.branchid]);

  const fetchVillagesWithBranch = React.useCallback(
    async (filter: VillageFilter) => {
      return await fetchVillages(filter, user.branchid);
    },
    [user.branchid]
  );

  console.log(zones, thanas, postOffices, tehsils);
  
  return (
    <CRUDMaster<Village>
      fetchData={fetchVillagesWithBranch}
      addEntry={() =>
        addVillage(user.branchid, zones, thanas, postOffices, tehsils)
      }
      modifyEntry={(village) =>
        modifyVillage(
          village,
          zones,
          thanas,
          postOffices,
          tehsils,
          user.branchid
        )
      }
      deleteEntry={(village) => deleteVillage(village, user.branchid)}
      pageTitle="Village Operations"
      addLabel="Add Village"
      onClose={() => navigate("/Village")}
      searchPlaceholder="Search by name or code..."
      renderTable={(villages, handleModify, handleDelete) => (
        <VillageTable
          Villages={villages}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(village) => village.villageId}
    />
  );
};

export default VillageMaster;
