import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../../../services/Validations/ProductMasters/RD/useFormValidation";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { decryptId } from "../../../utils/encryption";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import commonservice from "../../../services/common/commonservice";
import rdProductApiService, {
  CombinedRDProductDTO,
  RdProductDTO,
  RdProductRulesDTO,
  RdProductPostingHeadsDTO,
  RdProductInterestRuleDetailDTO,
} from "../../../services/productmasters/RD/rdproductapi";
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
  Plus,
  Trash2,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import { AccountHeadWithCode } from "../../accounthead/accounthead/accounthead-master";
import { json } from "stream/consumers";
import DatePicker from "../../../components/DatePicker";

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum DocumentPlan {
  ShortTermLoan = 1,
  LongTermLoan  = 2,
  RD            = 3,
  DDS           = 4,
}

// ─── Option Lists ─────────────────────────────────────────────────────────────
export const documentPlanOptions = [
  { value: DocumentPlan.ShortTermLoan, label: "Short Term Loan" },
  { value: DocumentPlan.LongTermLoan,  label: "Long Term Loan"  },
  { value: DocumentPlan.RD,            label: "RD"              },
  { value: DocumentPlan.DDS,           label: "DDS"             },
];

const postingIntervalOptions = [
  { value: 2, label: "Daily"       },
  { value: 3, label: "Monthly"     },
  { value: 4, label: "Quarterly"   },
  { value: 5, label: "Half Yearly" },
  { value: 6, label: "Yearly"      },
  { value: 7, label: "Two Yearly"  },
];

const compoundingIntervalOptions = [
  { value: 1, label: "No Compounding" },
  { value: 2, label: "Daily"          },
  { value: 3, label: "Monthly"        },
  { value: 4, label: "Quarterly"      },
  { value: 5, label: "Half Yearly"    },
  { value: 6, label: "Yearly"         },
  { value: 7, label: "Two Yearly"     },
];

const actionOnIntPostingOptions = [
  { value: 1, label: "Add In Balance" },
  { value: 2, label: "Stand"          },
];

// ─── Label lookup helpers ─────────────────────────────────────────────────────
const getPostingLabel     = (v: number) => postingIntervalOptions    .find((o) => o.value === v)?.label || "—";
const getCompoundingLabel = (v: number) => compoundingIntervalOptions.find((o) => o.value === v)?.label || "—";

// ─── Component ────────────────────────────────────────────────────────────────
const RDProductMaster = () => {
  const navigate       = useNavigate();
  const productNameRef = useRef<HTMLInputElement>(null);
  const productCodeRef = useRef<HTMLInputElement>(null);

  const { productId: encryptedId } = useParams<{ productId?: string }>();
  const productId  = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!productId;

  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();
  const { errors, validateForm, clearErrors, markFieldTouched } = useFormValidation();

  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab,    setActiveTab]    = useState("header");
  const [loading,      setLoading]      = useState(false);
  const [accountHeads, setAccountHeads] = useState<AccountHeadWithCode[]>([]);

  // ── Initial / reset state factory ────────────────────────────────────────────
  const getInitialState = (): CombinedRDProductDTO => ({
    rdProductDTO: {
      branchId:        user.branchid,
      productName:     "",
      productNameInSL: "",
      productCode:     "",
      effectiveFrom:   sessionDate,
    },
    rdProductRulesDTO: {
      branchId:       user.branchid,
      documentPlan:   0,
      periodLimitMin: 0,
      periodLimitMax: 0,
    },
    rdProductPostingHeadsDTO: {
      branchId:             user.branchid,
      principalBalHeadCode: 0,
      intPayableHeadCode:   0,
    },
    rdProductInterestRulesDetails: [],
  });

  const [combinedRdData, setCombinedRdData] = useState<CombinedRDProductDTO>(getInitialState);

  // ── Date formatter for edit-mode ──────────────────────────────────────────────
  const formatDatesInDTO = (data: CombinedRDProductDTO): CombinedRDProductDTO => ({
    ...data,
    rdProductDTO: {
      ...data.rdProductDTO!,
      effectiveFrom: data.rdProductDTO?.effectiveFrom
        ? commonservice.splitDate(data.rdProductDTO.effectiveFrom)
        : sessionDate,
    },
    rdProductInterestRulesDetails: (data.rdProductInterestRulesDetails || []).map((r) => ({
      ...r,
      applicableDate: r.applicableDate
        ? commonservice.splitDate(r.applicableDate)
        : sessionDate,
    })),
  });

  // ── Numeric input helper ──────────────────────────────────────────────────────
  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (value: number) => void,
    allowDecimal: boolean = false,
    maxLength?: number
  ) => {
    let value = e.target.value;
    if (maxLength && value.length > maxLength) value = value.slice(0, maxLength);
    if (value === "") { callback(0); return; }
    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (regex.test(value)) {
      const numValue = allowDecimal ? parseFloat(value) : parseInt(value);
      callback(isNaN(numValue) ? 0 : numValue);
    }
  };

  // ── Fetch account heads ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await AccountHeadApiService.fetchaccountheads(user.branchid);
        if (!res.success) throw new Error("Failed to load Account Heads");
        setAccountHeads(res.data || []);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Could not load account heads", "error");
      }
    })();
  }, [user.branchid]);

  // ── Load in edit mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode) loadRdProduct(Number(productId));
  }, [productId]);

  const loadRdProduct = async (id: number) => {
    setLoading(true);
    try {
      const response = await rdProductApiService.getRDProductById(id, user.branchid);
      if (response.success && response.data) {
        setCombinedRdData(formatDatesInDTO(response.data));
      } else {
        throw new Error(response.message || "Failed to load RD Product");
      }
    } catch (error: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: error.message || "Failed to load RD Product", confirmButtonColor: "#EF4444" });
      navigate("/rdproduct-operations");
    } finally {
      setLoading(false);
    }
  };

  // ── Section change handlers ───────────────────────────────────────────────────
  const handleProductChange = (field: keyof RdProductDTO, value: any) =>
    setCombinedRdData((prev) => ({ ...prev, rdProductDTO: { ...prev.rdProductDTO!, [field]: value } }));

  const handleRulesChange = (field: keyof RdProductRulesDTO, value: any) =>
    setCombinedRdData((prev) => ({ ...prev, rdProductRulesDTO: { ...prev.rdProductRulesDTO!, [field]: value } }));

  const handlePostingHeadsChange = (field: keyof RdProductPostingHeadsDTO, value: any) =>
    setCombinedRdData((prev) => ({ ...prev, rdProductPostingHeadsDTO: { ...prev.rdProductPostingHeadsDTO!, [field]: value } }));

  // ── Interest rule rows ────────────────────────────────────────────────────────
  const emptyInterestRow = (): RdProductInterestRuleDetailDTO => ({
    branchId:             user.branchid,   // ✅ always stamped at creation time
    applicableDate:       sessionDate,
    postingInterval:      0,
    compoundingInterval:  0,
    interestRateFrom:     0,
    interestRateTo:       0,
    variationFrom:        0,
    variationTo:          0,
    actionOnIntPosting:   0,
    intRateOnPrematurity: 0,
    postMaturityIntRate:  0,
    minLockInPeriodDays:  0,
  });

  const handleInterestRowChange = (
    index: number,
    field: keyof RdProductInterestRuleDetailDTO,
    value: any
  ) => {
    setCombinedRdData((prev) => {
      const rows = [...(prev.rdProductInterestRulesDetails || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, rdProductInterestRulesDetails: rows };
    });
  };

  const handleAddInterestRow = () =>
    setCombinedRdData((prev) => ({
      ...prev,
      rdProductInterestRulesDetails: [
        ...(prev.rdProductInterestRulesDetails || []),
        emptyInterestRow(),
      ],
    }));

  const handleRemoveInterestRow = (index: number) => {
    if ((combinedRdData.rdProductInterestRulesDetails || []).length === 1) {
      Swal.fire({ icon: "warning", title: "Cannot Remove", text: "At least one interest rule row is required." });
      return;
    }
    setCombinedRdData((prev) => ({
      ...prev,
      rdProductInterestRulesDetails: (prev.rdProductInterestRulesDetails || []).filter((_, i) => i !== index),
    }));
  };

  // ── Blur / uniqueness check ───────────────────────────────────────────────────
  const handleFieldBlur = async (fieldName: string, value: any = "") => {
    markFieldTouched(fieldName);

    if (fieldName === "productName") {
      const response = await commonservice.productname_unique(user.branchid, value, productId ?? 0);
      if (response.success) {
        handleProductChange("productName", "");
        Swal.fire({ icon: "error", title: "Duplication.", text: response.message, didClose: () => productNameRef.current?.focus() });
      }
    }
    if (fieldName === "productCode") {
      const response = await commonservice.productcode_unique(user.branchid, value, productId ?? 0);
      if (response.success) {
        handleProductChange("productCode", "");
        Swal.fire({ icon: "error", title: "Duplication.", text: response.message, didClose: () => productCodeRef.current?.focus() });
      }
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validateAllDTOs = (): boolean => {
    const validation = validateForm(combinedRdData);
    if (!validation.isValid) {
      setShowValidationSummary(true);
      Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `<div class="text-left">
          <p class="mb-3">Please fix the following ${validation.errors.length} error(s):</p>
          <div class="max-h-48 overflow-y-auto text-sm">
            ${Object.entries(validation.errorsByTab).map(([tab, tabErrors]) => `
              <div class="mb-2">
                <strong class="text-blue-600">${tab.charAt(0).toUpperCase() + tab.slice(1)}:</strong>
                <ul class="ml-4 list-disc">
                  ${(tabErrors as ValidationError[]).slice(0, 3).map((e) => `<li class="text-red-600">${e.message}</li>`).join("")}
                  ${(tabErrors as ValidationError[]).length > 3 ? `<li class="text-gray-500">...and ${(tabErrors as ValidationError[]).length - 3} more</li>` : ""}
                </ul>
              </div>`).join("")}
          </div>
        </div>`,
        confirmButtonText: "Fix Errors",
      });
      const firstError = validation.errors[0];
      if (firstError) {
        setActiveTab(firstError.tab);
        setTimeout(() => {
          const el = document.getElementById(firstError.field.replace(/\[|\]|\./g, "_"));
          if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
        }, 100);
      }
      return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateAllDTOs()) return;
    setLoading(true);
    try {
      const response = isEditMode && productId
        ? await rdProductApiService.updateRDProduct(combinedRdData, Number(productId))
        : await rdProductApiService.createRDProduct(combinedRdData);

      if (response.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: response.message || `RD Product ${isEditMode ? "updated" : "created"} successfully!`, confirmButtonColor: "#3B82F6" });
        clearErrors();
        setShowValidationSummary(false);
        isEditMode ? navigate("/rdproduct-info") : handleReset();
      } else {
        throw new Error(response.message || `Failed to ${isEditMode ? "update" : "create"} RD Product`);
      }
    } catch (error: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: error.message || "Failed to save RD Product.", confirmButtonColor: "#EF4444" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (user.branchid && user.branchid !== 0) {
    setCombinedRdData((prev) => ({
      ...prev,
      rdProductDTO: {
        ...prev.rdProductDTO!,
        branchId: user.branchid,
      },
      rdProductRulesDTO: {
        ...prev.rdProductRulesDTO!,
        branchId: user.branchid,
      },
      rdProductPostingHeadsDTO: {
        ...prev.rdProductPostingHeadsDTO!,
        branchId: user.branchid,
      },
    }));
  }
}, [user.branchid]); 
  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCombinedRdData(getInitialState());
    setActiveTab("header");
    clearErrors();
    setShowValidationSummary(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const errorsByField = errors.reduce((acc, e) => { if (!acc[e.field]) acc[e.field] = []; acc[e.field].push(e); return acc; }, {} as Record<string, ValidationError[]>);
  const errorsByTab   = errors.reduce((acc, e) => { if (!acc[e.tab])   acc[e.tab]   = []; acc[e.tab].push(e);   return acc; }, {} as Record<string, ValidationError[]>);

  const getTabClassName = (tabId: string) => {
    const hasErrors = errorsByTab[tabId]?.length > 0;
    const base = "flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative";
    if (activeTab === tabId) return `${base} border-blue-500 text-blue-600 bg-blue-50`;
    if (hasErrors)           return `${base} border-red-300 text-red-600 hover:bg-red-50`;
    return `${base} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
  };

  // ✅ FIX: numeric values from headCode
  const accountHeadOptions = accountHeads.map((h) => ({
    value: Number(h.headCode),
    label: h.accountHeadName,
  }));

  const tabs = [
    { id: "header",   label: "Product Information", icon: FileText   },
    { id: "rules",    label: "Product Rules",        icon: Settings   },
    { id: "posting",  label: "Posting Heads",        icon: DollarSign },
    { id: "interest", label: "Interest Rules",       icon: TrendingUp },
  ];

  // ─── Tab 1: Product Information ───────────────────────────────────────────────
  const renderHeaderInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" /> RD Product Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <FormField name="productName" label="Product Name" required errors={errorsByField.productName || []} icon={<User className="w-4 h-4 text-green-500" />}>
            <input
              type="text"
              ref={productNameRef}
              value={combinedRdData.rdProductDTO?.productName || ""}
              onChange={(e) => handleProductChange("productName", e.target.value)}
              onBlur={(e) => handleFieldBlur("productName", e.target.value)}
              maxLength={100}
              autoFocus
              placeholder="e.g., Daily Deposit Scheme"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <FormField name="productNameInSL" label="Product Name (In SL)" required errors={errorsByField.productNameInSL || []} icon={<FileText className="w-4 h-4 text-blue-500" />}>
            <input
              type="text"
              value={combinedRdData.rdProductDTO?.productNameInSL || ""}
              onChange={(e) => handleProductChange("productNameInSL", e.target.value)}
              onBlur={() => handleFieldBlur("productNameInSL")}
              maxLength={100}
              placeholder="Short / local language name"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <FormField name="effectiveFrom" label="Effective From" required errors={errorsByField.effectiveFrom || []} icon={<Calendar className="w-4 h-4 text-orange-500" />}>
            <DatePicker
              value={combinedRdData.rdProductDTO?.effectiveFrom || ""}
              onChange={(val) => handleProductChange("effectiveFrom", val)}
              onBlur={() => handleFieldBlur("effectiveFrom")}
              max={sessionDate}
              workingDate={sessionDate}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
            />
          </FormField>

          <FormField name="productCode" label="Code" required errors={errorsByField.productCode || []} icon={<CreditCard className="w-4 h-4 text-purple-500" />}>
            <input
              type="text"
              ref={productCodeRef}
              value={combinedRdData.rdProductDTO?.productCode || ""}
              onChange={(e) => handleProductChange("productCode", e.target.value)}
              onBlur={(e) => handleFieldBlur("productCode", e.target.value)}
              maxLength={10}
              placeholder="e.g., 21"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ─── Tab 2: Product Rules ─────────────────────────────────────────────────────
  const renderProductRules = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Definition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <FormField name="documentPlan" label="Document Plan" required errors={errorsByField.documentPlan || []}>
            <Select
              instanceId="document-plan-select"
              options={documentPlanOptions}
              // ✅ FIX: numeric comparison
              value={documentPlanOptions.find((o) => o.value === Number(combinedRdData.rdProductRulesDTO?.documentPlan)) || null}
              onChange={(sel) => handleRulesChange("documentPlan", sel?.value ?? 0)}
              placeholder="Select Document Plan"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField name="periodLimitMin" label="Period Limit Min (Months)" required errors={errorsByField.periodLimitMin || []}>
            <input
              type="text"
              inputMode="numeric"
              value={combinedRdData.rdProductRulesDTO?.periodLimitMin || ""}
              onChange={(e) => handleNumericInput(e, (val) => handleRulesChange("periodLimitMin", val), false, 4)}
              onBlur={() => handleFieldBlur("periodLimitMin")}
              maxLength={4}
              placeholder="e.g., 0"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <FormField name="periodLimitMax" label="Period Limit Max (Months)" required errors={errorsByField.periodLimitMax || []}>
            <input
              type="text"
              inputMode="numeric"
              value={combinedRdData.rdProductRulesDTO?.periodLimitMax || ""}
              onChange={(e) => handleNumericInput(e, (val) => handleRulesChange("periodLimitMax", val), false, 4)}
              onBlur={() => handleFieldBlur("periodLimitMax")}
              maxLength={4}
              placeholder="e.g., 999"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ─── Tab 3: Posting Heads ─────────────────────────────────────────────────────
  const renderPostingHeads = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Posting Account Heads
        </h3>
        <div className="grid grid-cols-1 gap-6">

          <FormField name="principalBalHeadCode" label="Principal Bal. Head" required errors={errorsByField.principalBalHeadCode || []}>
            <Select
              instanceId="rd-principal-bal-head-select"
              options={accountHeadOptions}
              // ✅ FIX: both sides as Number for strict equality
              value={accountHeadOptions.find((o) => o.value === Number(combinedRdData.rdProductPostingHeadsDTO?.principalBalHeadCode)) || null}
              // ✅ FIX: parse to number, not string
              onChange={(sel) => handlePostingHeadsChange("principalBalHeadCode", sel ? Number(sel.value) : 0)}
              placeholder="Select Principal Balance Head"
              isClearable
              className="text-sm"
            />
          </FormField>

          <FormField name="intPayableHeadCode" label="Int. Payable Head" required errors={errorsByField.intPayableHeadCode || []}>
            <Select
              instanceId="rd-int-payable-head-select"
              options={accountHeadOptions}
              // ✅ FIX: both sides as Number
              value={accountHeadOptions.find((o) => o.value === Number(combinedRdData.rdProductPostingHeadsDTO?.intPayableHeadCode)) || null}
              // ✅ FIX: parse to number
              onChange={(sel) => handlePostingHeadsChange("intPayableHeadCode", sel ? Number(sel.value) : 0)}
              placeholder="Select Interest Payable Head"
              isClearable
              className="text-sm"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ─── Tab 4: Interest Rules ────────────────────────────────────────────────────
  const renderInterestRules = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Interest Rules
          </h3>
          <button
            onClick={handleAddInterestRow}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>

        {(combinedRdData.rdProductInterestRulesDetails || []).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No interest rules added yet. Click <strong>Add Rule</strong> to begin.</p>
          </div>
        ) : (
          <>
            {(combinedRdData.rdProductInterestRulesDetails || []).map((row, index) => (
              <div key={index} className="bg-white border border-amber-200 rounded-lg p-5 mb-4 relative">
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => handleRemoveInterestRow(index)}
                    disabled={(combinedRdData.rdProductInterestRulesDetails || []).length === 1}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Remove Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

                  <FormField name={`applicableDate_${index}`} label="Date" required errors={errorsByField[`applicableDate_${index}`] || []}>
                    <DatePicker
                      value={row.applicableDate || ""}
                      onChange={(val) => handleInterestRowChange(index, "applicableDate", val)}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none text-sm"
                    />
                  </FormField>

                  <FormField name={`postingInterval_${index}`} label="Posting Interval" required errors={errorsByField[`postingInterval_${index}`] || []}>
                    <Select
                      instanceId={`posting-interval-${index}`}
                      options={postingIntervalOptions}
                      value={postingIntervalOptions.find((o) => o.value === Number(row.postingInterval)) || null}
                      onChange={(sel) => handleInterestRowChange(index, "postingInterval", sel?.value ?? 0)}
                      placeholder="==Select=="
                      isClearable
                      className="text-sm"
                    />
                  </FormField>

                  <FormField name={`compoundingInterval_${index}`} label="Compounding Interval" required errors={errorsByField[`compoundingInterval_${index}`] || []}>
                    <Select
                      instanceId={`compounding-interval-${index}`}
                      options={compoundingIntervalOptions}
                      value={compoundingIntervalOptions.find((o) => o.value === Number(row.compoundingInterval)) || null}
                      onChange={(sel) => handleInterestRowChange(index, "compoundingInterval", sel?.value ?? 0)}
                      placeholder="==Select=="
                      isClearable
                      className="text-sm"
                    />
                  </FormField>

                  <FormField name={`minLockInPeriodDays_${index}`} label="Min Lock-In Period Days" required errors={[]}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.minLockInPeriodDays || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "minLockInPeriodDays", val), false, 5)}
                      maxLength={5}
                      placeholder="e.g., 90"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

                  <FormField name={`interestRateFrom_${index}`} label="Interest Rate From (%)" required errors={errorsByField[`interestRateFrom_${index}`] || []}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.interestRateFrom || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "interestRateFrom", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., 1"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>

                  <FormField name={`interestRateTo_${index}`} label="Interest Rate To (%)" required errors={errorsByField[`interestRateTo_${index}`] || []}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.interestRateTo || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "interestRateTo", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., 100"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>

                  <FormField name={`variationFrom_${index}`} label="Interest Variation From (-ve)" required errors={[]}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.variationFrom || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "variationFrom", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., -5"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>

                  <FormField name={`variationTo_${index}`} label="Interest Variation To (+ve)" required errors={[]}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.variationTo || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "variationTo", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., 5"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <FormField name={`actionOnIntPosting_${index}`} label="Action on Int. Posting" required errors={errorsByField[`actionOnIntPosting_${index}`] || []}>
                    <div className="flex items-center gap-6 mt-2">
                      {actionOnIntPostingOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name={`actionOnIntPosting_${index}`}
                            value={opt.value}
                            checked={row.actionOnIntPosting === opt.value}
                            onChange={() => handleInterestRowChange(index, "actionOnIntPosting", opt.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </FormField>

                  <FormField name={`intRateOnPrematurity_${index}`} label="Int. Rate on Pre-maturity (%)" required errors={[]}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.intRateOnPrematurity || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "intRateOnPrematurity", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., 3.5"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>

                  <FormField name={`postMaturityIntRate_${index}`} label="Post Maturity Int Rate (%)" required errors={[]}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.postMaturityIntRate || ""}
                      onChange={(e) => handleNumericInput(e, (val) => handleInterestRowChange(index, "postMaturityIntRate", val), true, 6)}
                      maxLength={6}
                      placeholder="e.g., 4.0"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                  </FormField>
                </div>
              </div>
            ))}

            {/* Summary Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    {["Date", "Int. Rate From", "Int. Rate To", "Variation From", "Variation To", "Posting Interval", "Compounding Interval", "Action"].map((h) => (
                      <th key={h} className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(combinedRdData.rdProductInterestRulesDetails || []).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                      <td className="border border-gray-300 px-3 py-2 text-center">{row.applicableDate || "—"}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{row.interestRateFrom}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{row.interestRateTo}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{row.variationFrom}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{row.variationTo}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">{getPostingLabel(row.postingInterval)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">{getCompoundingLabel(row.compoundingInterval)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <button
                          onClick={() => handleRemoveInterestRow(i)}
                          disabled={(combinedRdData.rdProductInterestRulesDetails || []).length === 1}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all disabled:opacity-40"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "rules":    return renderProductRules();
      case "posting":  return renderPostingHeads();
      case "interest": return renderInterestRules();
      default:         return renderHeaderInfo();
    }
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Edit" : "Add"} RD Product Configuration
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Configure Recurring Deposit product rules and settings</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(isEditMode ? "/rdproduct-info" : "/product-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Operations
                </button>
              </div>
            </div>

            {/* Validation Summary */}
            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(_, tab) => setActiveTab(tab)}
              onClose={() => setShowValidationSummary(false)}
            />

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-0 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon          = tab.icon;
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
                    onClick={isEditMode ? commonservice.handleResetNotAllowed : handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Form
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEditMode ? "Updating..." : "Saving..."}</>
                    ) : (
                      <><Save className="w-4 h-4" />{isEditMode ? "Update RD Product" : "Save RD Product"}</>
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

export default RDProductMaster;
