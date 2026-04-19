import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import branchwiserule, {
  LoanProductBranchWiseRuleDTO,
} from "../../../services/branchwiserule/branchwiserules";
import {
  Save,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Landmark,
  AlertCircle,
  RotateCcw,
  Settings,
  User,
  Hash,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanProductApiService from "../../../services/productmasters/Loan/loanproductapi";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface LoanProduct {
  id: number;
  productName: string;
}

interface AccountMaster {
  accId: number;
  accountName: string;
}

interface ValidationErrors {
  loanProductId?: string;
  currentRecoverableIntAcc?: string;
  overdueRecoverableIntAcc?: string;
}

// ─── Static Options ───────────────────────────────────────────────────────────
const ACT_ON_EXP_OPTIONS = [
  { value: 1, label: "Add In Balance" },
  { value: 2, label: "Stand" },
];

const OPERATED_BY_OPTIONS = [
  { value: "M", label: "Membership No" },
  { value: "A", label: "Account No" },
];

const ACC_NAME_FIRST_OPTIONS = [
  { value: "A", label: "Account No" },
  { value: "N", label: "Name" },
];

// ─── Component ────────────────────────────────────────────────────────────────
const LoanProductBranchWiseRulePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [loadingProductData, setLoadingProductData] = useState(false);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showRecoverableAccounts, setShowRecoverableAccounts] = useState(false);

  const productSelectRef = useRef<any>(null);

  // ── Form State ──────────────────────────────────────────────────────────────
  const getInitialState = () => ({
    id: null as number | null,
    branchId: user.branchid,
    loanProductId: 0,
    operatedBy: "" as string,
    accNoOrNameFirst: "" as string,
    tempRecAccId: 0,
    intIncomeAcc: 0,
    currentRecoverableIntAcc: 0,
    overdueRecoverableIntAcc: 0,
    isApplyOverInt: false,
    ovrIntProvAcc: 0,
    intwrtDepositPledge: 0,
    ovrIntFromOpendate: false,
    actOnExpPosting: 0,
  });

  const [formData, setFormData] = useState(getInitialState);

  // ── Fetch dropdowns on mount ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [productsRes, accountsRes] = await Promise.all([
          commonservice.fetch_loan_products(user.branchid),
          commonservice.general_accmasters_info(user.branchid),
        ]);
        setLoanProducts((productsRes as any).data || []);
        setAccounts(accountsRes.data || []);
      } catch {
        Swal.fire("Error", "Failed to load required data", "error");
      }
    })();
  }, [user.branchid]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};
    if (!formData.loanProductId || formData.loanProductId === 0)
      errors.loanProductId = "Loan Product is required";
    if (showRecoverableAccounts) {
      if (!formData.currentRecoverableIntAcc || formData.currentRecoverableIntAcc === 0)
        errors.currentRecoverableIntAcc = "Current Recoverable Int Account is required";
      if (!formData.overdueRecoverableIntAcc || formData.overdueRecoverableIntAcc === 0)
        errors.overdueRecoverableIntAcc = "Overdue Recoverable Int Account is required";
    }
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // ── Fetch existing rule + product definition for selected product ─────────────
  const fetchProductData = async (productId: number) => {
    if (!productId) return;
    setLoadingProductData(true);
    try {
      const [ruleRes, productRes] = await Promise.all([
        branchwiserule.get_loan_branchwiserule_data(productId, user.branchid),
        loanProductApiService.getLoanProductById(productId, user.branchid),
      ]);

      // Check actOnIntPosting from product definition
      const actOnInt = (productRes as any).data?.loanProductDefinitionDTO?.actOnIntPosting;
      setShowRecoverableAccounts(actOnInt === 2);

      if (ruleRes.success && ruleRes.data) {
        const d = ruleRes.data;
        setFormData((prev) => ({
          ...prev,
          id: d.id || null,
          operatedBy: d.operatedBy || "",
          accNoOrNameFirst: d.accNoOrNameFirst || "",
          tempRecAccId: d.tempRecAccId || 0,
          intIncomeAcc: d.intIncomeAcc || 0,
          currentRecoverableIntAcc: d.currentRecoverableIntAcc || 0,
          overdueRecoverableIntAcc: d.overdueRecoverableIntAcc || 0,
          isApplyOverInt: (d.isApplyOverInt ?? 0) === 1,
          ovrIntProvAcc: d.ovrIntProvAcc || 0,
          intwrtDepositPledge: d.intwrtDepositPledge || 0,
          ovrIntFromOpendate: (d.ovrIntFromOpendate ?? 0) === 1,
          actOnExpPosting: d.actOnExpPosting || 0,
        }));
      } else {
        setFormData((prev) => ({ ...getInitialState(), loanProductId: prev.loanProductId }));
      }
    } finally {
      setLoadingProductData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProductChange = async (selected: any) => {
    const id = selected ? selected.value : 0;
    setFormData({ ...getInitialState(), loanProductId: id, branchId: user.branchid });
    setShowRecoverableAccounts(false);
    setValidationErrors({});
    if (id > 0) await fetchProductData(id);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFormData(getInitialState());
    setValidationErrors({});
    setShowRecoverableAccounts(false);
    setLoading(false);
    setTimeout(() => productSelectRef.current?.focus(), 100);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      const msgs = Object.values(validation.errors).filter(Boolean);
      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `<div class="text-left"><p class="mb-3">Please fix ${msgs.length} error(s):</p>
          <ul class="ml-4 list-disc text-sm">${msgs.map((m) => `<li class="text-red-600">${m}</li>`).join("")}</ul></div>`,
        confirmButtonText: "Fix Errors",
      });
      return;
    }

    setLoading(true);
    try {
      const dto: LoanProductBranchWiseRuleDTO = {
        Id: formData.id || undefined,
        BranchId: user.branchid,
        LoanProductId: formData.loanProductId,
        OperatedBy: formData.operatedBy || undefined,
        AccNoOrNameFirst: formData.accNoOrNameFirst || undefined,
        TempRecAccId: formData.tempRecAccId || undefined,
        IntIncomeAcc: formData.intIncomeAcc || undefined,
        CurrentRecoverableIntAcc: showRecoverableAccounts ? (formData.currentRecoverableIntAcc || undefined) : undefined,
        OverdueRecoverableIntAcc: showRecoverableAccounts ? (formData.overdueRecoverableIntAcc || undefined) : undefined,
        IsApplyOverInt: formData.isApplyOverInt ? 1 : 0,
        OVRIntProvAcc: formData.ovrIntProvAcc || 0,
        IntwrtDepositPledge: formData.intwrtDepositPledge || undefined,
        OVRIntFromOpendate: formData.ovrIntFromOpendate ? 1 : 0,
        ActOnExpPosting: formData.actOnExpPosting || undefined,
      };

      const res = await branchwiserule.insert_loan_product_branchwise_rule(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "Loan Product Branch Wise Rule saved successfully!",
          confirmButtonColor: "#3B82F6",
          showConfirmButton: false,
          timer: 1500,
        });
        handleReset();
      } else {
        throw new Error(res.message || "Failed to save data");
      }
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to save.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Dropdown options ──────────────────────────────────────────────────────────
  const loanProductOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const accountOptions = accounts.map((a) => ({ value: a.accId, label: a.accountName }));

  const selectStyles = (hasError: boolean) => ({
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any) => ({
      ...base,
      borderColor: hasError ? "#ef4444" : base.borderColor,
    }),
  });

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? (
      <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
        <AlertCircle className="w-3 h-3" /> {msg}
      </span>
    ) : null;

  const Toggle = ({
    value,
    onChange,
    activeColor = "bg-blue-500",
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    activeColor?: string;
  }) => (
    <div
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${value ? activeColor : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
      />
    </div>
  );

  const AccountSelect = ({
    instanceId,
    value,
    onChange,
    error,
    placeholder = "Select Account",
    disabled,
  }: {
    instanceId: string;
    value: number;
    onChange: (v: number) => void;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <div>
      <Select
        instanceId={instanceId}
        options={accountOptions}
        value={accountOptions.find((o) => o.value === value) || null}
        onChange={(sel) => onChange(sel ? sel.value : 0)}
        placeholder={placeholder}
        isClearable
        isDisabled={loadingProductData || disabled}
        styles={selectStyles(!!error)}
        menuPortalTarget={document.body}
        className="text-sm"
      />
      <ErrorMsg msg={error} />
    </div>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Loan Product Branch Wise Rule
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure loan product operational settings and account mappings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back To Dashboard
                </button>
              </div>
            </div>

            {/* ── Loading bar ── */}
            {loadingProductData && (
              <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Loading product data...</span>
              </div>
            )}

            {/* ── Main Form ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">

                {/* ── Section 1: Product Selection ── */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5" /> Product Selection
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          Loan Product <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        ref={productSelectRef}
                        instanceId="loan-product-select"
                        options={loanProductOptions}
                        value={loanProductOptions.find((o) => o.value === formData.loanProductId) || null}
                        onChange={handleProductChange}
                        placeholder="Select Loan Product"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(!!validationErrors.loanProductId)}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.loanProductId} />
                      <p className="text-xs text-gray-500">
                        Select a product to load existing configuration
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-blue-500" />
                          Act on Exp Posting
                        </span>
                      </label>
                      <Select
                        instanceId="act-on-exp-select"
                        options={ACT_ON_EXP_OPTIONS}
                        value={ACT_ON_EXP_OPTIONS.find((o) => o.value === formData.actOnExpPosting) || null}
                        onChange={(sel) => handleInputChange("actOnExpPosting", sel ? sel.value : 0)}
                        placeholder="Select Action"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(false)}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Operational Settings ── */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" /> Operational Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operated By */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-green-600" />
                          Operated By
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {OPERATED_BY_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium
                              ${formData.operatedBy === opt.value
                                ? "border-green-500 bg-green-100 text-green-800"
                                : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"}`}
                          >
                            <input
                              type="radio"
                              name="operatedBy"
                              value={opt.value}
                              checked={formData.operatedBy === opt.value}
                              onChange={() => handleInputChange("operatedBy", opt.value)}
                              className="w-4 h-4 text-green-600"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Account No. or Name First */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-green-600" />
                          Account No. or Name First
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {ACC_NAME_FIRST_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium
                              ${formData.accNoOrNameFirst === opt.value
                                ? "border-green-500 bg-green-100 text-green-800"
                                : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"}`}
                          >
                            <input
                              type="radio"
                              name="accNoOrNameFirst"
                              value={opt.value}
                              checked={formData.accNoOrNameFirst === opt.value}
                              onChange={() => handleInputChange("accNoOrNameFirst", opt.value)}
                              className="w-4 h-4 text-green-600"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Account Mappings ── */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Account Mappings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* OVR Int Provisioning Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-purple-500" />
                          OVR Int Provisioning Account
                        </span>
                      </label>
                      <AccountSelect
                        instanceId="ovr-int-prov-acc"
                        value={formData.ovrIntProvAcc}
                        onChange={(v) => handleInputChange("ovrIntProvAcc", v)}
                        placeholder="Select Account"
                      />
                      <p className="text-xs text-gray-500">E.g., Provision for OD Reserve</p>
                    </div>

                    {/* Temp Recovery Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-purple-500" />
                          Temp Recovery Account (For Cheque Entry)
                        </span>
                      </label>
                      <AccountSelect
                        instanceId="temp-rec-acc"
                        value={formData.tempRecAccId}
                        onChange={(v) => handleInputChange("tempRecAccId", v)}
                        placeholder="Select Account"
                      />
                      <p className="text-xs text-gray-500">E.g., Cheque Collection Charges</p>
                    </div>

                    {/* Interest Income Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-purple-500" />
                          Interest Income Account
                        </span>
                      </label>
                      <AccountSelect
                        instanceId="int-income-acc"
                        value={formData.intIncomeAcc}
                        onChange={(v) => handleInputChange("intIncomeAcc", v)}
                        placeholder="Select Account"
                      />
                      <p className="text-xs text-gray-500">E.g., Int Received on Loan</p>
                    </div>

                    {/* Int wrt Deposit Pledge */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-purple-500" />
                          Interest wrt Deposit Pledge
                        </span>
                      </label>
                      <AccountSelect
                        instanceId="intwrt-deposit-pledge"
                        value={formData.intwrtDepositPledge}
                        onChange={(v) => handleInputChange("intwrtDepositPledge", v)}
                        placeholder="Select Account"
                      />
                    </div>

                    {/* Conditional: Current & Overdue Recoverable Accounts */}
                    {showRecoverableAccounts && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-red-500" />
                              Current Recoverable Int Account
                              <span className="text-red-500">*</span>
                            </span>
                          </label>
                          <AccountSelect
                            instanceId="current-recoverable-int-acc"
                            value={formData.currentRecoverableIntAcc}
                            onChange={(v) => handleInputChange("currentRecoverableIntAcc", v)}
                            error={validationErrors.currentRecoverableIntAcc}
                            placeholder="Select Account"
                          />
                          <p className="text-xs text-gray-500">Required when interest posting is set to Stand</p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-red-500" />
                              Overdue Recoverable Int Account
                              <span className="text-red-500">*</span>
                            </span>
                          </label>
                          <AccountSelect
                            instanceId="overdue-recoverable-int-acc"
                            value={formData.overdueRecoverableIntAcc}
                            onChange={(v) => handleInputChange("overdueRecoverableIntAcc", v)}
                            error={validationErrors.overdueRecoverableIntAcc}
                            placeholder="Select Account"
                          />
                          <p className="text-xs text-gray-500">Required when interest posting is set to Stand</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Section 4: Flags ── */}
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Additional Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Is Apply Over Int */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <span className="flex items-center gap-2">
                          Is Apply Over Interest
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <Toggle
                          value={formData.isApplyOverInt}
                          onChange={(v) => handleInputChange("isApplyOverInt", v)}
                        />
                        <span className="text-sm text-gray-700">
                          {formData.isApplyOverInt ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500">Apply overdue interest on the account</p>
                    </div>

                    {/* OVR Int From Open Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <span className="flex items-center gap-2">
                          Apply Over Int From Opening Date
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <Toggle
                          value={formData.ovrIntFromOpendate}
                          onChange={(v) => handleInputChange("ovrIntFromOpendate", v)}
                          activeColor="bg-orange-500"
                        />
                        <span className="text-sm text-gray-700">
                          {formData.ovrIntFromOpendate ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500">Calculate overdue interest from account opening date</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Action Buttons ── */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Form
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || loadingProductData}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Branch Wise Rule
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

export default LoanProductBranchWiseRulePage;
