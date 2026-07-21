import React, { useState, useEffect } from "react";
import { Save, X, RotateCcw, Trash2, Receipt, FileText, CheckCircle, Edit2, ArrowLeft } from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import Select from "react-select";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanExpenseApi, {
  LoanExpenseDTO,
  LoanExpenseListDTO,
  GSTDetailDTO,
} from "../../../services/vouchers/loan/loanExpenseApi";
import expenseCategoryApi from "../../../services/loan/expensecategoryapi";
import GSTDetailPanel from "../../../components/GST/GSTDetailPanel";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const CREDIT_ACCOUNT_TYPES = [
  { value: 2, label: "Saving" },
  { value: 4, label: "ShareMoney" },
  { value: 3, label: "General" },
];

const selectStyles = (hasError = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "44px",
    borderWidth: "2px",
    borderColor: hasError ? "#ef4444" : state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": { borderColor: hasError ? "#ef4444" : "#3b82f6" },
  }),
  option: (base: any) => ({ ...base, cursor: "pointer" }),
  dropdownIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  clearIndicator: (base: any) => ({ ...base, cursor: "pointer" }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
});

interface LoanAccOption {
  accId: number;
  accountName: string;
}
interface CrAccOption {
  accId: number;
  accountName: string;
}
interface LoanProduct {
  id: number;
  productName: string;
}
interface ExpCat {
  id: number;
  description: string;
}

type ListRow = LoanExpenseListDTO & { _idx: number };

const LoanExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [saving, setSaving] = useState(false);

  // Lookup lists
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccOption[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpCat[]>([]);
  const [crAccounts, setCrAccounts] = useState<CrAccOption[]>([]);

  // Form state
  const [form, setForm] = useState({
    date: sessionDate,
    loanProductId: 0,
    drAccountId: 0,
    expenseCategoryId: 0,
    expenseAmount: "",
    crAccountTypeId: 0,
    crAccountId: 0,
    remarks: "",
  });
  const [editId, setEditId] = useState(0);
  const [modifyingId, setModifyingId] = useState(0);
  const [gstDetail, setGstDetail] = useState<GSTDetailDTO | null>(null);
  const [totalTax, setTotalTax] = useState(0);
  const [hasGstService, setHasGstService] = useState(false);
  const [gstModalOpen, setGstModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // List
  const [listData, setListData] = useState<ListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const clearErr = (key: string) =>
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });

  const expenseAmount = parseFloat(form.expenseAmount) || 0;
  const netAmount = expenseAmount + totalTax;

  // Initial load
  useEffect(() => {
    if (!user.branchid) return;
    commonservice.fetch_loan_products(user.branchid).then((res) => {
      if (res.success) setLoanProducts(res.data ?? []);
    });
    expenseCategoryApi.getList(user.branchid).then((res) => {
      if (res.success) setExpenseCategories((res as any).items ?? []);
    });
    loadList();
  }, []);

  const loadList = async (pageNo = 1) => {
    const res = await loanExpenseApi.getAll(user.branchid, pageNo, pageSize, '', sessionDate);
    if (res.success) {
      const items: LoanExpenseListDTO[] = (res as any).items ?? [];
      setListData(items.map((it, i) => ({ ...it, _idx: (pageNo - 1) * pageSize + i + 1 })));
      setTotalCount((res as any).totalCount ?? 0);
      setPage(pageNo);
    }
  };

  const handleProductChange = async (sel: any) => {
    const id = sel?.value ?? 0;
    setForm((p) => ({ ...p, loanProductId: id, drAccountId: 0 }));
    setLoanAccounts([]);
    clearErr("loanProductId");
    if (id && form.date) {
      const res = await commonservice.fetch_loan_accounts_by_product(user.branchid, id, form.date);
      if (res.success) setLoanAccounts(res.data ?? []);
    }
  };

  const handleCrTypeChange = async (sel: any) => {
    const t = sel?.value ?? 0;
    setForm((p) => ({ ...p, crAccountTypeId: t, crAccountId: 0 }));
    setCrAccounts([]);
    clearErr("crAccountTypeId");
    clearErr("crAccountId");
    if (t) {
      const res = await commonservice.fetch_accounts_by_type(user.branchid, t);
      if (res.success) setCrAccounts(res.data ?? []);
    }
  };

  const handleGSTChange = (v: GSTDetailDTO | null, tax: number) => {
    setGstDetail(v);
    setTotalTax(tax);
  };

  const handleModify = async (row: ListRow) => {
    setModifyingId(row.id);
    const res = await loanExpenseApi.getById(row.id, user.branchid);
    setModifyingId(0);
    if (!res.success) {
      Swal.fire({ icon: "error", title: "Error", text: res.message ?? "Failed to load record." });
      return;
    }
    const d = (res as any).data as LoanExpenseDTO;
    setEditId(row.id);
    setForm({
      date: typeof d.date === "string" ? d.date.split("T")[0] : sessionDate,
      loanProductId: d.loanProductId,
      drAccountId: d.drAccountId,
      expenseCategoryId: d.expenseCategoryId,
      expenseAmount: String(d.expenseAmount),
      crAccountTypeId: d.crAccountTypeId,
      crAccountId: d.crAccountId,
      remarks: d.remarks ?? "",
    });
    setGstDetail(null);
    setTotalTax(0);
    setErrors({});
    // Load dependent dropdowns
    if (d.loanProductId && d.date) {
      const dateStr = typeof d.date === "string" ? d.date.split("T")[0] : sessionDate;
      commonservice.fetch_loan_accounts_by_product(user.branchid, d.loanProductId, dateStr)
        .then(r => { if (r.success) setLoanAccounts(r.data ?? []); });
    }
    if (d.crAccountTypeId) {
      commonservice.fetch_accounts_by_type(user.branchid, d.crAccountTypeId)
        .then(r => { if (r.success) setCrAccounts(r.data ?? []); });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.loanProductId) errs.loanProductId = "Loan product is required.";
    if (!form.drAccountId) errs.drAccountId = "Loan account is required.";
    if (!form.expenseCategoryId) errs.expenseCategoryId = "Expense category is required.";
    if (!expenseAmount || expenseAmount <= 0) errs.expenseAmount = "Expense amount must be > 0.";
    if (!form.crAccountTypeId) errs.crAccountTypeId = "Credit account type is required.";
    if (!form.crAccountId) errs.crAccountId = "Credit account is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const dto: LoanExpenseDTO = {
        branchId: user.branchid,
        date: form.date,
        loanProductId: form.loanProductId,
        drAccountId: form.drAccountId,
        expenseCategoryId: form.expenseCategoryId,
        expenseAmount,
        totalTax,
        netAmount,
        remarks: form.remarks || undefined,
        crAccountTypeId: form.crAccountTypeId,
        crAccountId: form.crAccountId,
        gstDetail: gstDetail ?? undefined,
      };
      const res = editId
        ? await loanExpenseApi.update(editId, dto)
        : await loanExpenseApi.create(dto);
      if (res.success) {
        const voucherNo = (res as any).data?.voucherNo;
        await Swal.fire({
          icon: "success",
          title: editId ? "Updated" : "Saved",
          text: `Loan expense voucher #${voucherNo} ${editId ? "updated" : "created"} successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
        handleReset();
        loadList();
      } else {
        Swal.fire({ icon: "error", title: "Error", text: res.message ?? "Failed to save." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      date: sessionDate,
      loanProductId: 0,
      drAccountId: 0,
      expenseCategoryId: 0,
      expenseAmount: "",
      crAccountTypeId: 0,
      crAccountId: 0,
      remarks: "",
    });
    setEditId(0);
    setGstDetail(null);
    setTotalTax(0);
    setHasGstService(false);
    setGstModalOpen(false);
    setErrors({});
    setLoanAccounts([]);
    setCrAccounts([]);
  };

  const handleDelete = async (row: ListRow) => {
    const conf = await Swal.fire({
      icon: "warning",
      title: "Delete?",
      text: `Delete loan expense record from ${row.date ?? ""}?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#ef4444",
    });
    if (!conf.isConfirmed) return;
    const res = await loanExpenseApi.remove(row.id, user.branchid);
    if (res.success) {
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
      loadList(page);
    } else {
      Swal.fire({ icon: "error", title: "Error", text: res.message ?? "Failed to delete." });
    }
  };

  const columns: Column<ListRow>[] = [
    { key: "_idx", header: "#" },
    { key: "date", header: "Date" },
    { key: "loanProductName", header: "Loan Product" },
    { key: "accountName", header: "Account" },
    { key: "expenseCategoryName", header: "Expense Category" },
    { key: "expenseAmount", header: "Expense Amt", render: (r) => r.expenseAmount.toFixed(2) },
    { key: "totalTax", header: "Tax", render: (r) => r.totalTax.toFixed(2) },
    { key: "netAmount", header: "Net Amt", render: (r) => r.netAmount.toFixed(2) },
    { key: "voucherNo", header: "Voucher No" },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleModify(r)}
            disabled={modifyingId === r.id}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60"
            title="Modify"
          >
            {modifyingId === r.id
              ? <div className="w-[15px] h-[15px] border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              : <Edit2 size={15} />}
          </button>
          <button
            onClick={() => handleDelete(r)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      mainContent={
      <div className="w-full p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Loan Expense Stand</h1>
          </div>
          <button
            onClick={() => navigate("/voucher-operations")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back To Operations
          </button>
        </div>

        {/* Form */}
        <div className={`bg-white rounded-xl shadow border p-5 ${editId ? "border-yellow-400" : "border-gray-200"}`}>
          {editId > 0 && (
            <div className="flex items-center justify-between mb-4 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
              <span className="text-sm font-medium text-yellow-800">Editing record — changes will replace the existing voucher</span>
              <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                <X size={14} /> Close
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Date</label>
              <input
                type="text"
                value={form.date}
                readOnly
                className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed outline-none"
              />
            </div>

            {/* Loan Product */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product <span className="text-red-500">*</span></label>
              <Select
                options={loanProducts.map((p) => ({ value: p.id, label: p.productName }))}
                value={form.loanProductId ? { value: form.loanProductId, label: loanProducts.find((p) => p.id === form.loanProductId)?.productName ?? "" } : null}
                onChange={handleProductChange}
                styles={selectStyles(!!errors.loanProductId)}
                placeholder="Select product..."
                isClearable
              />
              {errors.loanProductId && <p className="text-red-500 text-xs mt-1">{errors.loanProductId}</p>}
            </div>

            {/* Loan Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Account <span className="text-red-500">*</span></label>
              <Select
                options={loanAccounts.map((a) => ({ value: a.accId, label: a.accountName }))}
                value={form.drAccountId ? { value: form.drAccountId, label: loanAccounts.find((a) => a.accId === form.drAccountId)?.accountName ?? "" } : null}
                onChange={(sel) => { setForm((p) => ({ ...p, drAccountId: sel?.value ?? 0 })); clearErr("drAccountId"); }}
                styles={selectStyles(!!errors.drAccountId)}
                placeholder="Select account..."
                isDisabled={!form.loanProductId}
                isClearable
              />
              {errors.drAccountId && <p className="text-red-500 text-xs mt-1">{errors.drAccountId}</p>}
            </div>

            {/* Expense Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category <span className="text-red-500">*</span></label>
              <Select
                options={expenseCategories.map((e) => ({ value: e.id, label: e.description }))}
                value={form.expenseCategoryId ? { value: form.expenseCategoryId, label: expenseCategories.find((e) => e.id === form.expenseCategoryId)?.description ?? "" } : null}
                onChange={(sel) => { setForm((p) => ({ ...p, expenseCategoryId: sel?.value ?? 0 })); clearErr("expenseCategoryId"); }}
                styles={selectStyles(!!errors.expenseCategoryId)}
                placeholder="Select category..."
                isClearable
              />
              {errors.expenseCategoryId && <p className="text-red-500 text-xs mt-1">{errors.expenseCategoryId}</p>}
            </div>

            {/* Expense Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Amount <span className="text-red-500">*</span></label>
              <input
                type="text"
                inputMode="decimal"
                value={form.expenseAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d{0,10}(\.\d{0,2})?$/.test(v)) {
                    setForm((p) => ({ ...p, expenseAmount: v }));
                    clearErr("expenseAmount");
                  }
                }}
                className={`w-full h-11 px-3 border-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 ${errors.expenseAmount ? "border-red-400" : "border-gray-200"}`}
                placeholder="0.00"
                maxLength={13}
              />
              {errors.expenseAmount && <p className="text-red-500 text-xs mt-1">{errors.expenseAmount}</p>}
            </div>

            {/* Credit Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Acc Type <span className="text-red-500">*</span></label>
              <Select
                options={CREDIT_ACCOUNT_TYPES}
                value={CREDIT_ACCOUNT_TYPES.find((t) => t.value === form.crAccountTypeId) ?? null}
                onChange={handleCrTypeChange}
                styles={selectStyles(!!errors.crAccountTypeId)}
                placeholder="Select type..."
                isClearable
              />
              {errors.crAccountTypeId && <p className="text-red-500 text-xs mt-1">{errors.crAccountTypeId}</p>}
            </div>

            {/* Credit Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Account <span className="text-red-500">*</span></label>
              <Select
                options={crAccounts.map((a) => ({ value: a.accId, label: a.accountName }))}
                value={form.crAccountId ? { value: form.crAccountId, label: crAccounts.find((a) => a.accId === form.crAccountId)?.accountName ?? "" } : null}
                onChange={(sel) => { setForm((p) => ({ ...p, crAccountId: sel?.value ?? 0 })); clearErr("crAccountId"); }}
                styles={selectStyles(!!errors.crAccountId)}
                placeholder="Select account..."
                isDisabled={!form.crAccountTypeId}
                isClearable
              />
              {errors.crAccountId && <p className="text-red-500 text-xs mt-1">{errors.crAccountId}</p>}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                placeholder="Optional remarks..."
                maxLength={500}
              />
            </div>
          </div>

          {/* GST panel — always mounted (hidden) so it reacts to expenseAmount; button only shown when account has a service */}
          <div className="hidden">
            <GSTDetailPanel
              date={form.date}
              crAccountId={form.crAccountId}
              expenseAmount={expenseAmount}
              value={gstDetail}
              onChange={handleGSTChange}
              onHasService={setHasGstService}
            />
          </div>

          {hasGstService && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setGstModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  gstDetail
                    ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {gstDetail ? <CheckCircle size={16} /> : <FileText size={16} />}
                {gstDetail ? `GST Applied — Tax: ${totalTax.toFixed(2)}` : "View GST Detail"}
              </button>
            </div>
          )}

          {hasGstService && gstModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-blue-700">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-white" />
                    <h2 className="text-lg font-bold text-white">GST Detail</h2>
                  </div>
                  <button onClick={() => setGstModalOpen(false)} className="p-1.5 rounded-lg hover:bg-blue-600 transition-colors text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <GSTDetailPanel
                    date={form.date}
                    crAccountId={form.crAccountId}
                    expenseAmount={expenseAmount}
                    value={gstDetail}
                    onChange={handleGSTChange}
                    onHasService={setHasGstService}
                  />
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setGstModalOpen(false)} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Expense: <span className="font-semibold text-gray-800">{expenseAmount.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600">
              Tax: <span className="font-semibold text-orange-600">{totalTax.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-800 font-bold">
              Net Amount: <span className="text-blue-700 text-base">{netAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Save size={15} />
              {saving ? (editId ? "Updating..." : "Saving...") : (editId ? "Update" : "Save")}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">Loan Expense Records</h2>
            <span className="text-sm text-gray-500">Total: {totalCount}</span>
          </div>
          <GenericTable
            data={listData}
            columns={columns}
            getKey={(r) => r.id}
          />
          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex justify-center gap-2 py-3 border-t border-gray-200">
              <button
                onClick={() => loadList(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => loadList(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      }
    />
  );
};

export default LoanExpensePage;
