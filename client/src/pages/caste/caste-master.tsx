import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import CasteApiService from "../../services/caste/casteapi";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Select from "react-select";
import commonService from "../../services/common/commonservice";
import {
  FaPlus,
  FaTimes,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaSave,
  FaInfoCircle,
} from "react-icons/fa";

interface Category {
  categoryId: number;
  categoryName: string;
}

export interface Caste {
  casteId: number;
  casteName: string;
}

const CasteMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [Caste, setCaste] = useState("");
  const [CasteSL, setCasteSL] = useState("");
  const [CategoryId, setCategoryId] = useState<number | "">("");
  const [categorys, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

  useEffect(() => {
    const fetchTypesAndParents = async () => {
      try {
        const res = await commonService.fetchCategory(user.branchid);
        if (!res.success) throw new Error("Failed to load Categories.");
        const data: Category[] = res.data || [];
        setCategories(data);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", err.message || "Could not load types", "error");
      }
    };
    fetchTypesAndParents();
  }, [user.branchid]);

  const handleCasteSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setCasteSL(inputText);
      setError("");
    } else {
      setError("Please enter only Hindi characters (Devanagari script).");
    }
  };

  const handleReset = () => {
    setCaste("");
    setCasteSL("");
    setCategoryId("");
    setError("");
    inputRef.current?.focus();
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!Caste.trim()) {
      setError("Caste Name is required");
      return;
    }
    if (CategoryId === "") {
      setError("Please select an Category.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await CasteApiService.add_new_caste(
        Caste,
        CasteSL,
        CategoryId as number,
        user.branchid
      );

      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: response.message,
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          handleReset();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: response.message || "Failed to save Caste.",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "An unexpected error occurred!",
        text: err.message || "Please check your network connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categorys.map((type) => ({
    value: type.categoryId,
    label: type.categoryName,
  }));

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Caste Master
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/Caste-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  <FaArrowLeft className="text-sm" />
                  Back to Operations
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white text-sm" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Create New Caste
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fill in the Caste details below
                    </p>
                  </div>
                </div>
              </div>

              <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="flex flex-col">
                    <label
                      htmlFor="Caste"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Caste Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="Caste"
                      ref={inputRef}
                      value={Caste}
                      onChange={(e) => setCaste(e.target.value)}
                      required
                      pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
                      autoFocus={true}
                      maxLength={50}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                      placeholder="Enter Caste Name"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="CasteSL"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Caste Name (SL){" "}
                      <span className="text-gray-500 text-xs">(Hindi)</span>
                    </label>
                    <input
                      type="text"
                      id="CasteSL"
                      value={CasteSL}
                      onChange={handleCasteSLChange}
                      maxLength={50}
                      className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${
                        error && error.includes("Hindi")
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-200 focus:border-emerald-500"
                      }`}
                      placeholder="Enter Hindi Name"
                      lang="hi"
                    />
                    {error ? (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        {error}
                      </p>
                    ) : ( 
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaInfoCircle />
                        Optional field for Hindi/Devanagari script (max 50
                        characters)
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="Category"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Caste Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      id="Category"
                      options={categoryOptions}
                      value={
                        categoryOptions.find(
                          (option) => option.value === CategoryId
                        ) || null
                      }
                      onChange={(selected) =>
                        setCategoryId(selected ? selected.value : "")
                      }
                      placeholder="Select Type"
                      isClearable
                      required
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                  >
                    <FaTimes />
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Caste
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default CasteMaster;
