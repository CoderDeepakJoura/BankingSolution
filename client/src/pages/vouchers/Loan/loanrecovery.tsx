import React, { useState, useEffect } from "react";
import {
  Save, X, FileText, User, Users, Phone, MapPin, CreditCard,
  Calendar, DollarSign, ArrowLeft, Plus, Trash2, RotateCcw,
  UserCheck, Pencil, TrendingDown, AlertCircle, BarChart2,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanRecoveryApi, {
  LoanRecoveryBalanceDTO,
  IntRecDetailRowDTO,
} from "../../../services/vouchers/loan/loanRecoveryApi";
import {
  loanAccountApi,
  CombinedLoanAccountDTO,
} from "../../../services/accountMasters/loanaccount/loanaccountapi";

// ── Types ─────────────────────────────────────────────────────────────────────

const debitAccountTypeOptions = [
  { value: 3, label: "General (Cash)" },
  { value: 2, label: "Saving" },
];

const INT_NAMES: Record<number, string> = {
  1: "Standard Interest",
  2: "Penal Interest",
  3: "Std. Recoverable",
  4: "Overdue Recoverable",
};

interface LoanAccountOption {
  accId: number;
  accountName: string;
  loanAmountPassed: number;
}

interface IntAllocation {
  catId: number;
  catName: string;
  outstanding: number;
  recovering: number;
}

interface DebitRow {
  rowId: number;
  accountId: number;
  accountType: number;
  amount: number;
  narration: string;
  accountName: string;
  accountTypeName: string;
}

// ── Select styles (identical to loan advancement) ─────────────────────────────

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
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
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
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeAllocation(total: number, info: LoanRecoveryBalanceDTO): IntAllocation[] {
  const outstanding: Record<number, number> = {
    1: info.stdInterestOutstanding,
    2: info.penalInterestOutstanding,
    3: info.stdRecoverableOutstanding,
    4: info.overdueRecoverableOutstanding,
  };
  const seq = info.recoverySeq
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((v) => v >= 1 && v <= 4);

  let rem = total;
  const result: IntAllocation[] = [];
  const done = new Set<number>();

  for (const catId of seq) {
    const out = outstanding[catId] || 0;
    const rec = out > 0 ? Math.min(rem, out) : 0;
    result.push({ catId, catName: INT_NAMES[catId], outstanding: out, recovering: rec });
    rem -= rec;
    done.add(catId);
    if (rem <= 0) break;
  }
  for (const catId of [1, 2, 3, 4]) {
    if (!done.has(catId) && (outstanding[catId] || 0) > 0)
      result.push({ catId, catName: INT_NAMES[catId], outstanding: outstanding[catId], recovering: 0 });
  }
  return result;
}

const formatDate = (value?: string | null) => {
  if (!value) return undefined;
  return new Date(value)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    .replace(/ /g, "-");
};

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Component ─────────────────────────────────────────────────────────────────

const LoanRecovery: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("account-info");

  const [loanProducts, setLoanProducts] = useState<{ id: number; productName: string }[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccountOption[]>([]);
  const [loanAccountData, setLoanAccountData] = useState<CombinedLoanAccountDTO | null>(null);
  const [loanBalance, setLoanBalance] = useState<LoanRecoveryBalanceDTO | null>(null);
  const [guarantorNames, setGuarantorNames] = useState<Record<string, string>>({});
  const [kistSchedule, setKistSchedule] = useState<any[]>([]);

  const [debitRows, setDebitRows] = useState<DebitRow[]>([]);
  const [debitAccountsForRow, setDebitAccountsForRow] = useState<{ accId: number; accountName: string }[]>([]);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    voucherDate: sessionDate,
    loanProductId: 0,
    loanAccountId: 0,
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
  const [allocation, setAllocation] = useState<IntAllocation[]>([]);
  const [rowSavingBalance, setRowSavingBalance] = useState<number | null>(null);
  const [rowBalanceLoading, setRowBalanceLoading] = useState(false);

  useEffect(() => {
    commonservice.fetch_loan_products(user.branchid).then((res) => {
      if (res.success) setLoanProducts(res.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!loanBalance || loanBalance.actOnIntPosting === 1) { setAllocation([]); return; }
    const total = parseFloat(formData.totalAmount) || 0;
    setAllocation(total > 0 ? computeAllocation(total, loanBalance) : []);
  }, [formData.totalAmount, loanBalance]);

  const clearError = (key: string) =>
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });

  const resetAccountState = () => {
    setLoanAccountData(null);
    setLoanBalance(null);
    setGuarantorNames({});
    setDebitRows([]);
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setDebitAccountsForRow([]);
    setRowSavingBalance(null);
    setAllocation([]);
    setKistSchedule([]);
  };

  // ── Product change ────────────────────────────────────────────────────────────

  const handleProductChange = async (sel: any) => {
    const id = sel ? sel.value : 0;
    setFormData((p) => ({ ...p, loanProductId: id, loanAccountId: 0, totalAmount: "" }));
    setLoanAccounts([]);
    resetAccountState();
    clearError("loanProductId");
    if (id) {
      const res = await commonservice.fetch_loan_accounts_by_product(user.branchid, id, formData.voucherDate);
      if (res.success) setLoanAccounts(res.data ?? []);
    }
  };

  // ── Account change ────────────────────────────────────────────────────────────

  const handleAccountChange = async (sel: any) => {
    setFormData((p) => ({ ...p, loanAccountId: sel ? sel.value : 0, totalAmount: "" }));
    resetAccountState();
    if (!sel) return;
    clearError("loanAccountId");

    // Full account details + kist schedule (all in one call)
    const detRes = await loanAccountApi.getLoanAccountById(sel.value, user.branchid);
    if (detRes.success && detRes.data) {
      const data = detRes.data as CombinedLoanAccountDTO;
      setLoanAccountData(data);
      // Kist schedule is already embedded in the response
      setKistSchedule(data.kistSchedule ?? []);
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
          names[p.key] = d?.memberName
            ? `${d.memberName}${d.relativeName ? ` (${d.relativeName})` : ""}`
            : `Member #${p.memberId}`;
        });
        setGuarantorNames(names);
      }
    }

    // Balance (for outstanding + interest allocation)
    const balRes = await loanRecoveryApi.getBalance(sel.value, user.branchid);
    if (balRes.success && balRes.data) setLoanBalance(balRes.data);
  };

  // ── Debit row type change ─────────────────────────────────────────────────────

  const handleRowTypeChange = async (sel: any) => {
    const t = sel ? sel.value : null;
    setRowForm((p) => ({ ...p, accountType: t, accountId: null }));
    setDebitAccountsForRow([]);
    setRowSavingBalance(null);
    clearError("rowType");
    clearError("rowAccount");
    if (t) {
      const res = await commonservice.fetch_accounts_by_type(user.branchid, t);
      if (res.success) setDebitAccountsForRow(res.data ?? []);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────────

  const totalAmt = parseFloat(formData.totalAmount) || 0;
  const intTotal = allocation.reduce((s, a) => s + a.recovering, 0);
  const principalRec = Math.max(0, Math.min(totalAmt - intTotal, loanBalance?.principalBalance ?? 0));
  const totalDebited = debitRows.reduce((s, r) => s + r.amount, 0);
  const otherDebited =
    editingRowId !== null
      ? debitRows.filter((r) => r.rowId !== editingRowId).reduce((s, r) => s + r.amount, 0)
      : totalDebited;
  const pending = Math.max(0, totalAmt - otherDebited);

  // ── Debit row management ──────────────────────────────────────────────────────

  const handleAddRow = () => {
    const errs: Record<string, string> = {};
    if (!rowForm.accountType) errs.rowType = "Select account type";
    if (!rowForm.accountId) errs.rowAccount = "Select account";
    if (!rowForm.amount || Number(rowForm.amount) <= 0) errs.rowAmount = "Enter valid amount";
    else if (Number(rowForm.amount) > pending + 0.01)
      errs.rowAmount = `Exceeds available (${fmt(pending)})`;
    else if (rowForm.accountType === 2 && rowSavingBalance !== null && Number(rowForm.amount) > rowSavingBalance)
      errs.rowAmount = `Insufficient balance (Available: ₹${fmt(rowSavingBalance)})`;
    if (Object.keys(errs).length) { setErrors((p) => ({ ...p, ...errs })); return; }

    const accOpt = debitAccountsForRow.find((a) => a.accId === rowForm.accountId);
    const typeLabel = debitAccountTypeOptions.find((t) => t.value === rowForm.accountType)?.label ?? "";

    if (editingRowId !== null) {
      setDebitRows((p) =>
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
      setDebitRows((p) => [
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
    setDebitAccountsForRow([]);
    setRowSavingBalance(null);
    ["rowType", "rowAccount", "rowAmount", "debitItems"].forEach(clearError);
  };

  const handleEditRow = async (row: DebitRow) => {
    const res = await commonservice.fetch_accounts_by_type(user.branchid, row.accountType);
    if (res.success) setDebitAccountsForRow(res.data ?? []);
    setRowForm({ accountType: row.accountType, accountId: row.accountId, amount: row.amount.toFixed(2), narration: row.narration });
    setEditingRowId(row.rowId);
    ["rowType", "rowAccount", "rowAmount"].forEach(clearError);
  };

  const handleCancelRowEdit = () => {
    setEditingRowId(null);
    setRowForm({ accountType: null, accountId: null, amount: "", narration: "" });
    setDebitAccountsForRow([]);
    setRowSavingBalance(null);
    ["rowType", "rowAccount", "rowAmount"].forEach(clearError);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setFormData({ voucherDate: sessionDate, loanProductId: 0, loanAccountId: 0, totalAmount: "", narration: "" });
    setLoanAccounts([]);
    resetAccountState();
    setErrors({});
    setActiveTab("account-info");
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!formData.loanProductId) errs.loanProductId = "Select a loan product";
    if (!formData.loanAccountId) errs.loanAccountId = "Select a loan account";
    if (!formData.totalAmount || totalAmt <= 0)
      errs.totalAmount = "Enter a valid recovery amount";
    else if (loanBalance && totalAmt > loanBalance.totalOutstanding + 0.01)
      errs.totalAmount = `Cannot exceed outstanding balance (₹${fmt(loanBalance.totalOutstanding)})`;
    if (debitRows.length === 0)
      errs.debitItems = "Add at least one debit account entry";
    else if (Math.abs(totalDebited - totalAmt) > 0.01)
      errs.debitItems = `Debit total ₹${fmt(totalDebited)} must equal recovery amount ₹${fmt(totalAmt)}`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await loanRecoveryApi.addRecovery({
        brId: user.branchid,
        voucherDate: formData.voucherDate,
        loanAccountId: formData.loanAccountId,
        totalAmount: totalAmt,
        narration: formData.narration || undefined,
        debitItems: debitRows.map((r) => ({
          accountId: r.accountId,
          accountType: r.accountType,
          amount: r.amount,
          narration: r.narration || undefined,
        })),
      });
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.data?.message ?? "Loan recovery voucher saved successfully.",
          confirmButtonColor: "#3B82F6",
        });
        handleReset();
      } else {
        throw new Error(res.message || "Failed to save voucher");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error!", text: err.message || "Failed to save.", confirmButtonColor: "#EF4444" });
    } finally {
      setLoading(false);
    }
  };

  // ── Options ───────────────────────────────────────────────────────────────────

  const loanProductOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const loanAccountOptions = loanAccounts.map((a) => ({ value: a.accId, label: a.accountName }));
  const debitAccOptions = debitAccountsForRow.map((a) => ({ value: a.accId, label: a.accountName }));

  // ── Tabs ──────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: "account-info", label: "Account Information", icon: User },
    { id: "int-detail", label: "Interest Detail", icon: BarChart2 },
    { id: "inst-schedule", label: "Inst. Schedule", icon: Calendar },
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

  const InfoCard = ({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value?: string | number | null }) => (
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

  const noAccountSelected = (
    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <p className="text-sm text-gray-500">Please select a loan account to view information</p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "account-info":
        if (!loanAccountData) return noAccountSelected;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoCard icon={User} color="bg-blue-50 text-blue-600" label="Account Name" value={acc?.accountName} />
            <InfoCard icon={Users} color="bg-purple-50 text-purple-600" label="Relative Name" value={acc?.relativeName} />
            <InfoCard icon={CreditCard} color="bg-green-50 text-green-600" label="Account No" value={acc?.accountNumber} />
            <InfoCard icon={FileText} color="bg-orange-50 text-orange-600" label="Loan No" value={kist?.loanNo} />
            <InfoCard icon={DollarSign} color="bg-rose-50 text-rose-600" label="Total Outstanding" value={loanBalance ? `₹${fmt(loanBalance.totalOutstanding)}` : undefined} />
            <InfoCard icon={DollarSign} color="bg-emerald-50 text-emerald-600" label="Principal Balance" value={loanBalance ? `₹${fmt(loanBalance.principalBalance)}` : undefined} />
            <InfoCard icon={Calendar} color="bg-indigo-50 text-indigo-600" label="Loan Date" value={formatDate(kist?.loanDate)} />
            <InfoCard icon={Phone} color="bg-pink-50 text-pink-600" label="Phone No" value={acc?.phoneNo1} />
            <InfoCard icon={DollarSign} color="bg-yellow-50 text-yellow-600" label="Kist Amount" value={kist?.kistAmount != null ? `₹${fmt(Number(kist.kistAmount))}` : undefined} />
            <InfoCard icon={UserCheck} color="bg-violet-50 text-violet-600" label="Std. Interest Rate" value={kist?.standardInterestRate != null ? `${kist.standardInterestRate}%` : undefined} />
            <InfoCard icon={UserCheck} color="bg-orange-50 text-orange-600" label="Overdue Interest Rate" value={loanBalance?.overdueInterestRate != null ? `${loanBalance.overdueInterestRate}%` : undefined} />
            <InfoCard icon={MapPin} color="bg-cyan-50 text-cyan-600" label="Address" value={acc?.addressLine} />
          </div>
        );

      case "int-detail":
        if (!loanBalance)
          return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-sm text-gray-500">Select a loan account to view interest details</p>
            </div>
          );

        // AddInBalance: interest is embedded in the principal balance — no separate interest categories
        if (loanBalance.actOnIntPosting === 1) {
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  This is an <span className="font-bold">Add in Balance</span> type loan — interest is added directly
                  to the loan balance and is not tracked separately. The outstanding balance below includes all accrued interest.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Balance (₹)</th>
                      {totalAmt > 0 && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Recovering (₹)</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="bg-blue-50 font-semibold">
                      <td className="px-6 py-4 text-sm text-blue-800">Outstanding Balance (incl. interest)</td>
                      <td className="px-6 py-4 text-sm text-blue-700">₹{fmt(loanBalance.principalBalance)}</td>
                      {totalAmt > 0 && <td className="px-6 py-4 text-sm text-green-700">₹{fmt(totalAmt)}</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // Stand: show interest category breakdown + voucherrecintdetail ledger
        return (
          <div className="space-y-6">
            {/* Interest calculation metadata */}
            <div className="flex flex-wrap gap-4 text-xs bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-blue-700 font-medium">
                Type: <span className="font-bold">Stand</span>
              </span>
              <span className="text-blue-700 font-medium">
                Calc Method: <span className="font-bold">{loanBalance.intCalcMethod ?? "Schedule"}</span>
              </span>
              {loanBalance.interestCalcFromDate && (
                <span className="text-blue-700 font-medium">
                  Period: <span className="font-bold">{formatDate(loanBalance.interestCalcFromDate)}</span>
                  {" → "}
                  <span className="font-bold">{formatDate(loanBalance.interestCalcToDate)}</span>
                </span>
              )}
              {loanBalance.overdueInstallments > 0 && (
                <>
                  <span className="text-rose-700 font-medium">
                    Overdue Installments: <span className="font-bold">{loanBalance.overdueInstallments}</span>
                  </span>
                  <span className="text-rose-700 font-medium">
                    Overdue Principal: <span className="font-bold">₹{fmt(loanBalance.overduePrincipal)}</span>
                  </span>
                </>
              )}
            </div>

            {/* Outstanding interest categories */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Interest Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Outstanding (₹)</th>
                    {totalAmt > 0 && <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Recovering (₹)</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { catId: 1, label: "Standard Interest", desc: "Unposted accrued interest (auto-posts on recovery)", out: loanBalance.stdInterestOutstanding },
                    { catId: 2, label: "Penal Interest", desc: "Unposted overdue/penal interest (auto-posts on recovery)", out: loanBalance.penalInterestOutstanding },
                    { catId: 3, label: "Std. Recoverable", desc: "Formally posted interest awaiting recovery", out: loanBalance.stdRecoverableOutstanding },
                    { catId: 4, label: "Overdue Recoverable", desc: "Formally posted overdue principal amounts", out: loanBalance.overdueRecoverableOutstanding },
                  ].map(({ catId, label, desc, out }) => {
                    const rec = allocation.find((a) => a.catId === catId)?.recovering ?? 0;
                    return (
                      <tr key={catId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{label}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{desc}</td>
                        <td className="px-6 py-4 text-sm font-medium text-amber-700 text-right">₹{fmt(out)}</td>
                        {totalAmt > 0 && (
                          <td className={`px-6 py-4 text-sm font-semibold text-right ${rec > 0 ? "text-green-700" : "text-gray-400"}`}>
                            ₹{fmt(rec)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-amber-50 border-t-2 border-amber-200 font-semibold">
                    <td className="px-6 py-4 text-sm text-amber-800">Total Interest</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm text-amber-700 text-right">
                      ₹{fmt(loanBalance.stdInterestOutstanding + loanBalance.penalInterestOutstanding + loanBalance.stdRecoverableOutstanding + loanBalance.overdueRecoverableOutstanding)}
                    </td>
                    {totalAmt > 0 && <td className="px-6 py-4 text-sm text-green-700 text-right">₹{fmt(intTotal)}</td>}
                  </tr>
                  <tr className="bg-blue-50 border-t border-blue-200 font-semibold">
                    <td className="px-6 py-4 text-sm text-blue-800">Principal Balance</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm text-blue-700 text-right">₹{fmt(loanBalance.principalBalance)}</td>
                    {totalAmt > 0 && <td className="px-6 py-4 text-sm text-green-700 text-right">₹{fmt(principalRec)}</td>}
                  </tr>
                  <tr className="bg-green-50 border-t-2 border-green-200 font-bold">
                    <td className="px-6 py-4 text-sm text-green-800">Total Outstanding</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm text-green-700 text-right">₹{fmt(loanBalance.totalOutstanding)}</td>
                    {totalAmt > 0 && <td className="px-6 py-4 text-sm text-green-700 text-right">₹{fmt(totalAmt)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Interest ledger — voucherrecintdetail rows */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Interest Posting / Recovery Ledger</h3>
              {(loanBalance.intRecDetail ?? []).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <BarChart2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No interest entries yet — interest will appear here after posting or recovery</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <th className="px-4 py-3 text-center font-semibold w-10">#</th>
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Category</th>
                        <th className="px-4 py-3 text-right font-semibold">Int. Dr (Posted) ₹</th>
                        <th className="px-4 py-3 text-right font-semibold">Int. Cr (Recovered) ₹</th>
                        <th className="px-4 py-3 text-center font-semibold">Voucher No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(loanBalance.intRecDetail ?? []).map((row: IntRecDetailRowDTO, idx: number) => (
                        <tr
                          key={row.id}
                          className={`${idx % 2 === 0 ? "bg-blue-50" : "bg-white"} hover:bg-blue-100 transition-colors`}
                        >
                          <td className="px-4 py-2.5 text-center text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-2.5 text-gray-700">{formatDate(row.entryDate)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              row.intCatId === 1 ? "bg-blue-100 text-blue-700"
                              : row.intCatId === 2 ? "bg-orange-100 text-orange-700"
                              : row.intCatId === 3 ? "bg-purple-100 text-purple-700"
                              : "bg-red-100 text-red-700"
                            }`}>
                              {row.intCatName}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${row.intDr > 0 ? "text-rose-700" : "text-gray-400"}`}>
                            {row.intDr > 0 ? `₹${fmt(row.intDr)}` : "—"}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${row.intCr > 0 ? "text-green-700" : "text-gray-400"}`}>
                            {row.intCr > 0 ? `₹${fmt(row.intCr)}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600 font-mono">{row.voucherNo}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-sm">
                        <td colSpan={3} className="px-4 py-2.5 text-gray-700">Totals</td>
                        <td className="px-4 py-2.5 text-right text-rose-700">
                          ₹{fmt((loanBalance.intRecDetail ?? []).reduce((s: number, r: IntRecDetailRowDTO) => s + r.intDr, 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-700">
                          ₹{fmt((loanBalance.intRecDetail ?? []).reduce((s: number, r: IntRecDetailRowDTO) => s + r.intCr, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case "inst-schedule":
        if (!loanBalance) return noAccountSelected;
        return kistSchedule.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No instalment schedule available</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  {["Kist No.", "Date", "Kist Amount (₹)", "Principal (₹)", "Interest (₹)"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kistSchedule.map((k, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{k.kistNumber ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{k.date ? formatDate(k.date) : "—"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">₹{fmt(k.kistAmount ?? 0)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{fmt(k.principalAmt ?? 0)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{fmt(k.interestAmt ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "guar-detail":
        if (!loanAccountData) return noAccountSelected;
        return guarantor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guarantor.guar1MemId && <InfoCard icon={User} color="bg-blue-50 text-blue-600" label="Guarantor 1" value={guarantorNames.guar1 ?? "Loading..."} />}
            {guarantor.guar2MemId && <InfoCard icon={User} color="bg-purple-50 text-purple-600" label="Guarantor 2" value={guarantorNames.guar2 ?? "Loading..."} />}
            {guarantor.witness1MemId && <InfoCard icon={UserCheck} color="bg-green-50 text-green-600" label="Witness 1" value={guarantorNames.wit1 ?? "Loading..."} />}
            {guarantor.witness2MemId && <InfoCard icon={UserCheck} color="bg-orange-50 text-orange-600" label="Witness 2" value={guarantorNames.wit2 ?? "Loading..."} />}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-sm text-gray-500">No guarantor information found</p>
          </div>
        );

      case "fd-pledge":
        if (!loanAccountData) return noAccountSelected;
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
                {fdPledges.map((p: any, i: number) => (
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
        if (!loanAccountData) return noAccountSelected;
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
                {rdPledges.map((p: any, i: number) => (
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

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* ── Voucher Form Card ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                      <TrendingDown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Loan Recovery Voucher</h2>
                      <p className="text-sm text-gray-600">Enter recovery details below</p>
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

                {/* ── Cr Section — Loan Account ────────────────────────── */}
                <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50/30 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border-b border-green-200">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm">
                      Cr
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-green-700">Credit Account (Loan)</p>
                      <p className="text-xs text-green-600">Loan account being recovered</p>
                    </div>
                    {loanBalance && loanBalance.totalOutstanding > 0 && (
                      <div className="ml-auto flex gap-4 text-xs">
                        <span className="text-rose-700 font-semibold">
                          Outstanding: ₹{fmt(loanBalance.totalOutstanding)}
                        </span>
                        <span className="text-blue-700 font-semibold">
                          Principal: ₹{fmt(loanBalance.principalBalance)}
                        </span>
                      </div>
                    )}
                    {loanBalance && loanBalance.totalOutstanding <= 0 && (
                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                        Fully recovered — no outstanding
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* Date */}
                      <div>
                        <Label>Voucher Date</Label>
                        <input
                          type="text"
                          readOnly
                          value={formData.voucherDate}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-not-allowed"
                        />
                      </div>

                      {/* Product */}
                      <div>
                        <Label required>Loan Product</Label>
                        <Select
                          options={loanProductOptions}
                          value={loanProductOptions.find((o) => o.value === formData.loanProductId) ?? null}
                          onChange={handleProductChange}
                          placeholder="Select Loan Product"
                          isClearable
                          styles={selectStyles(!!errors.loanProductId)}
                        />
                        {errors.loanProductId && <p className="mt-1 text-xs text-red-600">{errors.loanProductId}</p>}
                      </div>

                      {/* Account */}
                      <div>
                        <Label required>Loan Account</Label>
                        <Select
                          options={loanAccountOptions}
                          value={loanAccountOptions.find((o) => o.value === formData.loanAccountId) ?? null}
                          onChange={handleAccountChange}
                          placeholder="Select Loan Account"
                          isClearable
                          isDisabled={!formData.loanProductId}
                          noOptionsMessage={() =>
                            !formData.loanProductId ? "Select a product first" : "No accounts found"
                          }
                          styles={selectStyles(!!errors.loanAccountId)}
                        />
                        {errors.loanAccountId && <p className="mt-1 text-xs text-red-600">{errors.loanAccountId}</p>}
                      </div>

                      {/* Recovery Amount */}
                      <div>
                        <Label required>
                          Recovery Amount
                          {loanBalance && (
                            <span className="ml-2 text-xs font-normal text-blue-600">
                              (Max: ₹{fmt(loanBalance.totalOutstanding)})
                            </span>
                          )}
                        </Label>
                        <input
                          type="text"
                          value={formData.totalAmount}
                          onChange={(e) => {
                            const v = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/^(\d*\.?\d{0,2}).*$/, "$1");
                            setFormData((p) => ({ ...p, totalAmount: v }));
                            setDebitRows([]);
                            clearError("totalAmount");
                            clearError("debitItems");
                          }}
                          disabled={!formData.loanAccountId || (loanBalance?.totalOutstanding ?? 0) <= 0}
                          placeholder="0.00"
                          className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all ${
                            errors.totalAmount
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                        />
                        {errors.totalAmount && <p className="mt-1 text-xs text-red-600">{errors.totalAmount}</p>}
                      </div>
                    </div>

                    {/* Narration + allocation summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      {totalAmt > 0 && loanBalance && (
                        <div className="flex flex-wrap items-center gap-3 pt-6">
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                            {loanBalance.actOnIntPosting === 1 ? "Recovery" : "Principal"}: ₹{fmt(loanBalance.actOnIntPosting === 1 ? totalAmt : principalRec)}
                          </span>
                          {loanBalance.actOnIntPosting !== 1 && intTotal > 0 && (
                            <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                              Interest: ₹{fmt(intTotal)}
                            </span>
                          )}
                          <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                            Total: ₹{fmt(totalAmt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Dr Section — Debit Accounts ─────────────────────── */}
                <div className="mb-6 rounded-xl border-2 border-rose-200 bg-rose-50/30 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-rose-50 border-b border-rose-200">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white text-xs font-bold shadow-sm">
                      Dr
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-rose-700">
                        Debit Accounts <span className="text-red-500">*</span>
                      </p>
                      <p className="text-xs text-rose-500">Accounts providing the recovery amount (Cash / Saving)</p>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Row form */}
                    <div className={`bg-white border rounded-lg p-4 mb-3 ${editingRowId !== null ? "border-amber-300 ring-1 ring-amber-200" : "border-rose-200"}`}>
                      {editingRowId !== null && (
                        <p className="text-xs font-semibold text-amber-600 mb-3 flex items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Editing row — modify fields and click Update, or click ✕ to cancel
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label required>Account Type</Label>
                          <Select
                            options={debitAccountTypeOptions}
                            value={debitAccountTypeOptions.find((o) => o.value === rowForm.accountType) ?? null}
                            onChange={handleRowTypeChange}
                            placeholder="Type"
                            isClearable
                            isDisabled={!formData.loanAccountId || totalAmt <= 0}
                            styles={compactSelectStyles(!!errors.rowType)}
                          />
                          {errors.rowType && <p className="mt-1 text-xs text-red-600">{errors.rowType}</p>}
                        </div>

                        <div>
                          <Label required>Account</Label>
                          <Select
                            options={debitAccOptions}
                            value={debitAccOptions.find((o) => o.value === rowForm.accountId) ?? null}
                            onChange={(s) => {
                              const accId = s ? s.value : null;
                              setRowForm((p) => ({ ...p, accountId: accId }));
                              clearError("rowAccount");
                              if (accId && rowForm.accountType === 2) {
                                setRowBalanceLoading(true);
                                setRowSavingBalance(null);
                                commonservice.get_account_balance(user.branchid, accId)
                                  .then((res) => setRowSavingBalance(res?.data ?? null))
                                  .catch(() => setRowSavingBalance(null))
                                  .finally(() => setRowBalanceLoading(false));
                              } else {
                                setRowSavingBalance(null);
                              }
                            }}
                            placeholder="Account"
                            isClearable
                            isDisabled={!rowForm.accountType}
                            noOptionsMessage={() =>
                              !rowForm.accountType ? "Select type first" : "No accounts"
                            }
                            styles={compactSelectStyles(!!errors.rowAccount)}
                          />
                          {errors.rowAccount && <p className="mt-1 text-xs text-red-600">{errors.rowAccount}</p>}
                        </div>

                        <div>
                          <Label required>
                            Amount
                            {pending > 0 && (
                              <span className="ml-1 text-xs font-normal text-orange-500">
                                (Pending: ₹{fmt(pending)})
                              </span>
                            )}
                          </Label>
                          <input
                            type="text"
                            value={rowForm.amount}
                            onChange={(e) => {
                              setRowForm((p) => ({
                                ...p,
                                amount: e.target.value
                                  .replace(/[^0-9.]/g, "")
                                  .replace(/^(\d*\.?\d{0,2}).*$/, "$1"),
                              }));
                              clearError("rowAmount");
                            }}
                            placeholder="0.00"
                            className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none transition-all text-sm ${
                              errors.rowAmount
                                ? "border-red-400"
                                : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            }`}
                          />
                          {errors.rowAmount && <p className="mt-1 text-xs text-red-600">{errors.rowAmount}</p>}
                          {rowForm.accountType === 2 && (
                            <p className={`mt-1 text-xs font-medium ${rowBalanceLoading ? "text-gray-400" : rowSavingBalance !== null && Number(rowForm.amount) > rowSavingBalance ? "text-red-500" : "text-emerald-600"}`}>
                              {rowBalanceLoading
                                ? "Fetching balance..."
                                : rowSavingBalance !== null
                                ? `Balance: ₹${fmt(rowSavingBalance)}${Number(rowForm.amount) > rowSavingBalance ? " — Insufficient" : ""}`
                                : rowForm.accountId ? "Balance unavailable" : ""}
                            </p>
                          )}
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
                                  <Pencil className="w-4 h-4" /> Update
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
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="w-4 h-4" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {errors.debitItems && <p className="mb-2 text-sm text-red-600">{errors.debitItems}</p>}

                    {/* Debit table */}
                    <div className="overflow-x-auto rounded-lg border border-rose-200">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-200">
                          <tr>
                            {["#", "Account Type", "Account", "Amount (Dr)", "Narration", "Action"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-rose-800 uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {debitRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                                No debit accounts added yet. Use the form above to add.
                              </td>
                            </tr>
                          ) : (
                            debitRows.map((row, idx) => {
                              const isEditing = editingRowId === row.rowId;
                              return (
                                <tr
                                  key={row.rowId}
                                  className={`transition-colors ${isEditing ? "bg-amber-50 border-l-4 border-amber-400" : "hover:bg-rose-50"}`}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isEditing ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                      {row.accountTypeName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.accountName}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-rose-700">₹{row.amount.toFixed(2)}</td>
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
                                            title="Edit"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (editingRowId !== null) return;
                                              setDebitRows((p) => p.filter((r) => r.rowId !== row.rowId));
                                            }}
                                            disabled={editingRowId !== null}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="Delete"
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
                          {debitRows.length > 0 && (
                            <tr className="bg-rose-50 border-t-2 border-rose-200">
                              <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-rose-800">
                                Total Debited (Dr)
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-rose-700">
                                ₹{totalDebited.toFixed(2)}
                              </td>
                              <td colSpan={2} className="px-4 py-3 text-xs text-right pr-4">
                                {Math.abs(totalDebited - totalAmt) <= 0.01 ? (
                                  <span className="text-green-600 font-medium">Fully allocated</span>
                                ) : totalAmt - totalDebited > 0.01 ? (
                                  <span className="text-orange-600 font-medium">
                                    Pending: ₹{fmt(totalAmt - totalDebited)}
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
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Recovery
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

export default LoanRecovery;
