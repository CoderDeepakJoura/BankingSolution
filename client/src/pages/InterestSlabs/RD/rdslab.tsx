import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { decryptId } from "../../../utils/encryption";
import Select from "react-select";
import {
  Save, ArrowLeft, Percent, Plus, Trash2,
  Calendar, CreditCard, Landmark, AlertCircle,
  RotateCcw,
  // FileText removed – no longer needed
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import interestSlabService, {
  CombinedRDIntDTO,
} from "../../../services/interestslab/rdinterestslab";
import DatePicker from "../../../components/DatePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const KIST_INTERVAL_OPTIONS = [
  { value: "Monthly",    label: "Monthly"    },
  { value: "Quarterly",  label: "Quarterly"  },
  { value: "HalfYearly", label: "Half Yearly"},
  { value: "Yearly",     label: "Yearly"     },
];

const MAX_AMOUNT    = 99_999_999;
const MAX_PERIOD    = 9999;
const MAX_RATE      = 100;
const MAX_SLAB_NAME = 50;
const MIN_NAME_LEN  = 3;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RDProduct { id: number; productName: string; }

interface InterestSlab {
  slabNo:       number;
  fromAmount:   string;
  toAmount:     string;
  kistInterval: string;
  periodFrom:   string;
  periodTo:     string;
  interestRate: string;
}

type SlabErrors = Record<number, Partial<Record<keyof InterestSlab, string>>>;

interface FormErrors {
  rdProductId?:    string;
  slabName?:       string;
  // description removed
  applicableDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toInteger = (raw: string) => raw.replace(/[^0-9]/g, "").replace(/^0+(\d)/, "$1");

const toDecimal2 = (raw: string) => {
  let v = raw.replace(/[^0-9.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  if (parts.length === 2) v = parts[0] + "." + parts[1].substring(0, 2);
  return v;
};

// ─── Component ────────────────────────────────────────────────────────────────

const RDAccountInterestSlab = () => {
  const navigate = useNavigate();
  const { slabId: encryptedId } = useParams<{ slabId?: string }>();
  const slabId     = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!slabId;

  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [loading,    setLoading]    = useState(false);
  const [rdProducts, setRDProducts] = useState<RDProduct[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [slabErrors, setSlabErrors] = useState<SlabErrors>({});

  const rdProductSelectRef = useRef<any>(null);
  const slabRef            = useRef<any>(null);

  // ── Form state (description removed) ────────────────────────────────────────
  const [formData, setFormData] = useState({
    id:             null as number | null,
    branchId:       user.branchid,
    rdProductId:    0,
    slabName:       "",
    applicableDate: sessionDate,
  });

  const [interestSlabs, setInterestSlabs] = useState<InterestSlab[]>([
    { slabNo: 1, fromAmount: "0", toAmount: "", kistInterval: "", periodFrom: "", periodTo: "", interestRate: "" },
  ]);

  // ── Fetch RD Products ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await commonservice.fetch_rd_products(user.branchid);
        setRDProducts(res.data);
      } catch {
        Swal.fire("Error", "Failed to load required products", "error");
      }
    })();
  }, [user.branchid]);

  // ── Load slab in edit mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !slabId) return;
    (async () => {
      try {
        Swal.fire({ title: "Loading...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const response = await interestSlabService.getInterestSlabById(slabId, user.branchid);
        if (response.success && response.data) {
          const res = response.data;
          setFormData({
            id:             res.rdInterestSlab.id || null,
            branchId:       user.branchid,
            rdProductId:    res.rdInterestSlab.rdProductId || 0,
            slabName:       res.rdInterestSlab.slabName || "",
            // description removed
            applicableDate: commonservice.splitDate(res.rdInterestSlab.applicableDate),
          });
          if (res.rdInterestSlabDetails?.length > 0) {
            let sn = 1;
            setInterestSlabs(res.rdInterestSlabDetails.map((s: any) => ({
              slabNo:       sn++,
              fromAmount:   s.fromAmount?.toString()   || "0",
              toAmount:     s.toAmount?.toString()     || "",
              kistInterval: s.kistInterval             || "",
              periodFrom:   s.periodFrom?.toString()   || "",
              periodTo:     s.periodTo?.toString()     || "",
              interestRate: s.interestRate?.toString() || "",
            })));
          }
          Swal.close();
        } else {
          Swal.fire("Error", "Interest Slab not found", "error");
          navigate("/slab-operations");
        }
      } catch (error: any) {
        Swal.fire({ icon: "error", title: "Error!", text: error.message || "Failed to load data" });
        navigate("/slab-operations");
      }
    })();
  }, [slabId, isEditMode, user.branchid, navigate]);

  // ── Form-level validation ────────────────────────────────────────────────────
  const validateFormField = (field: string, value: any): string | undefined => {
    switch (field) {
      case "rdProductId":
        if (!value || value === 0) return "RD Product is required";
        break;
      case "slabName":
        if (!value?.trim()) return "Slab Name is required";
        if (value.trim().length < MIN_NAME_LEN)  return `Minimum ${MIN_NAME_LEN} characters required`;
        if (value.trim().length > MAX_SLAB_NAME) return `Maximum ${MAX_SLAB_NAME} characters allowed`;
        break;
      case "applicableDate":
        if (!value) return "Applicable Date is required";
        break;
    }
    return undefined;
  };

  // ── Per-cell slab validation ─────────────────────────────────────────────────
  const validateSlabCell = (
    field: keyof InterestSlab,
    value: string,
    slab: InterestSlab,
    prevSlab: InterestSlab | null
  ): string | undefined => {
    switch (field) {
      case "toAmount": {
        if (!value) return "Required";
        const toAmt   = parseFloat(value);
        const fromAmt = parseFloat(slab.fromAmount);
        if (isNaN(toAmt) || toAmt <= 0)             return "Must be > 0";
        if (toAmt > MAX_AMOUNT)                      return `Max ₹${MAX_AMOUNT.toLocaleString("en-IN")}`;
        if (!isNaN(fromAmt) && toAmt <= fromAmt)     return `Must be > ${fromAmt.toLocaleString("en-IN")}`;
        break;
      }
      case "kistInterval":
        if (!value) return "Required";
        break;
      case "periodFrom": {
        if (!value) return "Required";
        const pf = parseInt(value);
        if (isNaN(pf) || pf < 1) return "Must be ≥ 1";
        if (pf > MAX_PERIOD)      return `Max ${MAX_PERIOD}`;
        if (prevSlab?.periodTo) {
          const prevPTo = parseInt(prevSlab.periodTo);
          if (!isNaN(prevPTo) && pf <= prevPTo)
            return `Must be > ${prevPTo} (prev Period To)`;
        }
        break;
      }
      case "periodTo": {
        if (!value) return "Required";
        const pt = parseInt(value);
        const pf = parseInt(slab.periodFrom);
        if (isNaN(pt) || pt < 1)            return "Must be ≥ 1";
        if (pt > MAX_PERIOD)                 return `Max ${MAX_PERIOD}`;
        if (!isNaN(pf) && pt <= pf)          return `Must be > Period From (${pf})`;
        break;
      }
      case "interestRate": {
        if (!value) return "Required";
        const r = parseFloat(value);
        if (isNaN(r) || r < 0) return "Must be ≥ 0";
        if (r > MAX_RATE)       return `Max ${MAX_RATE}%`;
        break;
      }
    }
    return undefined;
  };

  // ── Validate all slabs ───────────────────────────────────────────────────────
  const validateAllSlabs = (): { errMap: SlabErrors; hasErrors: boolean } => {
    const errMap: SlabErrors = {};
    let hasErrors = false;

    interestSlabs.forEach((slab, i) => {
      const rowErrors: Partial<Record<keyof InterestSlab, string>> = {};
      const prev = i > 0 ? interestSlabs[i - 1] : null;

      if (i > 0 && prev?.toAmount) {
        const expected = parseFloat(prev.toAmount) + 1;
        const actual   = parseFloat(slab.fromAmount);
        if (!isNaN(expected) && actual !== expected) {
          rowErrors.fromAmount = `Should be ${expected.toLocaleString("en-IN")}`;
          hasErrors = true;
        }
      }

      (["toAmount", "kistInterval", "periodFrom", "periodTo", "interestRate"] as (keyof InterestSlab)[])
        .forEach((field) => {
          const err = validateSlabCell(field, slab[field] as string, slab, prev);
          if (err) { rowErrors[field] = err; hasErrors = true; }
        });

      if (Object.keys(rowErrors).length > 0) errMap[i] = rowErrors;
    });

    return { errMap, hasErrors };
  };

  // ── Full validation on Save ──────────────────────────────────────────────────
  const validateAll = (): boolean => {
    const fErr: FormErrors = {};
    // description removed from validation list
    ["rdProductId", "slabName", "applicableDate"].forEach((f) => {
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

  const handleRDProductChange = (opt: any) =>
    handleInputChange("rdProductId", opt ? opt.value : 0);

  const handleFieldBlur = async (fieldName: string, value: string) => {
    if (fieldName === "slabName" && value.trim()) {
      const response = await commonservice.slabname_exists(user.branchid, value, slabId ?? 0);
      if (response.success) {
        setFormData((prev) => ({ ...prev, slabName: "" }));
        Swal.fire({
          icon: "error",
          title: "Duplicate Slab Name",
          text: response.message,
          didClose: () => slabRef.current?.focus(),
        });
      }
    }
    const err = validateFormField(fieldName, value);
    setFormErrors((prev) => ({ ...prev, [fieldName]: err }));
  };

  // ── Slab row handlers ────────────────────────────────────────────────────────
  const handleSlabChange = (index: number, field: keyof InterestSlab, raw: string) => {
    let value = raw;
    if (field === "toAmount" || field === "interestRate") value = toDecimal2(raw);
    if (field === "periodFrom" || field === "periodTo")   value = toInteger(raw);

    const newSlabs = [...interestSlabs];
    newSlabs[index] = { ...newSlabs[index], [field]: value };

    if (field === "toAmount" && index < interestSlabs.length - 1) {
      const toVal = parseFloat(value);
      if (!isNaN(toVal)) newSlabs[index + 1].fromAmount = (toVal + 1).toString();
    }

    setInterestSlabs(newSlabs);

    const prev = index > 0 ? newSlabs[index - 1] : null;
    const err  = validateSlabCell(field, value, newSlabs[index], prev);
    setSlabErrors((prev) => ({
      ...prev,
      [index]: { ...(prev[index] || {}), [field]: err },
    }));
  };

  const handleSlabBlur = (index: number, field: keyof InterestSlab) => {
    const slab = interestSlabs[index];
    const prev = index > 0 ? interestSlabs[index - 1] : null;
    const err  = validateSlabCell(field, slab[field] as string, slab, prev);
    setSlabErrors((prev) => ({
      ...prev,
      [index]: { ...(prev[index] || {}), [field]: err },
    }));
  };

  const handleAddSlab = () => {
    const last   = interestSlabs[interestSlabs.length - 1];
    const lastTo = parseFloat(last.toAmount);
    if (isNaN(lastTo) || lastTo <= 0) {
      Swal.fire({ icon: "warning", title: "Invalid Input", text: "Complete the current slab before adding a new one." });
      return;
    }
    setInterestSlabs([...interestSlabs, {
      slabNo: interestSlabs.length + 1,
      fromAmount: (lastTo + 1).toString(),
      toAmount: "", kistInterval: "", periodFrom: "", periodTo: "", interestRate: "",
    }]);
  };

  const handleRemoveSlab = (index: number) => {
    if (interestSlabs.length === 1) {
      Swal.fire({ icon: "warning", title: "Cannot Remove", text: "At least one slab is required." });
      return;
    }
    const filtered = interestSlabs.filter((_, i) => i !== index);
    const rebuilt  = filtered.map((slab, i) => ({
      ...slab,
      slabNo:     i + 1,
      fromAmount: i === 0 ? "0" : (parseFloat(filtered[i - 1].toAmount) + 1).toString(),
    }));
    setInterestSlabs(rebuilt);
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
    setFormData({
      id: null, branchId: user.branchid,
      rdProductId: 0, slabName: "",
      // description removed
      applicableDate: sessionDate,
    });
    setInterestSlabs([{ slabNo: 1, fromAmount: "0", toAmount: "", kistInterval: "", periodFrom: "", periodTo: "", interestRate: "" }]);
    setFormErrors({});
    setSlabErrors({});
    setLoading(false);
    setTimeout(() => rdProductSelectRef.current?.focus(), 100);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateAll()) {
      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        text: "Please fix all highlighted errors before saving.",
        confirmButtonText: "Fix Errors",
      });
      return;
    }

    setLoading(true);
    try {
      const dto: CombinedRDIntDTO = {
        rdInterestSlab: {
          id:             formData.id || undefined,
          branchId:       user.branchid,
          rdProductId:    Number(formData.rdProductId),
          slabName:       formData.slabName.trim(),
          // description removed
          applicableDate: formData.applicableDate,
        },
        rdInterestSlabDetails: interestSlabs.map((s) => ({
          slabNo:         s.slabNo,
          fromAmount:     Number(s.fromAmount),
          toAmount:       Number(s.toAmount),
          kistInterval:   s.kistInterval,
          periodFrom:     Number(s.periodFrom),
          periodTo:       Number(s.periodTo),
          interestRate:   Number(s.interestRate),
          branchId:       user.branchid,
          interestSlabId: formData.id || 0,
        })),
      };

      const res = isEditMode
        ? await interestSlabService.updateInterestSlab(formData.id!, dto)
        : await interestSlabService.createInterestSlab(dto);

      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || `Interest Slab ${isEditMode ? "updated" : "saved"} successfully!`, showConfirmButton: false, timer: 1500 });
        isEditMode ? navigate("/rd-slab-info") : handleReset();
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
  const rdProductOptions = rdProducts.map((p) => ({ value: p.id, label: p.productName }));
  const cellErr = (i: number, f: keyof InterestSlab) => slabErrors[i]?.[f];
  const inputCls = (i: number, f: keyof InterestSlab) =>
    `w-full px-3 py-2 border-2 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${
      cellErr(i, f) ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
    }`;

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Percent className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Modify" : "Add"} RD Account Interest Slab
                    </h1>
                    <p className="text-gray-600 text-sm">Configure period-wise interest rates for RD products</p>
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

                  {/* 3-column grid: RD Product | Slab Name | Applicable Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* RD Product */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          RD Product <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <Select
                        ref={rdProductSelectRef}
                        options={rdProductOptions}
                        isDisabled={isEditMode}
                        autoFocus={!isEditMode}
                        value={rdProductOptions.find((o) => o.value === Number(formData.rdProductId)) || null}
                        onChange={handleRDProductChange}
                        placeholder="Select RD Product"
                        isClearable
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          control: (base) => ({
                            ...base,
                            borderColor: formErrors.rdProductId ? "#ef4444" : base.borderColor,
                            borderWidth: 2,
                          }),
                        }}
                      />
                      {formErrors.rdProductId && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors.rdProductId}
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
                        ref={slabRef}
                        type="text"
                        value={formData.slabName}
                        onChange={(e) => handleInputChange("slabName", e.target.value)}
                        onBlur={(e) => handleFieldBlur("slabName", e.target.value)}
                        maxLength={MAX_SLAB_NAME}
                        placeholder="e.g., Standard Rate 2025"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm ${formErrors.slabName ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                      />
                      <div className="flex justify-between items-center">
                        {formErrors.slabName
                          ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.slabName}</p>
                          : <p className="text-xs text-gray-500">Unique name for this slab</p>
                        }
                        <span className={`text-xs ${formData.slabName.length >= MAX_SLAB_NAME ? "text-red-500" : "text-gray-400"}`}>
                          {formData.slabName.length}/{MAX_SLAB_NAME}
                        </span>
                      </div>
                    </div>

                    {/* Applicable Date */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          Applicable Date <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <DatePicker
                        value={formData.applicableDate}
                        onChange={(val) => handleInputChange("applicableDate", val)}
                        onBlur={(val) => handleFieldBlur("applicableDate", val)}
                        max={sessionDate}
                        workingDate={sessionDate}
                        disabled={isEditMode}
                        className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none text-sm ${formErrors.applicableDate ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                      />
                      {formErrors.applicableDate
                        ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.applicableDate}</p>
                        : <p className="text-xs text-gray-500">Date from which slab is effective</p>
                      }
                    </div>
                  </div>
                  {/* Description field block removed entirely */}
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

                  {/* Instructions */}
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700 space-y-1">
                    <p>1. Amount From is auto-filled based on previous row's Amount To.</p>
                    <p>2. Period From / To are in <strong>months</strong> (integers only). Period To must be &gt; Period From.</p>
                    <p>3. Interest Rate must be between 0 – 100%.</p>
                    <p>4. Click <strong>Add Slab</strong> to add more ranges, then <strong>Save</strong>.</p>
                  </div>

                  {/* Slab Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                          {["Amount From", "Amount To", "Kist Interval", "Period From (mo)", "Period To (mo)", "Interest Rate (%)", "Action"].map((h) => (
                            <th key={h} className="border border-gray-300 px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {interestSlabs.map((slab, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? "bg-blue-50" : "bg-white"} hover:bg-blue-100 transition-colors`}>

                            {/* Amount From – read-only */}
                            <td className="border border-gray-300 px-3 py-2">
                              <input type="text" value={slab.fromAmount} readOnly
                                className={`w-full px-3 py-2 border rounded-lg text-sm text-right ${cellErr(index, "fromAmount") ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-100"}`}
                              />
                              {cellErr(index, "fromAmount") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "fromAmount")}
                                </p>
                              )}
                            </td>

                            {/* Amount To */}
                            <td className="border border-gray-300 px-3 py-2">
                              <input type="text" value={slab.toAmount}
                                onChange={(e) => handleSlabChange(index, "toAmount", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "toAmount")}
                                placeholder="e.g., 10000" inputMode="decimal"
                                className={inputCls(index, "toAmount")}
                              />
                              {cellErr(index, "toAmount") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "toAmount")}
                                </p>
                              )}
                            </td>

                            {/* Kist Interval */}
                            <td className="border border-gray-300 px-3 py-2 min-w-[155px]">
                              <Select
                                options={KIST_INTERVAL_OPTIONS}
                                value={KIST_INTERVAL_OPTIONS.find((o) => o.value === slab.kistInterval) || null}
                                onChange={(opt) => handleSlabChange(index, "kistInterval", opt ? opt.value : "")}
                                onBlur={() => handleSlabBlur(index, "kistInterval")}
                                placeholder="==Select=="
                                menuPortalTarget={document.body}
                                styles={{
                                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                  control: (base) => ({
                                    ...base, minHeight: "38px", fontSize: "14px", borderWidth: 2,
                                    borderColor: cellErr(index, "kistInterval") ? "#ef4444" : base.borderColor,
                                    backgroundColor: cellErr(index, "kistInterval") ? "#fff1f2" : base.backgroundColor,
                                  }),
                                }}
                              />
                              {cellErr(index, "kistInterval") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "kistInterval")}
                                </p>
                              )}
                            </td>

                            {/* Period From */}
                            <td className="border border-gray-300 px-3 py-2">
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

                            {/* Period To */}
                            <td className="border border-gray-300 px-3 py-2">
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

                            {/* Interest Rate */}
                            <td className="border border-gray-300 px-3 py-2">
                              <input type="text" value={slab.interestRate}
                                onChange={(e) => handleSlabChange(index, "interestRate", e.target.value)}
                                onBlur={() => handleSlabBlur(index, "interestRate")}
                                placeholder="e.g., 7.5" inputMode="decimal"
                                className={inputCls(index, "interestRate")}
                              />
                              {cellErr(index, "interestRate") && (
                                <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {cellErr(index, "interestRate")}
                                </p>
                              )}
                            </td>

                            {/* Action */}
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <button onClick={() => handleRemoveSlab(index)}
                                disabled={interestSlabs.length === 1}
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

                  {/* Example Table */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Example</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-700 text-white">
                            {["Amount From", "Amount To", "Kist Interval", "Period From", "Period To", "Interest Rate (%)"].map((h) => (
                              <th key={h} className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { af: 0,     at: 10000,  ki: "Monthly",   pf: 1,  pt: 12, ir: "3.0", bg: "bg-blue-100" },
                            { af: 10001, at: 50000,  ki: "Quarterly", pf: 13, pt: 24, ir: "4.0", bg: "bg-gray-200" },
                            { af: 50001, at: 100000, ki: "Yearly",    pf: 25, pt: 60, ir: "5.0", bg: "bg-blue-100" },
                          ].map((row, i) => (
                            <tr key={i} className={row.bg}>
                              <td className="border border-gray-400 px-4 py-2">{row.af.toLocaleString()}</td>
                              <td className="border border-gray-400 px-4 py-2">{row.at.toLocaleString()}</td>
                              <td className="border border-gray-400 px-4 py-2">{row.ki}</td>
                              <td className="border border-gray-400 px-4 py-2">{row.pf}</td>
                              <td className="border border-gray-400 px-4 py-2">{row.pt}</td>
                              <td className="border border-gray-400 px-4 py-2">{row.ir}</td>
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
                  <button onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all hover:scale-105">
                    <RotateCcw className="w-4 h-4" /> Reset Form
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                      : <><Save className="w-4 h-4" /> {isEditMode ? "Update" : "Save"} Interest Slab</>
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

export default RDAccountInterestSlab;
