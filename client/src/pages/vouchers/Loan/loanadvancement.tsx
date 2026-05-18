import React, { useState, useEffect } from "react";
import {
  Save,
  X,
  FileText,
  User,
  Users,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  DollarSign,
  ArrowLeft,
  Plus,
  Trash2,
  RotateCcw,
  UserCheck,
  Pencil,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useLocation } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanAdvancementApi, {
  LoanAdvancementCreditItemDTO,
} from "../../../services/vouchers/loan/loanAdvancementApi";
import {
  loanAccountApi,
  CombinedLoanAccountDTO,
} from "../../../services/accountMasters/loanaccount/loanaccountapi";
import { VoucherPreview } from "../../../services/vouchers/voucherOperationsApi";

const ACCOUNT_TYPES = { Loan: 1, Saving: 2, General: 3, RD: 5, FD: 6 };

const creditAccountTypeOptions = [
  { value: ACCOUNT_TYPES.General, label: "General" },
  { value: ACCOUNT_TYPES.Saving, label: "Saving" },
  { value: ACCOUNT_TYPES.RD, label: "RD" },
];

const selectStyles = (hasError = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "48px",
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
});

const compactSelectStyles = (hasError = false) => ({
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "40px",
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
});

interface LoanAccountOption {
  accId: number;
  accountName: string;
  loanAmountPassed: number;
}

interface CreditRow extends LoanAdvancementCreditItemDTO {
  rowId: number;
  accountName: string;
  accountTypeName: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return undefined;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).replace(/ /g, "-");
};

const ACCOUNT_TYPE_LABELS: Record<number, string> = { 1: "Loan", 2: "Saving", 3: "General", 5: "RD", 6: "FD" };

const LoanAdvancementVoucher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editVoucherId, setEditVoucherId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("account-info");

  const [loanProducts, setLoanProducts] = useState<{ id: number; productName: string }[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccountOption[]>([]);
  const [creditAccountsForRow, setCreditAccountsForRow] = useState<{ accId: number; accountName: string }[]>([]);
  const [loanAccountData, setLoanAccountData] = useState<CombinedLoanAccountDTO | null>(null);
  const [guarantorNames, setGuarantorNames] = useState<Record<string, string>>({});
  const [creditItems, setCreditItems] = useState<CreditRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    voucherDate: "",
    loanProductId: 0,
    loanAccountId: 0,
    loanAmountPassed: 0,
    totalAmount: "",
    narration: "",
  });

  const [rowForm, setRowForm] = useState({
    accountType: null as number | null,
    accountId: null as number | null,
    amount: "",
    narration: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Shared: load loan account details + guarantors for any account ID
  const loadAccountDetails = async (accountId: number) => {
    const res = await loanAccountApi.getLoanAccountById(accountId, user.branchid);
    if (!res.success) return null;
    const data = res.data as CombinedLoanAccountDTO;
    setLoanAccountData(data);

    const g = data.guarantor;
    if (g) {
      const pairs: Array<{ key: string; memberId: number; branchId: number }> = [];
      if (g.guar1MemId) pairs.push({ key: "guar1", memberId: g.guar1MemId, branchId: g.guar1MemBrId });
      if (g.guar2MemId) pairs.push({ key: "guar2", memberId: g.guar2MemId, branchId: g.guar2MemBrId });
      if (g.witness1MemId) pairs.push({ key: "wit1", memberId: g.witness1MemId, branchId: g.wit1MemBrId ?? g.guar1MemBrId });
      if (g.witness2MemId) pairs.push({ key: "wit2", memberId: g.witness2MemId, branchId: g.wit2MemBrId });

      const results = await Promise.all(pairs.map((p) => commonservice.fetch_member_name(p.memberId, p.branchId)));
      const names: Record<string, string> = {};
      pairs.forEach((p, i) => {
        const d = results[i]?.data;
        names[p.key] = d?.memberName ? `${d.memberName}${d.relativeName ? ` (${d.relativeName})` : ""}` : `Member #${p.memberId}`;
      });
      setGuarantorNames(names);
    }
    return data;
  };

  useEffect(() => {
    const editVoucher = (location.state as any)?.editVoucher as VoucherPreview | undefined;

    if (editVoucher) {
      // ── Edit mode ──────────────────────────────────────────────
      setIsEditMode(true);
      setEditVoucherId(editVoucher.voucherId);

      const drEntry = editVoucher.entries.find((e) => e.entryType === "Dr");
      const crEntries = editVoucher.entries.filter((e) => e.entryType === "Cr");

      if (drEntry) {
        const vDate = editVoucher.voucherDate.split("T")[0];
        setFormData({
          voucherDate: vDate,
          loanProductId: drEntry.generalProductId ?? 0,
          loanAccountId: drEntry.accountId,
          loanAmountPassed: 0,
          totalAmount: drEntry.amount.toFixed(2),
          narration: editVoucher.narration ?? "",
        });

        setLoanAccounts([{ accId: drEntry.accountId, accountName: drEntry.accountName, loanAmountPassed: 0 }]);

        setCreditItems(
          crEntries.map((cr) => ({
            rowId: Date.now() + Math.random(),
            accountId: cr.accountId,
            accountType: cr.accountType,
            amount: cr.amount,
            narration: cr.narration ?? "",
            accountName: cr.accountName,
            accountTypeName: ACCOUNT_TYPE_LABELS[cr.accountType] ?? "Unknown",
          }))
        );

        // Load account details (guarantors, kist info, etc.)
        loadAccountDetails(drEntry.accountId).then((data) => {
          const loanAmountPassed = data?.kistDetail?.loanAmountPassed ?? 0;
          setFormData((p) => ({ ...p, loanAmountPassed }));
          setLoanAccounts([{ accId: drEntry.accountId, accountName: drEntry.accountName, loanAmountPassed }]);
        });
      }

      // Still load products list for display
      commonservice.fetch_loan_products(user.branchid).then((res) => {
        if (res.success) setLoanProducts(res.data ?? []);
      });
    } else {
      // ── Create mode ────────────────────────────────────────────
      setFormData((p) => ({ ...p, voucherDate: sessionDate }));
      commonservice.fetch_loan_products(user.branchid).then((res) => {
        if (res.success) setLoanProducts(res.data ?? []);
      });
    }
  }, []);

  const clearError = (key: string) =>
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });

  const handleProductChange = async (sel: any) => {
    const id = sel ? sel.value : 0;
    setFormData((p) => ({ ...p, loanProductId: id, loanAccountId: 0, loanAmountPassed: 0, totalAmount: "" }));
    setLoanAccounts([]);
    setLoanAccountData(null);
    setCreditItems([]);
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setCreditAccountsForRow([]);
    clearError("loanProductId");
    if (id && formData.voucherDate) {
      const res = await commonservice.fetch_loan_accounts_by_product(user.branchid, id, formData.voucherDate);
      if (res.success) setLoanAccounts(res.data ?? []);
    }
  };

  const handleAccountChange = async (sel: any) => {
    if (!sel) {
      setFormData((p) => ({ ...p, loanAccountId: 0, loanAmountPassed: 0, totalAmount: "" }));
      setLoanAccountData(null);
      setGuarantorNames({});
      setCreditItems([]);
      setEditingRowId(null);
      setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
      setCreditAccountsForRow([]);
      return;
    }
    const acc = loanAccounts.find((a) => a.accId === sel.value);
    setFormData((p) => ({ ...p, loanAccountId: sel.value, loanAmountPassed: acc?.loanAmountPassed ?? 0, totalAmount: "" }));
    setLoanAccountData(null);
    setGuarantorNames({});
    setCreditItems([]);
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setCreditAccountsForRow([]);
    clearError("loanAccountId");
    await loadAccountDetails(sel.value);
  };

  const handleRowTypeChange = async (sel: any) => {
    const t = sel ? sel.value : null;
    setRowForm((p) => ({ ...p, accountType: t, accountId: null }));
    setCreditAccountsForRow([]);
    clearError("rowType");
    clearError("rowAccount");
    if (t) {
      const res = await commonservice.fetch_accounts_by_type(user.branchid, t);
      if (res.success) setCreditAccountsForRow(res.data ?? []);
    }
  };

  const totalCredited = creditItems.reduce((s, r) => s + r.amount, 0);
  const otherCredited = editingRowId !== null
    ? creditItems.filter((r) => r.rowId !== editingRowId).reduce((s, r) => s + r.amount, 0)
    : totalCredited;
  const pending = Math.max(0, (Number(formData.totalAmount) || 0) - otherCredited);

  const handleEditRow = async (row: CreditRow) => {
    const res = await commonservice.fetch_accounts_by_type(user.branchid, row.accountType);
    if (res.success) setCreditAccountsForRow(res.data ?? []);
    setRowForm({
      accountType: row.accountType,
      accountId: row.accountId,
      amount: row.amount.toFixed(2),
      narration: row.narration ?? "",
    });
    setEditingRowId(row.rowId);
    ["rowType", "rowAccount", "rowAmount"].forEach(clearError);
  };

  const handleCancelRowEdit = () => {
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setCreditAccountsForRow([]);
    ["rowType", "rowAccount", "rowAmount"].forEach(clearError);
  };

  const handleAddRow = () => {
    const errs: Record<string, string> = {};
    if (!rowForm.accountType) errs.rowType = "Select account type";
    if (!rowForm.accountId) errs.rowAccount = "Select account";
    if (!rowForm.amount || Number(rowForm.amount) <= 0) errs.rowAmount = "Enter valid amount";
    else if (Number(rowForm.amount) > pending + 0.01) errs.rowAmount = `Exceeds available (${pending.toFixed(2)})`;
    if (Object.keys(errs).length) { setErrors((p) => ({ ...p, ...errs })); return; }

    const accOpt = creditAccountsForRow.find((a) => a.accId === rowForm.accountId);
    const typeLabel = creditAccountTypeOptions.find((t) => t.value === rowForm.accountType)?.label ?? "";

    if (editingRowId !== null) {
      setCreditItems((p) =>
        p.map((r) =>
          r.rowId === editingRowId
            ? {
                ...r,
                accountId: rowForm.accountId!,
                accountType: rowForm.accountType!,
                amount: Number(rowForm.amount),
                narration: rowForm.narration,
                accountName: accOpt?.accountName ?? r.accountName,
                accountTypeName: typeLabel,
              }
            : r
        )
      );
      setEditingRowId(null);
    } else {
      setCreditItems((p) => [
        ...p,
        {
          rowId: Date.now(),
          accountId: rowForm.accountId!,
          accountType: rowForm.accountType!,
          amount: Number(rowForm.amount),
          narration: rowForm.narration,
          accountName: accOpt?.accountName ?? "",
          accountTypeName: typeLabel,
        },
      ]);
    }

    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setCreditAccountsForRow([]);
    ["rowType", "rowAccount", "rowAmount", "creditItems"].forEach(clearError);
  };

  const handleReset = () => {
    setFormData({
      voucherDate: sessionDate,
      loanProductId: 0,
      loanAccountId: 0,
      loanAmountPassed: 0,
      totalAmount: "",
      narration: "",
    });
    setLoanAccounts([]);
    setLoanAccountData(null);
    setGuarantorNames({});
    setCreditItems([]);
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setCreditAccountsForRow([]);
    setErrors({});
    setActiveTab("account-info");
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!isEditMode && !formData.loanProductId) errs.loanProductId = "Select a loan product";
    if (!formData.loanAccountId) errs.loanAccountId = "Select a loan account";
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0)
      errs.totalAmount = "Enter a valid amount";
    else if (formData.loanAmountPassed > 0 && Number(formData.totalAmount) > formData.loanAmountPassed)
      errs.totalAmount = `Cannot exceed sanctioned amount (${formData.loanAmountPassed.toFixed(2)})`;
    if (creditItems.length === 0)
      errs.creditItems = "Add at least one credit account";
    else if (Math.abs(totalCredited - Number(formData.totalAmount)) > 0.01)
      errs.creditItems = `Credit total ${totalCredited.toFixed(2)} must equal advancement amount`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      brId: user.branchid,
      voucherDate: formData.voucherDate,
      loanAccountId: formData.loanAccountId,
      totalAmount: Number(formData.totalAmount),
      narration: formData.narration || undefined,
      creditItems: creditItems.map((r) => ({
        accountId: r.accountId,
        accountType: r.accountType,
        amount: r.amount,
        narration: r.narration || undefined,
      })),
    };

    setLoading(true);
    try {
      const res = isEditMode && editVoucherId
        ? await loanAdvancementApi.updateLoanAdvancement(editVoucherId, payload)
        : await loanAdvancementApi.addLoanAdvancement(payload);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: isEditMode ? "Updated!" : "Success!",
          text: `Loan advancement voucher ${isEditMode ? "updated" : "saved"}. Voucher No: ${res.data?.voucherNo ?? ""}`,
          confirmButtonColor: "#3B82F6",
        });
        if (isEditMode) {
          navigate("/voucher-search");
        } else {
          handleReset();
        }
      } else {
        throw new Error(res.message || "Failed to save voucher");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error!", text: err.message || "Failed to save.", confirmButtonColor: "#EF4444" });
    } finally {
      setLoading(false);
    }
  };

  // ── Derived options ────────────────────────────────────────────────────────
  const loanProductOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const loanAccountOptions = loanAccounts.map((a) => ({ value: a.accId, label: a.accountName }));
  const creditAccOptions = creditAccountsForRow.map((a) => ({ value: a.accId, label: a.accountName }));

  // ── Tab helpers ────────────────────────────────────────────────────────────
  const tabs = [
    { id: "account-info", label: "Account Information", icon: User },
    { id: "ledger", label: "Ledger View", icon: FileText },
    { id: "guar-detail", label: "Guarantor Detail", icon: Users },
    { id: "fd-pledge", label: "FD Pledge", icon: CreditCard },
    { id: "rd-pledge", label: "RD Pledge", icon: CreditCard },
  ];

  const getTabClass = (id: string) =>
    `flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 cursor-pointer ${
      activeTab === id
        ? "border-blue-500 text-blue-600 bg-blue-50"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
    }`;

  // ── Info card helper ───────────────────────────────────────────────────────
  const InfoCard = ({
    icon: Icon,
    color,
    label,
    value,
  }: {
    icon: any;
    color: string;
    label: string;
    value?: string | number | null;
  }) => (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value ?? "N/A"}</p>
      </div>
    </div>
  );

  const acc = loanAccountData?.accountMasterDTO;
  const kist = loanAccountData?.kistDetail;
  const guarantor = loanAccountData?.guarantor;
  const fdPledges = loanAccountData?.fDPledges ?? [];
  const rdPledges = loanAccountData?.rDPledges ?? [];

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (!loanAccountData) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500">Please select a loan account to view information</p>
        </div>
      );
    }

    switch (activeTab) {
      case "account-info":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard icon={User} color="bg-blue-50 text-blue-600" label="Account Name" value={acc?.accountName} />
            <InfoCard icon={Users} color="bg-purple-50 text-purple-600" label="Relative Name" value={acc?.relativeName} />
            <InfoCard icon={CreditCard} color="bg-green-50 text-green-600" label="Account No (Khata No)" value={acc?.accountNumber} />
            <InfoCard icon={FileText} color="bg-orange-50 text-orange-600" label="Loan No" value={kist?.loanNo} />
            <InfoCard icon={DollarSign} color="bg-emerald-50 text-emerald-600" label="Loan Amount Passed" value={kist?.loanAmountPassed != null ? `₹${Number(kist.loanAmountPassed).toFixed(2)}` : undefined} />
            <InfoCard icon={Calendar} color="bg-indigo-50 text-indigo-600" label="Loan Date" value={kist?.loanDate ? formatDate(kist.loanDate) : undefined} />
            <InfoCard icon={Phone} color="bg-pink-50 text-pink-600" label="Phone No" value={acc?.phoneNo1} />
            <InfoCard icon={DollarSign} color="bg-yellow-50 text-yellow-600" label="Kist Amount" value={kist?.kistAmount != null ? `₹${Number(kist.kistAmount).toFixed(2)}` : undefined} />
            <InfoCard icon={Calendar} color="bg-teal-50 text-teal-600" label="Opening Date" value={acc?.accOpeningDate ? formatDate(acc.accOpeningDate) : undefined} />
            <InfoCard icon={UserCheck} color="bg-violet-50 text-violet-600" label="Std. Interest Rate" value={kist?.standardInterestRate != null ? `${kist.standardInterestRate}%` : undefined} />
            <InfoCard icon={MapPin} color="bg-cyan-50 text-cyan-600" label="Address" value={acc?.addressLine} />
          </div>
        );

      case "ledger":
        return (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Ledger view coming soon</p>
          </div>
        );

      case "guar-detail":
        return guarantor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guarantor.guar1MemId && (
              <InfoCard icon={User} color="bg-blue-50 text-blue-600" label="Guarantor 1" value={guarantorNames.guar1 ?? "Loading..."} />
            )}
            {guarantor.guar2MemId && (
              <InfoCard icon={User} color="bg-purple-50 text-purple-600" label="Guarantor 2" value={guarantorNames.guar2 ?? "Loading..."} />
            )}
            {guarantor.witness1MemId && (
              <InfoCard icon={UserCheck} color="bg-green-50 text-green-600" label="Witness 1" value={guarantorNames.wit1 ?? "Loading..."} />
            )}
            {guarantor.witness2MemId && (
              <InfoCard icon={UserCheck} color="bg-orange-50 text-orange-600" label="Witness 2" value={guarantorNames.wit2 ?? "Loading..."} />
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No guarantor information found</p>
          </div>
        );

      case "fd-pledge":
        return fdPledges.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No FD pledges found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  {["#", "FD Account No", "Amount", "Interest", "Date"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fdPledges.map((p, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.fDAccNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{p.fDAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{p.interest?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.date ? formatDate(p.date) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "rd-pledge":
        return rdPledges.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No RD pledges found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  {["#", "RD Account No", "Amount", "Interest", "Date"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rdPledges.map((p, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.rDAccNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{p.rDAmount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{p.interest?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.date ? formatDate(p.date) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Label helper ───────────────────────────────────────────────────────────
  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* ── Voucher Form Card ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${isEditMode ? "from-amber-500 to-orange-500" : "from-blue-600 to-indigo-600"} rounded-lg flex items-center justify-center shadow-md`}>
                      {isEditMode ? <Pencil className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-800">Loan Advancement Voucher</h2>
                        {isEditMode && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs font-semibold">
                            Edit Mode
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {isEditMode ? "Modify credit accounts or narration, then save" : "Enter transaction details below"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Operations
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Row 1: Date, Product, Account */}
                {/* ── Debit (Dr) Section ──────────────────────────────── */}
                <div className="mb-6 rounded-xl border-2 border-rose-200 bg-rose-50/30 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-rose-50 border-b border-rose-200">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white text-xs font-bold shadow-sm">
                      Dr
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-rose-700">Debit Account</p>
                      <p className="text-xs text-rose-500">Loan account to be debited</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div>
                        <Label>Voucher Date</Label>
                        <input
                          type="text"
                          readOnly
                          value={formData.voucherDate}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <Label required={!isEditMode}>Loan Product</Label>
                        <Select
                          options={loanProductOptions}
                          value={loanProductOptions.find((o) => o.value === formData.loanProductId) ?? null}
                          onChange={handleProductChange}
                          placeholder={isEditMode ? "—" : "Select Loan Product"}
                          isClearable={!isEditMode}
                          isDisabled={isEditMode}
                          styles={selectStyles(!!errors.loanProductId)}
                        />
                        {errors.loanProductId && <p className="mt-1 text-xs text-red-600">{errors.loanProductId}</p>}
                      </div>

                      <div>
                        <Label required>Loan Account</Label>
                        <Select
                          options={loanAccountOptions}
                          value={loanAccountOptions.find((o) => o.value === formData.loanAccountId) ?? null}
                          onChange={handleAccountChange}
                          placeholder="Select Loan Account"
                          isClearable={!isEditMode}
                          isDisabled={isEditMode || !formData.loanProductId}
                          noOptionsMessage={() =>
                            !formData.loanProductId ? "Select a product first" : "No accounts found"
                          }
                          styles={selectStyles(!!errors.loanAccountId)}
                        />
                        {errors.loanAccountId && <p className="mt-1 text-xs text-red-600">{errors.loanAccountId}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label required>
                          Loan Advancement Amount
                          {formData.loanAmountPassed > 0 && (
                            <span className="ml-2 text-xs font-normal text-blue-600">
                              (Max: ₹{formData.loanAmountPassed.toFixed(2)})
                            </span>
                          )}
                        </Label>
                        <input
                          type="text"
                          value={formData.totalAmount}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d{0,2}).*$/, "$1");
                            setFormData((p) => ({ ...p, totalAmount: v }));
                            if (!isEditMode) setCreditItems([]);
                            clearError("totalAmount");
                            clearError("creditItems");
                          }}
                          disabled={!formData.loanAccountId}
                          placeholder="Enter Amount (e.g., 10000.00)"
                          className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                            errors.totalAmount
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                        />
                        {errors.totalAmount && <p className="mt-1 text-xs text-red-600">{errors.totalAmount}</p>}
                      </div>

                      <div>
                        <Label>Narration</Label>
                        <input
                          type="text"
                          value={formData.narration}
                          onChange={(e) => setFormData((p) => ({ ...p, narration: e.target.value }))}
                          placeholder="Enter Narration (auto-generated if blank)"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Credit (Cr) Section ──────────────────────────────── */}
                <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50/40 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border-b border-green-200">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm">
                      Cr
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-green-700">Credit Accounts <span className="text-red-500">*</span></p>
                      <p className="text-xs text-green-600">Accounts receiving the disbursed amount</p>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Add / Edit row form */}
                    <div className={`bg-white border rounded-lg p-4 mb-3 ${editingRowId !== null ? "border-amber-300 ring-1 ring-amber-200" : "border-green-200"}`}>
                      {editingRowId !== null && (
                        <p className="text-xs font-semibold text-amber-600 mb-3 flex items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Editing row — modify fields and click Update, or click ✕ to cancel
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <Label required>Account Type</Label>
                          <Select
                            options={creditAccountTypeOptions}
                            value={creditAccountTypeOptions.find((o) => o.value === rowForm.accountType) ?? null}
                            onChange={handleRowTypeChange}
                            placeholder="Type"
                            isClearable
                            isDisabled={!formData.loanAccountId || !formData.totalAmount || isEditMode && !formData.totalAmount}
                            styles={compactSelectStyles(!!errors.rowType)}
                          />
                          {errors.rowType && <p className="mt-1 text-xs text-red-600">{errors.rowType}</p>}
                        </div>

                        <div>
                          <Label required>Account</Label>
                          <Select
                            options={creditAccOptions}
                            value={creditAccOptions.find((o) => o.value === rowForm.accountId) ?? null}
                            onChange={(s) => { setRowForm((p) => ({ ...p, accountId: s ? s.value : null })); clearError("rowAccount"); }}
                            placeholder="Account"
                            isClearable
                            isDisabled={!rowForm.accountType}
                            noOptionsMessage={() => !rowForm.accountType ? "Select type first" : "No accounts"}
                            styles={compactSelectStyles(!!errors.rowAccount)}
                          />
                          {errors.rowAccount && <p className="mt-1 text-xs text-red-600">{errors.rowAccount}</p>}
                        </div>

                        <div>
                          <Label required>
                            Amount
                            {pending > 0 && (
                              <span className="ml-1 text-xs font-normal text-orange-500">
                                (Pending: ₹{pending.toFixed(2)})
                              </span>
                            )}
                          </Label>
                          <input
                            type="text"
                            value={rowForm.amount}
                            onChange={(e) => { setRowForm((p) => ({ ...p, amount: e.target.value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d{0,2}).*$/, "$1") })); clearError("rowAmount"); }}
                            placeholder="0.00"
                            className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none transition-all text-sm ${
                              errors.rowAmount ? "border-red-400" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            }`}
                          />
                          {errors.rowAmount && <p className="mt-1 text-xs text-red-600">{errors.rowAmount}</p>}
                        </div>

                        <div>
                          <Label>Narration</Label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={rowForm.narration}
                              onChange={(e) => setRowForm((p) => ({ ...p, narration: e.target.value }))}
                              placeholder="Optional"
                              className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                            />
                            {editingRowId !== null ? (
                              <>
                                <button
                                  onClick={handleAddRow}
                                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Update
                                </button>
                                <button
                                  onClick={handleCancelRowEdit}
                                  className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={handleAddRow}
                                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {errors.creditItems && (
                      <p className="mb-2 text-sm text-red-600">{errors.creditItems}</p>
                    )}

                    {/* Credit table */}
                    <div className="overflow-x-auto rounded-lg border border-green-200">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                          <tr>
                            {["#", "Account Type", "Account", "Amount (Cr)", "Narration", "Action"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {creditItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                                No credit accounts added yet. Use the form above to add.
                              </td>
                            </tr>
                          ) : (
                            creditItems.map((row, idx) => {
                              const isEditing = editingRowId === row.rowId;
                              return (
                                <tr
                                  key={row.rowId}
                                  className={`transition-colors ${
                                    isEditing
                                      ? "bg-amber-50 border-l-4 border-amber-400"
                                      : "hover:bg-green-50"
                                  }`}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isEditing ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                      {row.accountTypeName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.accountName}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-green-700">₹{row.amount.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{row.narration || "—"}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      {isEditing ? (
                                        <span className="px-2 py-0.5 text-xs text-amber-600 font-semibold">Editing…</span>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleEditRow(row)}
                                            disabled={editingRowId !== null}
                                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Edit row"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (editingRowId !== null) return;
                                              setCreditItems((p) => p.filter((r) => r.rowId !== row.rowId));
                                            }}
                                            disabled={editingRowId !== null}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Delete row"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          {creditItems.length > 0 && (
                            <tr className="bg-green-50 border-t-2 border-green-200">
                              <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-green-800">
                                Total Credited (Cr)
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-green-700">
                                ₹{totalCredited.toFixed(2)}
                              </td>
                              <td colSpan={2} className="px-4 py-3 text-xs text-right pr-4">
                                {Math.abs(totalCredited - (Number(formData.totalAmount) || 0)) <= 0.01 ? (
                                  <span className="text-green-600 font-medium">Fully allocated</span>
                                ) : (Number(formData.totalAmount) || 0) - totalCredited > 0.01 ? (
                                  <span className="text-orange-600 font-medium">
                                    Pending: ₹{((Number(formData.totalAmount) || 0) - totalCredited).toFixed(2)}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={isEditMode ? () => navigate("/voucher-search") : handleReset}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    {isEditMode ? <X className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    {isEditMode ? "Cancel" : "Reset"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r ${
                      isEditMode
                        ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        : "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    } rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode ? "Update Voucher" : "Save Transaction"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Details Tabs Card ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto bg-gray-50">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={getTabClass(tab.id)}>
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
              <div className="p-6 sm:p-8 bg-white">{renderTabContent()}</div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default LoanAdvancementVoucher;
