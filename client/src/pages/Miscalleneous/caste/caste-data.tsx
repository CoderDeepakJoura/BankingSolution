import React from "react";
import CasteApiService, {
  Caste,
  CasteFilter,
} from "../../../services/caste/casteapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import CasteTable from "./caste-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonService from "../../../services/common/commonservice";

// Interface for Category (from your CasteMaster)
interface Category {
  categoryId: number;
  categoryName: string;
}

// Define the async function to fetch Castes
const fetchCastes = async (
  filter: { searchTerm: string; pageNumber: number; pageSize: number },
  branchId: number
) => {
  // Convert CRUDMaster filter to CasteFilter
  const casteFilter: CasteFilter = {
    searchTerm: filter.searchTerm || "",
    pageNumber: filter.pageNumber || 1,
    pageSize: filter.pageSize || 10,
  };

  const res = await CasteApiService.fetchcaste(casteFilter, branchId);

  return {
    success: res.success ?? false,
    data: res.castes ?? [],
    totalCount: res.totalCount ?? 0,
    message: res.message ?? "",
  };
};

// Add Caste function with only the required fields
const addCaste = async (
  branchId: number,
  categories: Category[]
) => {
  // Create options for categories
  const categoryOptions = categories
    .map(
      (category) =>
        `<option value="${category.categoryId}">${category.categoryName}</option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Add New Caste",
    html: `
      <div class="swal2-form-container space-y-6 p-2">
        <!-- Caste Name Field -->
        <div class="swal2-input-group">
          <label for="casteDescription" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
            Caste Name
            <span class="text-red-500 text-xs">*</span>
          </label>
          <div class="relative">
            <input 
              id="casteDescription" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
              placeholder="Enter Caste Name" 
              aria-required="true"
              autocomplete="off"
              autoFocus={true}
              required
              maxlength="50"
              pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
            >
            <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
          </div>
        </div>

        <!-- Caste Name SL (Hindi) Field -->
        <div class="swal2-input-group">
          <label for="casteDescriptionSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
            Caste Name (SL)
            <span class="text-gray-500 text-xs">(Hindi)</span>
          </label>
          <div class="relative">
            <input 
              id="casteDescriptionSL" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
              placeholder="Enter Hindi Name" 
              autocomplete="off"
              lang="hi"
              maxlength="50"
            >
            <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
          </div>
        </div>

        <!-- Caste Type (Category) Field -->
        <div class="swal2-input-group">
          <label for="categoryId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            Category Name
            <span class="text-red-500 text-xs">*</span>
          </label>
          <div class="relative">
            <select 
              id="categoryId" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
              required
            >
              <option value="">Select Type</option>
              ${categoryOptions}
            </select>
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
              <p class="text-sm font-semibold text-slate-700">Creating New Caste</p>
              <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new Caste.</p>
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
    confirmButtonText: "Add Caste",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    didOpen: () => {
      const hindiInput = document.getElementById("casteDescriptionSL") as HTMLInputElement;
      const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

      // Restrict Hindi input to Devanagari script only
      hindiInput.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value !== "" && !hindiRegex.test(target.value)) {
          target.style.borderColor = "#ef4444";
        } else {
          target.style.borderColor = "";
        }
      });
    },
    preConfirm: () => {
      const casteDescription = (
        document.getElementById("casteDescription") as HTMLInputElement
      ).value.trim();
      const casteDescriptionSL = (
        document.getElementById("casteDescriptionSL") as HTMLInputElement
      ).value.trim();
      const categoryId = (
        document.getElementById("categoryId") as HTMLSelectElement
      ).value;

      if (!casteDescription) {
        Swal.showValidationMessage("Caste Name is required");
        (document.getElementById("casteDescription") as HTMLInputElement).focus();
        return null;
      }

      if (!categoryId) {
        Swal.showValidationMessage("Please select a Caste Type");
        (document.getElementById("categoryId") as HTMLSelectElement).focus();
        return null;
      }

      // Validate Hindi text if provided
      const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;
      if (casteDescriptionSL && !hindiRegex.test(casteDescriptionSL)) {
        Swal.showValidationMessage("Please enter only Hindi characters (Devanagari script)");
        (document.getElementById("casteDescriptionSL") as HTMLInputElement).focus();
        return null;
      }

      return {
        casteDescription,
        casteDescriptionSL,
        categoryId: parseInt(categoryId),
      };
    },
  });

  if (formValues) {
    try {
      console.log("Adding caste with payload:", formValues);
      
      const response = await CasteApiService.add_new_caste(
        formValues.casteDescription,
        formValues.casteDescriptionSL,
        formValues.categoryId,
        branchId
      );

      if (response.success) {
        Swal.fire({
          title: "Success!",
          text: response.message || "New Caste has been added.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "Failed to add Caste");
      }
    } catch (err: any) {
      console.error("Error adding caste:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to add Caste.",
        "error"
      );
    }
  }
};

// Modify Caste function
const modifyCaste = async (
  caste: Caste,
  categories: Category[],
  branchId: number
) => {
  // Create options for categories with pre-selection
  const categoryOptions = categories
    .map((category) => {
      const isSelected = category.categoryId === caste.categoryId;
      return `<option value="${category.categoryId}" ${
        isSelected ? "selected" : ""
      }>${category.categoryName}</option>`;
    })
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Modify Caste",
    html: `
      <div class="swal2-form-container space-y-6 p-2">
        <!-- Caste Name Field -->
        <div class="swal2-input-group">
          <label for="casteDescription" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
            Caste Name
            <span class="text-red-500 text-xs">*</span>
          </label>
          <div class="relative">
            <input 
              id="casteDescription" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
              value="${caste.casteDescription || ""}"
              placeholder="Enter Caste Name" 
              required
              autoFocus={true}
              maxlength="50"
              pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
            >
            <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
          </div>
        </div>

        <!-- Caste Name SL (Hindi) Field -->
        <div class="swal2-input-group">
          <label for="casteDescriptionSL" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
            Caste Name (SL)
            <span class="text-gray-500 text-xs">(Hindi)</span>
          </label>
          <div class="relative">
            <input 
              id="casteDescriptionSL" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
              value="${caste.casteDescriptionSL || ""}"
              placeholder="Enter Hindi Name" 
              lang="hi"
              maxlength="50"
            >
            <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-emerald-200"></div>
          </div>
        </div>

        <!-- Caste Type (Category) Field -->
        <div class="swal2-input-group">
          <label for="categoryId" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            Category Name
            <span class="text-red-500 text-xs">*</span>
          </label>
          <div class="relative">
            <select 
              id="categoryId" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 bg-gradient-to-r from-white to-slate-50"
              required
            >
              <option value="">Select Type</option>
              ${categoryOptions}
            </select>
          </div>
        </div>

        <!-- Status Indicator -->
        <div class="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mt-6">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-bold">✓</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-700">Editing Caste Information</p>
              <p class="text-xs text-slate-500 mt-1">Update the Caste details above. Fields marked with * are required.</p>
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
    confirmButtonText: "Update Caste",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    width: 650,
    didOpen: () => {
      const hindiInput = document.getElementById("casteDescriptionSL") as HTMLInputElement;
      const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

      // Restrict Hindi input to Devanagari script only
      hindiInput.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value !== "" && !hindiRegex.test(target.value)) {
          target.style.borderColor = "#ef4444";
        } else {
          target.style.borderColor = "";
        }
      });
    },
    preConfirm: () => {
      const casteDescription = (
        document.getElementById("casteDescription") as HTMLInputElement
      ).value.trim();
      const casteDescriptionSL = (
        document.getElementById("casteDescriptionSL") as HTMLInputElement
      ).value.trim();
      const categoryId = (
        document.getElementById("categoryId") as HTMLSelectElement
      ).value;

      if (!casteDescription) {
        Swal.showValidationMessage("Caste Name is required");
        (document.getElementById("casteDescription") as HTMLInputElement).focus();
        return null;
      }

      if (!categoryId) {
        Swal.showValidationMessage("Please select a Caste Type");
        (document.getElementById("categoryId") as HTMLSelectElement).focus();
        return null;
      }

      // Validate Hindi text if provided
      const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;
      if (casteDescriptionSL && !hindiRegex.test(casteDescriptionSL)) {
        Swal.showValidationMessage("Please enter only Hindi characters (Devanagari script)");
        (document.getElementById("casteDescriptionSL") as HTMLInputElement).focus();
        return null;
      }

      return {
        id: caste.casteId,
        casteDescription,
        casteDescriptionSL,
        categoryId: parseInt(categoryId),
      };
    },
  });

  if (formValues) {
    try {
      console.log("Updating caste with values:", formValues);
      
      const response = await CasteApiService.modify_caste(
        formValues.id,
        formValues.casteDescription,
        formValues.casteDescriptionSL,
        formValues.categoryId,
        branchId
      );

      if (response.success) {
        Swal.fire({
          title: "Success!",
          text: response.message || "Caste has been updated.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "Failed to update Caste");
      }
    } catch (err: any) {
      console.error("Error updating caste:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to update Caste.",
        "error"
      );
    }
  }
};

// Delete Caste function
const deleteCaste = async (
  caste: Caste,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete Caste",
    text: `Are you sure you want to delete "${caste.casteDescription}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const response = await CasteApiService.delete_caste(
        caste.casteId,
        branchId
      );

      if (response.success) {
        Swal.fire({
          title: "Deleted!",
          text: `Caste "${caste.casteDescription}" has been deleted.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "Failed to delete Caste");
      }
    } catch (err: any) {
      console.error("Error deleting caste:", err);
      Swal.fire(
        "Error!",
        err.message || "Failed to delete Caste.",
        "error"
      );
    }
  }
};

// --- CasteMaster Component ---
const CasteMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // Fetch categories on component mount
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await commonService.fetchCategory(user.branchid);
        if (res.success) {
          setCategories(res.data || []);
        } else {
          throw new Error("Failed to load Categories.");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        Swal.fire("Error", "Could not load categories", "error");
      }
    };

    if (user.branchid) {
      fetchCategories();
    }
  }, [user.branchid]);

  return (
    <CRUDMaster<Caste>
      fetchData={(filter) => fetchCastes(filter, user.branchid)}
      addEntry={() => addCaste(user.branchid, categories)}
      modifyEntry={(caste) => modifyCaste(caste, categories, user.branchid)}
      deleteEntry={(caste) => deleteCaste(caste, user.branchid)}
      pageTitle="Caste Operations"
      addLabel="Add Caste"
      onClose={() => navigate("/caste-operations")}
      searchPlaceholder="Search by caste name..."
      renderTable={(castes, handleModify, handleDelete) => (
        <CasteTable
          Castes={castes}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(caste) => caste.casteId}
    />
  );
};

export default CasteMaster;
