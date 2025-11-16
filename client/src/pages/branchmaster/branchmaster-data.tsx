import React from "react";
import BranchApiService, {
  Branch,
  BranchFilter,
  BranchDTO,
} from "../../services/branch/branchapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../components/Location/CRUDOperations";
import BranchTable from "./branchmaster-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import TehsilApiService from "../../services/location/tehsil/tehsilapi";
import commonservice from "../../services/common/commonservice";

// Define types for dropdown data
interface TehsilInfo {
  tehsilId: number;
  tehsilName: string;
}

interface Village {
  villageId: number;
  villageName: string;
}

interface State {
  stateId: number;
  stateName: string;
}

// Define the async function to fetch branches
const fetchBranches = async (filter: BranchFilter, societyId: number) => {
  const res = await BranchApiService.fetchBranches(filter, societyId);

  return {
    success: res.success ?? false,
    data: res.branches ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Helper function to load dropdown data
const loadDropdownData = async (branchId: number) => {
  try {
    const [villagesRes, tehsilsRes, statesRes] = await Promise.all([
      commonservice.village_info(branchId),
      TehsilApiService.getAllTehsils(branchId),
      commonservice.get_states(),
    ]);

    const villages: Village[] = villagesRes.data || [];
    const tehsils: TehsilInfo[] = tehsilsRes.data || [];
    const states: State[] = statesRes.data || [];

    return { villages, tehsils, states };
  } catch (err: any) {
    console.error("Error loading dropdown data:", err);
    Swal.fire("Error", err.message || "Could not load dropdown data", "error");
    return { villages: [], tehsils: [], states: [] };
  }
};

// Helper function to generate dropdown options HTML
const generateDropdownOptions = (
  items: any[],
  valueKey: string,
  labelKey: string,
  selectedValue?: number
) => {
  return items
    .map(
      (item) =>
        `<option value="${item[valueKey]}" ${
          selectedValue === item[valueKey] ? "selected" : ""
        }>${item[labelKey]}</option>`
    )
    .join("");
};

// Define the async function for adding a branch
const addBranch = async (societyId: number, branchId: number) => {
  // Show loading message while fetching dropdown data
  Swal.fire({
    title: "Loading...",
    text: "Fetching dropdown data",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Load dropdown data first
  const { villages, tehsils, states } = await loadDropdownData(branchId);

  // Close loading message
  Swal.close();

  const villageOptions = generateDropdownOptions(
    villages,
    "villageId",
    "villageName"
  );
  const tehsilOptions = generateDropdownOptions(
    tehsils,
    "tehsilId",
    "tehsilName"
  );
  const stateOptions = generateDropdownOptions(states, "stateId", "stateName");

  const { value: formValues } = await Swal.fire({
    title: "Add New Branch",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Basic Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Basic Information</h4>
    </div>

    <!-- Branch Code Field -->
    <div class="swal2-input-group">
      <label for="branchCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Branch Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="branchCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 uppercase font-mono" 
          placeholder="Enter Branch Code" 
          aria-required="true"
          autocomplete="off"
          autoFocus="true"
          maxlength="20"
          style="text-transform: uppercase;"
        >
      </div>
    </div>

    <!-- Branch Name Field -->
    <div class="swal2-input-group">
      <label for="branchName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Branch Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="branchName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Branch Name" 
          aria-required="true"
          autocomplete="off"
          maxlength="200"
        >
      </div>
    </div>

    <!-- Branch Name SL Field -->
    <div class="swal2-input-group">
      <label for="branchNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Branch Name (SL)
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <div class="relative">
        <input 
          id="branchNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Branch Name SL" 
          autocomplete="off"
          maxlength="250"
        >
      </div>
    </div>

    <!-- Email ID Field -->
    <div class="swal2-input-group">
      <label for="emailId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
        Email ID
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="emailId" 
        type="email"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="branch@example.com" 
        aria-required="true"
        maxlength="50"
      >
    </div>

    <!-- Is Main Branch Field -->
    <div class="swal2-input-group">
      <label for="isMainBranch" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
        Main Branch
      </label>
      <select 
        id="isMainBranch" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    </div>

    <!-- Sequence No Field -->
    <div class="swal2-input-group">
      <label for="sequenceNo" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></div>
        Sequence No
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="sequenceNo" 
        type="number"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter sequence number" 
        autocomplete="off"
      >
    </div>

    <!-- Address Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Address Information</h4>
    </div>

    <!-- Address Line Field -->
    <div class="swal2-input-group">
      <label for="addressLine" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Address Line
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="addressLine" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter Complete Address" 
        aria-required="true"
        autocomplete="off"
        maxlength="200"
      >
    </div>

    <!-- Address Line SL Field -->
    <div class="swal2-input-group">
      <label for="addressLineSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Address (SL)
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="addressLineSL" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter Address SL" 
        autocomplete="off"
        maxlength="250"
      >
    </div>

    <!-- Address Type Field -->
    <div class="swal2-input-group">
      <label for="addressType" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
        Address Type
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <select 
        id="addressType" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Address Type</option>
        <option value="1">Permanent Address</option>
        <option value="2">Current Address</option>
        <option value="3">Correspondence Address</option>
        <option value="4">Office Address</option>
        <option value="5">Temporary Address</option>
        <option value="6">Billing Address</option>
      </select>
    </div>

    <!-- Pincode Field -->
    <div class="swal2-input-group">
      <label for="pincode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
        Pincode
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="pincode" 
        type="text"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter Pincode" 
        aria-required="true"
        pattern="[0-9]{6}"
        maxlength="6"
      >
    </div>

    <!-- State Dropdown -->
    <div class="swal2-input-group">
      <label for="stateId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
        State
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="stateId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select State</option>
        ${stateOptions}
      </select>
    </div>

    <!-- Village/Station Dropdown -->
    <div class="swal2-input-group">
      <label for="stationId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"></div>
        Village/Station
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="stationId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lime-500 focus:ring-2 focus:ring-lime-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Village</option>
        ${villageOptions}
      </select>
    </div>

    <!-- Tehsil Dropdown -->
    <div class="swal2-input-group">
      <label for="tehsilId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></div>
        Tehsil
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="tehsilId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Tehsil</option>
        ${tehsilOptions}
      </select>
    </div>

    <!-- Contact Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Contact Information</h4>
    </div>

    <!-- Phone Prefix 1 Field -->
    <div class="swal2-input-group">
      <label for="phonePrefix1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Prefix 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="phonePrefix1" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="+91" 
        value="+91"
        aria-required="true"
        maxlength="5"
      >
    </div>

    <!-- Phone Number 1 Field -->
    <div class="swal2-input-group">
      <label for="phoneNo1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Number 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="phoneNo1" 
        type="tel"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter Phone Number" 
        aria-required="true"
        pattern="[0-9]{10}"
        maxlength="20"
      >
    </div>

    <!-- Phone Type 1 Field -->
    <div class="swal2-input-group">
      <label for="phoneType1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Type 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="phoneType1" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Phone Type</option>
        <option value="1">Mobile</option>
        <option value="2">Home</option>
        <option value="3">Office</option>
        <option value="4">Landline</option>
      </select>
    </div>

    <!-- Phone Prefix 2 Field -->
    <div class="swal2-input-group">
      <label for="phonePrefix2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Prefix 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="phonePrefix2" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="+91" 
        value="+91"
        maxlength="5"
      >
    </div>

    <!-- Phone Number 2 Field -->
    <div class="swal2-input-group">
      <label for="phoneNo2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Number 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="phoneNo2" 
        type="tel"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        placeholder="Enter Phone Number" 
        pattern="[0-9]{10}"
        maxlength="20"
      >
    </div>

    <!-- Phone Type 2 Field -->
    <div class="swal2-input-group">
      <label for="phoneType2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Type 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <select 
        id="phoneType2" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Phone Type</option>
        <option value="1">Mobile</option>
        <option value="2">Home</option>
        <option value="3">Office</option>
        <option value="4">Landline</option>
      </select>
    </div>

    <!-- GST Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">GST Information</h4>
    </div>

    <!-- GSTIN Number Field -->
    <div class="swal2-input-group">
      <label for="gstinNo" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        GSTIN Number
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="gstinNo" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 uppercase font-mono" 
        placeholder="22AAAAA0000A1Z5" 
        aria-required="true"
        maxlength="25"
        style="text-transform: uppercase;"
      >
    </div>

    <!-- GST Issue Date Field -->
    <div class="swal2-input-group">
      <label for="gstNoIssueDate" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        GST Issue Date
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="gstNoIssueDate" 
        type="date"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50" 
        aria-required="true"
      >
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">+</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Creating New Branch</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new branch.</p>
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
            <li>Branch code and name should be unique</li>
            <li>Fields marked with * are required for successful creation</li>
            <li>GSTIN format: 22AAAAA0000A1Z5</li>
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
    .swal2-input-group input:focus,
    .swal2-input-group select:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover,
    .swal2-input-group select:hover {
      border-color: rgb(148, 163, 184) !important;
      transform: translateY(-1px);
    }
    .swal2-popup {
      padding: 2rem !important;
      max-width: 600px !important;
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
    confirmButtonText: "Add Branch",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: "700px",
    preConfirm: () => {
      const branchCodeInput = document.getElementById("branchCode") as HTMLInputElement;
      const branchNameInput = document.getElementById("branchName") as HTMLInputElement;
      const branchNameSLInput = document.getElementById("branchNameSL") as HTMLInputElement;
      const addressLineInput = document.getElementById("addressLine") as HTMLInputElement;
      const addressLineSLInput = document.getElementById("addressLineSL") as HTMLInputElement;
      const addressTypeInput = document.getElementById("addressType") as HTMLSelectElement;
      const pincodeInput = document.getElementById("pincode") as HTMLInputElement;
      const stateIdInput = document.getElementById("stateId") as HTMLSelectElement;
      const stationIdInput = document.getElementById("stationId") as HTMLSelectElement;
      const tehsilIdInput = document.getElementById("tehsilId") as HTMLSelectElement;
      const emailIdInput = document.getElementById("emailId") as HTMLInputElement;
      const phonePrefix1Input = document.getElementById("phonePrefix1") as HTMLInputElement;
      const phoneNo1Input = document.getElementById("phoneNo1") as HTMLInputElement;
      const phoneType1Input = document.getElementById("phoneType1") as HTMLSelectElement;
      const phonePrefix2Input = document.getElementById("phonePrefix2") as HTMLInputElement;
      const phoneNo2Input = document.getElementById("phoneNo2") as HTMLInputElement;
      const phoneType2Input = document.getElementById("phoneType2") as HTMLSelectElement;
      const gstinNoInput = document.getElementById("gstinNo") as HTMLInputElement;
      const gstNoIssueDateInput = document.getElementById("gstNoIssueDate") as HTMLInputElement;
      const isMainBranchInput = document.getElementById("isMainBranch") as HTMLSelectElement;
      const sequenceNoInput = document.getElementById("sequenceNo") as HTMLInputElement;

      const branchCode = branchCodeInput.value.trim();
      const branchName = branchNameInput.value.trim();
      const branchNameSL = branchNameSLInput.value.trim();
      const addressLine = addressLineInput.value.trim();
      const addressLineSL = addressLineSLInput.value.trim();
      const addressType = addressTypeInput.value;
      const pincode = pincodeInput.value.trim();
      const stateId = stateIdInput.value;
      const stationId = stationIdInput.value;
      const tehsilId = tehsilIdInput.value;
      const emailId = emailIdInput.value.trim();
      const phonePrefix1 = phonePrefix1Input.value.trim();
      const phoneNo1 = phoneNo1Input.value.trim();
      const phoneType1 = phoneType1Input.value;
      const phonePrefix2 = phonePrefix2Input.value.trim();
      const phoneNo2 = phoneNo2Input.value.trim();
      const phoneType2 = phoneType2Input.value;
      const gstinNo = gstinNoInput.value.trim();
      const gstNoIssueDate = gstNoIssueDateInput.value.trim();
      const isMainBranch = isMainBranchInput.value === "true";
      const sequenceNo = sequenceNoInput.value.trim();

      let firstEmptyElement: HTMLInputElement | HTMLSelectElement | null = null;

      if (!branchCode) {
        firstEmptyElement = branchCodeInput;
      } else if (!branchName) {
        firstEmptyElement = branchNameInput;
      } else if (!addressLine) {
        firstEmptyElement = addressLineInput;
      } else if (!pincode) {
        firstEmptyElement = pincodeInput;
      } else if (!stateId) {
        firstEmptyElement = stateIdInput;
      } else if (!stationId) {
        firstEmptyElement = stationIdInput;
      } else if (!tehsilId) {
        firstEmptyElement = tehsilIdInput;
      } else if (!emailId) {
        firstEmptyElement = emailIdInput;
      } else if (!phonePrefix1) {
        firstEmptyElement = phonePrefix1Input;
      } else if (!phoneNo1) {
        firstEmptyElement = phoneNo1Input;
      } else if (!phoneType1) {
        firstEmptyElement = phoneType1Input;
      } else if (!gstinNo) {
        firstEmptyElement = gstinNoInput;
      } else if (!gstNoIssueDate) {
        firstEmptyElement = gstNoIssueDateInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }

      return {
        branchCode,
        branchName,
        branchNameSL,
        addressLine,
        addressLineSL,
        addressType,
        pincode,
        stateId,
        stationId,
        tehsilId,
        emailId,
        phonePrefix1,
        phoneNo1,
        phoneType1,
        phonePrefix2,
        phoneNo2,
        phoneType2,
        gstinNo,
        gstNoIssueDate,
        isMainBranch,
        sequenceNo,
      };
    },
  });

  if (formValues) {
    try {
      const branchDto: BranchDTO = {
        id: 0,
        societyId: societyId,
        code: formValues.branchCode,
        name: formValues.branchName,
        nameSL: formValues.branchNameSL || undefined,
        addressLine: formValues.addressLine,
        addressLineSL: formValues.addressLineSL || undefined,
        addressType: formValues.addressType ? parseInt(formValues.addressType) : undefined,
        stationId: parseInt(formValues.stationId),
        phonePrefix1: formValues.phonePrefix1,
        phoneNo1: formValues.phoneNo1,
        phoneType1: parseInt(formValues.phoneType1),
        phonePrefix2: formValues.phonePrefix2 || undefined,
        phoneNo2: formValues.phoneNo2 || undefined,
        phoneType2: formValues.phoneType2 ? parseInt(formValues.phoneType2) : undefined,
        isMainBranch: formValues.isMainBranch,
        sequenceNo: formValues.sequenceNo ? parseInt(formValues.sequenceNo) : undefined,
        emailId: formValues.emailId,
        pincode: formValues.pincode,
        tehsilId: parseInt(formValues.tehsilId),
        gstinNo: formValues.gstinNo,
        gstNoIssueDate: formValues.gstNoIssueDate,
        stateId: parseInt(formValues.stateId),
      };

      await BranchApiService.add_new_branch(branchDto);
      Swal.fire({
        title: "Success!",
        text: "New branch has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add branch.", "error");
    }
  }
};


// Define the async function for modifying a branch
const modifyBranch = async (branch: Branch, societyId: number, branchId: number) => {
  // Show loading message while fetching dropdown data
  Swal.fire({
    title: "Loading...",
    text: "Fetching dropdown data",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Load dropdown data first
  const { villages, tehsils, states } = await loadDropdownData(branchId);

  // Close loading message
  Swal.close();

  const villageOptions = generateDropdownOptions(
    villages,
    "villageId",
    "villageName",
    branch.stationId
  );
  const tehsilOptions = generateDropdownOptions(
    tehsils,
    "tehsilId",
    "tehsilName",
    branch.tehsilId
  );
  const stateOptions = generateDropdownOptions(
    states,
    "stateId",
    "stateName",
    branch.stateId
  );

  const { value: formValues } = await Swal.fire({
    title: "Modify Branch",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- Basic Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Basic Information</h4>
    </div>

    <!-- Branch Code Field -->
    <div class="swal2-input-group">
      <label for="branchCode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Branch Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="branchCode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 uppercase font-mono" 
          value="${branch.code}"
          placeholder="Enter Branch Code" 
          aria-required="true"
          autocomplete="off"
          autoFocus="true"
          maxlength="20"
          style="text-transform: uppercase;"
        >
      </div>
    </div>

    <!-- Branch Name Field -->
    <div class="swal2-input-group">
      <label for="branchName" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Branch Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="branchName" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${branch.name}"
          placeholder="Enter Branch Name" 
          aria-required="true"
          autocomplete="off"
          maxlength="200"
        >
      </div>
    </div>

    <!-- Branch Name SL Field -->
    <div class="swal2-input-group">
      <label for="branchNameSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Branch Name (SL)
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <div class="relative">
        <input 
          id="branchNameSL" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${branch.nameSL || ""}"
          placeholder="Enter Branch Name SL" 
          autocomplete="off"
          maxlength="250"
        >
      </div>
    </div>

    <!-- Email ID Field -->
    <div class="swal2-input-group">
      <label for="emailId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
        Email ID
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="emailId" 
        type="email"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.emailId}"
        placeholder="branch@example.com" 
        aria-required="true"
        maxlength="50"
      >
    </div>

    <!-- Is Main Branch Field -->
    <div class="swal2-input-group">
      <label for="isMainBranch" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
        Main Branch
      </label>
      <select 
        id="isMainBranch" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="true" ${branch.isMainBranch ? 'selected' : ''}>Yes</option>
        <option value="false" ${!branch.isMainBranch ? 'selected' : ''}>No</option>
      </select>
    </div>

    <!-- Sequence No Field -->
    <div class="swal2-input-group">
      <label for="sequenceNo" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></div>
        Sequence No
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="sequenceNo" 
        type="number"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.sequenceNo || ""}"
        placeholder="Enter sequence number" 
        autocomplete="off"
      >
    </div>

    <!-- Address Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Address Information</h4>
    </div>

    <!-- Address Line Field -->
    <div class="swal2-input-group">
      <label for="addressLine" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Address Line
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="addressLine" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.addressLine}"
        placeholder="Enter Complete Address" 
        aria-required="true"
        autocomplete="off"
        maxlength="200"
      >
    </div>

    <!-- Address Line SL Field -->
    <div class="swal2-input-group">
      <label for="addressLineSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Address (SL)
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="addressLineSL" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.addressLineSL || ""}"
        placeholder="Enter Address SL" 
        autocomplete="off"
        maxlength="250"
      >
    </div>

    <!-- Address Type Field -->
    <div class="swal2-input-group">
      <label for="addressType" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
        Address Type
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <select 
        id="addressType" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Address Type</option>
        <option value="1" ${branch.addressType === 1 ? 'selected' : ''}>Permanent Address</option>
        <option value="2" ${branch.addressType === 2 ? 'selected' : ''}>Current Address</option>
        <option value="3" ${branch.addressType === 3 ? 'selected' : ''}>Correspondence Address</option>
        <option value="4" ${branch.addressType === 4 ? 'selected' : ''}>Office Address</option>
        <option value="5" ${branch.addressType === 5 ? 'selected' : ''}>Temporary Address</option>
        <option value="6" ${branch.addressType === 6 ? 'selected' : ''}>Billing Address</option>
      </select>
    </div>

    <!-- Pincode Field -->
    <div class="swal2-input-group">
      <label for="pincode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
        Pincode
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="pincode" 
        type="text"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.pincode}"
        placeholder="Enter Pincode" 
        aria-required="true"
        pattern="[0-9]{6}"
        maxlength="6"
      >
    </div>

    <!-- State Dropdown -->
    <div class="swal2-input-group">
      <label for="stateId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
        State
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="stateId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select State</option>
        ${stateOptions}
      </select>
    </div>

    <!-- Village/Station Dropdown -->
    <div class="swal2-input-group">
      <label for="stationId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"></div>
        Village/Station
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="stationId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lime-500 focus:ring-2 focus:ring-lime-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Village</option>
        ${villageOptions}
      </select>
    </div>

    <!-- Tehsil Dropdown -->
    <div class="swal2-input-group">
      <label for="tehsilId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></div>
        Tehsil
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="tehsilId" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Tehsil</option>
        ${tehsilOptions}
      </select>
    </div>

    <!-- Contact Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">Contact Information</h4>
    </div>

    <!-- Phone Prefix 1 Field -->
    <div class="swal2-input-group">
      <label for="phonePrefix1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Prefix 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="phonePrefix1" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.phonePrefix1}"
        placeholder="+91" 
        aria-required="true"
        maxlength="5"
      >
    </div>

    <!-- Phone Number 1 Field -->
    <div class="swal2-input-group">
      <label for="phoneNo1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Number 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="phoneNo1" 
        type="tel"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.phoneNo1}"
        placeholder="Enter Phone Number" 
        aria-required="true"
        pattern="[0-9]{10}"
        maxlength="20"
      >
    </div>

    <!-- Phone Type 1 Field -->
    <div class="swal2-input-group">
      <label for="phoneType1" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
        Phone Type 1
        <span class="text-red-500 text-xs">*</span>
      </label>
      <select 
        id="phoneType1" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Phone Type</option>
        <option value="1" ${branch.phoneType1 === 1 ? 'selected' : ''}>Mobile</option>
        <option value="2" ${branch.phoneType1 === 2 ? 'selected' : ''}>Home</option>
        <option value="3" ${branch.phoneType1 === 3 ? 'selected' : ''}>Office</option>
        <option value="4" ${branch.phoneType1 === 4 ? 'selected' : ''}>Landline</option>
      </select>
    </div>

    <!-- Phone Prefix 2 Field -->
    <div class="swal2-input-group">
      <label for="phonePrefix2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Prefix 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="phonePrefix2" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.phonePrefix2 || ""}"
        placeholder="+91" 
        maxlength="5"
      >
    </div>

    <!-- Phone Number 2 Field -->
    <div class="swal2-input-group">
      <label for="phoneNo2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Number 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <input 
        id="phoneNo2" 
        type="tel"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.phoneNo2 || ""}"
        placeholder="Enter Phone Number" 
        pattern="[0-9]{10}"
        maxlength="20"
      >
    </div>

    <!-- Phone Type 2 Field -->
    <div class="swal2-input-group">
      <label for="phoneType2" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
        Phone Type 2
        <span class="text-emerald-600 text-xs font-medium">(Optional)</span>
      </label>
      <select 
        id="phoneType2" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
      >
        <option value="">Select Phone Type</option>
        <option value="1" ${branch.phoneType2 === 1 ? 'selected' : ''}>Mobile</option>
        <option value="2" ${branch.phoneType2 === 2 ? 'selected' : ''}>Home</option>
        <option value="3" ${branch.phoneType2 === 3 ? 'selected' : ''}>Office</option>
        <option value="4" ${branch.phoneType2 === 4 ? 'selected' : ''}>Landline</option>
      </select>
    </div>

    <!-- GST Information Section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 mt-6">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">GST Information</h4>
    </div>

    <!-- GSTIN Number Field -->
    <div class="swal2-input-group">
      <label for="gstinNo" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        GSTIN Number
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="gstinNo" 
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 uppercase font-mono" 
        value="${branch.gstinNo}"
        placeholder="22AAAAA0000A1Z5" 
        aria-required="true"
        maxlength="25"
        style="text-transform: uppercase;"
      >
    </div>

    <!-- GST Issue Date Field -->
    <div class="swal2-input-group">
      <label for="gstNoIssueDate" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
        GST Issue Date
        <span class="text-red-500 text-xs">*</span>
      </label>
      <input 
        id="gstNoIssueDate" 
        type="date"
        class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50" 
        value="${branch.gstNoIssueDate.split('T')[0]}"
        aria-required="true"
      >
    </div>

    <!-- Status Indicator -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">✓</span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-700">Editing Branch Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the branch details above. Fields marked with * are required.</p>
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
            <li>Branch code changes may affect existing records</li>
            <li>Ensure Branch Name and Branch Code is unique in the system</li>
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
    .swal2-input-group input:focus,
    .swal2-input-group select:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    .swal2-input-group input:hover,
    .swal2-input-group select:hover {
      border-color: rgb(148, 163, 184) !important;
      transform: translateY(-1px);
    }
    .swal2-popup {
      padding: 2rem !important;
      max-width: 600px !important;
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
    confirmButtonText: "Update Branch",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: "700px",
    preConfirm: () => {
      const branchCodeInput = document.getElementById("branchCode") as HTMLInputElement;
      const branchNameInput = document.getElementById("branchName") as HTMLInputElement;
      const branchNameSLInput = document.getElementById("branchNameSL") as HTMLInputElement;
      const addressLineInput = document.getElementById("addressLine") as HTMLInputElement;
      const addressLineSLInput = document.getElementById("addressLineSL") as HTMLInputElement;
      const addressTypeInput = document.getElementById("addressType") as HTMLSelectElement;
      const pincodeInput = document.getElementById("pincode") as HTMLInputElement;
      const stateIdInput = document.getElementById("stateId") as HTMLSelectElement;
      const stationIdInput = document.getElementById("stationId") as HTMLSelectElement;
      const tehsilIdInput = document.getElementById("tehsilId") as HTMLSelectElement;
      const emailIdInput = document.getElementById("emailId") as HTMLInputElement;
      const phonePrefix1Input = document.getElementById("phonePrefix1") as HTMLInputElement;
      const phoneNo1Input = document.getElementById("phoneNo1") as HTMLInputElement;
      const phoneType1Input = document.getElementById("phoneType1") as HTMLSelectElement;
      const phonePrefix2Input = document.getElementById("phonePrefix2") as HTMLInputElement;
      const phoneNo2Input = document.getElementById("phoneNo2") as HTMLInputElement;
      const phoneType2Input = document.getElementById("phoneType2") as HTMLSelectElement;
      const gstinNoInput = document.getElementById("gstinNo") as HTMLInputElement;
      const gstNoIssueDateInput = document.getElementById("gstNoIssueDate") as HTMLInputElement;
      const isMainBranchInput = document.getElementById("isMainBranch") as HTMLSelectElement;
      const sequenceNoInput = document.getElementById("sequenceNo") as HTMLInputElement;

      const branchCode = branchCodeInput.value.trim();
      const branchName = branchNameInput.value.trim();
      const branchNameSL = branchNameSLInput.value.trim();
      const addressLine = addressLineInput.value.trim();
      const addressLineSL = addressLineSLInput.value.trim();
      const addressType = addressTypeInput.value;
      const pincode = pincodeInput.value.trim();
      const stateId = stateIdInput.value;
      const stationId = stationIdInput.value;
      const tehsilId = tehsilIdInput.value;
      const emailId = emailIdInput.value.trim();
      const phonePrefix1 = phonePrefix1Input.value.trim();
      const phoneNo1 = phoneNo1Input.value.trim();
      const phoneType1 = phoneType1Input.value;
      const phonePrefix2 = phonePrefix2Input.value.trim();
      const phoneNo2 = phoneNo2Input.value.trim();
      const phoneType2 = phoneType2Input.value;
      const gstinNo = gstinNoInput.value.trim();
      const gstNoIssueDate = gstNoIssueDateInput.value.trim();
      const isMainBranch = isMainBranchInput.value === "true";
      const sequenceNo = sequenceNoInput.value.trim();

      let firstEmptyElement: HTMLInputElement | HTMLSelectElement | null = null;

      if (!branchCode) {
        firstEmptyElement = branchCodeInput;
      } else if (!branchName) {
        firstEmptyElement = branchNameInput;
      } else if (!addressLine) {
        firstEmptyElement = addressLineInput;
      } else if (!pincode) {
        firstEmptyElement = pincodeInput;
      } else if (!stateId) {
        firstEmptyElement = stateIdInput;
      } else if (!stationId) {
        firstEmptyElement = stationIdInput;
      } else if (!tehsilId) {
        firstEmptyElement = tehsilIdInput;
      } else if (!emailId) {
        firstEmptyElement = emailIdInput;
      } else if (!phonePrefix1) {
        firstEmptyElement = phonePrefix1Input;
      } else if (!phoneNo1) {
        firstEmptyElement = phoneNo1Input;
      } else if (!phoneType1) {
        firstEmptyElement = phoneType1Input;
      } else if (!gstinNo) {
        firstEmptyElement = gstinNoInput;
      } else if (!gstNoIssueDate) {
        firstEmptyElement = gstNoIssueDateInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus();
        return null;
      }

      return {
        id: branch.id,
        branchCode,
        branchName,
        branchNameSL,
        addressLine,
        addressLineSL,
        addressType,
        pincode,
        stateId,
        stationId,
        tehsilId,
        emailId,
        phonePrefix1,
        phoneNo1,
        phoneType1,
        phonePrefix2,
        phoneNo2,
        phoneType2,
        gstinNo,
        gstNoIssueDate,
        isMainBranch,
        sequenceNo,
      };
    },
  });

  if (formValues) {
    try {
      const branchDto: BranchDTO = {
        id: formValues.id,
        societyId: societyId,
        code: formValues.branchCode,
        name: formValues.branchName,
        nameSL: formValues.branchNameSL || undefined,
        addressLine: formValues.addressLine,
        addressLineSL: formValues.addressLineSL || undefined,
        addressType: formValues.addressType ? parseInt(formValues.addressType) : undefined,
        stationId: parseInt(formValues.stationId),
        phonePrefix1: formValues.phonePrefix1,
        phoneNo1: formValues.phoneNo1,
        phoneType1: parseInt(formValues.phoneType1),
        phonePrefix2: formValues.phonePrefix2 || undefined,
        phoneNo2: formValues.phoneNo2 || undefined,
        phoneType2: formValues.phoneType2 ? parseInt(formValues.phoneType2) : undefined,
        isMainBranch: formValues.isMainBranch,
        sequenceNo: formValues.sequenceNo ? parseInt(formValues.sequenceNo) : undefined,
        emailId: formValues.emailId,
        pincode: formValues.pincode,
        tehsilId: parseInt(formValues.tehsilId),
        gstinNo: formValues.gstinNo,
        gstNoIssueDate: formValues.gstNoIssueDate,
        stateId: parseInt(formValues.stateId),
      };

      await BranchApiService.modify_branch(branchDto);
      Swal.fire({
        title: "Success!",
        text: "Branch has been updated successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to update branch.", "error");
    }
  }
};


// Define the async function for deleting a branch
const deleteBranch = async (branch: Branch, societyId: number) => {
  const result = await Swal.fire({
    title: "Delete Branch",
    text: `Are you sure you want to delete "${branch.name}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await BranchApiService.delete_branch(branch.id, societyId);
      Swal.fire({
        title: "Deleted!",
        text: `Branch "${branch.name}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete branch.", "error");
    }
  }
};


// --- BranchMaster Component ---
const BranchMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  
  const fetchBranchesWithSociety = React.useCallback(
    async (filter: BranchFilter) => {
      return await fetchBranches(filter, 1);
    },
    []
  );

  return (
    <CRUDMaster<Branch>
      fetchData={fetchBranchesWithSociety}
      addEntry={() => addBranch(1, 1)}
      modifyEntry={(branch) => modifyBranch(branch, 1, 1)}
      deleteEntry={(branch) => deleteBranch(branch, 1)}
      pageTitle="Branch Operations"
      addLabel="Add Branch"
      searchPlaceholder="Search by name, code or email..."
      onClose={() => navigate("/branchmaster-operations")}
      renderTable={(branches, handleModify, handleDelete) => (
        <BranchTable
          branches={branches}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(branch) => branch.id}
    />
  );
};

export default BranchMaster;
