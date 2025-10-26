import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import branchwiserule, {
  FDProductBranchwiseRuleDTO,
} from "../../../services/branchwiserule/branchwiserules";
import {
  Save,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Calendar,
  Landmark,
  AlertCircle,
  RotateCcw,
  Calculator,
  Hash,
  FileText,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";

// Define your interfaces/types
interface FDProduct {
  id: number;
  productName: string;
}

interface AccountMaster {
  accId: number;
  accountName: string;
}

interface ValidationErrors {
  fdProductId?: string;
  interestCalculationMethod?: string;
  DaysInAYear?: string;
  accNoGeneration?: string;
  intExpenseAccount?: string;
  closingChargesAccount?: string;
  intPayableAccount?: string;
}



// Interest Calculation Method Options
const interestCalculationMethods = [
  { value: 1, label: "Method 1" },
  { value: 2, label: "Method 2" },
  { value: 3, label: "Method 3" },
  { value: 4, label: "Method 4" },
];

// Days in Year Options
const DaysInAYearOptions = [
  { value: 360, label: "360 Days" },
  { value: 365, label: "365 Days" },
];

// Account Number Generation Options
const accNoGenerationOptions = [
  { value: 1, label: "Product Wise" },
  { value: 2, label: "Continuous" },
];

const FDProductBranchwiserule = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [loadingProductData, setLoadingProductData] = useState(false);
  const [fdProducts, setFDProducts] = useState<FDProduct[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Ref for auto-focus
  const fdProductSelectRef = useRef<any>(null);

  // Form data state
  const [formData, setFormData] = useState({
    id: null as number | null,
    branchId: user.branchid,
    fdProductId: 0,
    interestCalculationMethod: 0,
    DaysInAYear: 0,
    accNoGeneration: 0,
    intExpenseAccount: 0,
    closingChargesAccount: 0,
    intPayableAccount: 0,
  });

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        // TODO: Replace with your actual API service calls
        const fdProductsResponse = await commonservice.fetch_fd_products(user.branchid);
        const accountsResponse =
          await commonservice.general_accmasters_info(user.branchid);

        setFDProducts(fdProductsResponse.data);
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
      case "fdProductId":
        if (!value || value === 0) {
          return "FD Product is required";
        }
        break;
      case "interestCalculationMethod":
        if (!value || value === 0) {
          return "Interest Calculation Method is required";
        }
        break;
      case "DaysInAYear":
        if (!value || value === 0) {
          return "Days in Year is required";
        }
        break;
      case "accNoGeneration":
        if (!value || value === "") {
          return "Account Number Generation is required";
        }
        break;
      case "intExpenseAccount":
        if (!value || value === 0) {
          return "Interest Expense Account is required";
        }
        break;
      case "closingChargesAccount":
        if (!value || value === 0) {
          return "Closing Charges Account is required";
        }
        break;
      case "intPayableAccount":
        if (!value || value === 0) {
          return "Interest Payable Account is required";
        }
        break;
      default:
        return undefined;
    }
    return undefined;
  };

  // Validate all fields - only called on save
  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    const fdProductError = validateField("fdProductId", formData.fdProductId);
    if (fdProductError) errors.fdProductId = fdProductError;

    const methodError = validateField(
      "interestCalculationMethod",
      formData.interestCalculationMethod
    );
    if (methodError) errors.interestCalculationMethod = methodError;

    const daysError = validateField("DaysInAYear", formData.DaysInAYear);
    if (daysError) errors.DaysInAYear = daysError;

    const accountGenError = validateField(
      "accNoGeneration",
      formData.accNoGeneration
    );
    if (accountGenError) errors.accNoGeneration = accountGenError;

    const interestExpenseError = validateField(
      "intExpenseAccount",
      formData.intExpenseAccount
    );
    if (interestExpenseError) errors.intExpenseAccount = interestExpenseError;

    const closingChargesError = validateField(
      "closingChargesAccount",
      formData.closingChargesAccount
    );
    if (closingChargesError) errors.closingChargesAccount = closingChargesError;

    const interestPayableError = validateField(
      "intPayableAccount",
      formData.intPayableAccount
    );
    if (interestPayableError) errors.intPayableAccount = interestPayableError;

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Fetch data based on selected product
  const fetchProductSpecificData = async (productId: number) => {
    if (!productId || productId === 0) return;

    setLoadingProductData(true);
    try {
      // TODO: Replace with your actual API service call
      const response = await branchwiserule.get_fd_branchwiserule_data(productId, user.branchid);

      if (response.success && response.data) {
        setFormData((prev) => ({
          ...prev,
          id: response.data.id || null,
          interestCalculationMethod: response.data.interestCalculationMethod || 0,
          DaysInAYear: response.data.daysInAYear || 0,
          accNoGeneration: response.data.accNoGeneration || 0,
          intExpenseAccount: response.data.intExpenseAccount || 0,
          closingChargesAccount: response.data.closingChargesAccount || 0,
          intPayableAccount: response.data.intPayableAccount || 0,
        }));
      } else {
        // No existing data found for this product, reset fields
        setFormData((prev) => ({
          ...prev,
          id: null,
          interestCalculationMethod: 0,
          DaysInAYear: 0,
          accNoGeneration: 0,
          intExpenseAccount: 0,
          closingChargesAccount: 0,
          intPayableAccount: 0,
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

  // Handle FD product change
  const handleFDProductChange = async (selectedOption: any) => {
    const productId = selectedOption ? selectedOption.value : 0;

    // Update the FD product ID
    handleInputChange("fdProductId", productId);

    // Fetch data for the selected product
    if (productId > 0) {
      await fetchProductSpecificData(productId);
    } else {
      // Reset form if no product selected
      setFormData((prev) => ({
        ...prev,
        fdProductId: 0,
        id: null,
        interestCalculationMethod: 0,
        DaysInAYear: 0,
        accNoGeneration: 0,
        intExpenseAccount: 0,
        closingChargesAccount: 0,
        intPayableAccount: 0,
      }));
    }
  };

  // Reset form functionality
  const handleReset = () => {
    setFormData({
      id: null,
      branchId: user.branchid,
      fdProductId: 0,
      interestCalculationMethod: 0,
      DaysInAYear: 0,
      accNoGeneration: 0,
      intExpenseAccount: 0,
      closingChargesAccount: 0,
      intPayableAccount: 0,
    });
    setValidationErrors({});
    setLoading(false);
    setLoadingProductData(false);

    // Focus on the first field
    setTimeout(() => {
      if (fdProductSelectRef.current) {
        fdProductSelectRef.current.focus();
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
      const dto: FDProductBranchwiseRuleDTO = {
        Id: formData.id || undefined,
        BranchId: user.branchid,
        FDProductId: Number(formData.fdProductId),
        InterestCalculationMethod: Number(formData.interestCalculationMethod),
        DaysInAYear: Number(formData.DaysInAYear),
        AccNoGeneration: Number(formData.accNoGeneration) ?? 0,
        IntExpenseAccount: Number(formData.intExpenseAccount),
        ClosingChargesAccount: Number(formData.closingChargesAccount),
        IntPayableAccount: Number(formData.intPayableAccount),
      };

      console.log("Submitting DTO:", dto);

      // TODO: Replace with your actual API service call
      const res = await branchwiserule.insert_fd_product_branchwise_rule(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "FD Product Configuration saved successfully!",
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
  const fdProductOptions = fdProducts.map((product) => ({
    value: product.id,
    label: product.productName,
  }));

  const accountOptions = accounts.map((account) => ({
    value: account.accId,
    label: account.accountName,
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
                    <FileText className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      FD Product Configuration
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure Fixed Deposit product settings and account mappings
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
                  {/* Product Selection Section */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Landmark className="w-5 h-5" />
                      Product Selection
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
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
                          value={
                            fdProductOptions.find(
                              (opt) => opt.value === Number(formData.fdProductId)
                            ) || null
                          }
                          onChange={handleFDProductChange}
                          placeholder="Select FD Product (e.g., FD Member)"
                          isClearable
                          isDisabled={loadingProductData}
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
                        <p className="text-xs text-gray-500 mt-1">
                          Select the applicable FD Product to configure
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Settings Section */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Calculation Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Interest Calculation Method */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-green-500" />
                            Interest Calculation Method
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="interestCalculationMethod"
                          instanceId="interest-calculation-method-select"
                          options={interestCalculationMethods}
                          value={
                            interestCalculationMethods.find(
                              (opt) =>
                                opt.value === Number(formData.interestCalculationMethod)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "interestCalculationMethod",
                              selected ? selected.value : 0
                            )
                          }
                          placeholder="Select Method"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.interestCalculationMethod
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.interestCalculationMethod
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.interestCalculationMethod && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.interestCalculationMethod}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Choose calculation method for interest
                        </p>
                      </div>

                      {/* Days in Year */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            Days in a Year
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="DaysInAYear"
                          instanceId="days-in-year-select"
                          options={DaysInAYearOptions}
                          value={
                            DaysInAYearOptions.find(
                              (opt) => opt.value === Number(formData.DaysInAYear)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange("DaysInAYear", selected ? selected.value : 0)
                          }
                          placeholder="Select Days"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.DaysInAYear ? "border-red-500" : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.DaysInAYear
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.DaysInAYear && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.DaysInAYear}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Select year calculation basis
                        </p>
                      </div>

                      {/* Account Number Generation */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-purple-500" />
                            Account Number Generation
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="accNoGeneration"
                          instanceId="account-number-generation-select"
                          options={accNoGenerationOptions}
                          value={
                            accNoGenerationOptions.find(
                              (opt) => opt.value === formData.accNoGeneration
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "accNoGeneration",
                              selected ? selected.value : ""
                            )
                          }
                          placeholder="Select Generation Type"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.accNoGeneration
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.accNoGeneration
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.accNoGeneration && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.accNoGeneration}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Product Wise or Continuous numbering
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Mapping Section */}
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Account Mappings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Interest Expense Account */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-red-500" />
                            Interest Expense Account
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="intExpenseAccount"
                          instanceId="interest-expense-account-select"
                          options={accountOptions}
                          value={
                            accountOptions.find(
                              (opt) =>
                                opt.value === Number(formData.intExpenseAccount)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "intExpenseAccount",
                              selected ? selected.value : 0
                            )
                          }
                          placeholder="Select Account"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.intExpenseAccount
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.intExpenseAccount
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.intExpenseAccount && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.intExpenseAccount}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          E.g., Interest Paid on FD
                        </p>
                      </div>

                      {/* Closing Charges Account */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-orange-500" />
                            Closing Charges Account
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="closingChargesAccount"
                          instanceId="closing-charges-account-select"
                          options={accountOptions}
                          value={
                            accountOptions.find(
                              (opt) =>
                                opt.value === Number(formData.closingChargesAccount)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "closingChargesAccount",
                              selected ? selected.value : 0
                            )
                          }
                          placeholder="Select Account"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.closingChargesAccount ? "border-red-500" : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.closingChargesAccount
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.closingChargesAccount && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.closingChargesAccount}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          E.g., Account Closing Charges
                        </p>
                      </div>

                      {/* Interest Payable Account */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            Interest Payable Account
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <Select
                          id="intPayableAccount"
                          instanceId="interest-payable-account-select"
                          options={accountOptions}
                          value={
                            accountOptions.find(
                              (opt) =>
                                opt.value === Number(formData.intPayableAccount)
                            ) || null
                          }
                          onChange={(selected) =>
                            handleInputChange(
                              "intPayableAccount",
                              selected ? selected.value : 0
                            )
                          }
                          placeholder="Select Account"
                          isClearable
                          isDisabled={loadingProductData}
                          className={`text-sm ${
                            validationErrors.intPayableAccount
                              ? "border-red-500"
                              : ""
                          }`}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({
                              ...base,
                              borderColor: validationErrors.intPayableAccount
                                ? "#ef4444"
                                : base.borderColor,
                            }),
                          }}
                        />
                        {validationErrors.intPayableAccount && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.intPayableAccount}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          E.g., Interest Payable on FD
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
                        Save FD Configuration
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

export default FDProductBranchwiserule;
