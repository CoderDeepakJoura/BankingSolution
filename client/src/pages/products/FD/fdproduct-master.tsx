import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../../../services/Validations/ProductMasters/FD/useFormValidation";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { encryptId, decryptId } from "../../../utils/encryption";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import commonservice from "../../../services/common/commonservice";
import fdProductApiService, {
  CombinedFDDTO,
  FdProductDTO,
  FdProductRulesDTO,
  FdProductPostingHeadsDTO,
  FdProductInterestRulesDTO,
} from "../../../services/productmasters/FD/fdproductapi";
import {
  User,
  CreditCard,
  Save,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  Settings,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import { AccountHead } from "../../accounthead/accounthead/accounthead-master";

const FDProductMaster = () => {
  const navigate = useNavigate();
  const productNameref = useRef(null);
  const productCoderef = useRef(null);
  const { productId: encryptedId } = useParams<{ productId?: string }>();
  const productId = encryptedId ? decryptId(encryptedId) : null;
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();

  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("header");
  const [loading, setLoading] = useState(false);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const isEditMode = !!productId;

  // Helper function to get current date in YYYY-MM-DD format

  // Helper function to format all dates using commonservice.splitdate
  const formatDatesInDTO = (data: CombinedFDDTO): CombinedFDDTO => {
    return {
      ...data,
      fdProductDTO: {
        ...data.fdProductDTO!,
        effectiveFrom: data.fdProductDTO?.effectiveFrom
          ? commonservice.splitDate(data.fdProductDTO.effectiveFrom)
          : commonservice.getCurrentDate(),
        effectiveTill: data.fdProductDTO?.effectiveTill
          ? commonservice.splitDate(data.fdProductDTO.effectiveTill)
          : "",
      },
      fdProductInterestRulesDTO: {
        ...data.fdProductInterestRulesDTO!,
        applicableDate: data.fdProductInterestRulesDTO?.applicableDate
          ? commonservice.splitDate(
              data.fdProductInterestRulesDTO.applicableDate
            )
          : commonservice.getCurrentDate(),
      },
    };
  };

  // Helper function to handle numeric-only input with maxLength
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
  // Initialize combined DTO state with current date
  const [combinedFdData, setCombinedFdData] = useState<CombinedFDDTO>({
    fdProductDTO: {
      branchId: user.branchid,
      productName: "",
      productCode: "",
      effectiveFrom: commonservice.getCurrentDate(),
      effectiveTill: "",
      isSeparateFdAccountAllowed: false,
    },
    fdProductRulesDTO: {
      branchId: user.branchid,
      intAccountType: 0,
      fdMaturityReminderInMonths: 0,
      fdMaturityReminderInDays: 0,
    },
    fdProductPostingHeadsDTO: {
      branchId: user.branchid,
      principalBalHeadCode: 0,
      suspendedBalHeadCode: 0,
      intPayableHeadCode: 0,
    },
    fdProductInterestRulesDTO: {
      branchId: user.branchid,
      applicableDate: commonservice.getCurrentDate(),
      interestApplicableOn: 0,
      interestRateMinValue: 0,
      interestRateMaxValue: 0,
      interestVariationMinValue: 0,
      interestVariationMaxValue: 0,
      actionOnIntPosting: 0,
      postMaturityIntRateCalculationType: 0,
      prematurityCalculationType: 0,
      maturityDueNoticeInDays: 0,
      intPostingInterval: 0,
      intPostingDate: 0,
    },
  });

  // Load data if editing
  useEffect(() => {
    if (isEditMode) {
      loadFdProduct(Number(productId));
    }
  }, [productId]);

  // Fetch account heads
  useEffect(() => {
    const fetchAccountHeads = async () => {
      try {
        const res = await AccountHeadApiService.fetchaccountheads(
          user.branchid
        );
        if (!res.success) throw new Error("Failed to load Account Heads");
        const parentData: AccountHead[] = res.data || [];
        setAccountHeads(parentData);
      } catch (err: any) {
        console.error(err);
        Swal.fire(
          "Error",
          err.message || "Could not load accountHeads",
          "error"
        );
      }
    };
    fetchAccountHeads();
  }, [user.branchid]);

  // Load FD Product with date formatting
  const loadFdProduct = async (id: number) => {
    setLoading(true);
    try {
      const response = await fdProductApiService.getFDProductById(
        id,
        user.branchid
      );

      if (response.success && response.data) {
        const formattedData = formatDatesInDTO(response.data);
        setCombinedFdData(formattedData);
      } else {
        throw new Error(response.message || "Failed to load FD Product");
      }
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to load FD Product",
        confirmButtonColor: "#EF4444",
      });
      navigate("/fdproduct-operations");
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (field: keyof FdProductDTO, value: any) => {
    setCombinedFdData((prev) => ({
      ...prev,
      fdProductDTO: {
        ...prev.fdProductDTO!,
        [field]: value,
      },
    }));
  };

  const handleRulesChange = (field: keyof FdProductRulesDTO, value: any) => {
    setCombinedFdData((prev) => ({
      ...prev,
      fdProductRulesDTO: {
        ...prev.fdProductRulesDTO!,
        [field]: value,
      },
    }));
  };

  const handlePostingHeadsChange = (
    field: keyof FdProductPostingHeadsDTO,
    value: any
  ) => {
    setCombinedFdData((prev) => ({
      ...prev,
      fdProductPostingHeadsDTO: {
        ...prev.fdProductPostingHeadsDTO!,
        [field]: value,
      },
    }));
  };

  const handleInterestRulesChange = (
    field: keyof FdProductInterestRulesDTO,
    value: any
  ) => {
    setCombinedFdData((prev) => ({
      ...prev,
      fdProductInterestRulesDTO: {
        ...prev.fdProductInterestRulesDTO!,
        [field]: value,
      },
    }));
  };

  const handleFieldBlur = async (fieldName: string, value: any = "") => {
    markFieldTouched(fieldName);
    if (fieldName == "productName") {
      const response = await commonservice.productname_unique(
        user.branchid,
        value,
        productId ?? 0
      );
      if (response.success) {
        setCombinedFdData((prev) => ({
          ...prev,
          fdProductDTO: {
            ...prev.fdProductDTO!,
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
      const response = await commonservice.productcode_unique(
        user.branchid,
        value,
        productId ?? 0
      );
      if (response.success) {
        setCombinedFdData((prev) => ({
          ...prev,
          fdProductDTO: {
            ...prev.fdProductDTO!,
            productCode: "",
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
    const validation = validateForm(combinedFdData);

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
        setTimeout(() => {
          const cleanFieldName = firstError.field.replace(/\[|\]|\./g, "_");
          const element = document.getElementById(cleanFieldName);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
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
      if (combinedFdData.fdProductDTO?.effectiveTill == "") {
        combinedFdData.fdProductDTO.effectiveTill = null;
      }
      if (isEditMode && productId) {
        response = await fdProductApiService.updateFDProduct(
          combinedFdData,
          Number(productId)
        );
      } else {
        response = await fdProductApiService.createFDProduct(combinedFdData);
      }

      if (response.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            response.message ||
            `FD Product ${isEditMode ? "updated" : "created"} successfully!`,
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setShowValidationSummary(false);

        if (!isEditMode) {
          handleReset();
        } else {
          navigate("/fdproduct-operations");
        }
      } else {
        throw new Error(
          response.message ||
            `Failed to ${isEditMode ? "update" : "create"} FD Product`
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
          } FD Product. Please try again.`,
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCombinedFdData({
      fdProductDTO: {
        branchId: user.branchid,
        productName: "",
        productCode: "",
        effectiveFrom: commonservice.getCurrentDate(),
        effectiveTill: "",
        isSeparateFdAccountAllowed: false,
      },
      fdProductRulesDTO: {
        branchId: user.branchid,
        intAccountType: 0,
        fdMaturityReminderInMonths: 0,
        fdMaturityReminderInDays: 0,
      },
      fdProductPostingHeadsDTO: {
        branchId: user.branchid,
        principalBalHeadCode: 0,
        suspendedBalHeadCode: 0,
        intPayableHeadCode: 0,
      },
      fdProductInterestRulesDTO: {
        branchId: user.branchid,
        applicableDate: commonservice.getCurrentDate(),
        interestApplicableOn: 0,
        interestRateMinValue: 0,
        interestRateMaxValue: 0,
        interestVariationMinValue: 0,
        interestVariationMaxValue: 0,
        actionOnIntPosting: 0,
        postMaturityIntRateCalculationType: 0,
        prematurityCalculationType: 0,
        maturityDueNoticeInDays: 0,
        intPostingInterval: 0,
        intPostingDate: 0,
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
    { id: "header", label: "Product Information", icon: FileText },
    { id: "rules", label: "Product Rules", icon: Settings },
    { id: "posting", label: "Posting Heads", icon: DollarSign },
    { id: "interest", label: "Interest Rules", icon: TrendingUp },
  ];

  const accountHeadOptions = accountHeads.map((head) => ({
    value: head.accountHeadId,
    label: head.accountHeadName,
  }));

  const intAccountTypeOptions = [
    { value: 1, label: "Same Account" },
    { value: 2, label: "Other A/c" },
  ];

  const interestApplicableOnOptions = [
    { value: 1, label: "Voucher Date" },
    { value: 2, label: "FD Date / Value Date" },
  ];

  const actionOnIntPostingOptions = [
    { value: 1, label: "Add In Balance" },
    { value: 2, label: "Stand" },
  ];

  const calculationTypeOptions = [
    { value: 1, label: "Calculate From Slab" },
    { value: 2, label: "Fixed Rate" },
  ];

  const intPostingIntervalOptions = [
    { value: 1, label: "Daily" },
    { value: 2, label: "Monthly" },
    { value: 3, label: "Quarterly" },
    { value: 4, label: "Half Yearly" },
    { value: 5, label: "Yearly" },
  ];

  const intPostingDateOptions = [
    { value: 1, label: "Fix Date" },
    { value: 2, label: "Custom Date" },
  ];
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if in edit mode or form has data
      if (isEditMode) {
        e.preventDefault();
      }
    };

    // Add the event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isEditMode, combinedFdData]);
  // Tab 1: Header Information
  const renderHeaderInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          FD Product Configuration
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
              value={combinedFdData.fdProductDTO?.productName || ""}
              onChange={(e) =>
                handleProductChange("productName", e.target.value)
              }
              ref={productNameref}
              onBlur={(e) => handleFieldBlur("productName", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Product Name (e.g., FD MEMBER)"
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
              value={combinedFdData.fdProductDTO?.productCode || ""}
              onChange={(e) =>
                handleProductChange("productCode", e.target.value)
              }
              ref={productCoderef}
              onBlur={(e) => handleFieldBlur("productCode", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Code (e.g., 07)"
              required
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
              value={combinedFdData.fdProductDTO?.effectiveFrom || ""}
              onChange={(e) =>
                commonservice.handleDateChange(
                  e.target.value,
                  (val) => handleProductChange("effectiveFrom", val),
                  "effectiveFrom"
                )
              }
              onBlur={() => handleFieldBlur("effectiveFrom")}
              max={commonservice.getCurrentDate()}
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
              value={combinedFdData.fdProductDTO?.effectiveTill || ""}
              onChange={(e) =>
                commonservice.handleDateChange(
                  e.target.value,
                  (val) => handleProductChange("effectiveTill", val),
                  "effectiveTill"
                )
              }
              onBlur={() => handleFieldBlur("effectiveTill")}
              max={commonservice.getCurrentDate()}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <div className="lg:col-span-2">
            <FormField
              name="isSeparateFdAccountAllowed"
              label="Separate FD Account"
              errors={errorsByField.isSeparateFdAccountAllowed || []}
            >
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      combinedFdData.fdProductDTO?.isSeparateFdAccountAllowed ||
                      false
                    }
                    onChange={(e) =>
                      handleProductChange(
                        "isSeparateFdAccountAllowed",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Allow separate FD account for each deposit
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                If unchecked, multiple FDs can share the same account number
              </p>
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  // Tab 2: Product Rules
  const renderProductRules = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Product Rules - Definition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="intAccountType"
            label="Int A/c Type"
            required
            errors={errorsByField.intAccountType || []}
          >
            <Select
              instanceId="int-account-type-select"
              key={`intAccountType-${combinedFdData.fdProductRulesDTO?.intAccountType || 0}`}
              options={intAccountTypeOptions}
              value={intAccountTypeOptions.find(
                (opt) =>
                  opt.value === combinedFdData.fdProductRulesDTO?.intAccountType
              )}
              onChange={(selected) =>
                handleRulesChange("intAccountType", selected?.value || 0)
              }
              placeholder="Select Account Type"
              isClearable
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Interest posting destination: same account or linked account
            </p>
          </FormField>

          <FormField
            name="fdMaturityReminderInMonths"
            label="Maturity Reminder (Months)"
            required
            errors={errorsByField.fdMaturityReminderInMonths || []}
          >
            <input
              type="text"
              inputMode="numeric"
              value={
                combinedFdData.fdProductRulesDTO?.fdMaturityReminderInMonths ||
                ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) => handleRulesChange("fdMaturityReminderInMonths", val),
                  false,
                  3
                )
              }
              onBlur={() => handleFieldBlur("fdMaturityReminderInMonths")}
              maxLength={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 15"
            />
          </FormField>

          <FormField
            name="fdMaturityReminderInDays"
            label="Maturity Reminder (Days)"
            required
            errors={errorsByField.fdMaturityReminderInDays || []}
          >
            <input
              type="text"
              inputMode="numeric"
              value={
                combinedFdData.fdProductRulesDTO?.fdMaturityReminderInDays || ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) => handleRulesChange("fdMaturityReminderInDays", val),
                  false,
                  3
                )
              }
              onBlur={() => handleFieldBlur("fdMaturityReminderInDays")}
              maxLength={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 0"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // Tab 3: Posting Account Heads - ✅ ALL FIXED with instanceId
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
              instanceId="principal-bal-head-select"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductPostingHeadsDTO?.principalBalHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "principalBalHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Principal Balance Head"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField
            name="suspendedBalHeadCode"
            label="Suspended Bal. Head"
            required
            errors={errorsByField.suspendedBalHeadCode || []}
          >
            <Select
              instanceId="suspended-bal-head-select"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductPostingHeadsDTO?.suspendedBalHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "suspendedBalHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Suspended Balance Head"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField
            name="intPayableHeadCode"
            label="Int. Payable Head Code"
            required
            errors={errorsByField.intPayableHeadCode || []}
          >
            <Select
              instanceId="int-payable-head-select"
              options={accountHeadOptions}
              value={accountHeadOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductPostingHeadsDTO?.intPayableHeadCode
              )}
              onChange={(selected) =>
                handlePostingHeadsChange(
                  "intPayableHeadCode",
                  selected?.value || 0
                )
              }
              placeholder="Select Interest Payable Head"
              isClearable
              className="text-sm"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // Tab 4: Interest Rules - ✅ ALL FIXED with instanceId
  const renderInterestRules = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
        <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Interest Rules Configuration
        </h3>
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
                combinedFdData.fdProductInterestRulesDTO?.applicableDate || ""
              }
              onChange={(e) =>
                commonservice.handleDateChange(
                  e.target.value,
                  (val) => handleInterestRulesChange("applicableDate", val),
                  "applicableDate"
                )
              }
              onBlur={() => handleFieldBlur("applicableDate")}
              max={commonservice.getCurrentDate()}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              required
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
                combinedFdData.fdProductInterestRulesDTO
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
              placeholder="e.g., 1.00"
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
                combinedFdData.fdProductInterestRulesDTO
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
              placeholder="e.g., 25.00"
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
                combinedFdData.fdProductInterestRulesDTO
                  ?.interestVariationMinValue || ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) =>
                    handleInterestRulesChange("interestVariationMinValue", val),
                  true,
                  6
                )
              }
              onBlur={() => handleFieldBlur("interestVariationMinValue")}
              maxLength={6}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 5.00"
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
                combinedFdData.fdProductInterestRulesDTO
                  ?.interestVariationMaxValue || ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) =>
                    handleInterestRulesChange("interestVariationMaxValue", val),
                  true,
                  6
                )
              }
              onBlur={() => handleFieldBlur("interestVariationMaxValue")}
              maxLength={6}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 5.00"
            />
          </FormField>
          <FormField
            name="interestApplicableOn"
            label="Int. Applicable Date"
            required
            errors={errorsByField.interestApplicableOn || []}
          >
            <Select
              instanceId="interest-applicable-on-select"
              options={interestApplicableOnOptions}
              value={interestApplicableOnOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO?.interestApplicableOn
              )}
              onChange={(selected) =>
                handleInterestRulesChange(
                  "interestApplicableOn",
                  selected?.value || 0
                )
              }
              placeholder="Select Applicable Date Type"
              isClearable
              className="text-sm"
            />
          </FormField>
          <FormField
            name="actionOnIntPosting"
            label="Action on int. posting"
            required
            errors={errorsByField.actionOnIntPosting || []}
          >
            <Select
              instanceId="action-on-int-posting-select"
              options={actionOnIntPostingOptions}
              value={actionOnIntPostingOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO?.actionOnIntPosting
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
            />
          </FormField>

          <FormField
            name="postMaturityIntRateCalculationType"
            label="Post Maturity Interest Rate"
            required
            errors={errorsByField.postMaturityIntRateCalculationType || []}
          >
            <Select
              instanceId="post-maturity-calc-type-select"
              options={calculationTypeOptions}
              value={calculationTypeOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO
                    ?.postMaturityIntRateCalculationType
              )}
              onChange={(selected) =>
                handleInterestRulesChange(
                  "postMaturityIntRateCalculationType",
                  selected?.value || 0
                )
              }
              placeholder="Select Calculation Type"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField
            name="prematurityCalculationType"
            label="FD Pre-maturity Rule"
            required
            errors={errorsByField.prematurityCalculationType || []}
          >
            <Select
              instanceId="prematurity-calc-type-select"
              options={calculationTypeOptions}
              value={calculationTypeOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO
                    ?.prematurityCalculationType
              )}
              onChange={(selected) =>
                handleInterestRulesChange(
                  "prematurityCalculationType",
                  selected?.value || 0
                )
              }
              placeholder="Select Calculation Type"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField
            name="maturityDueNoticeInDays"
            label="Maturity Due Notice (Days)"
            required
            errors={errorsByField.maturityDueNoticeInDays || []}
          >
            <input
              type="text"
              inputMode="numeric"
              value={
                combinedFdData.fdProductInterestRulesDTO
                  ?.maturityDueNoticeInDays || ""
              }
              onChange={(e) =>
                handleNumericInput(
                  e,
                  (val) =>
                    handleInterestRulesChange("maturityDueNoticeInDays", val),
                  false,
                  3
                )
              }
              onBlur={() => handleFieldBlur("maturityDueNoticeInDays")}
              maxLength={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 15"
            />
          </FormField>

          <FormField
            name="intPostingInterval"
            label="Posting Interval"
            required
            errors={errorsByField.intPostingInterval || []}
          >
            <Select
              instanceId="int-posting-interval-select"
              options={intPostingIntervalOptions}
              value={intPostingIntervalOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO?.intPostingInterval
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
            />
          </FormField>

          <FormField
            name="intPostingDate"
            label="Int. Posting Date"
            required
            errors={errorsByField.intPostingDate || []}
          >
            <Select
              instanceId="int-posting-date-select"
              options={intPostingDateOptions}
              value={intPostingDateOptions.find(
                (opt) =>
                  opt.value ===
                  combinedFdData.fdProductInterestRulesDTO?.intPostingDate
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
            />
          </FormField>
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
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Edit" : "Add"} FD Product Configuration
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure Fixed Deposit product rules and settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/fdproduct-info")
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
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode ? "Update FD Product" : "Save FD Product"}
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

export default FDProductMaster;
