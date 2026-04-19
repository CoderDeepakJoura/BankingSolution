import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { decryptId } from "../../../utils/encryption";
import Select from "react-select";
import {
  Save, ArrowLeft, Percent, Plus, Trash2,
  Calendar, CreditCard, Landmark, AlertCircle, RotateCcw,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanSlabService, { CombinedLoanSlabDTO } from "../../../services/interestslab/loanslabservice";

const MAX_AMOUNT   = 99_999_999;
const MAX_PERIOD   = 9999;
const MAX_RATE     = 100;
const MAX_NAME_LEN = 50;
const MIN_NAME_LEN = 3;

interface LoanProduct { id: number; productName: string; }

interface SlabRow {
  fromAmount:      string;
  toAmount:        string;
  periodFrom:      string;
  periodTo:        string;
  periodFromInDays: string;
  periodToInDays:  string;
  stdIntRate:      string;
  penalIntRate:    string;
}

type SlabErrors = Record<number, Partial<Record<keyof SlabRow, string>>>;

interface FormErrors {
  loanProductId?: string;
  name?:          string;
  date?:          string;
}

const toInteger = (raw: string) => raw.replace(/[^0-9]/g, "").replace(/^0+(\d)/, "$1");
const toDecimal2 = (raw: string) => {
  let v = raw.replace(/[^0-9.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  if (parts.length === 2) v = parts[0] + "." + parts[1].substring(0, 2);
  return v;
};

const emptyRow = (fromAmount = "0"): SlabRow => ({
  fromAmount, toAmount: "", periodFrom: "", periodTo: "",
  periodFromInDays: "", periodToInDays: "", stdIntRate: "", penalIntRate: "",
});

const LoanInterestSlab: React.FC = () => {
  const navigate = useNavigate();
  const { slabId: encryptedId } = useParams<{ slabId?: string }>();
  const slabId     = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!slabId;

  const user = useSelector((state: RootState) => state.user);

  const [loading,      setLoading]      = useState(false);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [formErrors,   setFormErrors]   = useState<FormErrors>({});
  const [slabErrors,   setSlabErrors]   = useState<SlabErrors>({});

  const productSelectRef = useRef<any>(null);
  const nameRef          = useRef<any>(null);

  const [formData, setFormData] = useState({
    id:            null as number | null,
    brId:          user.branchid,
    loanProductId: 0,
    name:          "",
    nameSL:        "",
    date:          commonservice.getTodaysDate(),
  });

  const [slabRows, setSlabRows] = useState<SlabRow[]>([emptyRow()]);

  useEffect(() => {
    (async () => {
      try {
        const res = await commonservice.fetch_loan_products(user.branchid);
        setLoanProducts(res.data ?? []);
      } catch {
        Swal.fire("Error", "Failed to load loan products", "error");
      }
    })();
  }, [user.branchid]);

  useEffect(() => {
    if (!isEditMode || !slabId) return;
    (async () => {
      try {
        Swal.fire({ title: "Loading...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const response = await loanSlabService.getLoanSlabById(slabId, user.branchid);
        if (response.success && response.data) {
          const res = response.data;
          setFormData({
            id:            res.loanSlab.id || null,
            brId:          user.branchid,
            loanProductId: res.loanSlab.loanProductId || 0,
            name:          res.loanSlab.name || "",
            nameSL:        res.loanSlab.nameSL || "",
            date:          commonservice.splitDate(res.loanSlab.date),
          });
          if (res.loanSlabDetails?.length > 0) {
            setSlabRows(res.loanSlabDetails.map((s: any) => ({
              fromAmount:       s.fromAmount?.toString()       || "0",
              toAmount:         s.toAmount?.toString()         || "",
              periodFrom:       s.periodFrom?.toString()       || "",
              periodTo:         s.periodTo?.toString()         || "",
              periodFromInDays: s.periodFromInDays?.toString() || "",
              periodToInDays:   s.periodToInDays?.toString()  || "",
              stdIntRate:       s.stdIntRate?.toString()       || "",
              penalIntRate:     s.penalIntRate?.toString()     || "",
            })));
          }
          Swal.close();
        } else {
          Swal.fire("Error", "Loan Slab not found", "error");
          navigate("/loan-slab-operations");
        }
      } catch (error: any) {
        Swal.fire({ icon: "error", title: "Error!", text: error.message || "Failed to load data" });
        navigate("/loan-slab-operations");
      }
    })();
  }, [slabId, isEditMode, user.branchid, navigate]);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateFormField = (field: string, value: any): string | undefined => {
    switch (field) {
      case "loanProductId":
        if (!value || value === 0) return "Loan Product is required";
        break;
      case "name":
        if (!value?.trim()) return "Slab Name is required";
        if (value.trim().length < MIN_NAME_LEN)  return `Minimum ${MIN_NAME_LEN} characters required`;
        if (value.trim().length > MAX_NAME_LEN)  return `Maximum ${MAX_NAME_LEN} characters allowed`;
        break;
      case "date":
        if (!value) return "Date is required";
        break;
    }
    return undefined;
  };

  const validateSlabCell = (
    field: keyof SlabRow,
    value: string,
    slab: SlabRow,
    _prev: SlabRow | null
  ): string | undefined => {
    switch (field) {
      case "toAmount": {
        if (!value) return "Required";
        const to   = parseFloat(value);
        const from = parseFloat(slab.fromAmount);
        if (isNaN(to) || to <= 0) return "Must be > 0";
        if (to > MAX_AMOUNT)      return `Max ${MAX_AMOUNT.toLocaleString("en-IN")}`;
        if (!isNaN(from) && to <= from) return `Must be > ${from.toLocaleString("en-IN")}`;
        break;
      }
      case "stdIntRate": {
        if (!value) return "Required";
        const r = parseFloat(value);
        if (isNaN(r) || r < 0) return "Must be ≥ 0";
        if (r > MAX_RATE)      return `Max ${MAX_RATE}%`;
        break;
      }
      case "penalIntRate": {
        if (value === "") break; // optional
        const r = parseFloat(value);
        if (isNaN(r) || r < 0) return "Must be ≥ 0";
        if (r > MAX_RATE)      return `Max ${MAX_RATE}%`;
        break;
      }
      case "periodFrom": {
        if (value === "") break; // optional
        const pf = parseInt(value);
        if (isNaN(pf) || pf < 1) return "Must be ≥ 1";
        if (pf > MAX_PERIOD)     return `Max ${MAX_PERIOD}`;
        break;
      }
      case "periodTo": {
        if (value === "") break; // optional
        const pt = parseInt(value);
        const pf = parseInt(slab.periodFrom);
        if (isNaN(pt) || pt < 1) return "Must be ≥ 1";
        if (pt > MAX_PERIOD)     return `Max ${MAX_PERIOD}`;
        if (!isNaN(pf) && pt <= pf) return `Must be > Period From (${pf})`;
        break;
      }
    }
    return undefined;
  };

  const validateAllSlabs = (): { errMap: SlabErrors; hasErrors: boolean } => {
    const errMap: SlabErrors = {};
    let hasErrors = false;

    slabRows.forEach((slab, i) => {
      const rowErrors: Partial<Record<keyof SlabRow, string>> = {};
      const prev = i > 0 ? slabRows[i - 1] : null;

      if (i > 0 && prev?.toAmount) {
        const expected = parseFloat(prev.toAmount) + 1;
        const actual   = parseFloat(slab.fromAmount);
        if (!isNaN(expected) && actual !== expected) {
          rowErrors.fromAmount = `Should be ${expected.toLocaleString("en-IN")}`;
          hasErrors = true;
        }
      }

      (["toAmount", "stdIntRate", "penalIntRate", "periodFrom", "periodTo"] as (keyof SlabRow)[])
        .forEach((field) => {
          const err = validateSlabCell(field, slab[field] as string, slab, prev);
          if (err) { rowErrors[field] = err; hasErrors = true; }
        });

      // At least months pair OR days pair must be provided
      const hasMonths = slab.periodFrom !== "" && slab.periodTo !== "";
      const hasDays   = slab.periodFromInDays !== "" && slab.periodToInDays !== "";
      if (!hasMonths && !hasDays) {
        rowErrors.periodFrom       = "Required (months or days)";
        rowErrors.periodFromInDays = "Required (months or days)";
        hasErrors = true;
      }

      if (Object.keys(rowErrors).length > 0) errMap[i] = rowErrors;
    });

    return { errMap, hasErrors };
  };

  const validateAll = (): boolean => {
    const fErr: FormErrors = {};
    ["loanProductId", "name", "date"].forEach((f) => {
      const e = validateFormField(f, formData[f as keyof typeof formData]);
      if (e) fErr[f as keyof FormErrors] = e;
    });
    setFormErrors(fErr);

    const { errMap, hasErrors: slabHasErrors } = validateAllSlabs();
    setSlabErrors(errMap);

    return Object.keys(fErr).length === 0 && !slabHasErrors;
  };

  // ── Input handlers ───────────────────────────────────────────────────────────

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as keyof FormErrors])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFieldBlur = (fieldName: string, value: string) => {
    const err = validateFormField(fieldName, value);
    setFormErrors((prev) => ({ ...prev, [fieldName]: err }));
  };

  // ── Slab row handlers ────────────────────────────────────────────────────────

  const handleSlabChange = (index: number, field: keyof SlabRow, raw: string) => {
    let value = raw;
    if (field === "toAmount" || field === "stdIntRate" || field === "penalIntRate") value = toDecimal2(raw);
    if (["periodFrom", "periodTo", "periodFromInDays", "periodToInDays"].includes(field)) value = toInteger(raw);

    const newRows = [...slabRows];
    newRows[index] = { ...newRows[index], [field]: value };

    if (field === "toAmount" && index < slabRows.length - 1) {
      const toVal = parseFloat(value);
      if (!isNaN(toVal)) newRows[index + 1].fromAmount = (toVal + 1).toString();
    }

    setSlabRows(newRows);

    const prev = index > 0 ? newRows[index - 1] : null;
    const err  = validateSlabCell(field, value, newRows[index], prev);
    setSlabErrors((prev) => ({
      ...prev,
      [index]: { ...(prev[index] || {}), [field]: err },
    }));
  };

  const handleSlabBlur = (index: number, field: keyof SlabRow) => {
    const slab = slabRows[index];
    const prev = index > 0 ? slabRows[index - 1] : null;
    const err  = validateSlabCell(field, slab[field] as string, slab, prev);
    setSlabErrors((prev) => ({
      ...prev,
      [index]: { ...(prev[index] || {}), [field]: err },
    }));
  };

  const handleAddSlab = () => {
    const last   = slabRows[slabRows.length - 1];
    const lastTo = parseFloat(last.toAmount);
    if (isNaN(lastTo) || lastTo <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid Input", text: "Complete the current slab before adding a new one." });
      return;
    }
    setSlabRows([...slabRows, emptyRow((lastTo + 1).toString())]);
  };

  const handleRemoveSlab = (index: number) => {
    if (slabRows.length === 1) {
      Swal.fire({ icon: "warning", title: "Cannot Remove", text: "At least one slab is required." });
      return;
    }
    const filtered = slabRows.filter((_, i) => i !== index);
    const rebuilt  = filtered.map((slab, i) => ({
      ...slab,
      fromAmount: i === 0 ? "0" : (parseFloat(filtered[i - 1].toAmount) + 1).toString(),
    }));
    setSlabRows(rebuilt);
    setSlabErrors((prev) => {
      const next: SlabErrors = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki === index) return;
        next[ki > index ? ki - 1 : ki] = v;
      });
      return next;
    });
  };

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    if (isEditMode) {
      Swal.fire({ icon: "error", title: "Not Allowed", text: "Reset is not allowed in modify mode." });
      return;
    }
    setFormData({ id: null, brId: user.branchid, loanProductId: 0, name: "", nameSL: "", date: commonservice.getTodaysDate() });
    setSlabRows([emptyRow()]);
    setFormErrors({});
    setSlabErrors({});
    setLoading(false);
    setTimeout(() => productSelectRef.current?.focus(), 100);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateAll()) {
      await Swal.fire({
        icon: "error", title: "Validation Errors",
        text: "Please fix all highlighted errors before saving.",
        confirmButtonText: "Fix Errors",
      });
      return;
    }

    setLoading(true);
    try {
      const dto: CombinedLoanSlabDTO = {
        loanSlab: {
          id:            formData.id || undefined,
          brId:          user.branchid,
          loanProductId: Number(formData.loanProductId),
          name:          formData.name.trim(),
          nameSL:        formData.nameSL?.trim() || undefined,
          date:          formData.date,
        },
        loanSlabDetails: slabRows.map((s) => ({
          brId:            user.branchid,
          slabId:          formData.id || 0,
          fromAmount:      Number(s.fromAmount),
          toAmount:        Number(s.toAmount),
          periodFrom:      s.periodFrom ? Number(s.periodFrom) : undefined,
          periodTo:        s.periodTo   ? Number(s.periodTo)   : undefined,
          periodFromInDays: s.periodFromInDays ? Number(s.periodFromInDays) : undefined,
          periodToInDays:   s.periodToInDays   ? Number(s.periodToInDays)   : undefined,
          stdIntRate:      s.stdIntRate   ? Number(s.stdIntRate)   : undefined,
          penalIntRate:    s.penalIntRate ? Number(s.penalIntRate) : undefined,
        })),
      };

      const res = isEditMode
        ? await loanSlabService.updateLoanSlab(formData.id!, dto)
        : await loanSlabService.createLoanSlab(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success", title: "Success!",
          text: res.message || `Loan Slab ${isEditMode ? "updated" : "saved"} successfully!`,
          showConfirmButton: false, timer: 1500,
        });
        isEditMode ? navigate("/loan-slab-info") : handleReset();
      } else {
        throw new Error(res.message || "Failed to save data");
      }
    } catch (error: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: error.message || "Failed to save data." });
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const productOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const cellErr = (i: number, f: keyof SlabRow) => slabErrors[i]?.[f];
  const inputCls = (i: number, f: keyof SlabRow) =>
    `w-full px-3 py-2 border-2 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${
      cellErr(i, f) ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
    }`;

  // ── JSX ──────────────────────────────────────────────────────────────────────

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
                      {isEditMode ? "Modify" : "Add"} Loan Interest Slab
                    </h1>
                    <p className="text-gray-600 text-sm">Configure amount-wise interest rates for loan products</p>
                  </div>
                </div>
                <button onClick={() => navigate("/slab-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium">
                  <ArrowLeft className="w-4 h-4" /> Back to Operations
                </button>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">

                {/* Section 1: Basic Information */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5" /> 1. Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Loan Product */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          Loan Product <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        ref={productSelectRef}
                        options={productOptions}
                        isDisabled={isEditMode}
                        autoFocus={!isEditMode}
                        value={productOptions.find((o) => o.value === Number(formData.loanProductId)) || null}
                        onChange={(opt) => handleInputChange("loanProductId", opt ? opt.value : 0)}
                        placeholder="Select Loan Product"
                        isClearable
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          control: (base) => ({
                            ...base,
                            borderColor: formErrors.loanProductId ? "#ef4444" : base.borderColor,
                            borderWidth: 2,
                          }),
                        }}
                      />
                      {formErrors.loanProductId && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors.loanProductId}
                        </p>
                      )}
                    </div>

                    {/* Slab Name */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-purple-500" />
                          Slab Name <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        ref={nameRef}
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        onBlur={(e) => handleFieldBlur("name", e.target.value)}
                        maxLength={MAX_NAME_LEN}
                        placeholder="e.g., Standard Loan Rate 2025"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm ${formErrors.name ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                      />
                      <div className="flex justify-between items-center">
                        {formErrors.name
                          ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.name}</p>
                          : <p className="text-xs text-gray-500">Unique name for this slab</p>
                        }
                        <span className={`text-xs ${formData.name.length >= MAX_NAME_LEN ? "text-red-500" : "text-gray-400"}`}>
                          {formData.name.length}/{MAX_NAME_LEN}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          Date <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => commonservice.handleDateChange(e.target.value, (val) => handleInputChange("date", val), "effectiveFrom")}
                        onBlur={(e) => handleFieldBlur("date", e.target.value)}
                        max={commonservice.getTodaysDate()}
                        readOnly={isEditMode}
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm ${formErrors.date ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                      />
                      {formErrors.date
                        ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.date}</p>
                        : <p className="text-xs text-gray-500">Effective date for this slab</p>
                      }
                    </div>

                    {/* Name SL (optional, spans 1 col) */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Name (SL)</label>
                      <input
                        type="text"
                        value={formData.nameSL}
                        onChange={(e) => handleInputChange("nameSL", e.target.value)}
                        maxLength={MAX_NAME_LEN}
                        placeholder="Name in second language (optional)"
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Slab Detail */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                      <Percent className="w-5 h-5" /> 2. Slab Detail
                    </h3>
                    <button onClick={handleAddSlab}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105">
                      <Plus className="w-4 h-4" /> Add Slab
                    </button>
                  </div>

                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-1">
                    <p>1. Amount From is auto-filled based on previous row's Amount To.</p>
                    <p>2. Period From / To are in <strong>months</strong>; Period From/To in Days are optional.</p>
                    <p>3. Std. Interest Rate is required. Penal Interest Rate is optional.</p>
                    <p>4. Click <strong>Add Slab</strong> to add more ranges, then <strong>Save</strong>.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                          {["Amt From", "Amt To", "Period From (mo)", "Period To (mo)", "Period From (days)", "Period To (days)", "Std Rate (%)", "Penal Rate (%)", "Action"].map((h) => (
                            <th key={h} className="border border-gray-300 px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slabRows.map((slab, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? "bg-blue-50" : "bg-white"} hover:bg-blue-100 transition-colors`}>

                            {/* Amount From – read-only */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.fromAmount} readOnly
                                className={`w-full px-2 py-2 border rounded-lg text-sm text-right ${cellErr(index, "fromAmount") ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-100"}`}
                              />
                              {cellErr(index, "fromAmount") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "fromAmount")}
                                </p>
                              )}
                            </td>

                            {/* Amount To */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.toAmount}
                                onChange={(e) => handleSlabChange(index, "toAmount", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "toAmount")}
                                placeholder="e.g., 50000" inputMode="decimal"
                                className={inputCls(index, "toAmount")}
                              />
                              {cellErr(index, "toAmount") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "toAmount")}
                                </p>
                              )}
                            </td>

                            {/* Period From (months) */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.periodFrom}
                                onChange={(e) => handleSlabChange(index, "periodFrom", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "periodFrom")}
                                placeholder="e.g., 1" inputMode="numeric" maxLength={4}
                                className={inputCls(index, "periodFrom")}
                              />
                              {cellErr(index, "periodFrom") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "periodFrom")}
                                </p>
                              )}
                            </td>

                            {/* Period To (months) */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.periodTo}
                                onChange={(e) => handleSlabChange(index, "periodTo", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "periodTo")}
                                placeholder="e.g., 12" inputMode="numeric" maxLength={4}
                                className={inputCls(index, "periodTo")}
                              />
                              {cellErr(index, "periodTo") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "periodTo")}
                                </p>
                              )}
                            </td>

                            {/* Period From In Days */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.periodFromInDays}
                                onChange={(e) => handleSlabChange(index, "periodFromInDays", e.target.value)}
                                placeholder="e.g., 30" inputMode="numeric" maxLength={5}
                                className={inputCls(index, "periodFromInDays")}
                              />
                              {cellErr(index, "periodFromInDays") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "periodFromInDays")}
                                </p>
                              )}
                            </td>

                            {/* Period To In Days */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.periodToInDays}
                                onChange={(e) => handleSlabChange(index, "periodToInDays", e.target.value)}
                                placeholder="e.g., 365" inputMode="numeric" maxLength={5}
                                className={inputCls(index, "periodToInDays")}
                              />
                            </td>

                            {/* Std Interest Rate */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.stdIntRate}
                                onChange={(e) => handleSlabChange(index, "stdIntRate", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "stdIntRate")}
                                placeholder="e.g., 12.5" inputMode="decimal"
                                className={inputCls(index, "stdIntRate")}
                              />
                              {cellErr(index, "stdIntRate") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "stdIntRate")}
                                </p>
                              )}
                            </td>

                            {/* Penal Interest Rate */}
                            <td className="border border-gray-300 px-2 py-2">
                              <input type="text" value={slab.penalIntRate}
                                onChange={(e) => handleSlabChange(index, "penalIntRate", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "penalIntRate")}
                                placeholder="e.g., 2.0" inputMode="decimal"
                                className={inputCls(index, "penalIntRate")}
                              />
                              {cellErr(index, "penalIntRate") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "penalIntRate")}
                                </p>
                              )}
                            </td>

                            {/* Action */}
                            <td className="border border-gray-300 px-2 py-2 text-center">
                              <button onClick={() => handleRemoveSlab(index)}
                                disabled={slabRows.length === 1}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove Slab">
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

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all hover:scale-105">
                    <RotateCcw className="w-4 h-4" /> Reset Form
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                      : <><Save className="w-4 h-4" /> {isEditMode ? "Update" : "Save"} Loan Slab</>
                    }
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

export default LoanInterestSlab;
