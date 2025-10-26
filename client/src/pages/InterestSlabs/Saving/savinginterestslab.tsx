import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  Save,
  ArrowLeft,
  Percent,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Landmark,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import interestSlabService, {
  SavingAccountInterestSlabDTO,
} from "../../../services/interestslab/interestslabservice";

// Define your interfaces/types
interface SavingProduct {
  id: number;
  productName: string;
}

interface InterestSlab {
  slabNo: number;
  fromAmount: string;
  toAmount: string;
  interestRate: string;
}

interface ValidationErrors {
  savingProductId?: string;
  applicableDate?: string;
  slabs?: string;
}

const SavingAccountInterestSlab = () => {
  const navigate = useNavigate();
  const { slabId: encryptedId } = useParams<{ slabId?: string }>();
  const slabId = encryptedId ? parseInt(encryptedId) : null;
  const isEditMode = !!slabId;

  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Ref for auto-focus
  const savingProductSelectRef = useRef<any>(null);

  // Form data state
  const [formData, setFormData] = useState({
    id: null as number | null,
    branchId: user.branchid,
    savingProductId: 0,
    applicableDate: commonservice.getTodaysDate(),
  });

  // Interest slabs state
  const [interestSlabs, setInterestSlabs] = useState<InterestSlab[]>([
    { slabNo: 1, fromAmount: "0", toAmount: "", interestRate: "" },
  ]);

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const savingProductsResponse =
          await commonservice.fetch_saving_products(user.branchid);
        setSavingProducts(savingProductsResponse.data);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchRequiredData();
  }, [user.branchid]);

  // Fetch interest slab data if in edit mode
  useEffect(() => {
    const fetchInterestSlabData = async () => {
      if (isEditMode && slabId) {
        try {
          Swal.fire({
            title: "Loading Interest Slab Data...",
            text: "Please wait",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          const response = await interestSlabService.getInterestSlabById(
            slabId,
            user.branchid
          );

          if (response.success && response.data) {
            const data = response.data;

            // Populate form data
            setFormData({
              id: data.id || null,
              branchId: user.branchid,
              savingProductId: data.savingProductId || 0,
              applicableDate: commonservice.splitDate(data.applicableDate),
            });

            // Populate slabs
            if (data.interestSlabs && data.interestSlabs.length > 0) {
              setInterestSlabs(
                data.interestSlabs.map((slab: any, index: number) => ({
                  slabNo: index + 1,
                  fromAmount: slab.fromAmount?.toString() || "0",
                  toAmount: slab.toAmount?.toString() || "",
                  interestRate: slab.interestRate?.toString() || "",
                }))
              );
            }

            Swal.close();
          } else {
            Swal.fire("Error", "Interest Slab not found", "error");
            navigate("/interest-slab-operations");
          }
        } catch (error: any) {
          console.error("Error fetching interest slab:", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: error.message || "Failed to load interest slab data",
          });
          navigate("/interest-slab-operations");
        }
      }
    };

    fetchInterestSlabData();
  }, [slabId, isEditMode, user.branchid, navigate]);

  // Validation function
  const validateField = (fieldName: string, value: any): string | undefined => {
    switch (fieldName) {
      case "savingProductId":
        if (!value || value === 0) {
          return "Saving Product is required";
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

  // Validate slabs
  const validateSlabs = (): string | undefined => {
    if (interestSlabs.length === 0) {
      return "At least one interest slab is required";
    }

    for (let i = 0; i < interestSlabs.length; i++) {
      const slab = interestSlabs[i];

      if (!slab.toAmount || slab.toAmount === "") {
        return `Slab ${i + 1}: To Amount is required`;
      }

      if (!slab.interestRate || slab.interestRate === "") {
        return `Slab ${i + 1}: Interest Rate is required`;
      }

      const fromAmt = parseFloat(slab.fromAmount);
      const toAmt = parseFloat(slab.toAmount);
      const rate = parseFloat(slab.interestRate);

      if (isNaN(fromAmt) || fromAmt < 0) {
        return `Slab ${i + 1}: Invalid From Amount`;
      }

      if (isNaN(toAmt) || toAmt < 0) {
        return `Slab ${i + 1}: Invalid To Amount`;
      }

      if (isNaN(rate) || rate < 0 || rate > 100) {
        return `Slab ${i + 1}: Interest Rate must be between 0 and 100`;
      }

      if (toAmt <= fromAmt) {
        return `Slab ${i + 1}: To Amount must be greater than From Amount`;
      }

      // Check for overlapping slabs
      if (i > 0) {
        const prevSlab = interestSlabs[i - 1];
        const prevToAmt = parseFloat(prevSlab.toAmount);
        if (fromAmt !== prevToAmt + 1) {
          return `Slab ${i + 1}: From Amount should be ${prevToAmt + 1}`;
        }
      }
    }

    return undefined;
  };

  // Validate all fields - only called on save
  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    const savingProductError = validateField(
      "savingProductId",
      formData.savingProductId
    );
    if (savingProductError) errors.savingProductId = savingProductError;

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

    // Clear error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Handle saving product change
  const handleSavingProductChange = (selectedOption: any) => {
    const productId = selectedOption ? selectedOption.value : 0;
    handleInputChange("savingProductId", productId);
  };

  // Handle slab field change
  const handleSlabChange = (
    index: number,
    field: keyof InterestSlab,
    value: string
  ) => {
    // Only allow numeric input with decimal
    if (field === "toAmount" || field === "interestRate") {
      // Allow numbers and single decimal point
      let numericValue = value.replace(/[^0-9.]/g, "");
      
      // Ensure only one decimal point
      const parts = numericValue.split(".");
      if (parts.length > 2) {
        numericValue = parts[0] + "." + parts.slice(1).join("");
      }
      
      // Limit decimal places
      if (parts.length === 2) {
        numericValue = parts[0] + "." + parts[1].substring(0, 2);
      }
      
      value = numericValue;
    }

    const newSlabs = [...interestSlabs];
    newSlabs[index] = { ...newSlabs[index], [field]: value };

    // Auto-update next slab's fromAmount
    if (field === "toAmount" && index < interestSlabs.length - 1) {
      const toAmountValue = parseFloat(value);
      if (!isNaN(toAmountValue)) {
        newSlabs[index + 1].fromAmount = (toAmountValue + 1).toString();
      }
    }

    setInterestSlabs(newSlabs);

    // Clear slab errors
    if (validationErrors.slabs) {
      setValidationErrors((prev) => ({ ...prev, slabs: undefined }));
    }
  };

  // Add new slab
  const handleAddSlab = () => {
    const lastSlab = interestSlabs[interestSlabs.length - 1];
    const lastToAmount = parseFloat(lastSlab.toAmount);

    if (isNaN(lastToAmount) || lastToAmount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Input",
        text: "Please complete the current slab before adding a new one",
      });
      return;
    }

    const newSlab: InterestSlab = {
      slabNo: interestSlabs.length + 1,
      fromAmount: (lastToAmount + 1).toString(),
      toAmount: "",
      interestRate: "",
    };

    setInterestSlabs([...interestSlabs, newSlab]);
  };

  // Remove slab
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
    // Renumber slabs
    newSlabs.forEach((slab, i) => {
      slab.slabNo = i + 1;
      // Update fromAmount for slabs after the removed one
      if (i > 0) {
        const prevToAmount = parseFloat(newSlabs[i - 1].toAmount);
        if (!isNaN(prevToAmount)) {
          slab.fromAmount = (prevToAmount + 1).toString();
        }
      } else {
        // First slab always starts from 0
        slab.fromAmount = "0";
      }
    });

    setInterestSlabs(newSlabs);
  };

  // Reset form functionality - not allowed in edit mode
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
      savingProductId: 0,
      applicableDate: commonservice.getTodaysDate(),
    });
    setInterestSlabs([
      { slabNo: 1, fromAmount: "0", toAmount: "", interestRate: "" },
    ]);
    setValidationErrors({});
    setLoading(false);

    setTimeout(() => {
      if (savingProductSelectRef.current) {
        savingProductSelectRef.current.focus();
      }
    }, 100);
  };

  const handleSubmit = async () => {
    // Validate only on save
    const validation = validateForm();

    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).filter(Boolean);

      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `
        <div class="text-left">
          <p class="mb-3">Please fix the following ${errorMessages.length} error(s):</p>
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
      const dto: SavingAccountInterestSlabDTO = {
        id: formData.id || undefined,
        branchId: user.branchid,
        savingProductId: Number(formData.savingProductId),
        applicableDate: formData.applicableDate,
        interestSlabs: interestSlabs.map((slab) => ({
          slabNo: slab.slabNo,
          fromAmount: Number(slab.fromAmount),
          toAmount: Number(slab.toAmount),
          interestRate: Number(slab.interestRate),
        })),
      };

      console.log("Submitting DTO:", dto);

      const res = isEditMode
        ? await interestSlabService.updateInterestSlab(dto)
        : await interestSlabService.createInterestSlab(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            res.message ||
            `Interest Slab ${isEditMode ? "updated" : "saved"} successfully!`,
          confirmButtonColor: "#3B82F6",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          if (isEditMode) {
            navigate("/interest-slab-operations");
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

  // Prepare dropdown options
  const savingProductOptions = savingProducts.map((product) => ({
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
                      {isEditMode ? "Modify" : "Add"} Saving Account Interest
                      Slab
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure balance-wise interest rates for saving products
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/interest-slab-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="space-y-6">
                  {/* Product Selection Section */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Landmark className="w-5 h-5" />
                      1. Select Saving Product
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Saving Product Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            Saving Product
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          ref={savingProductSelectRef}
                          id="savingProductId"
                          instanceId="saving-product-select"
                          options={savingProductOptions}
                          value={
                            savingProductOptions.find(
                              (opt) =>
                                opt.value === Number(formData.savingProductId)
                            ) || null
                          }
                          onChange={handleSavingProductChange}
                          placeholder="Eg. Member Deposit"
                          isClearable
                          className={`text-sm ${
                            validationErrors.savingProductId
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.savingProductId
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.savingProductId && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.savingProductId}
                          </span>
                        )}
                      </div>

                      {/* Applicable Date Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            handleInputChange("applicableDate", e.target.value)
                          }
                          max={commonservice.getTodaysDate()}
                          className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
                            validationErrors.applicableDate
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                        />
                        {validationErrors.applicableDate && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.applicableDate}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Define the date from which the slab will be effective
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interest Slabs Section */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                        <Percent className="w-5 h-5" />
                        3. Balance Wise Interest Rate Set
                      </h3>
                      <button
                        onClick={handleAddSlab}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                      >
                        <Plus className="w-4 h-4" />
                        Add Slab
                      </button>
                    </div>

                    {validationErrors.slabs && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-red-600 text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.slabs}
                        </span>
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>
                          1. Enter From Amount and To Amount for each slab.
                        </li>
                        <li>2. Enter Interest Rate (%).</li>
                        <li>3. Click OK to confirm.</li>
                        <li>4. Click Save to store all slab ranges.</li>
                      </ul>
                    </div>

                    {/* Slabs Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                              Slab No
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                              From Amount
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                              To Amount
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">
                              Interest Rate (%)
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">
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
                              <td className="border border-gray-300 px-4 py-3 text-sm font-medium">
                                {slab.slabNo}
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
                                <input
                                  type="text"
                                  value={slab.fromAmount}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                                />
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
                                <input
                                  type="text"
                                  value={slab.toAmount}
                                  onChange={(e) =>
                                    handleSlabChange(
                                      index,
                                      "toAmount",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                  placeholder="Enter To Amount"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
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
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                  placeholder="e.g., 3.0"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-center">
                                <button
                                  onClick={() => handleRemoveSlab(index)}
                                  disabled={interestSlabs.length === 1}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

                    {/* Example Table */}
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Example Table
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-700 text-white">
                              <th className="border border-gray-400 px-4 py-2 text-left">
                                Slab No
                              </th>
                              <th className="border border-gray-400 px-4 py-2 text-left">
                                From Amount
                              </th>
                              <th className="border border-gray-400 px-4 py-2 text-left">
                                To Amount
                              </th>
                              <th className="border border-gray-400 px-4 py-2 text-left">
                                Interest Rate (%)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-blue-100">
                              <td className="border border-gray-400 px-4 py-2">
                                1
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                0
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                10,000
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                3.0
                              </td>
                            </tr>
                            <tr className="bg-gray-200">
                              <td className="border border-gray-400 px-4 py-2">
                                2
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                10,001
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                50,000
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                4.0
                              </td>
                            </tr>
                            <tr className="bg-blue-100">
                              <td className="border border-gray-400 px-4 py-2">
                                3
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                50,001
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                100,000
                              </td>
                              <td className="border border-gray-400 px-4 py-2">
                                5.0
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
                        {isEditMode ? "Update" : "Save"} Interest Slab
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

export default SavingAccountInterestSlab;
