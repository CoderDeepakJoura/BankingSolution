// pages/productmasters/Savings/savings-product-master.tsx
import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../../../services/Validations/ProductMasters/Saving/useFormValidation";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { encryptId, decryptId } from "../../../utils/encryption";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import commonservice from "../../../services/common/commonservice";
import savingsProductApiService, {
  CombinedSavingsDTO,
  SavingsProductDTO,
  SavingsProductRulesDTO,
  SavingsProductPostingHeadsDTO,
  SavingsProductInterestRulesDTO,
} from "../../../services/productmasters/Saving/savingproductapi";
import {
  User,
  CreditCard,
  Save,
  RotateCcw,
  ArrowLeft,
  Banknote,
  Settings,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import { AccountHead } from "../../accounthead/accounthead/accounthead-master";

const SavingsProductMaster = () => {
  const navigate = useNavigate();
  const { productId: encryptedId } = useParams<{ productId?: string }>();
  const productNameref = useRef(null);
  const productCoderef = useRef(null);
  const productId = encryptedId ? decryptId(encryptedId) : null;
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();

  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("header");
  const [loading, setLoading] = useState(false);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const isEditMode = !!productId;

  const getCurrentDate = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const formatDatesInDTO = (data: CombinedSavingsDTO): CombinedSavingsDTO => {
    return {
      savingsProductDTO: {
        ...data.savingsProductDTO!,
        effectiveFrom: data.savingsProductDTO?.effectiveFrom
          ? commonservice.splitDate(data.savingsProductDTO.effectiveFrom)
          : getCurrentDate(),
        effectiveTill: data.savingsProductDTO?.effectiveTill
          ? commonservice.splitDate(data.savingsProductDTO.effectiveTill)
          : "",
      },
      savingsProductRulesDTO: {
        ...data.savingsProductRulesDTO!,
      },
      savingsProductPostingHeadsDTO: {
        ...data.savingsProductPostingHeadsDTO!,
      },
      savingsProductInterestRulesDTO: {
        ...data.savingsProductInterestRulesDTO!,
        applicableDate: data.savingsProductInterestRulesDTO?.applicableDate
          ? commonservice.splitDate(
              data.savingsProductInterestRulesDTO.applicableDate
            )
          : getCurrentDate(),
        intApplicableDate: data.savingsProductInterestRulesDTO
          ?.intApplicableDate
          ? commonservice.splitDate(
              data.savingsProductInterestRulesDTO.intApplicableDate
            )
          : getCurrentDate(),
      },
    };
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (value: number) => void,
    allowDecimal: boolean = false,
    maxLength?: number
  ) => {
    let value = e.target.value;

    if (maxLength && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }

    if (value === "") {
      callback(0);
      return;
    }

    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

    if (regex.test(value)) {
      const numValue = allowDecimal ? parseFloat(value) : parseInt(value);
      callback(isNaN(numValue) ? 0 : numValue);
    }
  };

  const handleDateChange = (
    value: string,
    callback: (value: string) => void,
    fieldName: string
  ) => {
    if (!value) {
      callback("");
      return;
    }

    const selectedDate = new Date(value);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      callback(value);
    } else {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Cannot select a future date.",
        timer: 2000,
        showConfirmButton: false,
      });
      callback(getCurrentDate());
    }
  };

  const [combinedSavingsData, setCombinedSavingsData] =
    useState<CombinedSavingsDTO>({
      savingsProductDTO: {
        branchId: user.branchid,
        productName: "",
        productCode: "",
        effectiveFrom: getCurrentDate(),
        effectiveTill: "",
      },
      savingsProductRulesDTO: {
        branchId: user.branchid,
        acStatementFrequency: 0,
        acRetentionDays: 0,
        minBalanceAmt: 0,
      },
      savingsProductPostingHeadsDTO: {
        branchId: user.branchid,
        principalBalHeadCode: 0,
        suspendedBalHeadCode: 0,
        intPayableHeadCode: 0,
      },
      savingsProductInterestRulesDTO: {
        branchId: user.branchid,
        applicableDate: getCurrentDate(),
        rateAppliedMethod: 0,
        intApplicableDate: getCurrentDate(),
        calculationMethod: 0,
        interestRateMinValue: 0,
        interestRateMaxValue: 0,
        interestVariationMinValue: 0,
        interestVariationMaxValue: 0,
        minPostingIntAmt: 0,
        minBalForPosting: 0,
        intPostingInterval: 0,
        intPostingDate: 0,
        compoundInterval: 0,
        intCompoundDate: 0,
        actionOnIntPosting: 0,
      },
    });

  useEffect(() => {
    if (isEditMode) {
      loadSavingsProduct(Number(productId));
    }
  }, [productId]);

  useEffect(() => {
    const fetchAccountHeads = async () => {
      try {
        const res = await AccountHeadApiService.fetchaccountheads(
          user.branchid
        );
        if (!res.success) throw new Error("Failed to load Account Heads");
        setAccountHeads(res.data || []);
      } catch (err: any) {
        console.error(err);
        Swal.fire(
          "Error",
          err.message || "Could not load account heads",
          "error"
        );
      }
    };
    fetchAccountHeads();
  }, [user.branchid]);

  const loadSavingsProduct = async (id: number) => {
    setLoading(true);
    try {
      const response = await savingsProductApiService.getSavingProductById(
        id,
        user.branchid
      );

      if (response.success && response.data) {
        const formattedData = formatDatesInDTO(response.data);
        setCombinedSavingsData(formattedData);
      } else {
        throw new Error(response.message || "Failed to load Savings Product");
      }
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to load Savings Product",
        confirmButtonColor: "#EF4444",
      });
      navigate("/savingproduct-operations");
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (field: keyof SavingsProductDTO, value: any) => {
    setCombinedSavingsData((prev) => ({
      ...prev,
      savingsProductDTO: {
        ...prev.savingsProductDTO!,
        [field]: value,
      },
    }));
  };

  const handleRulesChange = (
    field: keyof SavingsProductRulesDTO,
    value: any
  ) => {
    setCombinedSavingsData((prev) => ({
      ...prev,
      savingsProductRulesDTO: {
        ...prev.savingsProductRulesDTO!,
        [field]: value,
      },
    }));
  };

  const handlePostingHeadsChange = (
    field: keyof SavingsProductPostingHeadsDTO,
    value: any
  ) => {
    setCombinedSavingsData((prev) => ({
      ...prev,
      savingsProductPostingHeadsDTO: {
        ...prev.savingsProductPostingHeadsDTO!,
        [field]: value,
      },
    }));
  };

  const handleInterestRulesChange = (
    field: keyof SavingsProductInterestRulesDTO,
    value: any
  ) => {
    setCombinedSavingsData((prev) => ({
      ...prev,
      savingsProductInterestRulesDTO: {
        ...prev.savingsProductInterestRulesDTO!,
        [field]: value,
      },
    }));
  };

  const handleFieldBlur = async (fieldName: string, value: any = "") => {
    markFieldTouched(fieldName);
    if (fieldName == "productName") {
      const response = await commonservice.saving_productname_unique(
        user.branchid,
        value,
        productId ?? 0
      );
      if (response.success) {
        setCombinedSavingsData((prev) => ({
          ...prev,
          savingsProductDTO: {
            ...prev.savingsProductDTO!,
            productName: "",
          },
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            productNameref.current?.focus();
          },
        });
      }
    }

    if (fieldName == "productCode") {
      const response = await commonservice.saving_productcode_unique(
        user.branchid,
        value,
        productId ?? 0
      );
      if (response.success) {
        setCombinedSavingsData((prev) => ({
          ...prev,
          savingsProductDTO: {
            ...prev.savingsProductDTO!,
            productCode: ""
          },
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            productCoderef.current?.focus();
          },
        });
      }
    }
  };

  const validateAllDTOs = (): boolean => {
    const validation = validateForm(combinedSavingsData);

    if (!validation.isValid) {
      setShowValidationSummary(true);

      Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `
        <div class="text-left">
          <p class="mb-3">Please fix the following ${
            validation.errors.length
          } error(s):</p>
          <div class="max-h-48 overflow-y-auto text-sm">
            ${Object.entries(validation.errorsByTab)
              .map(
                ([tab, tabErrors]) => `
              <div class="mb-2">
                <strong class="text-blue-600">${
                  tab.charAt(0).toUpperCase() + tab.slice(1)
                }:</strong>
                <ul class="ml-4 list-disc">
                  ${(tabErrors as ValidationError[])
                    .slice(0, 3)
                    .map(
                      (error) =>
                        `<li class="text-red-600">${error.message}</li>`
                    )
                    .join("")}
                  ${
                    (tabErrors as ValidationError[]).length > 3
                      ? `<li class="text-gray-500">...and ${
                          (tabErrors as ValidationError[]).length - 3
                        } more</li>`
                      : ""
                  }
                </ul>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `,
        confirmButtonText: "Fix Errors",
      });

      const firstError = validation.errors[0];
      if (firstError) {
        setActiveTab(firstError.tab);
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAllDTOs()) {
      return;
    }

    setLoading(true);
    try {
      let response;
      if (combinedSavingsData.savingsProductDTO?.effectiveTill === "") {
        combinedSavingsData.savingsProductDTO.effectiveTill = null;
      }
      if (isEditMode && productId) {
        response = await savingsProductApiService.updateSavingProduct(
          combinedSavingsData,
          Number(productId)
        );
      } else {
        response = await savingsProductApiService.createSavingProduct(
          combinedSavingsData
        );
      }

      if (response.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            response.message ||
            `Savings Product ${
              isEditMode ? "updated" : "created"
            } successfully!`,
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setShowValidationSummary(false);

        if (!isEditMode) {
          handleReset();
        } else {
          navigate("/savingproduct-operations");
        }
      } else {
        throw new Error(
          response.message ||
            `Failed to ${isEditMode ? "update" : "create"} Savings Product`
        );
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          error.message ||
          `Failed to ${
            isEditMode ? "update" : "add"
          } Savings Product. Please try again.`,
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCombinedSavingsData({
      savingsProductDTO: {
        branchId: user.branchid,
        productName: "",
        productCode: "",
        effectiveFrom: getCurrentDate(),
        effectiveTill: "",
      },
      savingsProductRulesDTO: {
        branchId: user.branchid,
        acStatementFrequency: 0,
        acRetentionDays: 0,
        minBalanceAmt: 0,
      },
      savingsProductPostingHeadsDTO: {
        branchId: user.branchid,
        principalBalHeadCode: 0,
        suspendedBalHeadCode: 0,
        intPayableHeadCode: 0,
      },
      savingsProductInterestRulesDTO: {
        branchId: user.branchid,
        applicableDate: getCurrentDate(),
        rateAppliedMethod: 0,
        intApplicableDate: getCurrentDate(),
        calculationMethod: 0,
        interestRateMinValue: 0,
        interestRateMaxValue: 0,
        interestVariationMinValue: 0,
        interestVariationMaxValue: 0,
        minPostingIntAmt: 0,
        minBalForPosting: 0,
        intPostingInterval: 0,
        intPostingDate: 0,
        compoundInterval: 0,
        intCompoundDate: 0,
        actionOnIntPosting: 0,
      },
    });
    setActiveTab("header");
    clearErrors();
    setShowValidationSummary(false);
  };

  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const errorsByTab = errors.reduce((acc, error) => {
    if (!acc[error.tab]) acc[error.tab] = [];
    acc[error.tab].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const baseClassName = `flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;

    if (activeTab === tabId) {
      return `${baseClassName} border-blue-500 text-blue-600 bg-blue-50`;
    } else if (hasTabErrors) {
      return `${baseClassName} border-red-300 text-red-600 hover:bg-red-50`;
    } else {
      return `${baseClassName} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
    }
  };

  const tabs = [
    { id: "header", label: "Header Information", icon: FileText },
    { id: "rules", label: "Product Rules", icon: Settings },
    { id: "posting", label: "Posting Heads", icon: DollarSign },
    { id: "interest", label: "Interest Rules", icon: TrendingUp },
  ];

  const accountHeadOptions = accountHeads.map((head) => ({
    value: head.accountHeadId,
    label: head.accountHeadName,
  }));

  const statementFrequencyOptions = [
    { value: 1, label: "Monthly" },
    { value: 2, label: "Quarterly" },
    { value: 3, label: "Half-Yearly" },
    { value: 4, label: "Yearly" },
    { value: 5, label: "On Demand" },
  ];

  const rateAppliedMethodOptions = [
    { value: 1, label: "Changed Rate" },
    { value: 2, label: "Fixed Rate" },
    { value: 3, label: "Slab Wise Rate" },
  ];

  const calculationMethodOptions = [
    { value: 1, label: "Monthly Minimum Balance" },
    { value: 2, label: "Balance Method" },
  ];

  const intervalOptions = [
    { value: 1, label: "Daily" },
    { value: 2, label: "Monthly" },
    { value: 3, label: "Quarterly" },
    { value: 4, label: "Half Yearly" },
    { value: 5, label: "Yearly" },
  ];

  const dateTypeOptions = [
    { value: 1, label: "Fixed Date" },
    { value: 2, label: "Custom Date" },
  ];

  const actionOnIntPostingOptions = [
    { value: 1, label: "Stand" },
    { value: 2, label: "Add In Balance" },
  ];

  // Render functions for each tab (continuing in next message due to length)

  const renderHeaderInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Savings Product Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="productName"
            label="Product Name"
            required
            errors={errorsByField.productName || []}
            icon={<User className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={combinedSavingsData.savingsProductDTO?.productName || ""}
              onChange={(e) =>
                handleProductChange("productName", e.target.value)
              }
              ref={productNameref}
              onBlur={(e) => handleFieldBlur("productName", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Product Name (e.g., MEMBER DEPOSIT)"
              required
              maxLength={255}
              autoFocus
            />
          </FormField>

          <FormField
            name="productCode"
            label="Product Code"
            required
            errors={errorsByField.productCode || []}
            icon={<CreditCard className="w-4 h-4 text-purple-500" />}
          >
            <input
              type="text"
              value={combinedSavingsData.savingsProductDTO?.productCode || ""}
              onChange={(e) =>
                handleProductChange("productCode", e.target.value)
              }
              onBlur={(e) => handleFieldBlur("productCode", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Code (e.g., 03)"
              required
              ref={productCoderef}
              maxLength={10}
            />
          </FormField>

          <FormField
            name="effectiveFrom"
            label="Effective From"
            required
            errors={errorsByField.effectiveFrom || []}
            icon={<Calendar className="w-4 h-4 text-blue-500" />}
          >
            <input
              type="date"
              value={combinedSavingsData.savingsProductDTO?.effectiveFrom || ""}
              onChange={(e) =>
                handleDateChange(
                  e.target.value,
                  (val) => handleProductChange("effectiveFrom", val),
                  "effectiveFrom"
                )
              }
              onBlur={() => handleFieldBlur("effectiveFrom")}
              max={getCurrentDate()}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
          </FormField>

          <FormField
            name="effectiveTill"
            label="Till Date"
            errors={errorsByField.effectiveTill || []}
            icon={<Calendar className="w-4 h-4 text-orange-500" />}
          >
            <input
              type="date"
              value={combinedSavingsData.savingsProductDTO?.effectiveTill || ""}
              onChange={(e) =>
                handleDateChange(
                  e.target.value,
                  (val) => handleProductChange("effectiveTill", val),
                  "effectiveTill"
                )
              }
              onBlur={() => handleFieldBlur("effectiveTill")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // CONTINUING FROM PREVIOUS - Add these render functions before the return statement

  const renderProductRules = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Document Definition & Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="acStatementFrequency"
            label="A/c Statement Frequency"
            required
            errors={errorsByField.acStatementFrequency || []}
          >
            <Select
              key={`acStatementFrequency-${
                combinedSavingsData.savingsProductRulesDTO
                  ?.acStatementFrequency || 0
              }`}
              instanceId="ac-statement-frequency-select"
              name="acStatementFrequency"
              options={statementFrequencyOptions}
              value={statementFrequencyOptions.find(
                (opt) =>
                  opt.value ===
                  combinedSavingsData.savingsProductRulesDTO
                    ?.acStatementFrequency
              )}
              onChange={(selected) =>
                handleRulesChange("acStatementFrequency", selected?.value || 0)
              }
              placeholder="Select Statement Frequency"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>

          <FormField
            name="acRetentionDays"
            label="A/c Retention Days"
            required
            errors={errorsByField.acRetentionDays || []}
          >
            <input
              type="text"
              inputMode="numeric"
              value={
                combinedSavingsData.savingsProductRulesDTO?.acRetentionDays ||
                ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) => handleRulesChange("acRetentionDays", val),
                  false,
                  4
                )
              }
              onBlur={() => handleFieldBlur("acRetentionDays")}
              maxLength={4}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 180"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of days to retain account records
            </p>
          </FormField>

          <FormField
            name="minBalanceAmt"
            label="Min. Balance Amt."
            required
            errors={errorsByField.minBalanceAmt || []}
          >
            <input
              type="text"
              inputMode="decimal"
              value={
                combinedSavingsData.savingsProductRulesDTO?.minBalanceAmt || ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) => handleRulesChange("minBalanceAmt", val),
                  true,
                  10
                )
              }
              onBlur={() => handleFieldBlur("minBalanceAmt")}
              maxLength={10}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum amount to keep in the account
            </p>
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderPostingHeads = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Posting Account Heads
        </h3>
        <div className="grid grid-cols-1 gap-6">
          <FormField
            name="principalBalHeadCode"
            label="Principal Bal. Head"
            required
            errors={errorsByField.principalBalHeadCode || []}
          >
            <Select
              key={`principal-${
                combinedSavingsData.savingsProductPostingHeadsDTO
                  ?.principalBalHeadCode || 0
              }`}
              instanceId="principal-bal-head-select"
              name="principalBalHeadCode"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedSavingsData.savingsProductPostingHeadsDTO
                    ?.principalBalHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "principalBalHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Principal Balance Head (e.g., Saving)"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>

          <FormField
            name="suspendedBalHeadCode"
            label="Suspended Bal. Head"
            required
            errors={errorsByField.suspendedBalHeadCode || []}
          >
            <Select
              key={`suspended-${
                combinedSavingsData.savingsProductPostingHeadsDTO
                  ?.suspendedBalHeadCode || 0
              }`}
              instanceId="suspended-bal-head-select"
              name="suspendedBalHeadCode"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedSavingsData.savingsProductPostingHeadsDTO
                    ?.suspendedBalHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "suspendedBalHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Suspended Balance Head (e.g., SUSPENSE A/C)"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>

          <FormField
            name="intPayableHeadCode"
            label="Int. Payable Head Code"
            required
            errors={errorsByField.intPayableHeadCode || []}
          >
            <Select
              key={`intPayable-${
                combinedSavingsData.savingsProductPostingHeadsDTO
                  ?.intPayableHeadCode || 0
              }`}
              instanceId="int-payable-head-select"
              name="intPayableHeadCode"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedSavingsData.savingsProductPostingHeadsDTO
                    ?.intPayableHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "intPayableHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Interest Payable Head (e.g., Payable)"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderInterestRules = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
        <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Interest Rules & Calculation Parameters
        </h3>

        {/* Calculation Parameters Section */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-amber-700 mb-3">
            Calculation Parameters
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              name="applicableDate"
              label="Applicable Date"
              required
              errors={errorsByField.applicableDate || []}
            >
              <input
                type="date"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.applicableDate || ""
                }
                onChange={(e) =>
                  handleDateChange(
                    e.target.value,
                    (val) => handleInterestRulesChange("applicableDate", val),
                    "applicableDate"
                  )
                }
                onBlur={() => handleFieldBlur("applicableDate")}
                max={getCurrentDate()}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              />
            </FormField>

            <FormField
              name="rateAppliedMethod"
              label="Rate Applied Method"
              required
              errors={errorsByField.rateAppliedMethod || []}
            >
              <Select
                key={`rateAppliedMethod-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.rateAppliedMethod || 0
                }`}
                instanceId="rate-applied-method-select"
                name="rateAppliedMethod"
                options={rateAppliedMethodOptions}
                value={rateAppliedMethodOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.rateAppliedMethod
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "rateAppliedMethod",
                    selected?.value || 0
                  )
                }
                placeholder="Select Rate Method"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="intApplicableDate"
              label="Int. Applicable Date"
              required
              errors={errorsByField.intApplicableDate || []}
            >
              <input
                type="date"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.intApplicableDate || ""
                }
                onChange={(e) =>
                  handleDateChange(
                    e.target.value,
                    (val) =>
                      handleInterestRulesChange("intApplicableDate", val),
                    "intApplicableDate"
                  )
                }
                onBlur={() => handleFieldBlur("intApplicableDate")}
                max={getCurrentDate()}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              />
            </FormField>

            <FormField
              name="calculationMethod"
              label="Calculation Method"
              required
              errors={errorsByField.calculationMethod || []}
            >
              <Select
                key={`calculationMethod-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.calculationMethod || 0
                }`}
                instanceId="calculation-method-select"
                name="calculationMethod"
                options={calculationMethodOptions}
                value={calculationMethodOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.calculationMethod
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "calculationMethod",
                    selected?.value || 0
                  )
                }
                placeholder="Select Calculation Method"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="interestRateMinValue"
              label="Interest Rate From (%)"
              required
              errors={errorsByField.interestRateMinValue || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.interestRateMinValue || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) =>
                      handleInterestRulesChange("interestRateMinValue", val),
                    true,
                    6
                  )
                }
                onBlur={() => handleFieldBlur("interestRateMinValue")}
                maxLength={6}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 5"
              />
            </FormField>

            <FormField
              name="interestRateMaxValue"
              label="Interest Rate To (%)"
              required
              errors={errorsByField.interestRateMaxValue || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.interestRateMaxValue || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) =>
                      handleInterestRulesChange("interestRateMaxValue", val),
                    true,
                    6
                  )
                }
                onBlur={() => handleFieldBlur("interestRateMaxValue")}
                maxLength={6}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 8"
              />
            </FormField>

            <FormField
              name="interestVariationMinValue"
              label="Interest Variation From (+/- %)"
              required
              errors={errorsByField.interestVariationMinValue || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.interestVariationMinValue || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) =>
                      handleInterestRulesChange(
                        "interestVariationMinValue",
                        val
                      ),
                    true,
                    6
                  )
                }
                onBlur={() => handleFieldBlur("interestVariationMinValue")}
                maxLength={6}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 1"
              />
            </FormField>

            <FormField
              name="interestVariationMaxValue"
              label="Interest Variation To (+/- %)"
              required
              errors={errorsByField.interestVariationMaxValue || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.interestVariationMaxValue || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) =>
                      handleInterestRulesChange(
                        "interestVariationMaxValue",
                        val
                      ),
                    true,
                    6
                  )
                }
                onBlur={() => handleFieldBlur("interestVariationMaxValue")}
                maxLength={6}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 5"
              />
            </FormField>
          </div>
        </div>

        {/* Posting & Compounding Configuration Section */}
        <div className="mt-8">
          <h4 className="text-md font-semibold text-amber-700 mb-3">
            Posting & Compounding Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              name="minPostingIntAmt"
              label="Min. Posting Int. Amt."
              required
              errors={errorsByField.minPostingIntAmt || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.minPostingIntAmt || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) => handleInterestRulesChange("minPostingIntAmt", val),
                    true,
                    10
                  )
                }
                onBlur={() => handleFieldBlur("minPostingIntAmt")}
                maxLength={10}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum interest that can be posted
              </p>
            </FormField>

            <FormField
              name="minBalForPosting"
              label="Min Bal. For Posting"
              required
              errors={errorsByField.minBalForPosting || []}
            >
              <input
                type="text"
                inputMode="decimal"
                value={
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.minBalForPosting || ""
                }
                onChange={(e) =>
                  handleNumericInput(
                    e,
                    (val) => handleInterestRulesChange("minBalForPosting", val),
                    true,
                    10
                  )
                }
                onBlur={() => handleFieldBlur("minBalForPosting")}
                maxLength={10}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="e.g., 500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum balance should interest be posted
              </p>
            </FormField>

            <FormField
              name="intPostingInterval"
              label="Posting Interval"
              required
              errors={errorsByField.intPostingInterval || []}
            >
              <Select
                key={`intPostingInterval-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.intPostingInterval || 0
                }`}
                instanceId="int-posting-interval-select"
                name="intPostingInterval"
                options={intervalOptions}
                value={intervalOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.intPostingInterval
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "intPostingInterval",
                    selected?.value || 0
                  )
                }
                placeholder="Select Posting Interval"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="intPostingDate"
              label="Int. Posting Date"
              required
              errors={errorsByField.intPostingDate || []}
            >
              <Select
                key={`intPostingDate-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.intPostingDate || 0
                }`}
                instanceId="int-posting-date-select"
                name="intPostingDate"
                options={dateTypeOptions}
                value={dateTypeOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.intPostingDate
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "intPostingDate",
                    selected?.value || 0
                  )
                }
                placeholder="Select Posting Date Type"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="compoundInterval"
              label="Compound Interval"
              required
              errors={errorsByField.compoundInterval || []}
            >
              <Select
                key={`compoundInterval-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.compoundInterval || 0
                }`}
                instanceId="compound-interval-select"
                name="compoundInterval"
                options={intervalOptions}
                value={intervalOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.compoundInterval
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "compoundInterval",
                    selected?.value || 0
                  )
                }
                placeholder="Select Compound Interval"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="intCompoundDate"
              label="Int. Compound Date"
              required
              errors={errorsByField.intCompoundDate || []}
            >
              <Select
                key={`intCompoundDate-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.intCompoundDate || 0
                }`}
                instanceId="int-compound-date-select"
                name="intCompoundDate"
                options={dateTypeOptions}
                value={dateTypeOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.intCompoundDate
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "intCompoundDate",
                    selected?.value || 0
                  )
                }
                placeholder="Select Compound Date Type"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>

            <FormField
              name="actionOnIntPosting"
              label="Action on int. posting"
              required
              errors={errorsByField.actionOnIntPosting || []}
            >
              <Select
                key={`actionOnIntPosting-${
                  combinedSavingsData.savingsProductInterestRulesDTO
                    ?.actionOnIntPosting || 0
                }`}
                instanceId="action-on-int-posting-select"
                name="actionOnIntPosting"
                options={actionOnIntPostingOptions}
                value={actionOnIntPostingOptions.find(
                  (opt) =>
                    opt.value ===
                    combinedSavingsData.savingsProductInterestRulesDTO
                      ?.actionOnIntPosting
                )}
                onChange={(selected) =>
                  handleInterestRulesChange(
                    "actionOnIntPosting",
                    selected?.value || 0
                  )
                }
                placeholder="Select Action"
                isClearable
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "rules":
        return renderProductRules();
      case "posting":
        return renderPostingHeads();
      case "interest":
        return renderInterestRules();
      default:
        return renderHeaderInfo();
    }
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Banknote className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Edit" : "Add"} Savings Product
                      Configuration
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure savings account product rules and settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/savingproduct-info")
                      : navigate("/product-operations")
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Validation Summary */}
            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(fieldName, tab) => {
                setActiveTab(tab);
              }}
              onClose={() => setShowValidationSummary(false)}
            />

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-0 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const tabErrorCount = errorsByTab[tab.id]?.length || 0;

                    return (
                      <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={getTabClassName(tab.id)}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {tabErrorCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {tabErrorCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 sm:p-8">{renderTabContent()}</div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={
                      isEditMode
                        ? commonservice.handleResetNotAllowed
                        : handleReset
                    }
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Form
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode
                          ? "Update Savings Product"
                          : "Save Savings Product"}
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

export default SavingsProductMaster;
