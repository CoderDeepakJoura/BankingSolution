// RDProductBranchwiserule.tsx
import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import branchwiserule, {
  RDProductBranchwiseRuleDTO,
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
  CheckSquare,
  Repeat,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";


// ─── Interfaces ───────────────────────────────────────────────────────────────
interface RDProduct {
  id: number;
  productName: string;
}


interface AccountMaster {
  accId: number;
  accountName: string;
}


interface ValidationErrors {
  rdProductId?: string;
  interestFormula?: string;
  accNoGeneration?: string;
  paymentDateType?: string;
  noOfDayOrMonth?: string;
  intExpenseAccount?: string;
  penaltyIncExpAccount?: string;
  closingChargesAccount?: string;
}


// ─── Static Options ───────────────────────────────────────────────────────────
const interestFormulaOptions = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: `Formula${n}`,
}));


const accNoGenerationOptions = [
  { value: 1, label: "Product Wise" },
  { value: 2, label: "Continue" },
];


const paymentDateTypeOptions = [
  { value: 1, label: "Day" },
  { value: 2, label: "Month" },
];


// ─── Component ────────────────────────────────────────────────────────────────
const RDProductBranchwiserule = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);


  const [loading, setLoading] = useState(false);
  const [loadingProductData, setLoadingProductData] = useState(false);
  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );


  const rdProductSelectRef = useRef<any>(null);


  // ── Form State ──────────────────────────────────────────────────────────────
  const getInitialState = () => ({
    id: null as number | null,
    branchId: user.branchid,
    rdProductId: 0,
    interestFormula: 0,
    accNoGeneration: 0,
    printCertificate: false,
    kistAfterMaturity: false,
    paymentDateType: 0,
    noOfDayOrMonth: 0,
    intExpenseAccount: 0,
    penaltyIncExpAccount: 0,
    closingChargesAccount: 0,
  });


  const [formData, setFormData] = useState(getInitialState);


  // ── Fetch dropdowns on mount ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [productsRes, accountsRes] = await Promise.all([
          commonservice.fetch_rd_products(user.branchid),
          commonservice.general_accmasters_info(user.branchid),
        ]);
        setRdProducts(productsRes.data || []);
        setAccounts(accountsRes.data || []);
      } catch (err: any) {
        Swal.fire("Error", "Failed to load required data", "error");
      }
    })();
  }, [user.branchid]);


  // ── Validation ───────────────────────────────────────────────────────────────
  const validateField = (
    field: string,
    value: any,
    // ← CHANGE 1: pass full form snapshot for cross-field account checks
    allValues?: typeof formData,
  ): string | undefined => {
    const data = allValues ?? formData;

    switch (field) {
      case "rdProductId":
        return !value || value === 0 ? "RD Product is required" : undefined;
      case "interestFormula":
        return !value || value === 0
          ? "Interest Formula is required"
          : undefined;
      case "accNoGeneration":
        return !value || value === 0
          ? "Account Number Generation is required"
          : undefined;
      case "paymentDateType":
        return !value || value === 0
          ? "Payment Date type is required"
          : undefined;
      case "noOfDayOrMonth":
        return !value || value === 0
          ? "No. of Day or Month is required"
          : undefined;

      // ── CHANGE 1: uniqueness checks across all three account fields ──
      case "intExpenseAccount": {
        if (!value || value === 0) return "Interest Expense Account is required";
        if (
          (data.penaltyIncExpAccount !== 0 && value === data.penaltyIncExpAccount) ||
          (data.closingChargesAccount !== 0 && value === data.closingChargesAccount)
        )
          return "Int Exp Account must be different from the other two accounts";
        return undefined;
      }
      case "penaltyIncExpAccount": {
        if (!value || value === 0) return "Penalty Income Expense Account is required";
        if (
          (data.intExpenseAccount !== 0 && value === data.intExpenseAccount) ||
          (data.closingChargesAccount !== 0 && value === data.closingChargesAccount)
        )
          return "Penalty Inc Exp Account must be different from the other two accounts";
        return undefined;
      }
      case "closingChargesAccount": {
        if (!value || value === 0) return "Closing Charges Account is required";
        if (
          (data.intExpenseAccount !== 0 && value === data.intExpenseAccount) ||
          (data.penaltyIncExpAccount !== 0 && value === data.penaltyIncExpAccount)
        )
          return "Closing Charges Account must be different from the other two accounts";
        return undefined;
      }

      default:
        return undefined;
    }
  };


  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};
    const fields: (keyof ValidationErrors)[] = [
      "rdProductId",
      "interestFormula",
      "accNoGeneration",
      "paymentDateType",
      "noOfDayOrMonth",
      "intExpenseAccount",
      "penaltyIncExpAccount",
      "closingChargesAccount",
    ];
    // ← CHANGE 1: pass formData snapshot so cross-field checks are consistent
    fields.forEach((f) => {
      const err = validateField(
        f,
        formData[f as keyof typeof formData],
        formData,
      );
      if (err) errors[f] = err;
    });
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };


  // ── Fetch existing rule for selected product ──────────────────────────────────
  const fetchProductData = async (productId: number) => {
    if (!productId) return;
    setLoadingProductData(true);
    try {
      const response = await branchwiserule.get_rd_branchwiserule_data(
        productId,
        user.branchid,
      );
      if (response.success && response.data) {
        const d = response.data;
        setFormData((prev) => ({
          ...prev,
          id: d.id || null,
          interestFormula: d.intFormula || 0,
          accNoGeneration: Number(d.accNoGeneration) || 0,
          printCertificate: d.printCertificate ?? false,
          kistAfterMaturity: d.kistAfterMaturity ?? false,
          paymentDateType: d.paymentDateType || 0,
          noOfDayOrMonth: d.noOfDayOrMonth || 0,
          intExpenseAccount: d.intExpAccId || 0,
          penaltyIncExpAccount: d.penaltyIncAccId || 0,
          closingChargesAccount: d.closingChargesAcc || 0,
        }));
      } else {
        setFormData((prev) => ({
          ...getInitialState(),
          rdProductId: prev.rdProductId,
        }));
      }
    } finally {
      setLoadingProductData(false);
    }
  };


  // ── Input helpers ─────────────────────────────────────────────────────────────
  const handleInputChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    // ← CHANGE 1: re-validate the changed field using the updated snapshot
    // Also re-validate sibling account fields so their errors clear/appear live
    const accountFields: (keyof ValidationErrors)[] = [
      "intExpenseAccount",
      "penaltyIncExpAccount",
      "closingChargesAccount",
    ];
    const isAccountField = accountFields.includes(
      field as keyof ValidationErrors,
    );

    setValidationErrors((prev) => {
      const next = { ...prev };

      // Always clear+recheck the field that changed
      next[field as keyof ValidationErrors] = validateField(
        field,
        value,
        updated,
      );

      // If an account field changed, also recheck the other two siblings
      if (isAccountField) {
        accountFields
          .filter((f) => f !== field)
          .forEach((sibling) => {
            next[sibling] = validateField(
              sibling,
              updated[sibling as keyof typeof updated],
              updated,
            );
          });
      }

      return next;
    });
  };


  const handleProductChange = async (selected: any) => {
    const id = selected ? selected.value : 0;
    handleInputChange("rdProductId", id);
    if (id > 0) await fetchProductData(id);
    else setFormData({ ...getInitialState() });
  };


  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFormData(getInitialState());
    setValidationErrors({});
    setLoading(false);
    setTimeout(() => rdProductSelectRef.current?.focus(), 100);
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
      const dto: RDProductBranchwiseRuleDTO = {
        Id: formData.id || undefined,
        BrId: user.branchid,
        RDProductId: Number(formData.rdProductId),
        IntFormula: Number(formData.interestFormula),
        AccNoGeneration: formData.accNoGeneration.toString(),
        PrintCertificate: formData.printCertificate,
        KistAfterMaturity: formData.kistAfterMaturity,
        PaymentDateType: Number(formData.paymentDateType),
        NoOfDayOrMonth: Number(formData.noOfDayOrMonth),
        IntExpAccId: Number(formData.intExpenseAccount),
        PenaltyIncAccId: Number(formData.penaltyIncExpAccount),
        ClosingChargesAcc: Number(formData.closingChargesAccount),
      };


      const res = await branchwiserule.insert_rd_product_branchwise_rule(dto);


      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "RD Product Configuration saved successfully!",
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
  const rdProductOptions = rdProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));
  const accountOptions = accounts.map((a) => ({
    value: a.accId,
    label: a.accountName,
  }));


  // ── Select styles helper ──────────────────────────────────────────────────────
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


  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">
            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      RD Product Configuration
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure Recurring Deposit product settings and account
                      mappings
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
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          RD Product <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        ref={rdProductSelectRef}
                        instanceId="rd-product-select"
                        options={rdProductOptions}
                        value={
                          rdProductOptions.find(
                            (o) => o.value === Number(formData.rdProductId),
                          ) || null
                        }
                        onChange={handleProductChange}
                        placeholder="Select RD Product (e.g., RD Member)"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(!!validationErrors.rdProductId)}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.rdProductId} />
                      <p className="text-xs text-gray-500">
                        Select the applicable RD Product to configure
                      </p>
                    </div>
                  </div>
                </div>


                {/* ── Section 2: Interest Formula ── */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5" /> Interest Formula
                  </h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <span className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-green-500" />
                        Select Formula <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {interestFormulaOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium
                            ${
                              formData.interestFormula === opt.value
                                ? "border-green-500 bg-green-100 text-green-800"
                                : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"
                            }`}
                        >
                          <input
                            type="radio"
                            name="interestFormula"
                            value={opt.value}
                            checked={formData.interestFormula === opt.value}
                            onChange={() =>
                              handleInputChange("interestFormula", opt.value)
                            }
                            className="w-4 h-4 text-green-600"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    <ErrorMsg msg={validationErrors.interestFormula} />
                    <p className="text-xs text-gray-500 mt-1">
                      Choose interest calculation formula for this product
                    </p>
                  </div>
                </div>


                {/* ── Section 3: General Settings ── */}
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" /> General Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Account Number Generation */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-yellow-600" />
                          Account No. Generation{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        instanceId="acc-no-generation-select"
                        options={accNoGenerationOptions}
                        value={
                          accNoGenerationOptions.find(
                            (o) => o.value === formData.accNoGeneration,
                          ) || null
                        }
                        onChange={(sel) =>
                          handleInputChange(
                            "accNoGeneration",
                            sel ? sel.value : 0,
                          )
                        }
                        placeholder="Select Type"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(
                          !!validationErrors.accNoGeneration,
                        )}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.accNoGeneration} />
                      <p className="text-xs text-gray-500">
                        Product Wise or Continue
                      </p>
                    </div>


                    {/* Print Certificate */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          Print Certificate
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() =>
                            handleInputChange(
                              "printCertificate",
                              !formData.printCertificate,
                            )
                          }
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            formData.printCertificate
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.printCertificate
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {formData.printCertificate ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500">
                        Enable to print RD certificate
                      </p>
                    </div>


                    {/* Kist After Maturity */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        <span className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-purple-500" />
                          Kist After Maturity
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() =>
                            handleInputChange(
                              "kistAfterMaturity",
                              !formData.kistAfterMaturity,
                            )
                          }
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            formData.kistAfterMaturity
                              ? "bg-purple-500"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.kistAfterMaturity
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {formData.kistAfterMaturity ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500">
                        Allow kist collection after maturity
                      </p>
                    </div>


                    {/* Placeholder for alignment */}
                    <div />
                  </div>
                </div>


                {/* ── Section 4: Payment Date Settings ── */}
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Payment Date Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Day or Month */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          Day or Month <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        instanceId="payment-date-type-select"
                        options={paymentDateTypeOptions}
                        value={
                          paymentDateTypeOptions.find(
                            (o) => o.value === formData.paymentDateType,
                          ) || null
                        }
                        onChange={(sel) =>
                          handleInputChange(
                            "paymentDateType",
                            sel ? sel.value : 0,
                          )
                        }
                        placeholder="==Select=="
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(
                          !!validationErrors.paymentDateType,
                        )}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.paymentDateType} />
                      <p className="text-xs text-gray-500">
                        Choose whether payment is on a specific day or month
                      </p>
                    </div>


                    {/* No of Day or Month — CHANGE 2: type="text" + digits-only filter */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-orange-500" />
                          No. of Day or Month{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"                                   // ← CHANGE 2
                        inputMode="numeric"                           // ← CHANGE 2: mobile numeric keyboard
                        value={formData.noOfDayOrMonth || ""}
                        disabled={loadingProductData}
                        maxLength={3}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (!/^\d*$/.test(raw)) return;            // ← CHANGE 2: block non-digits
                          handleInputChange(
                            "noOfDayOrMonth",
                            raw === "" ? 0 : parseInt(raw, 10),
                          );
                        }}
                        placeholder="e.g., 5"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none text-sm transition-colors
                          ${
                            validationErrors.noOfDayOrMonth
                              ? "border-red-400 focus:border-red-500"
                              : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                          }`}
                      />
                      <ErrorMsg msg={validationErrors.noOfDayOrMonth} />
                      <p className="text-xs text-gray-500">
                        Enter the day number (1–31) or month number
                      </p>
                    </div>
                  </div>
                </div>


                {/* ── Section 5: Expense Account Mappings ── */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Expense Account Mappings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Int Exp Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          Int Exp Account{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        instanceId="int-expense-account-select"
                        options={accountOptions}
                        value={
                          accountOptions.find(
                            (o) =>
                              o.value === Number(formData.intExpenseAccount),
                          ) || null
                        }
                        onChange={(sel) =>
                          handleInputChange(
                            "intExpenseAccount",
                            sel ? sel.value : 0,
                          )
                        }
                        placeholder="Select Account"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(
                          !!validationErrors.intExpenseAccount,
                        )}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.intExpenseAccount} />
                      <p className="text-xs text-gray-500">
                        E.g., INTT Paid on Member RD
                      </p>
                    </div>


                    {/* Penalty Inc Exp Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          Penalty Inc Exp Account{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        instanceId="penalty-inc-exp-account-select"
                        options={accountOptions}
                        value={
                          accountOptions.find(
                            (o) =>
                              o.value === Number(formData.penaltyIncExpAccount),
                          ) || null
                        }
                        onChange={(sel) =>
                          handleInputChange(
                            "penaltyIncExpAccount",
                            sel ? sel.value : 0,
                          )
                        }
                        placeholder="Select Account"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(
                          !!validationErrors.penaltyIncExpAccount,
                        )}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.penaltyIncExpAccount} />
                      <p className="text-xs text-gray-500">
                        E.g., Penalties Charges
                      </p>
                    </div>


                    {/* Closing Charges Account */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          Closing Charges Acc{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        instanceId="closing-charges-account-select"
                        options={accountOptions}
                        value={
                          accountOptions.find(
                            (o) =>
                              o.value ===
                              Number(formData.closingChargesAccount),
                          ) || null
                        }
                        onChange={(sel) =>
                          handleInputChange(
                            "closingChargesAccount",
                            sel ? sel.value : 0,
                          )
                        }
                        placeholder="Select Account"
                        isClearable
                        isDisabled={loadingProductData}
                        styles={selectStyles(
                          !!validationErrors.closingChargesAccount,
                        )}
                        menuPortalTarget={document.body}
                        className="text-sm"
                      />
                      <ErrorMsg msg={validationErrors.closingChargesAccount} />
                      <p className="text-xs text-gray-500">
                        E.g., Account Closing Charges
                      </p>
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
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save RD Configuration
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


export default RDProductBranchwiserule;