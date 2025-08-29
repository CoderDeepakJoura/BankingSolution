import React from "react";
import PostOfficeApiService, {
  PostOffice,
  PostOfficeFilter,
} from "../../../services/PostOffice/postOfficeapi";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import PostOfficeTable from "./postOffice-table";
import { useNavigate } from "react-router-dom";

// Define the async function to fetch PostOffices and ensure the return type is correct.
const fetchPostOffices = async (filter: PostOfficeFilter) => {
  const res = await PostOfficeApiService.fetchPostOffices(filter);
  return {
    // Ensure 'success' is a boolean, defaulting to false if undefined.
    success: res.success ?? false, // Ensure 'data' is a PostOffice array, defaulting to an empty array.
    data: res.postOffices ?? [], // Ensure 'totalCount' is a number, defaulting to 0.
    totalCount: res.totalCount ?? 0, // Ensure 'message' is a string, defaulting to an empty string.
    message: res.message ?? "",
  };
};

// Define the async function for adding a PostOffice.
const addPostOffice = async () => {
  const { value: formValues } = await Swal.fire({
    title: "Add New Post Office",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- PostOffice Name Field -->
    <div class="swal2-input-group">
      <label for="PostOfficename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Post Office Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="PostOfficename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Post Office Name" 
          aria-required="true"
          autocomplete="off"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- PostOffice Code Field -->
    <div class="swal2-input-group">
      <label for="PostOfficecode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Post Office Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="PostOfficecode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 font-mono" 
          placeholder="Enter Post Office Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          "
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- PostOffice Name SL Field -->
    <div class="swal2-input-group">
      <label for="PostOfficenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Post Office Name SL
        <span class="text-emerald-600 text-xs font-medium"></span>
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="PostOfficenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          placeholder="Enter Post Office Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Creating New PostOffice</p>
          <p class="text-xs text-slate-500 mt-1">Fill in all the required information to add a new PostOffice.</p>
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
            <li>PostOffice name should be descriptive and unique</li>
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
    confirmButtonText: "Add PostOffice",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const PostOfficenameInput = document.getElementById(
        "PostOfficename"
      ) as HTMLInputElement;
      const PostOfficecodeInput = document.getElementById(
        "PostOfficecode"
      ) as HTMLInputElement;

      const PostOfficename = PostOfficenameInput.value.trim();
      const PostOfficecode = PostOfficecodeInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!PostOfficename) {
        firstEmptyElement = PostOfficenameInput;
      } else if (!PostOfficecode) {
        firstEmptyElement = PostOfficecodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return { PostOfficename, PostOfficecode };
    },
  });

  if (formValues) {
    try {
      await PostOfficeApiService.add_new_PostOffice(
        formValues.PostOfficename,
        formValues.PostOfficecode
      );
      Swal.fire({
        title: "Success!",
        text: "New PostOffice has been added.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to add PostOffice.", "error");
    }
  }
};

// Define the async function for modifying a PostOffice.
const modifyPostOffice = async (PostOffice: PostOffice) => {
  const { value: formValues } = await Swal.fire({
    title: "Modify Post Office",
    html: `
  <div class="swal2-form-container space-y-6 p-2">
    <!-- PostOffice Name Field -->
    <div class="swal2-input-group">
      <label for="PostOfficename" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
        Post Office Name
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="PostOfficename" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${PostOffice.postOfficeName}"
          placeholder="Enter PostOffice Name" 
          aria-required="true"
          autocomplete="off"
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-blue-200"></div>
      </div>
    </div>

    <!-- PostOffice Code Field -->
    <div class="swal2-input-group">
      <label for="PostOfficecode" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        Post Office Code
        <span class="text-red-500 text-xs">*</span>
      </label>
      <div class="relative">
        <input 
          id="PostOfficecode" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50 font-mono" 
          value="${PostOffice.postOfficeCode || ""}"
          placeholder="Enter Post Office Code" 
          aria-required="true"
          autocomplete="off"
          maxlength="10"
          required
          
        >
        <div class="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none transition-all duration-300 hover:border-purple-200"></div>
      </div>
    </div>

    <!-- PostOffice Name SL Field -->
    <div class="swal2-input-group">
      <label for="PostOfficenamesl" class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <div class="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        Post Office Name SL
        
      </label>
      <div class="relative">
        <input 
          id="PostOfficenamesl" 
          class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-slate-700 placeholder-slate-400 bg-gradient-to-r from-white to-slate-50" 
          value="${PostOffice.postOfficeNameSL || ""}"
          placeholder="Enter Post Office Name SL" 
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
          <p class="text-sm font-semibold text-slate-700">Editing Post Office Information</p>
          <p class="text-xs text-slate-500 mt-1">Update the Post Office details above. Fields marked with * are required.</p>
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
            <li>Post Office code changes may affect existing records</li>
            <li>Ensure Post Office Name and Post Office Code is unique in the system</li>
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
    confirmButtonText: "Update PostOffice",
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    preConfirm: () => {
      const PostOfficenameInput = document.getElementById(
        "PostOfficename"
      ) as HTMLInputElement;
      const PostOfficecodeInput = document.getElementById(
        "PostOfficecode"
      ) as HTMLInputElement;

      const PostOfficename = PostOfficenameInput.value.trim();
      const PostOfficecode = PostOfficecodeInput.value.trim();

      // Keep track of the first empty element
      let firstEmptyElement: HTMLInputElement | null = null;

      if (!PostOfficename) {
        firstEmptyElement = PostOfficenameInput;
      } else if (!PostOfficecode) {
        firstEmptyElement = PostOfficecodeInput;
      }

      if (firstEmptyElement) {
        Swal.showValidationMessage("Please fill in all required fields");
        firstEmptyElement.focus(); // Set focus to the first empty element
        return null;
      }
      return { id: PostOffice.postOfficeId, PostOfficename, PostOfficecode };
    },
  });

  if (formValues) {
    try {
      await PostOfficeApiService.modify_PostOffice(
        formValues.id,
        formValues.PostOfficename,
        formValues.PostOfficecode
      );
      Swal.fire({
        title: "Success!",
        text: "Post Office has been updated.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to update PostOffice.",
        "error"
      );
    }
  }
};

// Define the async function for deleting a PostOffice.
const deletePostOffice = async (PostOffice: PostOffice) => {
  const result = await Swal.fire({
    title: "Delete PostOffice",
    text: `Are you sure you want to delete "${PostOffice.postOfficeName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      await PostOfficeApiService.delete_PostOffice(
        PostOffice.postOfficeId,
        PostOffice.postOfficeName,
        PostOffice.postOfficeCode,
        PostOffice.postOfficeNameSL
      );
      Swal.fire({
        title: "Deleted!",
        text: `Post Office "${PostOffice.postOfficeName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to delete PostOffice.",
        "error"
      );
    }
  }
};

// --- PostOfficeMaster Component ---

const PostOfficeMaster: React.FC = () => {
  const navigate = useNavigate();
  return (
    <CRUDMaster<PostOffice>
      fetchData={fetchPostOffices}
      addEntry={addPostOffice}
      modifyEntry={modifyPostOffice}
      deleteEntry={deletePostOffice}
      pageTitle="Post Office Operations"
      addLabel="Add Post Office"
      onClose={() => navigate("/PostOffice")}
      searchPlaceholder="Search by name or code..."
      renderTable={(PostOffices, handleModify, handleDelete) => (
        <PostOfficeTable
          PostOffices={PostOffices}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(PostOffice) => PostOffice.postOfficeId}
    />
  );
};

export default PostOfficeMaster;
