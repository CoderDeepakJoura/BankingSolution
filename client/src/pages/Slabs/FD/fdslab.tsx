import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { encryptId, decryptId } from "../../../utils/encryption";
import Select from "react-select";
import {
  Save,
  ArrowLeft,
  Percent,
  CreditCard,
  Landmark,
  AlertCircle,
  RotateCcw,
  Clock,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import fdInterestSlabService, {
  CombinedFDIntDTO,
} from "../../../services/slabs/fdslabservice";

// Define your interfaces/types
interface FDProduct {
  id: number;
  productName: string;
}

interface CompoundingInterval {
  value: number;
  label: string;
}

interface ValidationErrors {
  fdProductId?: string;
  slabName?: string;
  fromDays?: string;
  toDays?: string;
  compoundingInterval?: string;
}

const FDSlab = () => {
  const navigate = useNavigate();
  const { slabId: encryptedId } = useParams<{ slabId?: string }>();
  const slabId = encryptedId ? decryptId(encryptedId) : null;

  const isEditMode = !!slabId;

  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Ref for auto-focus
  const fdProductSelectRef = useRef<any>(null);
  const slabNameRef = useRef<any>(null);

  // Compounding Interval Options
  const compoundingIntervalOptions: CompoundingInterval[] = [
    { value: 1, label: "No Compounding" },
    { value: 2, label: "Daily" },
    { value: 3, label: "Monthly" },
    { value: 4, label: "Quarterly" },
    { value: 5, label: "Half-Yearly" },
    { value: 6, label: "Yearly" },
    { value: 7, label: "Two-Yearly" }
  ];

  // Form data state - ONLY Basic Information
  const [formData, setFormData] = useState({
    id: null as number | null,
    branchId: user.branchid,
    fdProductId: 0,
    slabName: "",
    fromDays: "",
    toDays: "",
    compoundingInterval: 0,
  });

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const fdProductsResponse = await commonservice.fetch_fd_products(
          user.branchid
        );
        setFdProducts(fdProductsResponse.data);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchRequiredData();
  }, [user.branchid]);

  // Fetch FD interest slab data if in edit mode
  useEffect(() => {
    const fetchFDInterestSlabData = async () => {
      if (isEditMode && slabId) {
        try {
          Swal.fire({
            title: "Loading FD Interest Slab Data...",
            text: "Please wait",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          const response = await fdInterestSlabService.getFDInterestSlabById(
            slabId,
            user.branchid
          );

          if (response.success && response.data) {
            const res = response.data;

            // Populate form data - ONLY Basic Information
            setFormData({
              id: res.fdInterestSlab.id || null,
              branchId: user.branchid,
              fdProductId: res.fdInterestSlab.fdProductId || 0,
              slabName: res.fdInterestSlab.slabName || "",
              fromDays: res.fdInterestSlab.fromDays?.toString() || "",
              toDays: res.fdInterestSlab.toDays?.toString() || "",
              compoundingInterval: res.fdInterestSlab.compoundingInterval || 0,
            });

            Swal.close();
          } else {
            Swal.fire("Error", "FD Interest Slab not found", "error");
            navigate("/fd-slab-operations");
          }
        } catch (error: any) {
          console.error("Error fetching FD interest slab:", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: error.message || "Failed to load FD interest slab data",
          });
          navigate("/fd-slab-operations");
        }
      }
    };

    fetchFDInterestSlabData();
  }, [slabId, isEditMode, user.branchid, navigate]);

  // Validation function
  const validateField = (fieldName: string, value: any): string | undefined => {
    switch (fieldName) {
      case "fdProductId":
        if (!value || value === 0) {
          return "FD Product is required";
        }
        break;
      case "slabName":
        if (!value || value.trim() === "") {
          return "Slab Name is required";
        }
        if (value.trim().length < 3) {
          return "Slab Name must be at least 3 characters";
        }
        break;
      case "fromDays":
        if (!value || value === "") {
          return "From Days is required";
        }
        if (isNaN(parseInt(value)) || parseInt(value) < 0) {
          return "From Days must be a positive number";
        }
        break;
      case "toDays":
        if (!value || value === "") {
          return "To Days is required";
        }
        if (isNaN(parseInt(value)) || parseInt(value) < 0) {
          return "To Days must be a positive number";
        }
        if (
          formData.fromDays &&
          parseInt(value) <= parseInt(formData.fromDays)
        ) {
          return "To Days must be greater than From Days";
        }
        break;
      case "compoundingInterval":
        if (!value || value === 0) {
          return "Compounding Interval is required";
        }
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    const fdProductError = validateField("fdProductId", formData.fdProductId);
    if (fdProductError) errors.fdProductId = fdProductError;

    const slabNameError = validateField("slabName", formData.slabName);
    if (slabNameError) errors.slabName = slabNameError;

    const fromDaysError = validateField("fromDays", formData.fromDays);
    if (fromDaysError) errors.fromDays = fromDaysError;

    const toDaysError = validateField("toDays", formData.toDays);
    if (toDaysError) errors.toDays = toDaysError;

    const compoundingIntervalError = validateField(
      "compoundingInterval",
      formData.compoundingInterval
    );
    if (compoundingIntervalError)
      errors.compoundingInterval = compoundingIntervalError;

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleFDProductChange = (selectedOption: any) => {
    const productId = selectedOption ? selectedOption.value : 0;
    handleInputChange("fdProductId", productId);
  };

  const handleCompoundingIntervalChange = (selectedOption: any) => {
    const interval = selectedOption ? selectedOption.value : 0;
    handleInputChange("compoundingInterval", interval);
  };

  const handleFieldBlur = async (fieldName: string, value: any = "") => {
    if (fieldName === "slabName") {
      const response = await commonservice.slabname_exists(
        user.branchid,
        value,
        slabId ?? 0
      );
      if (response.success) {
        setFormData((prev) => ({
          ...prev,
          slabName: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            slabNameRef.current?.focus();
          },
        });
      }
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      Swal.fire({
        icon: "error",
        title: "Not Allowed",
        text: "Reset form is not allowed in modify mode.",
      });
      return;
    }

    setFormData({
      id: null,
      branchId: user.branchid,
      fdProductId: 0,
      slabName: "",
      fromDays: "",
      toDays: "",
      compoundingInterval: 0,
    });
    setValidationErrors({});
    setLoading(false);

    setTimeout(() => {
      if (fdProductSelectRef.current) {
        fdProductSelectRef.current.focus();
      }
    }, 100);
  };

  const handleSubmit = async () => {
    const validation = validateForm();

    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).filter(Boolean);

      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `
        <div class="text-left">
          <p class="mb-3">Please fix the following ${
            errorMessages.length
          } error(s):</p>
          <div class="max-h-48 overflow-y-auto text-sm">
            <ul class="ml-4 list-disc">
              ${errorMessages
                .map((error) => `<li class="text-red-600">${error}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      `,
        confirmButtonText: "Fix Errors",
        customClass: {
          popup: "text-left",
        },
      });
      return;
    }

    setLoading(true);
    try {
      const dto: CombinedFDIntDTO = {
        fdInterestSlab: {
          id: formData.id || undefined,
          branchId: user.branchid,
          fdProductId: Number(formData.fdProductId),
          slabName: formData.slabName.trim(),
          applicableDate: commonservice.getTodaysDate(),
          fromDays: Number(formData.fromDays),
          toDays: Number(formData.toDays),
          compoundingInterval: Number(formData.compoundingInterval),
        },
        fdInterestSlabDetails: [], // Empty array - no detail slabs
      };

      console.log("Submitting FD DTO:", dto);

      const res = isEditMode
        ? await fdInterestSlabService.updateFDInterestSlab(formData.id!, dto)
        : await fdInterestSlabService.createFDInterestSlab(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            res.message ||
            `FD Slab ${isEditMode ? "updated" : "saved"} successfully!`,
          confirmButtonColor: "#3B82F6",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          if (isEditMode) {
            navigate("/fd-slab-info");
          } else {
            handleReset();
          }
        });
      } else {
        throw new Error(res.message || "Failed to save data");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to save data. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const fdProductOptions = fdProducts.map((product) => ({
    value: product.id,
    label: product.productName,
  }));

  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Percent className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Modify" : "Add"} FD Slab
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure FD slab information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/fd-slab-info")
                      : navigate("/fd-slab-operations")
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Main Form - ONLY Basic Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Basic Information Section */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* FD Product Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          FD Product
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        ref={fdProductSelectRef}
                        id="fdProductId"
                        instanceId="fd-product-select"
                        options={fdProductOptions}
                        isDisabled={isEditMode}
                        autoFocus={!isEditMode}
                        value={
                          fdProductOptions.find(
                            (opt) => opt.value === Number(formData.fdProductId)
                          ) || null
                        }
                        onChange={handleFDProductChange}
                        placeholder="Eg. Senior Citizen FD"
                        isClearable
                        className={`text-sm ${
                          validationErrors.fdProductId ? "border-red-500" : ""
                        }`}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          control: (base) => ({
                            ...base,
                            borderColor: validationErrors.fdProductId
                              ? "#ef4444"
                              : base.borderColor,
                          }),
                        }}
                      />
                      {validationErrors.fdProductId && (
                        <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.fdProductId}
                        </span>
                      )}
                    </div>

                    {/* Slab Name Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-purple-500" />
                          Slab Name
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.slabName}
                        onChange={(e) =>
                          handleInputChange("slabName", e.target.value)
                        }
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
                          validationErrors.slabName
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                        ref={slabNameRef}
                        onBlur={(e) =>
                          handleFieldBlur("slabName", e.target.value)
                        }
                        placeholder="e.g., FD Rate 2025"
                        maxLength={50}
                      />
                      {validationErrors.slabName && (
                        <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.slabName}
                        </span>
                      )}
                    </div>

                    {/* From Days Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          From Days
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.fromDays}
                        onChange={(e) =>
                          handleInputChange("fromDays", e.target.value)
                        }
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
                          validationErrors.fromDays
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                        placeholder="e.g., 30"
                        min="0"
                      />
                      {validationErrors.fromDays && (
                        <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.fromDays}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum tenure in days
                      </p>
                    </div>

                    {/* To Days Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-red-500" />
                          To Days
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.toDays}
                        onChange={(e) =>
                          handleInputChange("toDays", e.target.value)
                        }
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
                          validationErrors.toDays
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                        placeholder="e.g., 365"
                        min="0"
                      />
                      {validationErrors.toDays && (
                        <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.toDays}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum tenure in days
                      </p>
                    </div>

                    {/* Compounding Interval Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-indigo-500" />
                          Compounding Interval
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        id="compoundingInterval"
                        instanceId="compounding-interval-select"
                        options={compoundingIntervalOptions}
                        value={
                          compoundingIntervalOptions.find(
                            (opt) =>
                              opt.value === Number(formData.compoundingInterval)
                          ) || null
                        }
                        onChange={handleCompoundingIntervalChange}
                        placeholder="Select Interval"
                        isClearable
                        className={`text-sm ${
                          validationErrors.compoundingInterval
                            ? "border-red-500"
                            : ""
                        }`}
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          control: (base) => ({
                            ...base,
                            borderColor: validationErrors.compoundingInterval
                              ? "#ef4444"
                              : base.borderColor,
                          }),
                        }}
                      />
                      {validationErrors.compoundingInterval && (
                        <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.compoundingInterval}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        How often interest is compounded
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Form
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode ? "Update" : "Save"} FD Slab
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default FDSlab;
