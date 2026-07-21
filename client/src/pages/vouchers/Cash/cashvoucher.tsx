import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Wallet,
  FileText,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Banknote,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import cashVoucherApi, {
  CashPaymentReceiptDTO,
} from "../../../services/vouchers/cash/cashVoucherApi";
import { getFirstSessionFromDate } from "../../../utils/session";
import { VoucherPreview } from "../../../services/vouchers/voucherOperationsApi";
import { Pencil, X } from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

interface AccountOption {
  accId: number;
  accountName: string;
}

interface GridEntry {
  id: string;
  accountType: number;
  accountId: number;
  accountName: string;
  amount: string;
  entryType: "Cr" | "Dr";
  balance: string | null;
  balanceLoading: boolean;
  accounts: AccountOption[];
  accountsLoading: boolean;
}

const ACCOUNT_TYPES = [
  { value: 2, label: "Saving Account" },
  { value: 3, label: "General Account" },
  { value: 4, label: "Share Money Account" },
  { value: 5, label: "Recurring Deposit (RD)" },
];

const ENTRY_TYPES = [
  { value: "Cr" as const, label: "Credit (Cr)" },
  { value: "Dr" as const, label: "Debit (Dr)" },
];

const SELECT_STYLES = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "48px",
    borderWidth: "2px",
    borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    "&:hover": { borderColor: "#3b82f6" },
  }),
};

const SELECT_STYLES_COMPACT = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "42px",
    borderWidth: "2px",
    borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "13px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    "&:hover": { borderColor: "#3b82f6" },
  }),
};

function newEntry(): GridEntry {
  return {
    id: crypto.randomUUID(),
    accountType: 0,
    accountId: 0,
    accountName: "",
    amount: "",
    entryType: "Cr",
    balance: null,
    balanceLoading: false,
    accounts: [],
    accountsLoading: false,
  };
}

// ─── component ────────────────────────────────────────────────────────────────

const CashPaymentReceiptVoucher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  const isFirstSession =
    user.isFirstSession === true || user.isFirstSession === "True";
  const firstSessionFromDate = getFirstSessionFromDate(user);
  const isDateDisabled =
    !isFirstSession &&
    (!firstSessionFromDate || sessionDate >= firstSessionFromDate);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editVoucherId, setEditVoucherId] = useState<number | null>(null);

  const [formReady, setFormReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cashAccountId, setCashAccountId] = useState(0);
  const [cashAccountName, setCashAccountName] = useState("");

  const [voucherDate, setVoucherDate] = useState(sessionDate);
  const [narration, setNarration] = useState("");
  const [entries, setEntries] = useState<GridEntry[]>([newEntry()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── computed ────────────────────────────────────────────────────────────────

  const totalCr = entries.reduce(
    (s, e) => (e.entryType === "Cr" ? s + parseFloat(e.amount || "0") : s),
    0
  );
  const totalDr = entries.reduce(
    (s, e) => (e.entryType === "Dr" ? s + parseFloat(e.amount || "0") : s),
    0
  );
  const netCash = totalCr - totalDr;
  const cashAmount = Math.abs(netCash);
  const cashEntryType: "Cr" | "Dr" = netCash > 0 ? "Dr" : "Cr";

  // ─── init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const res = await commonservice.default_cash_in_hand_account(
          user.branchid
        );
        const accId = Number(res?.data);
        if (!accId || accId <= 0) {
          await Swal.fire({
            icon: "error",
            title: "Cash Account Not Configured",
            text: "Please configure the default cash-in-hand account in Settings before using this voucher.",
            confirmButtonColor: "#EF4444",
          });
          navigate(-1);
          return;
        }
        setCashAccountId(accId);

        const masterRes = await commonservice.general_accmasters_info(
          user.branchid
        );
        const allGeneral: AccountOption[] = masterRes.data || [];
        const found = allGeneral.find((a) => a.accId === accId);
        setCashAccountName(found?.accountName || `Account #${accId}`);

        setFormReady(true);
      } catch {
        Swal.fire("Error", "Failed to load voucher configuration.", "error");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.branchid]);

  // ─── edit mode: restore from VoucherPreview ───────────────────────────────────

  useEffect(() => {
    const editVoucher = (location.state as any)?.editVoucher as VoucherPreview | undefined;
    if (!editVoucher) return;

    setIsEditMode(true);
    setEditVoucherId(editVoucher.voucherId);
    setVoucherDate(editVoucher.voucherDate.split("T")[0]);
    setNarration(editVoucher.narration ?? "");

    // Split entries: user entries (non-cash) vs cash entry
    // cashAccountId may not be set yet in this effect; we use a closure trick via
    // a local variable that will be resolved once the init effect has run.
    // We store the raw preview entries and resolve them once cashAccountId is known.
    (async () => {
      // Fetch cash account so we can exclude it from the grid
      const res = await commonservice.default_cash_in_hand_account(user.branchid);
      const cashId = Number(res?.data);

      const userEntries = editVoucher.entries.filter(
        (e) => e.accountId !== cashId
      );

      const restored: GridEntry[] = await Promise.all(
        userEntries.map(async (e) => {
          let accounts: AccountOption[] = [];
          try {
            const accRes = await commonservice.accounts_by_type(
              user.branchid,
              e.accountType
            );
            accounts = accRes.data || [];
          } catch { /* keep empty */ }

          return {
            id: crypto.randomUUID(),
            accountType: e.accountType,
            accountId: e.accountId,
            accountName: e.accountName,
            amount: e.amount.toFixed(2),
            entryType: e.entryType as "Cr" | "Dr",
            balance: null,
            balanceLoading: false,
            accounts,
            accountsLoading: false,
          };
        })
      );

      setEntries(restored.length > 0 ? restored : [newEntry()]);
    })();
  }, []);

  // ─── entry helpers ────────────────────────────────────────────────────────────

  const updateEntry = useCallback(
    (id: string, patch: Partial<GridEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const loadAccounts = useCallback(
    async (id: string, accountType: number) => {
      updateEntry(id, {
        accountsLoading: true,
        accounts: [],
        accountId: 0,
        accountName: "",
        balance: null,
      });
      try {
        const res = await commonservice.accounts_by_type(
          user.branchid,
          accountType
        );
        updateEntry(id, { accounts: res.data || [], accountsLoading: false });
      } catch {
        updateEntry(id, { accountsLoading: false });
      }
    },
    [user.branchid, updateEntry]
  );

  const fetchBalance = useCallback(
    async (id: string, accountId: number, accountType: number) => {
      if (![2, 4, 5].includes(accountType)) {
        updateEntry(id, { balance: null });
        return;
      }
      updateEntry(id, { balanceLoading: true, balance: null });
      try {
        const res = await commonservice.get_account_balance(user.branchid, accountId);
        const bal = res?.data;
        updateEntry(id, {
          balance: bal != null ? String(bal) : "error",
          balanceLoading: false,
        });
      } catch {
        updateEntry(id, { balance: "error", balanceLoading: false });
      }
    },
    [user.branchid, updateEntry]
  );

  const handleAccountTypeChange = (id: string, type: number) => {
    updateEntry(id, {
      accountType: type,
      accountId: 0,
      accountName: "",
      balance: null,
      accounts: [],
    });
    if (type > 0) loadAccounts(id, type);
    clearError(`acc_type_${id}`);
    clearError(`acc_id_${id}`);
  };

  const handleAccountChange = (
    id: string,
    accId: number,
    accountType: number,
    entryType: "Cr" | "Dr"
  ) => {
    const isDuplicate = entries.some(
      (e) => e.id !== id && e.accountId === accId && accId > 0
    );
    if (isDuplicate) {
      Swal.fire({
        icon: "warning",
        title: "Duplicate Account",
        text: "This account is already added. Duplicate entries are not allowed.",
        confirmButtonColor: "#3B82F6",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }
    updateEntry(id, { accountId: accId, balance: null });
    if (accId > 0 && [2, 4, 5].includes(accountType)) fetchBalance(id, accId, accountType);
    clearError(`acc_id_${id}`);
  };

  const handleEntryTypeChange = (
    id: string,
    type: "Cr" | "Dr",
    accountId: number,
    accountType: number
  ) => {
    // Keep existing balance — just update the direction; re-fetch only if not yet loaded
    updateEntry(id, { entryType: type });
    if (accountId > 0 && [2, 4, 5].includes(accountType)) {
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id);
        if (entry && entry.balance === null && !entry.balanceLoading) fetchBalance(id, accountId, accountType);
        return prev;
      });
    }
  };

  const handleAmountChange = (id: string, value: string) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      updateEntry(id, { amount: value });
      clearError(`amt_${id}`);
    }
  };

  const addEntry = () => setEntries((prev) => [...prev, newEntry()]);

  const removeEntry = (id: string) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clearError = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  // ─── validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!voucherDate) errs.voucherDate = "Voucher date is required.";

    entries.forEach((e) => {
      if (!e.accountType) errs[`acc_type_${e.id}`] = "Select account type.";
      if (!e.accountId) errs[`acc_id_${e.id}`] = "Select account.";
      if (!e.amount || parseFloat(e.amount) <= 0)
        errs[`amt_${e.id}`] = "Enter a valid amount.";

      if (
        e.entryType === "Dr" &&
        [2, 4, 5].includes(e.accountType) &&
        e.balance !== null && e.balance !== "error"
      ) {
        const bal = parseFloat(e.balance);
        const amt = parseFloat(e.amount || "0");
        if (!isNaN(bal) && !isNaN(amt) && amt > bal)
          errs[`amt_${e.id}`] = `Insufficient balance. Available: ₹${bal.toFixed(2)}`;
      }
    });

    if (netCash === 0 && entries.some((e) => parseFloat(e.amount || "0") > 0))
      errs.netCash =
        "Total credits equal total debits — net cash is zero. Voucher cannot be saved.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── submit ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    const dto: CashPaymentReceiptDTO = {
      brID: user.branchid,
      voucherDate,
      voucherNarration: narration || "Cash Payment/Receipt",
      cashAccountId,
      entries: entries.map((e) => ({
        accountId: e.accountId,
        accountType: e.accountType,
        entryType: e.entryType,
        amount: parseFloat(e.amount),
      })),
    };

    setSaving(true);
    try {
      const res = isEditMode && editVoucherId
        ? await cashVoucherApi.updateCashVoucher(editVoucherId, dto)
        : await cashVoucherApi.addCashVoucher(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: isEditMode ? "Updated!" : "Success!",
          text: res.message || (isEditMode ? "Cash voucher updated successfully." : "Cash voucher saved successfully."),
          confirmButtonColor: "#3B82F6",
        });
        if (isEditMode) {
          navigate("/voucher-search");
        } else {
          handleReset();
        }
      } else {
        throw new Error(res.message || "Failed to save voucher.");
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to save voucher. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setVoucherDate(sessionDate);
    setNarration("");
    setEntries([newEntry()]);
    setErrors({});
  };

  // ─── render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout
        mainContent={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        }
      />
    );
  }

  if (!formReady) return null;

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* ── Header ── */}
              <div className={`bg-gradient-to-r ${isEditMode ? "from-amber-50 to-orange-50" : "from-blue-50 to-indigo-50"} border-b border-gray-200 px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${isEditMode ? "from-amber-500 to-orange-500" : "from-blue-600 to-indigo-600"} rounded-lg flex items-center justify-center shadow-md`}>
                      {isEditMode ? <Pencil className="w-5 h-5 text-white" /> : <Banknote className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-800">
                          Cash Payment / Receipt Voucher
                        </h2>
                        {isEditMode && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs font-semibold">
                            Edit Mode
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {isEditMode ? "Modify transaction details below" : "Enter transaction details below"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(isEditMode ? "/voucher-search" : "/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {isEditMode ? "Back to Search" : "Back to Operations"}
                  </button>
                </div>
              </div>

              {/* ── Form Body ── */}
              <div className="p-6 space-y-6">

                {/* Row 1 – Date / Cash Account / Narration */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Voucher Date */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Voucher Date
                      <span className="text-red-500 text-xs ml-1">*</span>
                    </label>
                    <input
                      type={isDateDisabled ? "text" : "date"}
                      value={voucherDate}
                      max={isDateDisabled ? undefined : sessionDate}
                      readOnly={isDateDisabled}
                      onChange={(e) => {
                        setVoucherDate(e.target.value);
                        clearError("voucherDate");
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition-all duration-200 ${
                        errors.voucherDate
                          ? "border-red-300 bg-red-50"
                          : isDateDisabled
                          ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      }`}
                    />
                    {errors.voucherDate && (
                      <p className="text-red-600 text-sm flex items-center gap-1 bg-red-50 p-2 rounded border border-red-200 mt-1">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        {errors.voucherDate}
                      </p>
                    )}
                  </div>

                  {/* Cash Account (read-only info) */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Wallet className="w-4 h-4 text-teal-600" />
                      Cash Account
                    </label>
                    <div className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-100 rounded-lg text-gray-700 text-sm font-medium cursor-not-allowed select-none">
                      {cashAccountName}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Configured in Settings
                    </p>
                  </div>

                  {/* Narration */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Narration
                    </label>
                    <input
                      type="text"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      placeholder="Enter narration (optional)"
                      maxLength={200}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* ── Entries ── */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-gray-800">
                        Transaction Entries
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={addEntry}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Add Entry
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="hidden lg:grid grid-cols-[1fr_1.5fr_1fr_1fr_40px] gap-3 px-1 mb-1">
                    {["Account Type", "Account", "Amount (₹)", "Type", ""].map(
                      (h) => (
                        <span
                          key={h}
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                        >
                          {h}
                        </span>
                      )
                    )}
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        idx={idx}
                        errors={errors}
                        onAccountTypeChange={handleAccountTypeChange}
                        onAccountChange={handleAccountChange}
                        onEntryTypeChange={handleEntryTypeChange}
                        onAmountChange={handleAmountChange}
                        onRemove={removeEntry}
                        canRemove={entries.length > 1}
                      />
                    ))}
                  </div>
                </div>

                {/* ── Cash Summary ── */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-800">
                      Cash Account Summary
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Cr */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Total Credits (entries)
                      </p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <p className="text-xl font-bold text-green-700">
                          ₹{totalCr.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Total Dr */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Total Debits (entries)
                      </p>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <p className="text-xl font-bold text-red-700">
                          ₹{totalDr.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Net cash */}
                    <div
                      className={`border-2 rounded-lg p-4 ${
                        netCash === 0
                          ? "bg-yellow-50 border-yellow-300"
                          : cashEntryType === "Dr"
                          ? "bg-red-50 border-red-300"
                          : "bg-green-50 border-green-300"
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Cash ({cashAccountName})
                      </p>
                      <div className="flex items-center gap-1">
                        {netCash === 0 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        ) : cashEntryType === "Dr" ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        )}
                        <p
                          className={`text-xl font-bold ${
                            netCash === 0
                              ? "text-yellow-700"
                              : cashEntryType === "Dr"
                              ? "text-red-700"
                              : "text-green-700"
                          }`}
                        >
                          ₹{cashAmount.toFixed(2)}
                        </p>
                        <span
                          className={`text-sm font-semibold ml-1 ${
                            netCash === 0
                              ? "text-yellow-600"
                              : cashEntryType === "Dr"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {netCash !== 0 && cashEntryType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {netCash === 0
                          ? "Balanced — cannot save"
                          : cashEntryType === "Dr"
                          ? "Cash goes out"
                          : "Cash comes in"}
                      </p>
                    </div>
                  </div>

                  {errors.netCash && (
                    <p className="text-red-600 text-sm flex items-center gap-1 bg-red-50 p-2 rounded border border-red-200 mt-3">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      {errors.netCash}
                    </p>
                  )}
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={isEditMode ? () => navigate("/voucher-search") : handleReset}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                  >
                    {isEditMode ? <X className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    {isEditMode ? "Cancel" : "Reset"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r ${isEditMode ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"} rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode ? "Update Voucher" : "Save Voucher"}
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

// ─── Entry Row ────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: GridEntry;
  idx: number;
  errors: Record<string, string>;
  onAccountTypeChange: (id: string, type: number) => void;
  onAccountChange: (id: string, accId: number, accountType: number, entryType: "Cr" | "Dr") => void;
  onEntryTypeChange: (id: string, type: "Cr" | "Dr", accountId: number, accountType: number) => void;
  onAmountChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const EntryRow: React.FC<EntryRowProps> = ({
  entry,
  idx,
  errors,
  onAccountTypeChange,
  onAccountChange,
  onEntryTypeChange,
  onAmountChange,
  onRemove,
  canRemove,
}) => {
  const accountOptions = entry.accounts.map((a) => ({
    value: a.accId,
    label: a.accountName,
  }));

  const selectedAccType =
    ACCOUNT_TYPES.find((t) => t.value === entry.accountType) ?? null;

  const selectedAccount =
    accountOptions.find((o) => o.value === entry.accountId) ?? null;

  const selectedEntryType =
    ENTRY_TYPES.find((t) => t.value === entry.entryType) ?? ENTRY_TYPES[0];

  const hasAccTypeErr = !!errors[`acc_type_${entry.id}`];
  const hasAccIdErr = !!errors[`acc_id_${entry.id}`];
  const hasAmtErr = !!errors[`amt_${entry.id}`];

  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
      <div className="flex items-start gap-3">
        {/* Row number */}
        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-2.5">
          {idx + 1}
        </div>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr_1fr] gap-3">
          {/* Account Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 lg:hidden">
              Account Type
            </label>
            <Select
              options={ACCOUNT_TYPES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
              value={selectedAccType ? { value: selectedAccType.value, label: selectedAccType.label } : null}
              onChange={(sel) => sel && onAccountTypeChange(entry.id, sel.value)}
              placeholder="Select type..."
              styles={{ 
                control: (base, state) => ({
                  ...base,
                  minHeight: "42px",
                  borderWidth: "2px",
                  borderColor: hasAccTypeErr
                    ? "#fca5a5"
                    : state.isFocused
                    ? "#3b82f6"
                    : "#e5e7eb",
                  borderRadius: "0.5rem",
                  fontSize: "13px",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59,130,246,0.2)"
                    : "none",
                  "&:hover": { borderColor: "#3b82f6" },
                }),
              }}
            />
            {hasAccTypeErr && (
              <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                <AlertCircle size={11} />
                {errors[`acc_type_${entry.id}`]}
              </p>
            )}
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 lg:hidden">
              Account
            </label>
            <Select
              options={accountOptions}
              value={selectedAccount}
              onChange={(sel) =>
                sel &&
                onAccountChange(entry.id, sel.value, entry.accountType, entry.entryType)
              }
              isLoading={entry.accountsLoading}
              isDisabled={!entry.accountType || entry.accountsLoading}
              placeholder={
                !entry.accountType
                  ? "Select type first"
                  : entry.accountsLoading
                  ? "Loading..."
                  : "Select account..."
              }
              noOptionsMessage={() => "No accounts found"}
              styles={{ 
                control: (base, state) => ({
                  ...base,
                  minHeight: "42px",
                  borderWidth: "2px",
                  borderColor: hasAccIdErr
                    ? "#fca5a5"
                    : state.isFocused
                    ? "#3b82f6"
                    : "#e5e7eb",
                  borderRadius: "0.5rem",
                  fontSize: "13px",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59,130,246,0.2)"
                    : "none",
                  "&:hover": { borderColor: "#3b82f6" },
                }),
              }}
            />
            {hasAccIdErr && (
              <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                <AlertCircle size={11} />
                {errors[`acc_id_${entry.id}`]}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 lg:hidden">
              Amount (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                inputMode="decimal"
                value={entry.amount}
                onChange={(e) => onAmountChange(entry.id, e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2.5 border-2 rounded-lg outline-none text-sm transition-all duration-200 ${
                  hasAmtErr
                    ? "border-red-300 bg-red-50 focus:border-red-400"
                    : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
              />
            </div>
            {hasAmtErr && (
              <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                <AlertCircle size={11} />
                {errors[`amt_${entry.id}`]}
              </p>
            )}
            {[2, 4, 5].includes(entry.accountType) && (
              <p className="text-xs mt-0.5">
                {entry.balanceLoading ? (
                  <span className="text-gray-400">Fetching balance...</span>
                ) : entry.balance === "error" ? (
                  <span className="text-orange-500">Balance unavailable</span>
                ) : entry.balance !== null ? (
                  (() => {
                    const bal = parseFloat(entry.balance);
                    const amt = parseFloat(entry.amount || "0");
                    const isInsufficient = entry.entryType === "Dr" && !isNaN(amt) && amt > bal;
                    return (
                      <span className={isInsufficient ? "text-red-600 font-semibold" : "text-blue-600 font-semibold"}>
                        Bal: ₹{bal.toFixed(2)}{isInsufficient ? " — Insufficient" : ""}
                      </span>
                    );
                  })()
                ) : null}
              </p>
            )}
          </div>

          {/* Entry Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 lg:hidden">
              Type
            </label>
            <Select
              options={ENTRY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={{ value: selectedEntryType.value, label: selectedEntryType.label }}
              onChange={(sel) =>
                sel &&
                onEntryTypeChange(
                  entry.id,
                  sel.value,
                  entry.accountId,
                  entry.accountType
                )
              }
              styles={{ 
                control: (base, state) => ({
                  ...base,
                  minHeight: "42px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  fontSize: "13px",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59,130,246,0.2)"
                    : "none",
                  "&:hover": { borderColor: "#3b82f6" },
                }),
                singleValue: (base) => ({
                  ...base,
                  color: entry.entryType === "Cr" ? "#16a34a" : "#dc2626",
                  fontWeight: 700,
                }),
              }}
            />
          </div>
        </div>

        {/* Remove */}
        {canRemove && (
          <button
            onClick={() => onRemove(entry.id)}
            className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors mt-2"
            title="Remove entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CashPaymentReceiptVoucher;
