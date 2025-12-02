import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { encryptId, decryptId } from "../../../utils/encryption";
import Select from "react-select";
import {
  Save,
  ArrowLeft,
  Percent,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import fdInterestSlabService, {
  CombinedFDIntInfoDTO, FDSlabs
} from "../../../services/interestslab/fdinterestslabservice";

// Define your interfaces/types
interface FDProduct {
  id: number;
  productName: string;
}


interface InterestSlab {
  slabNo: number;
  fdIntSlabId: number;
  ageFrom: string;
  ageTo: string;
  interestRate: string;
}

interface ValidationErrors {
  fdProductId?: string;
  applicableDate?: string;
  slabs?: string;
}

const FDInterestSlab = () => {
  const navigate = useNavigate();
  const { slabId: encryptedId } = useParams<{ slabId?: string }>();
  const slabId = encryptedId ? decryptId(encryptedId) : null;

  const isEditMode = !!slabId;

  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);
  const [fdSlabs, setFDSlabs] = useState<FDSlabs[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Ref for auto-focus
  const fdProductSelectRef = useRef<any>(null);

  // Form data state
  const [formData, setFormData] = useState({
    id: null as number | null,
    branchId: user.branchid,
    fdProductId: 0,
    applicableDate: commonservice.getTodaysDate(),
  });

  // Interest slabs state (Age-based) - ✅ Removed applicableDate
  const [interestSlabs, setInterestSlabs] = useState<InterestSlab[]>([
    {
      slabNo: 1,
      fdIntSlabId: 0,
      ageFrom: "0",
      ageTo: "",
      interestRate: "",
    },
  ]);

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const fdProductsResponse = await commonservice.fetch_fd_products(
          user.branchid
        );
        setFdProducts(fdProductsResponse.data);
        const fdSlabResponse = await fdInterestSlabService.fetchAllFDSlabs(user.branchid);
        setFDSlabs(fdSlabResponse.data);
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
      console.log("Fetching FD interest slab data for ID:", slabId);
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
            setFormData({
              id: res.fdInterestSlabInfo.id || null,
              branchId: user.branchid,
              fdProductId: res.fdInterestSlabInfo.fdProductId || 0,
              applicableDate: commonservice.splitDate(
                res.fdInterestSlabInfo.applicableDate
              ),
            });

            // ✅ Removed applicableDate from slabs
            if (
              res.fdInterestSlabDetails &&
              res.fdInterestSlabDetails.length > 0
            ) {
              let serialno = 1;
              setInterestSlabs(
                res.fdInterestSlabDetails.map((slab: any) => ({
                  slabNo: serialno++,
                  fdIntSlabId: slab.fdIntSlabId  || 0,
                  ageFrom: slab.ageFrom?.toString() || "0",
                  ageTo: slab.ageTo?.toString() || "",
                  interestRate: slab.interestRate?.toString() || "",
                }))
              );
            }

            Swal.close();
          } else {
            Swal.fire("Error", "FD Interest Slab not found", "error");
            navigate("/slab-operations");
          }
        } catch (error: any) {
          console.error("Error fetching FD interest slab:", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: error.message || "Failed to load FD interest slab data",
          });
          navigate("/slab-operations");
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
      case "applicableDate":
        if (!value || value === "") {
          return "Applicable Date is required";
        }
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  // ✅ Simplified validation - removed date validations for slabs
  const validateSlabs = (): string | undefined => {
  if (interestSlabs.length === 0) {
    return "At least one interest slab is required";
  }

  // Group slabs by fdIntSlabId to validate each type independently
  const slabTypeMap: { [key: number]: InterestSlab[] } = {};
  
  interestSlabs.forEach((slab) => {
    if (!slabTypeMap[slab.fdIntSlabId]) {
      slabTypeMap[slab.fdIntSlabId] = [];
    }
    slabTypeMap[slab.fdIntSlabId].push(slab);
  });

  // Validate each slab type independently
  for (const slabId in slabTypeMap) {
    const slabs = slabTypeMap[slabId];
    
    for (let i = 0; i < slabs.length; i++) {
      const slab = slabs[i];
      const globalIndex = interestSlabs.indexOf(slab);

      if (!slab.fdIntSlabId || slab.fdIntSlabId === 0) {
        return `Slab ${globalIndex + 1}: FD Slab is required`;
      }

      if (!slab.ageTo || slab.ageTo.trim() === "") {
        return `Slab ${globalIndex + 1}: To Age is required`;
      }

      if (!slab.interestRate || slab.interestRate.trim() === "") {
        return `Slab ${globalIndex + 1}: Interest Rate is required`;
      }

      const fromAge = parseFloat(slab.ageFrom);
      const toAge = parseFloat(slab.ageTo);
      const rate = parseFloat(slab.interestRate);

      if (isNaN(fromAge) || fromAge < 0) {
        return `Slab ${globalIndex + 1}: Invalid From Age`;
      }

      if (isNaN(toAge) || toAge < 0) {
        return `Slab ${globalIndex + 1}: Invalid To Age`;
      }

      if (isNaN(rate) || rate < 0 || rate > 100) {
        return `Slab ${globalIndex + 1}: Interest Rate must be between 0 and 100`;
      }

      if (toAge <= fromAge) {
        return `Slab ${globalIndex + 1}: To Age must be greater than From Age`;
      }

      // Validate continuity within this slab type
      if (i === 0) {
        // First slab of this type must start from 0
        if (fromAge !== 0) {
          return `Slab ${globalIndex + 1}: First entry for "${
            fdSlabs.find(s => s.id === slabId)?.slabName || 'this slab'
          }" must start from age 0`;
        }
      } else {
        // Subsequent slabs must continue from previous
        const prevSlab = slabs[i - 1];
        const prevToAge = parseFloat(prevSlab.ageTo);
        const expectedFromAge = prevToAge + 1;
        
        if (fromAge !== expectedFromAge) {
          return `Slab ${globalIndex + 1}: For "${
            fdSlabs.find(s => s.id === slabId)?.slabName || 'this slab'
          }", From Age should be ${expectedFromAge}`;
        }
      }
    }
  }

  return undefined;
};


  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    const fdProductError = validateField("fdProductId", formData.fdProductId);
    if (fdProductError) errors.fdProductId = fdProductError;

    const applicableDateError = validateField(
      "applicableDate",
      formData.applicableDate
    );
    if (applicableDateError) errors.applicableDate = applicableDateError;

    const slabsError = validateSlabs();
    if (slabsError) errors.slabs = slabsError;

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

 const handleSlabFDProductChange = (index: number, selectedOption: any) => {
  const newSlabId = selectedOption ? selectedOption.value : 0;
  const newSlabs = [...interestSlabs];
  const previousSlabId = newSlabs[index].fdIntSlabId;

  // Update the slab ID
  newSlabs[index].fdIntSlabId = newSlabId;

  // If slab type changed
  if (previousSlabId !== newSlabId) {
    // Find the last occurrence of this new slab type before current index
    let lastOccurrenceOfNewSlab = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (newSlabs[i].fdIntSlabId === newSlabId) {
        lastOccurrenceOfNewSlab = i;
        break;
      }
    }

    if (lastOccurrenceOfNewSlab !== -1) {
      // This slab type exists before - continue from its ageTo
      const lastAgeTo = parseFloat(newSlabs[lastOccurrenceOfNewSlab].ageTo);
      if (!isNaN(lastAgeTo) && lastAgeTo > 0) {
        newSlabs[index].ageFrom = (lastAgeTo + 1).toString();
      } else {
        newSlabs[index].ageFrom = "0";
      }
    } else {
      // This is first occurrence of this slab type - start from 0
      newSlabs[index].ageFrom = "0";
    }

    // Clear dependent fields
    newSlabs[index].ageTo = "";
    newSlabs[index].interestRate = "";

    // Recalculate all subsequent slabs
    for (let i = index + 1; i < newSlabs.length; i++) {
      const currentSlabId = newSlabs[i].fdIntSlabId;
      
      // Find the last occurrence of this slab type before current index
      let lastOccurrence = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (newSlabs[j].fdIntSlabId === currentSlabId) {
          lastOccurrence = j;
          break;
        }
      }

      if (lastOccurrence !== -1) {
        const lastAgeTo = parseFloat(newSlabs[lastOccurrence].ageTo);
        if (!isNaN(lastAgeTo) && lastAgeTo > 0) {
          newSlabs[i].ageFrom = (lastAgeTo + 1).toString();
        }
      } else {
        // First occurrence of this type - should be 0, but keep existing if set
        if (!newSlabs[i].ageFrom || newSlabs[i].ageFrom === "") {
          newSlabs[i].ageFrom = "0";
        }
      }
    }
  }

  setInterestSlabs(newSlabs);

  if (validationErrors.slabs) {
    setValidationErrors((prev) => ({ ...prev, slabs: undefined }));
  }
};



  // ✅ Simplified - removed applicableDate handling
  const handleSlabChange = (
  index: number,
  field: keyof Omit<InterestSlab, 'fdProductId'>,
  value: string
) => {
  if (field === "ageTo" || field === "interestRate") {
    let numericValue = value.replace(/[^0-9.]/g, "");

    const parts = numericValue.split(".");
    if (parts.length > 2) {
      numericValue = parts[0] + "." + parts.slice(1).join("");
    }

    if (parts.length === 2) {
      numericValue = parts[0] + "." + parts[1].substring(0, 2);
    }

    value = numericValue;
  }

  const newSlabs = [...interestSlabs];
  newSlabs[index] = { ...newSlabs[index], [field]: value };

  // If ageTo changed, recalculate ageFrom for next occurrence of same slab type
  if (field === "ageTo") {
    const currentSlabId = newSlabs[index].fdIntSlabId;
    const newAgeToValue = parseFloat(value);

    if (!isNaN(newAgeToValue) && currentSlabId) {
      // Find next row with same slab type
      for (let i = index + 1; i < newSlabs.length; i++) {
        if (newSlabs[i].fdIntSlabId === currentSlabId) {
          newSlabs[i].ageFrom = (newAgeToValue + 1).toString();
          break; // Only update the immediate next occurrence
        }
      }
    }
  }

  setInterestSlabs(newSlabs);

  if (validationErrors.slabs) {
    setValidationErrors((prev) => ({ ...prev, slabs: undefined }));
  }
};


  // ✅ Removed applicableDate from new slab
  const handleAddSlab = () => {
  const lastSlab = interestSlabs[interestSlabs.length - 1];
  const lastToAge = parseFloat(lastSlab.ageTo);

  if (isNaN(lastToAge) || lastToAge <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Input",
      text: "Please complete the current slab before adding a new one",
    });
    return;
  }

  const newSlab: InterestSlab = {
    slabNo: interestSlabs.length + 1,
    fdIntSlabId: lastSlab.fdIntSlabId || 0,
    ageFrom: (lastToAge + 1).toString(),
    ageTo: "",
    interestRate: "",
  };

  setInterestSlabs([...interestSlabs, newSlab]);
};

 const handleRemoveSlab = (index: number) => {
  if (interestSlabs.length === 1) {
    Swal.fire({
      icon: "warning",
      title: "Cannot Remove",
      text: "At least one slab is required",
    });
    return;
  }

  const newSlabs = interestSlabs.filter((_, i) => i !== index);

  // Renumber the slabs
  newSlabs.forEach((slab, i) => {
    slab.slabNo = i + 1;
  });

  // Recalculate ageFrom for all slabs based on their slab type
  for (let i = 0; i < newSlabs.length; i++) {
    const currentSlabId = newSlabs[i].fdIntSlabId;

    // Find the last occurrence of this slab type before current index
    let lastOccurrence = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (newSlabs[j].fdIntSlabId === currentSlabId) {
        lastOccurrence = j;
        break;
      }
    }

    if (lastOccurrence !== -1) {
      // Found previous occurrence - continue from it
      const lastAgeTo = parseFloat(newSlabs[lastOccurrence].ageTo);
      if (!isNaN(lastAgeTo) && lastAgeTo > 0) {
        newSlabs[i].ageFrom = (lastAgeTo + 1).toString();
      }
    } else {
      // First occurrence of this type - start from 0
      newSlabs[i].ageFrom = "0";
    }
  }

  setInterestSlabs(newSlabs);
};



  // ✅ Removed applicableDate from reset
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
      applicableDate: commonservice.getTodaysDate(),
    });
    setInterestSlabs([
      {
        slabNo: 1,
        fdIntSlabId: 0,
        ageFrom: "0",
        ageTo: "",
        interestRate: "",
      },
    ]);
    setValidationErrors({});
    setLoading(false);

    setTimeout(() => {
      if (fdProductSelectRef.current) {
        fdProductSelectRef.current.focus();
      }
    }, 100);
  };

  // ✅ Use main applicable date for all slabs
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
      const dto: CombinedFDIntInfoDTO = {
        fdInterestSlabInfo: {
          id: formData.id || undefined,
          branchId: user.branchid,
          fdProductId: Number(formData.fdProductId),
          applicableDate: formData.applicableDate,
        },
        fdInterestSlabDetails: interestSlabs.map((slab) => ({
          branchId: user.branchid,
          fdIntSlabId: Number(slab.fdIntSlabId),
          ageFrom: Number(slab.ageFrom),
          ageTo: Number(slab.ageTo),
          interestRate: Number(slab.interestRate)
        })),
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
            `FD Interest Slab Detail ${isEditMode ? "updated" : "saved"} successfully!`,
          confirmButtonColor: "#3B82F6",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          if (isEditMode) {
            navigate("/fd-interest-slab-info");
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
  const fdSlabOptions = fdSlabs.map((slabs) => ({
    value: slabs.id,
    label: slabs.slabName,
  }));

  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Percent className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Modify" : "Add"} FD Interest Slab Detail
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure age-wise interest rates for FD products
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/fd-interest-slab-info")
                      : navigate("/slab-operations")
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="space-y-8">
                  {/* Basic Information */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-6 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      1. Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* FD Product Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              minHeight: '42px',
                              borderColor: validationErrors.fdProductId
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.fdProductId && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-2">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.fdProductId}
                          </span>
                        )}
                      </div>

                      {/* Applicable Date Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            Applicable Date
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="date"
                          value={formData.applicableDate}
                          onChange={(e) =>
                            commonservice.handleDateChange(
                              e.target.value,
                              (val) => handleInputChange("applicableDate", val),
                              "applicableDate"
                            )
                          }
                          max={commonservice.getTodaysDate()}
                          className={`w-full px-4 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
                            validationErrors.applicableDate
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                          readOnly={isEditMode}
                        />
                        {validationErrors.applicableDate && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-2">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.applicableDate}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          This date will apply to all age slabs
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Age Wise Interest Rate Set */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                        <Percent className="w-5 h-5" />
                        2. Age Wise Interest Rate Set
                      </h3>
                      <button
                        onClick={handleAddSlab}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add Slab
                      </button>
                    </div>

                    {validationErrors.slabs && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-red-600 text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.slabs}
                        </span>
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-semibold min-w-[20px]">1.</span>
                          <span>Select FD Slab for each row - MANDATORY.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-semibold min-w-[20px]">2.</span>
                          <span>Enter Age From and Age To for each slab.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-semibold min-w-[20px]">3.</span>
                          <span>Enter Interest Rate (%) - MANDATORY.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-semibold min-w-[20px]">4.</span>
                          <span>Click Add Slab to add more age ranges.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-semibold min-w-[20px]">5.</span>
                          <span>Click Save to store all slab ranges.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Slabs Table - ✅ Removed Applicable Date Column */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <th className="border border-gray-300 px-3 py-4 text-sm font-semibold w-[80px]">
                              Slab No
                            </th>
                            <th className="border border-gray-300 px-4 py-4 text-sm font-semibold w-[300px]">
                              FD Slab *
                            </th>
                            <th className="border border-gray-300 px-4 py-4 text-sm font-semibold w-[140px]">
                              Age From
                            </th>
                            <th className="border border-gray-300 px-4 py-4 text-sm font-semibold w-[140px]">
                              Age To
                            </th>
                            <th className="border border-gray-300 px-4 py-4 text-sm font-semibold w-[180px]">
                              Interest Rate (%) *
                            </th>
                            <th className="border border-gray-300 px-3 py-4 text-sm font-semibold w-[100px]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {interestSlabs.map((slab, index) => (
                            <tr
                              key={index}
                              className={`${
                                index % 2 === 0 ? "bg-blue-50" : "bg-white"
                              } hover:bg-blue-100 transition-colors`}
                            >
                              <td className="border border-gray-300 text-center px-3 py-3 text-sm font-medium">
                                {slab.slabNo}
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <Select
                                  instanceId={`slab-fd-slab-${index}`}
                                  options={fdSlabOptions}
                                  value={
                                    fdSlabOptions.find(
                                      (opt) => opt.value === Number(slab.fdIntSlabId)
                                    ) || null
                                  }
                                  onChange={(selectedOption) =>
                                    handleSlabFDProductChange(index, selectedOption)
                                  }
                                  placeholder="Select Slab"
                                  isClearable
                                  className="text-sm"
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    control: (base) => ({
                                      ...base,
                                      minHeight: '38px',
                                      fontSize: '13px',
                                    }),
                                  }}
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-3">
                                <input
                                  type="text"
                                  value={slab.ageFrom}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-center"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-3">
                                <input
                                  type="text"
                                  value={slab.ageTo}
                                  onChange={(e) =>
                                    handleSlabChange(
                                      index,
                                      "ageTo",
                                      e.target.value
                                    )
                                  }
                                  className="w-full text-center px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                  placeholder="Enter Age To"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-3">
                                <input
                                  type="text"
                                  value={slab.interestRate}
                                  onChange={(e) =>
                                    handleSlabChange(
                                      index,
                                      "interestRate",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 text-center border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                  placeholder="e.g., 6.5"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-3 text-center">
                                <button
                                  onClick={() => handleRemoveSlab(index)}
                                  disabled={interestSlabs.length === 1}
                                  className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Remove Slab"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                        {isEditMode ? "Update" : "Save"} FD Interest Slab Detail
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

export default FDInterestSlab;
