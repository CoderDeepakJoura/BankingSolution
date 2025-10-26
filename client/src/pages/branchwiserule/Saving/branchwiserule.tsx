import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  Save,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Calendar,
  Landmark,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import branchwiserule, {
  SavingProductBranchwiseRuleDTO,
} from "../../../services/branchwiserule/branchwiserules";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import branchwiserules from "../../../services/branchwiserule/branchwiserules";

// Define your interfaces/types
interface SavingProduct {
  id: number;
  productName: string;
}

interface AccountMaster {
  accId: number;
  accountName: string;
}

interface ValidationErrors {
  savingProductId?: string;
  intexpaccount?: string;
  depwithdrawlimitinterval?: string;
  depwithdrawlimit?: string;
}

// Interval options
const intervalOptions = [
  { value: 1, label: "Daily" },
  { value: 7, label: "Weekly" },
  { value: 30, label: "Monthly" },
];

const BranchWiseRule = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [loadingProductData, setLoadingProductData] = useState(false);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Ref for auto-focus
  const savingProductSelectRef = useRef<any>(null);

  // Form data state
  const [formData, setFormData] = useState({
    id: null as number | null,
    branchId: user.branchid,
    savingProductId: 0,
    intexpaccount: 0,
    depwithdrawlimitinterval: 0,
    depwithdrawlimit: "",
  });

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const savingProductsResponse =
          await commonservice.fetch_saving_products(user.branchid);
        const accountsResponse =
          await commonservice.general_accmasters_info(user.branchid);

        setSavingProducts(savingProductsResponse.data);
        setAccounts(accountsResponse.data);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchRequiredData();
  }, [user.branchid]);

  // Validation function
  const validateField = (fieldName: string, value: any): string | undefined => {
    switch (fieldName) {
      case "savingProductId":
        if (!value || value === 0) {
          return "Saving Product is required";
        }
        break;
      case "intexpaccount":
        if (!value || value === 0) {
          return "Interest/Expense Account is required";
        }
        break;
      case "depwithdrawlimitinterval":
        if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
          return "Interval must be a positive number";
        }
        break;
      case "depwithdrawlimit":
        if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
          return "Limit amount must be a positive number";
        }
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  // Validate all fields - only called on save
  // Returns errors object directly to avoid async state issues
  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    const savingProductError = validateField(
      "savingProductId",
      formData.savingProductId
    );
    if (savingProductError) errors.savingProductId = savingProductError;

    const intExpAccountError = validateField("intexpaccount", formData.intexpaccount);
    if (intExpAccountError) errors.intexpaccount = intExpAccountError;

    const intervalError = validateField(
      "depwithdrawlimitinterval",
      formData.depwithdrawlimitinterval
    );
    if (intervalError) errors.depwithdrawlimitinterval = intervalError;

    const limitError = validateField("depwithdrawlimit", formData.depwithdrawlimit);
    if (limitError) errors.depwithdrawlimit = limitError;

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Fetch data based on selected product
  const fetchProductSpecificData = async (productId: number) => {
    if (!productId || productId === 0) return;

    setLoadingProductData(true);
    try {
      const response = await branchwiserule.get_saving_branchwiserule_data(
        productId,
        user.branchid
      );

      if (response.success && response.data) {
        setFormData((prev) => ({
          ...prev,
          id: response.data.id || null,
          intexpaccount: response.data.intexpaccount || 0,
          depwithdrawlimitinterval: response.data.depwithdrawlimitinterval || 0,
          depwithdrawlimit: response.data.depwithdrawlimit?.toString() || "",
        }));
      } else {
        // No existing data found for this product, reset fields
        setFormData((prev) => ({
          ...prev,
          id: null,
          intexpaccount: 0,
          depwithdrawlimitinterval: 0,
          depwithdrawlimit: "",
        }));
      }
    } catch (err: any) {
      console.error("Error fetching product data:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load product-specific data",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setLoadingProductData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    allowDecimal: boolean = false,
    maxLength: number = 10
  ) => {
    let value = e.target.value;

    if (allowDecimal) {
      value = value.replace(/[^0-9.]/g, "");
      const decimalIndex = value.indexOf(".");
      if (decimalIndex !== -1) {
        value = value.substring(0, decimalIndex + 3);
      }
    } else {
      value = value.replace(/[^0-9]/g, "");
    }

    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
    }

    handleInputChange(field, value);
  };

  // Handle saving product change
  const handleSavingProductChange = async (selectedOption: any) => {
    const productId = selectedOption ? selectedOption.value : 0;

    // Update the saving product ID
    handleInputChange("savingProductId", productId);

    // Fetch data for the selected product
    if (productId > 0) {
      await fetchProductSpecificData(productId);
    } else {
      // Reset form if no product selected
      setFormData((prev) => ({
        ...prev,
        savingProductId: 0,
        id: null,
        intexpaccount: 0,
        depwithdrawlimitinterval: 0,
        depwithdrawlimit: "",
      }));
    }
  };

  // Handle interval change - empty the limit amount field
  const handleIntervalChange = (selectedOption: any) => {
    const intervalValue = selectedOption ? selectedOption.value : 0;
    handleInputChange("depwithdrawlimitinterval", intervalValue);
    // Empty the limit amount when interval changes
    handleInputChange("depwithdrawlimit", "");
  };

  // Reset form functionality
  const handleReset = () => {
    setFormData({
      id: null,
      branchId: user.branchid,
      savingProductId: 0,
      intexpaccount: 0,
      depwithdrawlimitinterval: 0,
      depwithdrawlimit: "",
    });
    setValidationErrors({});
    setLoading(false);
    setLoadingProductData(false);

    // Focus on the first field (Saving Product select)
    setTimeout(() => {
      if (savingProductSelectRef.current) {
        savingProductSelectRef.current.focus();
      }
    }, 100);
  };

  const handleSubmit = async () => {
    // Validate only on save - get errors directly from return value
    const validation = validateForm();

    if (!validation.isValid) {
      // Build error messages from the returned errors object
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
      const dto: SavingProductBranchwiseRuleDTO = {
        Id: formData.id || undefined,
        BranchId: user.branchid,
        SavingProductId: Number(formData.savingProductId),
        IntExpAccount: Number(formData.intexpaccount),
        DepWithdrawLimitInterval: formData.depwithdrawlimitinterval
          ? Number(formData.depwithdrawlimitinterval)
          : undefined,
        DepWithdrawLimit: formData.depwithdrawlimit
          ? Number(formData.depwithdrawlimit)
          : undefined,
      };

      const res = await branchwiserules.insert_saving_product_branchwise_rule(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "Branch Wise Rule saved successfully!",
          confirmButtonColor: "#3B82F6",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          handleReset();
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

  const accountOptions = accounts.map((account) => ({
    value: account.accId,
    label: account.accountName,
  }));

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Branch Wise Rule Configuration
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure deposit and withdrawal limits for saving products
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Loading Overlay */}
            {loadingProductData && (
              <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Loading product data...</span>
              </div>
            )}

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="space-y-6">
                  {/* Product Configuration Section */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Landmark className="w-5 h-5" />
                      Product & Account Configuration
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
                              (opt) => opt.value === Number(formData.savingProductId)
                            ) || null
                          }
                          onChange={handleSavingProductChange}
                          placeholder="Select Saving Product"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.savingProductId ? "border-red-500" : ""
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
                        <p className="text-xs text-gray-500 mt-1">
                          Select a product to load existing configuration
                        </p>
                      </div>

                      {/* Interest/Expense Account Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            Interest/Expense Account
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="intexpaccount"
                          instanceId="intexpaccount-select"
                          options={accountOptions}
                          value={
                            accountOptions.find(
                              (opt) => opt.value === Number(formData.intexpaccount)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "intexpaccount",
                              selected ? selected.value : 0
                            )
                          }
                          placeholder="Select Interest/Expense Account"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.intexpaccount ? "border-red-500" : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.intexpaccount
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.intexpaccount && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.intexpaccount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Limit Configuration Section */}
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Deposit/Withdraw Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Limit Interval Field - Dropdown */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            Limit Interval
                          </span>
                        </label>
                        <Select
                          id="depwithdrawlimitinterval"
                          instanceId="depwithdrawlimitinterval-select"
                          options={intervalOptions}
                          value={
                            intervalOptions.find(
                              (opt) =>
                                opt.value === Number(formData.depwithdrawlimitinterval)
                            ) || null
                          }
                          onChange={handleIntervalChange}
                          placeholder="Select Interval Type"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.depwithdrawlimitinterval
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.depwithdrawlimitinterval
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.depwithdrawlimitinterval && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.depwithdrawlimitinterval}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Select the time period for the limit (changes will clear the
                          limit amount)
                        </p>
                      </div>

                      {/* Limit Amount Field */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            Deposit/Withdraw Limit Amount
                          </span>
                        </label>
                        <input
                          type="text"
                          value={formData.depwithdrawlimit}
                          onChange={(e) =>
                            handleNumericInput(e, "depwithdrawlimit", true, 15)
                          }
                          disabled={loadingProductData}
                          className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                            validationErrors.depwithdrawlimit
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                          placeholder="0.00"
                          inputMode="decimal"
                          maxLength={15}
                        />
                        {validationErrors.depwithdrawlimit && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.depwithdrawlimit}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum amount allowed for deposit/withdrawal per interval
                        </p>
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
                    disabled={loading || loadingProductData}
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
                        Save Branch Wise Rule
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

export default BranchWiseRule;
