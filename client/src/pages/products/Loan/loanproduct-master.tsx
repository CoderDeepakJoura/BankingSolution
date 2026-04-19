import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../../../services/Validations/ProductMasters/Loan/useFormValidation";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { decryptId } from "../../../utils/encryption";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import commonservice from "../../../services/common/commonservice";
import loanProductApiService, {
  CombinedLoanProductDTO,
  LoanProductDTO,
  LoanProductDefinitionDTO,
  LoanProductAdvancementDTO,
  LoanProductMarginMoneyRuleDTO,
  LoanProductPostingDTO,
  LoanProductRecoveryDTO,
} from "../../../services/productmasters/Loan/loanproductapi";
import { Save, RotateCcw, ArrowLeft, FileText, Settings, DollarSign, Calendar, User, CreditCard } from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import { AccountHeadWithCode } from "../../accounthead/accounthead/accounthead-master";

// ─── Lookup constants ─────────────────────────────────────────────────────────

const LOAN_TYPES = [
  { value: 1, label: "Installments" },
  { value: 2, label: "Overdraft" },
  { value: 3, label: "Demand Loan" },
  { value: 4, label: "Limit Wise" },
];
const CATEGORIES = [
  { value: 1, label: "UnSecure" },
  { value: 2, label: "Secure" },
];
const DOC_PLANS = [
  { value: 1, label: "General" },
  { value: 2, label: "Short Term Loan" },
  { value: 3, label: "Long Term Loan" },
  { value: 4, label: "Special" },
];
const SECURITIES = [
  { id: 1, label: "Property" },
  { id: 2, label: "Gold" },
  { id: 3, label: "Insurance Policy" },
  { id: 4, label: "Vehicle" },
  { id: 5, label: "FD/RD Pledge" },
];
const DISBURSMENT_MODES = [
  { id: "Current", label: "Current" },
  { id: "Cash", label: "Cash" },
  { id: "Cheque", label: "Cheque" },
  { id: "GL", label: "GL" },
  { id: "Saving", label: "Saving" },
];
const RECOVERY_MODES = [
  { id: "Current", label: "Current" },
  { id: "Cash", label: "Cash" },
  { id: "Cheque", label: "Cheque" },
  { id: "GL", label: "GL" },
  { id: "Savings", label: "Savings" },
];
const POSTING_INTERVAL_OPTIONS = [
  { value: 1, label: "Daily" },
  { value: 2, label: "Monthly" },
  { value: 3, label: "Quarterly" },
  { value: 4, label: "Half Yearly" },
  { value: 5, label: "Yearly" },
];
const ACTION_ON_INT_OPTIONS = [
  { value: 1, label: "Add In Balance" },
  { value: 2, label: "Stand" },
];
const MARGIN_RATIO_OPTIONS = [
  { value: 1, label: "Ratio" },
  { value: 2, label: "Percentage" },
];

// ─── Initial state factory ────────────────────────────────────────────────────

const makeInitial = (branchId: number): CombinedLoanProductDTO => ({
  loanProductDTO: { branchId, code: "", productName: "", nameSL: "", effectiveFrom: commonservice.getCurrentDate() },
  loanProductDefinitionDTO: { branchId, typeId: 0, categoryId: 0, securityIds: "", secReviewFreqPeriod: 0, docPlanId: 0, intSchedule: 1, intFormulae: 2, actOnIntPosting: 1 },
  loanProductAdvancementDTO: { branchId, disbursmentMode: "", maxNoofDisbursments: 1, minLoanAmount: 0, maxLoanAmount: 0, isShareMoneyReq: "Y", loanPeriodType: "M", overDraftLimit: 0, loanAmtPerOnSecurityRD: 0, loanAmtPerOnSecurityFD: 0 },
  loanProductMarginMoneyRuleDTO: { branchId, ratioOrPerc: 0, loanProportion: 0, marginProportion: 0, mmPercentage: 0 },
  loanProductPostingDTO: { branchId, principalBalHeadCode: 0, miscIncHeadCode: 0, minBalLeftLimitHeadCode: 0, minBalGivenLimitHeadCode: 0, expHeadCode: 0, recoverableIntHeadCode: 0 },
  loanProductRecoveryDTO: { branchId, recoveryMode: "", minBalLeftLimit: 0, minBalGivenLimit: 0, overDueInterestSeq: 1, standardInterestSeq: 2, overDueBalanceSeq: 3, standardBalanceSeq: 4, applyOvrIntOn: "IA", intRecoveredInAdvance: 0, intPostingInterval: 0, stdOverdueOnKistDate: 0, recoveryAdjustmentSeq: 1 },
});

// ─── Component ────────────────────────────────────────────────────────────────

const LoanProductMaster: React.FC = () => {
  const navigate = useNavigate();
  const productNameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const { productId: encryptedId } = useParams<{ productId?: string }>();
  const productId = encryptedId ? decryptId(encryptedId) : null;
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } = useFormValidation();

  const [activeTab, setActiveTab] = useState<"definition" | "recovery">("definition");
  const [loading, setLoading] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [accountHeads, setAccountHeads] = useState<AccountHeadWithCode[]>([]);
  const [data, setData] = useState<CombinedLoanProductDTO>(() => makeInitial(user.branchid));
  const isEditMode = !!productId;

  // ─── Load data ──────────────────────────────────────────────────────────

  useEffect(() => { if (isEditMode) loadProduct(Number(productId)); }, [productId]);
  useEffect(() => {
    AccountHeadApiService.fetchaccountheads(user.branchid).then((res) => {
      if (res.success) setAccountHeads(res.data || []);
    });
  }, [user.branchid]);

  const loadProduct = async (id: number) => {
    setLoading(true);
    try {
      const res = await loanProductApiService.getLoanProductById(id, user.branchid);
      if (res.success && res.data) {
        const d = res.data;
        setData({
          ...d,
          loanProductDTO: {
            ...d.loanProductDTO!,
            effectiveFrom: d.loanProductDTO?.effectiveFrom ? commonservice.splitDate(d.loanProductDTO.effectiveFrom) : commonservice.getCurrentDate(),
          },
        });
      } else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/loanproduct-operations");
    } finally { setLoading(false); }
  };

  // ─── Change helpers ──────────────────────────────────────────────────────

  const setProd = (f: keyof LoanProductDTO, v: any) => setData((p) => ({ ...p, loanProductDTO: { ...p.loanProductDTO!, [f]: v } }));
  const setDef = (f: keyof LoanProductDefinitionDTO, v: any) => setData((p) => ({ ...p, loanProductDefinitionDTO: { ...p.loanProductDefinitionDTO!, [f]: v } }));
  const setAdv = (f: keyof LoanProductAdvancementDTO, v: any) => setData((p) => ({ ...p, loanProductAdvancementDTO: { ...p.loanProductAdvancementDTO!, [f]: v } }));
  const setMmr = (f: keyof LoanProductMarginMoneyRuleDTO, v: any) => setData((p) => ({ ...p, loanProductMarginMoneyRuleDTO: { ...p.loanProductMarginMoneyRuleDTO!, [f]: v } }));
  const setPost = (f: keyof LoanProductPostingDTO, v: any) => setData((p) => ({ ...p, loanProductPostingDTO: { ...p.loanProductPostingDTO!, [f]: v } }));
  const setRec = (f: keyof LoanProductRecoveryDTO, v: any) => setData((p) => ({ ...p, loanProductRecoveryDTO: { ...p.loanProductRecoveryDTO!, [f]: v } }));

  const numInput = (e: React.ChangeEvent<HTMLInputElement>, cb: (v: number) => void, dec = false, max?: number) => {
    let val = e.target.value;
    if (max && val.length > max) val = val.slice(0, max);
    if (val === "") { cb(0); return; }
    if ((dec ? /^\d*\.?\d*$/ : /^\d*$/).test(val)) cb(dec ? parseFloat(val) || 0 : parseInt(val) || 0);
  };

  const parseCsvStr = (csv: string) => (csv ? csv.split(",").filter(Boolean) : []);
  const parseCsvIds = (csv: string) => (csv ? csv.split(",").map(Number).filter(Boolean) : []);

  const toggleCsvStr = (cur: string, item: string, setter: (v: string) => void) => {
    const arr = parseCsvStr(cur);
    setter((arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]).join(","));
  };
  const toggleSecId = (cur: string, id: number) => {
    const arr = parseCsvIds(cur);
    setDef("securityIds", (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]).join(","));
  };

  // ─── Blur / uniqueness ───────────────────────────────────────────────────

  const onBlur = async (field: string, value: any) => {
    markFieldTouched(field);
    if (field === "productName") {
      const res = await commonservice.productname_unique(user.branchid, value, productId ?? 0);
      if (res.success) { setProd("productName", ""); Swal.fire({ icon: "error", title: "Duplication.", text: res.message, didClose: () => productNameRef.current?.focus() }); }
    }
    if (field === "code") {
      const res = await commonservice.productcode_unique(user.branchid, value, productId ?? 0);
      if (res.success) { setProd("code", ""); Swal.fire({ icon: "error", title: "Duplication.", text: res.message, didClose: () => codeRef.current?.focus() }); }
    }
  };

  // ─── Submit / Reset ──────────────────────────────────────────────────────

  const validateAll = () => {
    const r = validateForm(data);
    if (!r.isValid) {
      setShowValidationSummary(true);
      Swal.fire({ icon: "error", title: "Validation Errors", html: `<p>Please fix ${r.errors.length} error(s).</p>`, confirmButtonText: "Fix Errors" });
      const first = r.errors[0];
      if (first) { setActiveTab(first.tab as any); setTimeout(() => { document.getElementById(first.field)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); }
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setLoading(true);
    try {
      const res = isEditMode && productId
        ? await loanProductApiService.updateLoanProduct(data, Number(productId))
        : await loanProductApiService.createLoanProduct(data);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        clearErrors(); setShowValidationSummary(false);
        isEditMode ? navigate(isEditMode ? "/loanproduct-info" : "/product-operations") : handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); setActiveTab("definition"); clearErrors(); setShowValidationSummary(false); };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const errorsByField = errors.reduce((a, e) => { if (!a[e.field]) a[e.field] = []; a[e.field].push(e); return a; }, {} as Record<string, ValidationError[]>);
  const errorsByTab = errors.reduce((a, e) => { if (!a[e.tab]) a[e.tab] = []; a[e.tab].push(e); return a; }, {} as Record<string, ValidationError[]>);
  const tabCls = (id: string) => {
    const base = "px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 relative";
    if (activeTab === id) return `${base} border-blue-500 text-blue-600 bg-blue-50`;
    if ((errorsByTab[id]?.length ?? 0) > 0) return `${base} border-red-400 text-red-600 hover:bg-red-50`;
    return `${base} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
  };

  const accOpts = accountHeads.map((h) => ({ value: h.headCode, label: h.accountHeadName }));
  const selectPortalStyles = { menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) };
  const prod = data.loanProductDTO!;
  const def = data.loanProductDefinitionDTO!;
  const adv = data.loanProductAdvancementDTO!;
  const mmr = data.loanProductMarginMoneyRuleDTO!;
  const post = data.loanProductPostingDTO!;
  const rec = data.loanProductRecoveryDTO!;
  const selSec = parseCsvIds(def.securityIds || "");
  const selDisb = parseCsvStr(adv.disbursmentMode || "");
  const selRec = parseCsvStr(rec.recoveryMode || "");
  const showSecurityAmtFields = def.typeId === 4 && def.categoryId === 2 && selSec.includes(5);

  // ─── Tab 1 ───────────────────────────────────────────────────────────────

  const renderDefinition = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Definition */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-700 px-2">Definition</legend>
          <div className="space-y-3">
            <FormField name="typeId" label="Loan Type" required errors={errorsByField.typeId || []}>
              <Select instanceId="loan-type" options={LOAN_TYPES} value={LOAN_TYPES.find((o) => o.value === def.typeId) || null} onChange={(s) => setDef("typeId", s?.value || 0)} placeholder="Select Loan Type" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
            </FormField>
            <FormField name="categoryId" label="Category" errors={errorsByField.categoryId || []}>
              <Select instanceId="category" options={CATEGORIES} value={CATEGORIES.find((o) => o.value === def.categoryId) || null} onChange={(s) => setDef("categoryId", s?.value || 0)} placeholder="Select Category" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
            </FormField>
            <FormField name="securityIds" label="Security" errors={errorsByField.securityIds || []}>
              <div className="border border-gray-200 rounded p-2 max-h-28 overflow-y-auto space-y-1 bg-white">
                {SECURITIES.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={selSec.includes(s.id)} onChange={() => toggleSecId(def.securityIds || "", s.id)} className="w-3.5 h-3.5 text-blue-600 rounded" />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField name="secReviewFreqPeriod" label="Security Review Freq Period" required errors={errorsByField.secReviewFreqPeriod || []}>
              <input type="text" inputMode="numeric" value={def.secReviewFreqPeriod || ""} onChange={(e) => numInput(e, (v) => setDef("secReviewFreqPeriod", v), false, 4)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="e.g. 12" />
            </FormField>
            <FormField name="docPlanId" label="Document Plan" required errors={errorsByField.docPlanId || []}>
              <Select instanceId="doc-plan" options={DOC_PLANS} value={DOC_PLANS.find((o) => o.value === def.docPlanId) || null} onChange={(s) => setDef("docPlanId", s?.value || 0)} placeholder="Select Document Plan" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
            </FormField>
            <FormField name="intSchedule" label="Installment Schedule" errors={[]}>
              <div className="flex gap-5 mt-1">
                {[{ v: 1, l: "With Interest" }, { v: 2, l: "Without Interest" }].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="intSchedule" checked={def.intSchedule === o.v} onChange={() => setDef("intSchedule", o.v)} className="text-blue-600" /><span>{o.l}</span></label>
                ))}
              </div>
            </FormField>
            <FormField name="intFormulae" label="Interest Formula" errors={[]}>
              <div className="flex gap-5 mt-1">
                {[{ v: 1, l: "Flat Interest" }, { v: 2, l: "Reducing Interest" }].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="intFormulae" checked={def.intFormulae === o.v} onChange={() => setDef("intFormulae", o.v)} className="text-blue-600" /><span>{o.l}</span></label>
                ))}
              </div>
            </FormField>
          </div>
        </fieldset>

        {/* Advancement Rules */}
        <fieldset className="border border-gray-300 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-700 px-2">Advancement Rules</legend>
          <div className="space-y-3">
            <FormField name="disbursmentMode" label="Disbursement Mode" required errors={errorsByField.disbursmentMode || []}>
              <div className="flex flex-wrap gap-3 mt-1">
                {DISBURSMENT_MODES.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="checkbox" checked={selDisb.includes(m.id)} onChange={() => toggleCsvStr(adv.disbursmentMode || "", m.id, (v) => setAdv("disbursmentMode", v))} className="w-3.5 h-3.5 text-blue-600 rounded" />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField name="maxNoofDisbursments" label="Max No. of Disbursements" required errors={errorsByField.maxNoofDisbursments || []}>
              <input type="text" inputMode="numeric" value={adv.maxNoofDisbursments || ""} onChange={(e) => numInput(e, (v) => setAdv("maxNoofDisbursments", v), false, 3)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="e.g. 10" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="minLoanAmount" label="Loan Amount (From)" required errors={errorsByField.minLoanAmount || []}>
                <input type="text" inputMode="decimal" value={adv.minLoanAmount || ""} onChange={(e) => numInput(e, (v) => setAdv("minLoanAmount", v), true, 12)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="1.00" />
              </FormField>
              <FormField name="maxLoanAmount" label="Loan Amount (To)" required errors={errorsByField.maxLoanAmount || []}>
                <input type="text" inputMode="decimal" value={adv.maxLoanAmount || ""} onChange={(e) => numInput(e, (v) => setAdv("maxLoanAmount", v), true, 12)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="800000.00" />
              </FormField>
            </div>
            <FormField name="loanPeriodType" label="Loan Period In" errors={[]}>
              <div className="flex gap-5 mt-1">
                {[{ v: "D", l: "Days" }, { v: "M", l: "Months" }].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="loanPeriodType" checked={adv.loanPeriodType === o.v} onChange={() => setAdv("loanPeriodType", o.v)} className="text-blue-600" /><span>{o.l}</span></label>
                ))}
              </div>
            </FormField>
            <FormField name="isShareMoneyReq" label="Share Money Check" required errors={[]}>
              <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="isShareMoneyReq" checked={adv.isShareMoneyReq === "Y"} onChange={() => setAdv("isShareMoneyReq", "Y")} className="text-blue-600" /><span>Y</span></label>
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="isShareMoneyReq" checked={adv.isShareMoneyReq === "N"} onChange={() => setAdv("isShareMoneyReq", "N")} className="text-blue-600" /><span>N</span></label>
              </div>
            </FormField>
            <FormField name="overDraftLimit" label="Over Draft Limit" required errors={[]}>
              <div className="flex gap-5 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="overDraftLimit" checked={adv.overDraftLimit === 1} onChange={() => setAdv("overDraftLimit", 1)} className="text-blue-600" /><span>Y</span></label>
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="overDraftLimit" checked={adv.overDraftLimit === 0} onChange={() => setAdv("overDraftLimit", 0)} className="text-blue-600" /><span>N</span></label>
              </div>
            </FormField>
            {showSecurityAmtFields && (
              <div className="grid grid-cols-2 gap-3">
                <FormField name="loanAmtPerOnSecurityRD" label="Loan Amount(%) On Security(RD)" errors={[]}>
                  <input type="text" inputMode="decimal" value={adv.loanAmtPerOnSecurityRD || ""} onChange={(e) => numInput(e, (v) => setAdv("loanAmtPerOnSecurityRD", v), true, 6)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0.00" />
                </FormField>
                <FormField name="loanAmtPerOnSecurityFD" label="Loan Amount(%) On Security(FD)" errors={[]}>
                  <input type="text" inputMode="decimal" value={adv.loanAmtPerOnSecurityFD || ""} onChange={(e) => numInput(e, (v) => setAdv("loanAmtPerOnSecurityFD", v), true, 6)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0.00" />
                </FormField>
              </div>
            )}
          </div>
        </fieldset>
      </div>

      {/* Margin Money */}
      <fieldset className="border border-gray-300 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Margin Money</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField name="ratioOrPerc" label="Ratio/Perc." errors={errorsByField.ratioOrPerc || []}>
            <Select instanceId="ratio-perc" options={MARGIN_RATIO_OPTIONS} value={MARGIN_RATIO_OPTIONS.find((o) => o.value === mmr.ratioOrPerc) || null} onChange={(s) => setMmr("ratioOrPerc", s?.value || 0)} placeholder="==Select==" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
          </FormField>
          <FormField name="loanProportion" label="Loan Amount" errors={[]}>
            <input type="text" inputMode="decimal" value={mmr.loanProportion || ""} onChange={(e) => numInput(e, (v) => setMmr("loanProportion", v), true, 10)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0" />
          </FormField>
          <FormField name="marginProportion" label="Margin Money" errors={[]}>
            <input type="text" inputMode="decimal" value={mmr.marginProportion || ""} onChange={(e) => numInput(e, (v) => setMmr("marginProportion", v), true, 10)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0" />
          </FormField>
          <FormField name="mmPercentage" label="Margin Money(%)" errors={[]}>
            <input type="text" inputMode="decimal" value={mmr.mmPercentage || ""} onChange={(e) => numInput(e, (v) => setMmr("mmPercentage", v), true, 6)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0" />
          </FormField>
        </div>
      </fieldset>
    </div>
  );

  // ─── Tab 2 ───────────────────────────────────────────────────────────────

  const renderRecovery = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Recovery Rules */}
      <fieldset className="border border-gray-300 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Recovery Rules</legend>
        <div className="space-y-3">
          <FormField name="recoveryMode" label="Recovery Modes" errors={errorsByField.recoveryMode || []}>
            <div className="flex flex-wrap gap-3 mt-1">
              {RECOVERY_MODES.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="checkbox" checked={selRec.includes(m.id)} onChange={() => toggleCsvStr(rec.recoveryMode || "", m.id, (v) => setRec("recoveryMode", v))} className="w-3.5 h-3.5 text-blue-600 rounded" />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField name="minBalLeftLimit" label="Min. Bal. Left Limit" errors={[]}>
              <input type="text" inputMode="decimal" value={rec.minBalLeftLimit || ""} onChange={(e) => numInput(e, (v) => setRec("minBalLeftLimit", v), true, 10)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0" />
            </FormField>
            <FormField name="minBalGivenLimit" label="Min. Bal. Given Limit" errors={[]}>
              <input type="text" inputMode="decimal" value={rec.minBalGivenLimit || ""} onChange={(e) => numInput(e, (v) => setRec("minBalGivenLimit", v), true, 10)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="0" />
            </FormField>
          </div>

          {/* Recovery Sequence */}
          <FormField name="recoverySeq" label="Recovery Sequence Rule" errors={errorsByField.recoverySeq || []}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {([
                { key: "overDueInterestSeq" as const, label: "Over Due Interest" },
                { key: "standardInterestSeq" as const, label: "Standard Interest" },
                { key: "overDueBalanceSeq" as const, label: "Over Due Balance" },
                { key: "standardBalanceSeq" as const, label: "Standard Balance" },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1">{label}*</span>
                  <input
                    type="text" inputMode="numeric"
                    value={rec[key] || ""}
                    onChange={(e) => numInput(e, (v) => setRec(key, Math.min(4, Math.max(1, v))), false, 1)}
                    className="w-12 px-2 py-1.5 border-2 border-gray-200 rounded text-center text-sm focus:border-blue-500 outline-none"
                    maxLength={1}
                  />
                </div>
              ))}
            </div>
          </FormField>

          <FormField name="applyOvrIntOn" label="Apply Overdue Int On" required errors={[]}>
            <div className="flex gap-5 mt-1">
              {[{ v: "IA", l: "Installment Amt" }, { v: "PA", l: "Principal Amt" }].map((o) => (
                <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="applyOvrIntOn" checked={rec.applyOvrIntOn === o.v} onChange={() => setRec("applyOvrIntOn", o.v)} className="text-blue-600" /><span>{o.l}</span></label>
              ))}
            </div>
          </FormField>

          <FormField name="intRecoveredInAdvance" label="Int. Recovered in Advance" errors={[]}>
            <label className="flex items-center gap-2 cursor-pointer text-sm mt-1">
              <input type="checkbox" checked={rec.intRecoveredInAdvance === 1} onChange={(e) => setRec("intRecoveredInAdvance", e.target.checked ? 1 : 0)} className="w-4 h-4 text-blue-600 rounded" />
              <span>Yes</span>
            </label>
          </FormField>

          <FormField name="actOnIntPosting" label="Action on Int. Posting" required errors={[]}>
            <Select instanceId="act-on-int" options={ACTION_ON_INT_OPTIONS} value={ACTION_ON_INT_OPTIONS.find((o) => o.value === def.actOnIntPosting) || null} onChange={(s) => setDef("actOnIntPosting", s?.value || 1)} placeholder="Select Action" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
          </FormField>

          <FormField name="recoveryAdjustmentSeq" label="Recovery Adjustment Seq." required errors={errorsByField.recoveryAdjustmentSeq || []}>
            <div className="flex gap-5 mt-1">
              {[{ v: 1, l: "Interest First" }, { v: 2, l: "Principal First" }].map((o) => (
                <label key={o.v} className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="recoveryAdjSeq" checked={rec.recoveryAdjustmentSeq === o.v} onChange={() => setRec("recoveryAdjustmentSeq", o.v)} className="text-blue-600" /><span>{o.l}</span></label>
              ))}
            </div>
          </FormField>

          <FormField name="intPostingInterval" label="Int. Posting Interval" required errors={errorsByField.intPostingInterval || []}>
            <Select instanceId="int-posting-interval" options={POSTING_INTERVAL_OPTIONS} value={POSTING_INTERVAL_OPTIONS.find((o) => o.value === rec.intPostingInterval) || null} onChange={(s) => setRec("intPostingInterval", s?.value || 0)} placeholder="Select Interval" isClearable menuPortalTarget={document.body} styles={selectPortalStyles} className="text-sm" />
          </FormField>

          <FormField name="stdOverdueOnKistDate" label="Stand Overdue On Kist Date" errors={[]}>
            <label className="flex items-center gap-2 cursor-pointer text-sm mt-1">
              <input type="checkbox" checked={rec.stdOverdueOnKistDate === 1} onChange={(e) => setRec("stdOverdueOnKistDate", e.target.checked ? 1 : 0)} className="w-4 h-4 text-blue-600 rounded" />
              <span>Yes</span>
            </label>
          </FormField>
        </div>
      </fieldset>

      {/* Posting Rules */}
      <fieldset className="border border-gray-300 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Posting Rules</legend>
        <div className="space-y-3">
          {([
            { key: "principalBalHeadCode" as const, label: "Principal Bal. Head", req: true, id: "principal-bal-head" },
            { key: "miscIncHeadCode" as const, label: "Misc. Income Head", req: true, id: "misc-inc-head" },
            { key: "minBalLeftLimitHeadCode" as const, label: "Min. Bal. Left Lt Head", req: false, id: "min-bal-left-head" },
            { key: "minBalGivenLimitHeadCode" as const, label: "Min. Given Limit Head", req: false, id: "min-bal-given-head" },
            { key: "expHeadCode" as const, label: "Expenses A/C Head", req: true, id: "exp-head" },
            { key: "recoverableIntHeadCode" as const, label: "Recoverable Int Head", req: false, id: "recoverable-int-head" },
          ]).map(({ key, label, req, id }) => (
            <FormField key={key} name={key} label={label} required={req} errors={errorsByField[key] || []}>
              <Select
                instanceId={id}
                options={accOpts}
                value={accOpts.find((o) => String(o.value) === String((post as any)[key])) || null}
                onChange={(s) => setPost(key, s?.value || 0)}
                placeholder={`Select ${label}`}
                isClearable
                menuPortalTarget={document.body}
                styles={selectPortalStyles}
                className="text-sm"
              />
            </FormField>
          ))}
        </div>
      </fieldset>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? "Edit" : "Add"} Loan Product</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Configure loan product rules and settings</p>
                </div>
              </div>
              <button onClick={() => navigate(isEditMode ? "/loanproduct-info" : "/product-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            <ValidationSummary errors={errors} errorsByTab={errorsByTab} isVisible={showValidationSummary} onErrorClick={(_, tab) => setActiveTab(tab as any)} onClose={() => setShowValidationSummary(false)} />

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              {/* Product name/code/date */}
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <fieldset className="border border-gray-300 rounded-lg p-4">
                  <legend className="text-sm font-semibold text-gray-700 px-2">Deposit</legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField name="productName" label="Loan Name" required errors={errorsByField.productName || []} icon={<User className="w-4 h-4 text-blue-500" />}>
                      <input type="text" ref={productNameRef} value={prod.productName || ""} onChange={(e) => setProd("productName", e.target.value)} onBlur={(e) => onBlur("productName", e.target.value)} maxLength={50} autoFocus placeholder="Enter Loan Name" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                    </FormField>
                    <FormField name="effectiveFrom" label="Effective From" required errors={errorsByField.effectiveFrom || []} icon={<Calendar className="w-4 h-4 text-blue-500" />}>
                      <input type="date" value={prod.effectiveFrom || ""} onChange={(e) => commonservice.handleDateChange(e.target.value, (v) => setProd("effectiveFrom", v), "effectiveFrom")} max={commonservice.getCurrentDate()} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                    </FormField>
                    <FormField name="code" label="Loan Code" required errors={errorsByField.code || []} icon={<CreditCard className="w-4 h-4 text-purple-500" />}>
                      <input type="text" ref={codeRef} value={prod.code || ""} onChange={(e) => setProd("code", e.target.value.toUpperCase())} onBlur={(e) => onBlur("code", e.target.value)} maxLength={3} placeholder="e.g. 51" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                    </FormField>
                  </div>
                </fieldset>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex">
                  {([
                    { id: "definition", label: "Definition/Advancement", icon: Settings },
                    { id: "recovery", label: "Recovery/Posting", icon: DollarSign },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={tabCls(id)}>
                      <Icon className="w-4 h-4 inline mr-1.5" />{label}
                      {(errorsByTab[id]?.length ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{errorsByTab[id].length}</span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-5">{activeTab === "definition" ? renderDefinition() : renderRecovery()}</div>

              {/* Actions */}
              <div className="border-t border-gray-200 p-5 bg-gray-50 flex justify-end gap-3">
                <button onClick={isEditMode ? commonservice.handleResetNotAllowed : handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEditMode ? "Updating..." : "Saving..."}</>
                    : <><Save className="w-4 h-4" />{isEditMode ? "Update" : "Save"} Loan Product</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default LoanProductMaster;
