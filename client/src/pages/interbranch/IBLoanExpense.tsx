import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Select from "react-select";
import Swal from "sweetalert2";
import {
  ArrowLeft, Save, RotateCcw, CreditCard, Building2,
  DollarSign, FileText, Loader2, AlertTriangle, Tag,
} from "lucide-react";
import commonservice from "../../services/common/commonservice";
import otherBranchAccountApi from "../../services/interbranch/otherBranchAccountApi";
import ibVoucherApi from "../../services/interbranch/ibVoucherApi";
import expenseCategoryApi from "../../services/loan/expensecategoryapi";

const selectStyles = (hasError = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "48px",
    borderWidth: "2px",
    borderColor: hasError ? "#ef4444" : state.isFocused ? "#6366f1" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99,102,241,0.2)" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": { borderColor: hasError ? "#ef4444" : "#6366f1" },
  }),
  option: (base: any) => ({ ...base, cursor: "pointer" }),
  dropdownIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  clearIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
});

const CR_TYPE_OPTIONS = [
  { value: 3, label: "General" },
  { value: 2, label: "Saving" },
  { value: 4, label: "Share Money" },
];

const IBLoanExpense: React.FC = () => {
  const navigate    = useNavigate();
  const user        = useSelector((state: RootState) => state.user);
  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [ibMappings, setIbMappings]               = useState<any[]>([]);
  const [loanProducts, setLoanProducts]             = useState<any[]>([]);
  const [expCategories, setExpCategories]           = useState<any[]>([]);
  const [loanAccOptions, setLoanAccOptions]         = useState<any[]>([]);
  const [loanAccLoading, setLoanAccLoading]         = useState(false);
  const [crAccOptions, setCrAccOptions]             = useState<any[]>([]);
  const [defaultCashAccId, setDefaultCashAccId]     = useState<number>(0);
  const [defaultCashAccName, setDefaultCashAccName] = useState<string>("");

  // Form
  const [destBrId, setDestBrId]           = useState<number>(0);
  const [destBrName, setDestBrName]       = useState<string>("");
  const [ibRefAccId, setIbRefAccId]       = useState<number>(0);
  const [ibRefAccName, setIbRefAccName]   = useState<string>("");
  const [loanProductId, setLoanProductId] = useState<number>(0);
  const [loanAccId, setLoanAccId]         = useState<number>(0);
  const [loanAccNo, setLoanAccNo]         = useState<string>("");
  const [loanAccName, setLoanAccName]     = useState<string>("");
  const [expCategoryId, setExpCategoryId] = useState<number>(0);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [crTypeId, setCrTypeId]           = useState<number>(3); // default General
  const [crAccId, setCrAccId]             = useState<number>(0);
  const [crAccName, setCrAccName]         = useState<string>("");
  const [remarks, setRemarks]             = useState<string>("");
  const [narration, setNarration]         = useState<string>("");
  const [submitting, setSubmitting]       = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  const flowType = user.isMainBranch ? "HOToBranch" : "BranchToBranch";

  useEffect(() => {
    if (!user.branchid) return;
    Promise.all([
      otherBranchAccountApi.getAll(user.branchid),
      commonservice.fetch_loan_products(user.branchid, workingDate),
      expenseCategoryApi.getList(user.branchid),
      commonservice.default_cash_in_hand_account(user.branchid),
    ]).then(([ibRes, prodRes, catRes, cashRes]: any[]) => {
      if (ibRes?.success && ibRes.data) setIbMappings(ibRes.data);
      if (prodRes?.success) setLoanProducts((prodRes.data ?? []).map((p: any) => ({ value: p.id ?? p.Id, label: p.productName ?? p.ProductName })));
      if (catRes?.success) setExpCategories(((catRes as any).items ?? []).map((c: any) => ({ value: c.id, label: c.description })));
      if (cashRes?.success && cashRes.data) {
        const id   = cashRes.data.accId ?? cashRes.data.AccId ?? 0;
        const name = cashRes.data.accountName ?? cashRes.data.AccountName ?? "";
        setDefaultCashAccId(id);
        setDefaultCashAccName(name);
        setCrAccId(id);
        setCrAccName(name);
      }
    });
    // Load General accounts for source branch (default cr type = General)
    commonservice.fetch_accounts_by_type(user.branchid, 3).then((res: any) => {
      if (res?.success) setCrAccOptions((res.data ?? []).map((a: any) => ({
        value: a.accId ?? a.AccId,
        label: a.accountName ?? a.AccountName,
      })));
    });
  }, [user.branchid]);

  const destBrOptions = ibMappings.map((m: any) => ({
    value: m.otherBrId,
    label: `${m.otherBranchCode ? m.otherBranchCode + " - " : ""}${m.otherBranchName ?? m.otherBrId}`,
    accId: m.accId,
    accountName: m.accountName ?? "",
  }));

  const handleDestBrChange = async (selected: any) => {
    setDestBrId(selected ? selected.value : 0);
    setDestBrName(selected ? selected.label : "");
    setIbRefAccId(selected ? selected.accId : 0);
    setIbRefAccName(selected ? (selected.accountName ?? "") : "");
    setLoanAccId(0); setLoanAccNo(""); setLoanAccName("");
    setLoanAccOptions([]);
    setErrors((e) => ({ ...e, destBrId: "", loanAccId: "" }));

    if (selected?.value) {
      setLoanAccLoading(true);
      try {
        const res = await commonservice.fetch_accounts_by_type(selected.value, 1) as any;
        if (res?.success && res.data) {
          setLoanAccOptions(res.data.map((a: any) => ({
            value: a.accId ?? a.AccId,
            label: a.accountName ?? a.AccountName,
          })));
        }
      } catch { /* non-critical */ }
      finally { setLoanAccLoading(false); }
    }
  };

  const handleLoanAccChange = async (selected: any) => {
    if (!selected) { setLoanAccId(0); setLoanAccNo(""); setLoanAccName(""); return; }
    const combined: string = selected.label ?? "";
    const dashIdx = combined.indexOf("-");
    const accNo   = dashIdx >= 0 ? combined.slice(0, dashIdx).trim() : combined.trim();
    const accName = dashIdx >= 0 ? combined.slice(dashIdx + 1).trim() : combined.trim();
    setLoanAccId(selected.value); setLoanAccNo(accNo); setLoanAccName(accName);
    setErrors((e) => ({ ...e, loanAccId: "" }));
  };

  const handleCrTypeChange = async (selected: any) => {
    const t = selected?.value ?? 3;
    setCrTypeId(t);
    setCrAccId(0); setCrAccName("");
    setCrAccOptions([]);
    if (t) {
      const res = await commonservice.fetch_accounts_by_type(user.branchid, t) as any;
      if (res?.success) setCrAccOptions((res.data ?? []).map((a: any) => ({
        value: a.accId ?? a.AccId,
        label: a.accountName ?? a.AccountName,
      })));
    }
    // Reset to default cash if switching back to General
    if (t === 3 && defaultCashAccId) {
      setCrAccId(defaultCashAccId);
      setCrAccName(defaultCashAccName);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!destBrId)            e.destBrId      = "Destination branch is required.";
    if (!ibRefAccId)          e.destBrId      = "IB reference account not configured.";
    if (!loanProductId)       e.loanProductId = "Loan product is required.";
    if (!loanAccId)           e.loanAccId     = "Loan account is required.";
    if (!expCategoryId)       e.expCategoryId = "Expense category is required.";
    const amt = parseFloat(expenseAmount);
    if (!expenseAmount || isNaN(amt) || amt <= 0)
      e.expenseAmount = "Enter a valid expense amount greater than zero.";
    if (!crAccId)             e.crAccId       = "Credit account is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const amt = parseFloat(expenseAmount);
    const confirm = await Swal.fire({
      title: "Create IB Loan Expense?",
      html: `Charge <strong>₹${amt.toFixed(2)}</strong> as Loan Expense to <strong>${loanAccName}</strong> at <strong>${destBrName}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Create",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const payload: any = {
        brId:              user.branchid,
        destBrId,
        destAccId:         loanAccId,
        destAccNo:         loanAccNo,
        destAccName:       loanAccName,
        drAccId:           ibRefAccId,
        crAccId,
        amount:            amt,
        loanProductId,
        expenseCategoryId: expCategoryId,
        expenseAmount:     amt,
        totalTax:          0,
        remarks:           remarks.trim() || undefined,
        crAccountTypeId:   crTypeId,
        narration:         narration.trim() || undefined,
        voucherDate:       workingDate,
        workingDate,
        userId:            user.userId?.toString(),
        flowType,
        gstDetail:         null,
      };

      const res = await ibVoucherApi.createLoanExpenseStep1(payload) as any;

      if (res?.success) {
        await Swal.fire({
          icon: "success",
          title: "IB Loan Expense Created",
          text: res.message || "Inter-branch loan expense recorded successfully.",
          confirmButtonColor: "#6366f1",
        });
        handleReset();
      } else {
        Swal.fire("Error", res?.message || "Failed to create IB loan expense.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to create IB loan expense.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDestBrId(0); setDestBrName(""); setIbRefAccId(0); setIbRefAccName("");
    setLoanProductId(0); setLoanAccId(0); setLoanAccNo(""); setLoanAccName("");
    setLoanAccOptions([]); setExpCategoryId(0);
    setExpenseAmount(""); setCrTypeId(3);
    setCrAccId(defaultCashAccId); setCrAccName(defaultCashAccName);
    setRemarks(""); setNarration(""); setErrors({});
  };

  if (!user.enableIBTransactions) return (
    <DashboardLayout enableScroll mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 mb-2">IB Transactions Disabled</h2>
          <p className="text-sm text-gray-400">Inter-Branch transactions have been disabled for this branch.</p>
        </div>
      </div>
    } />
  );

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="w-full min-h-screen bg-gradient-to-br from-gray-100 to-indigo-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">IB Loan Expense</h1>
                    <p className="text-indigo-200 text-sm">
                      {flowType === "HOToBranch" ? "HO → Branch (2-step)" : "Branch → Branch (3-step)"} · Working Date: {workingDate}
                    </p>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${flowType === "HOToBranch" ? "bg-blue-200 text-blue-800" : "bg-amber-200 text-amber-800"}`}>
                {flowType === "HOToBranch" ? "HO to Branch" : "Branch to Branch"}
              </span>
            </div>
          </div>

          <div className="p-6 max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Flow info banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
                <p className="font-semibold mb-1">{flowType === "HOToBranch" ? "HOToBranch flow:" : "BranchToBranch flow:"}</p>
                {flowType === "HOToBranch" ? (
                  <p>Step 1 (this action): HO collects expense from borrower — <strong>Dr IB-Ref → Cr Credit Acc</strong>.<br />
                    Step 2: Dest branch posts Dr=Loan Account (LA entry) → Cr=HO-Ref + records loan expense.</p>
                ) : (
                  <p>Step 1 (this action): Source branch collects expense — <strong>Dr IB-Ref → Cr Credit Acc</strong>.<br />
                    Step 2: HO settles Dr=Dest-Ref → Cr=Source-Ref.<br />
                    Step 3: Dest branch posts Dr=Loan Account (LA entry) → Cr=HO-Ref + records loan expense.</p>
                )}
              </div>

              {/* Destination Branch */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Destination Branch
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Branch <span className="text-red-500">*</span></label>
                  <Select
                    options={destBrOptions}
                    value={destBrOptions.find((o) => o.value === destBrId) ?? null}
                    onChange={handleDestBrChange}
                    placeholder="Select destination branch…"
                    isClearable
                    menuPortalTarget={document.body}
                    styles={selectStyles(!!errors.destBrId)}
                  />
                  {errors.destBrId && <p className="text-red-500 text-xs mt-1">{errors.destBrId}</p>}
                  {destBrId > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">IB Ref Account (Dr)</p>
                        <p className="text-sm font-semibold text-gray-800">{ibRefAccName || "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Credit Account (Cr)</p>
                        <p className="text-sm font-semibold text-gray-800">{crAccName || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Account at Destination */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Loan Account at Destination Branch
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product <span className="text-red-500">*</span></label>
                    <Select
                      options={loanProducts}
                      value={loanProducts.find((o) => o.value === loanProductId) ?? null}
                      onChange={(sel: any) => {
                        setLoanProductId(sel?.value ?? 0);
                        setErrors((e) => ({ ...e, loanProductId: "" }));
                      }}
                      placeholder="Select product…"
                      isClearable
                      menuPortalTarget={document.body}
                      styles={selectStyles(!!errors.loanProductId)}
                    />
                    {errors.loanProductId && <p className="text-red-500 text-xs mt-1">{errors.loanProductId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Account <span className="text-red-500">*</span></label>
                    <Select
                      options={loanAccOptions}
                      value={loanAccOptions.find((o) => o.value === loanAccId) ?? null}
                      onChange={handleLoanAccChange}
                      isLoading={loanAccLoading}
                      isDisabled={!destBrId}
                      placeholder={destBrId ? "Select loan account…" : "Select destination branch first"}
                      isClearable
                      menuPortalTarget={document.body}
                      styles={selectStyles(!!errors.loanAccId)}
                    />
                    {errors.loanAccId && <p className="text-red-500 text-xs mt-1">{errors.loanAccId}</p>}
                  </div>
                </div>
              </div>

              {/* Expense Details */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Expense Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category <span className="text-red-500">*</span></label>
                    <Select
                      options={expCategories}
                      value={expCategories.find((o) => o.value === expCategoryId) ?? null}
                      onChange={(sel: any) => {
                        setExpCategoryId(sel?.value ?? 0);
                        setErrors((e) => ({ ...e, expCategoryId: "" }));
                      }}
                      placeholder="Select category…"
                      isClearable
                      menuPortalTarget={document.body}
                      styles={selectStyles(!!errors.expCategoryId)}
                    />
                    {errors.expCategoryId && <p className="text-red-500 text-xs mt-1">{errors.expCategoryId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Amount (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={expenseAmount}
                      onChange={(e) => { setExpenseAmount(e.target.value); setErrors((er) => ({ ...er, expenseAmount: "" })); }}
                      className={`w-full h-12 px-4 rounded-lg border-2 text-gray-800 font-semibold text-lg focus:outline-none focus:ring-2 transition-all ${errors.expenseAmount ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"}`}
                      placeholder="0.00"
                    />
                    {errors.expenseAmount && <p className="text-red-500 text-xs mt-1">{errors.expenseAmount}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Remarks <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-sm text-gray-700 transition-all"
                    placeholder="Remarks for expense…"
                  />
                </div>
              </div>

              {/* Credit Account at Source Branch */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Credit Account at Source Branch
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <Select
                      options={CR_TYPE_OPTIONS}
                      value={CR_TYPE_OPTIONS.find((o) => o.value === crTypeId) ?? null}
                      onChange={handleCrTypeChange}
                      menuPortalTarget={document.body}
                      styles={selectStyles()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Account <span className="text-red-500">*</span></label>
                    <Select
                      options={crAccOptions}
                      value={crAccOptions.find((o) => o.value === crAccId) ?? null}
                      onChange={(sel: any) => {
                        setCrAccId(sel?.value ?? 0);
                        setCrAccName(sel?.label ?? "");
                        setErrors((e) => ({ ...e, crAccId: "" }));
                      }}
                      placeholder="Select credit account…"
                      isClearable
                      menuPortalTarget={document.body}
                      styles={selectStyles(!!errors.crAccId)}
                    />
                    {errors.crAccId && <p className="text-red-500 text-xs mt-1">{errors.crAccId}</p>}
                  </div>
                </div>
              </div>

              {/* Narration */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Narration <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-sm text-gray-700 resize-none transition-all"
                  placeholder="Enter narration…"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
                    : <><Save className="w-4 h-4" />Create IB Loan Expense</>
                  }
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />Reset
                </button>
              </div>

            </form>
          </div>
        </div>
      }
    />
  );
};

export default IBLoanExpense;
