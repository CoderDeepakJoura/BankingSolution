import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { Plus, Trash2, Pencil, ArrowLeft, Save, RotateCcw, Landmark, Receipt } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DatePicker from "../../components/DatePicker";
import bankFDAccountApi, { BankFDDetailItemDTO } from "../../services/bankfd/bankFDAccountApi";
import commonservice from "../../services/common/commonservice";
import { decryptId } from "../../utils/encryption";
import { canEnterOpeningBalance } from "../../utils/session";

// ─── Option types ─────────────────────────────────────────────
interface SelectOption {
  value: number;
  label: string;
}

const compoundingOptions: SelectOption[] = [
  { value: 12, label: "Monthly" },
  { value: 4, label: "Quarterly" },
  { value: 2, label: "Half-Yearly" },
  { value: 1, label: "Yearly" },
  { value: 0, label: "No Compounding" },
];

const fdStatusOptions: SelectOption[] = [
  { value: 1, label: "Active" },
  { value: 2, label: "Matured" },
  { value: 3, label: "Pre-Matured" },
  { value: 4, label: "Renewed" },
];

// ─── Detail row state ─────────────────────────────────────────
interface DetailRow extends BankFDDetailItemDTO {
  rowKey: number;
}

interface VoucherEntry {
  creditAccountId: number;
  amount: number;
  narration: string;
}

const emptyDetail = (key: number): DetailRow => ({
  rowKey: key,
  id: 0,
  ltdNo: "",
  fdDate: "",
  fdAmount: 0,
  fdPeriodMonths: 0,
  fdPeriodDays: 0,
  intRate: 0,
  intCompInterval: 4,
  fdMaturityDate: "",
  maturityAmount: 0,
  fdStatus: 1,
  serialNo: undefined,
  openingBalance: 0,
  openingBalanceType: "Cr",
  openingBalanceHeadId: undefined,
  openingTDS: 0,
  openingTDSHeadId: undefined,
});

// ─── Calculations ─────────────────────────────────────────────
const calcMaturityDate = (fdDate: string, months: number, days: number): string => {
  if (!fdDate) return "";
  const d = new Date(fdDate);
  d.setMonth(d.getMonth() + (months || 0));
  d.setDate(d.getDate() + (days || 0));
  return d.toISOString().split("T")[0];
};

const calcMaturityAmount = (
  principal: number,
  rate: number,
  compInterval: number,
  fdDate: string,
  maturityDate: string
): number => {
  if (!principal || !rate || !fdDate || !maturityDate) return 0;
  const start = new Date(fdDate);
  const end = new Date(maturityDate);
  const actualDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const t = actualDays / 365;
  if (compInterval === 0) {
    return Math.round(principal * (1 + (rate / 100) * t));
  }
  const n = compInterval;
  return Math.round(principal * Math.pow(1 + rate / 100 / n, n * t));
};

// ─── Main component ───────────────────────────────────────────
const BankFDAccountForm: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const { accountId: encryptedAccountId } = useParams<{ accountId: string }>();
  const workingDate = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();

  const isEditMode = !!encryptedAccountId;
  const editAccId = isEditMode ? decryptId(encryptedAccountId!) : null;

  // Account-level fields
  const [accountName, setAccountName] = useState("");
  const [openingDate, setOpeningDate] = useState(commonservice.getTodaysDate());
  const [accPrefix, setAccPrefix] = useState("BFD");
  const [accSuffix, setAccSuffix] = useState<number | null>(null);
  const [accSuffixInput, setAccSuffixInput] = useState("");   // editable text
  const [suffixError, setSuffixError] = useState("");
  const [lastAccNo, setLastAccNo] = useState("");
  const [savedAccNo, setSavedAccNo] = useState("");   // edit mode: original account number

  // Detail rows in the grid
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [rowCounter, setRowCounter] = useState(1);

  // Detail entry form state
  const [editingRowKey, setEditingRowKey] = useState<number | null>(null);
  const [entry, setEntry] = useState<DetailRow>(emptyDetail(0));

  // Account head selection
  const [accountHeadId, setAccountHeadId] = useState<number>(0);

  // Dropdown data
  const [accountHeads, setAccountHeads] = useState<SelectOption[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<SelectOption[]>([]);

  // Voucher section (non-opening entry, create mode only)
  const [voucherEntries, setVoucherEntries] = useState<VoucherEntry[]>([]);
  const [vEntryAccId, setVEntryAccId] = useState<number>(0);
  const [vEntryAmount, setVEntryAmount] = useState<string>("");
  const [vEntryNarration, setVEntryNarration] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  const isOpeningEntry = canEnterOpeningBalance(user, openingDate);

  const resetForm = () => {
    setAccountName("");
    setOpeningDate(commonservice.getTodaysDate());
    setAccPrefix("BFD");
    setAccSuffix(null);
    setAccSuffixInput("");
    setSuffixError("");
    setAccountHeadId(0);
    setDetails([]);
    setRowCounter(1);
    setEditingRowKey(null);
    setEntry(emptyDetail(0));
    setVoucherEntries([]);
    setVEntryAccId(0);
    setVEntryAmount("");
    setVEntryNarration("");
    // Refresh last account number hint after save
    if (user.branchid) {
      bankFDAccountApi.getLastSuffix(user.branchid).then(res => {
        if (res.success && res.data) setLastAccNo(res.data.lastAccNo);
      }).catch(() => {});
    }
  };

  // Load account heads + GL accounts + last suffix hint (create mode)
  useEffect(() => {
    if (user.branchid) {
      loadAccountHeads();
      commonservice.general_accmasters_info(user.branchid)
        .then(r => {
          const list = (r.data ?? []).map((a: any) => ({ value: a.accId ?? a.AccId, label: a.accountName ?? a.AccountName ?? a.name }));
          setGeneralAccounts(list);
        })
        .catch(err => console.error("Failed to load general accounts", err));
      if (!isEditMode) {
        bankFDAccountApi.getLastSuffix(user.branchid).then(res => {
          if (res.success && res.data) setLastAccNo(res.data.lastAccNo);
        }).catch(() => {});
      }
    }
  }, [user.branchid]);

  // Load account for edit mode
  useEffect(() => {
    if (isEditMode && editAccId && user.branchid) {
      loadAccount(editAccId);
    }
  }, [isEditMode, editAccId, user.branchid]);

  const loadAccountHeads = async () => {
    try {
      const res = await commonservice.makeRequest<any>(
        "/fetchdata/get_all_accountheads",
        {
          method: "POST",
          body: JSON.stringify({ BranchId: user.branchid }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = (res as any)?.data ?? [];
      setAccountHeads(
        data.map((h: any) => ({
          value: h.accountHeadId ?? h.AccountHeadId,
          label: h.accountHeadName ?? h.AccountHeadName,
        }))
      );
    } catch (err) {
      console.error("Failed to load account heads", err);
    }
  };

  const loadAccount = async (accId: number) => {
    setLoading(true);
    try {
      const res = await bankFDAccountApi.getById(user.branchid, accId);
      const payload = (res as any)?.data;
      if (!payload) throw new Error("Account not found.");

      const { account, details: detailList } = payload;
      setAccountName(account.accountName ?? "");
      setOpeningDate(
        account.openingDate ? commonservice.splitDate(account.openingDate) : commonservice.getTodaysDate()
      );
      setAccPrefix(account.accPrefix ?? "BFD");
      const loadedSuffix = account.accSuffix ?? null;
      setAccSuffix(loadedSuffix);
      setAccSuffixInput(loadedSuffix !== null ? String(loadedSuffix) : "");
      setSuffixError("");
      setSavedAccNo(`${account.accPrefix ?? "BFD"}-${loadedSuffix ?? ""}`);
      setAccountHeadId(account.headId ?? 0);

      let counter = 1;
      const rows: DetailRow[] = (detailList ?? []).map((d: any) => ({
        rowKey: counter++,
        id: d.id ?? 0,
        ltdNo: d.ltdNo ?? "",
        fdDate: d.fdDate ? commonservice.splitDate(d.fdDate) : "",
        fdAmount: d.fdAmount ?? 0,
        fdPeriodMonths: d.fdPeriodMonths ?? 0,
        fdPeriodDays: d.fdPeriodDays ?? 0,
        intRate: d.intRate ?? 0,
        intCompInterval: d.intCompInterval ?? 1,
        fdMaturityDate: d.fdMaturityDate ? commonservice.splitDate(d.fdMaturityDate) : "",
        maturityAmount: Math.round(d.maturityAmount ?? 0),
        fdStatus: d.fdStatus ?? 1,
        serialNo: d.serialNo ?? undefined,
        openingBalance: d.openingBalance?.balance ?? 0,
        openingBalanceType: d.openingBalance?.balanceType ?? "Cr",
        openingBalanceHeadId: d.openingBalance?.headId ?? undefined,
        openingTDS: d.openingTDS?.balance ?? 0,
        openingTDSHeadId: d.openingTDS?.headId ?? undefined,
      }));
      setDetails(rows);
      setRowCounter(counter);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Auto-calc maturity date and amount when entry fields change
  const recalcEntry = (updated: DetailRow): DetailRow => {
    const matDate = calcMaturityDate(updated.fdDate, updated.fdPeriodMonths, updated.fdPeriodDays);
    const matAmt = calcMaturityAmount(
      updated.fdAmount,
      updated.intRate,
      updated.intCompInterval,
      updated.fdDate,
      matDate
    );
    return { ...updated, fdMaturityDate: matDate, maturityAmount: matAmt };
  };

  const setEntryField = (field: keyof DetailRow, value: any) => {
    setEntry(prev => {
      const updated = { ...prev, [field]: value };
      return recalcEntry(updated);
    });
  };

  const clearEntry = () => {
    setEntry(emptyDetail(0));
    setEditingRowKey(null);
  };

  const handleAddDetail = () => {
    const errors: string[] = [];
    if (!entry.ltdNo.trim()) errors.push("LTD No is required.");
    if (!entry.fdDate) errors.push("FD Date is required.");
    if (!entry.fdAmount || entry.fdAmount <= 0) errors.push("FD Amount must be greater than 0.");
    if (!entry.intRate || entry.intRate <= 0) errors.push("Interest Rate must be greater than 0.");
    if (!entry.fdMaturityDate) errors.push("Maturity Date is required.");
    if (entry.fdDate && openingDate && entry.fdDate < openingDate) {
      errors.push("FD Date cannot be before Account Opening Date.");
    }
    if (errors.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>`,
      });
      return;
    }

    // Auto-assign account head as both opening balance and TDS head
    const finalEntry = isOpeningEntry
      ? {
          ...entry,
          openingBalanceHeadId: accountHeadId || entry.openingBalanceHeadId,
          openingTDSHeadId: accountHeadId || entry.openingTDSHeadId,
        }
      : entry;

    if (editingRowKey !== null) {
      setDetails(prev =>
        prev.map(r => (r.rowKey === editingRowKey ? { ...finalEntry, rowKey: editingRowKey } : r))
      );
    } else {
      const key = rowCounter;
      setRowCounter(k => k + 1);
      setDetails(prev => [...prev, { ...finalEntry, rowKey: key }]);
    }
    clearEntry();
  };

  const handleEditRow = (row: DetailRow) => {
    setEntry({ ...row });
    setEditingRowKey(row.rowKey);
  };

  const handleDeleteRow = async (key: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Remove Detail?",
      text: "Are you sure you want to remove this FD detail row?",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Remove",
    });
    if (!result.isConfirmed) return;
    setDetails(prev => prev.filter(r => r.rowKey !== key));
    if (editingRowKey === key) clearEntry();
  };

  const handleReset = () => {
    if (isEditMode) {
      commonservice.handleResetNotAllowed();
      return;
    }
    setAccountName("");
    setOpeningDate(commonservice.getTodaysDate());
    setAccPrefix("BFD");
    setAccSuffix(null);
    setAccountHeadId(0);
    setDetails([]);
    setVoucherEntries([]);
    setVEntryAccId(0);
    setVEntryAmount("");
    setVEntryNarration("");
    clearEntry();
  };

  const handleSuffixBlur = async () => {
    const val = accSuffixInput.trim();
    if (!val) { setSuffixError(""); setAccSuffix(null); return; }
    const n = parseInt(val, 10);
    if (isNaN(n) || n <= 0) { setSuffixError("Must be a positive number."); setAccSuffix(null); return; }
    setAccSuffix(n);
    try {
      const res = await bankFDAccountApi.checkSuffix(user.branchid, n, accountHeadId || undefined, editAccId ?? undefined);
      if (res.success && res.data?.taken) {
        setSuffixError(`${accPrefix || "BFD"}-${n} is already in use under this account head.`);
      } else {
        setSuffixError("");
      }
    } catch { setSuffixError(""); }
  };

  const handleSave = async () => {
    const errors: string[] = [];
    if (!accountName.trim()) errors.push("Account Name is required.");
    if (!openingDate) errors.push("Account Opening Date is required.");
    if (details.length === 0) errors.push("At least one FD detail is required.");
    if (suffixError) errors.push(`Account number: ${suffixError}`);
    if (!isOpeningEntry && !isEditMode) {
      if (voucherEntries.length === 0) errors.push("At least one voucher credit entry is required.");
      else {
        const fdTotal = details.reduce((s, d) => s + d.fdAmount, 0);
        const entryTotal = voucherEntries.reduce((s, e) => s + e.amount, 0);
        if (Math.abs(fdTotal - entryTotal) > 0.01)
          errors.push(`Voucher credit total (₹${entryTotal.toFixed(2)}) must equal total FD amount (₹${fdTotal.toFixed(2)}).`);
      }
    }

    if (errors.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>`,
      });
      return;
    }

    const dto = {
      accountId: editAccId ?? 0,
      branchId: user.branchid,
      accountName: accountName.trim(),
      accPrefix: accPrefix.trim() || "BFD",
      accSuffix: accSuffix ?? undefined,
      openingDate,
      isOpeningEntry,
      headId: accountHeadId,
      // Voucher fields (only sent for create + non-opening entry)
      ...(!isOpeningEntry && !isEditMode ? {
        voucherEntries: voucherEntries,
        voucherDate: workingDate,
      } : {}),
      details: details.map(d => ({
        id: d.id,
        ltdNo: d.ltdNo,
        fdDate: d.fdDate,
        fdAmount: d.fdAmount,
        fdPeriodMonths: d.fdPeriodMonths,
        fdPeriodDays: d.fdPeriodDays,
        intRate: d.intRate,
        intCompInterval: d.intCompInterval,
        fdMaturityDate: d.fdMaturityDate,
        maturityAmount: d.maturityAmount,
        fdStatus: d.fdStatus,
        serialNo: d.serialNo,
        openingBalance: d.openingBalance,
        openingBalanceType: d.openingBalanceType,
        openingBalanceHeadId: d.openingBalanceHeadId,
        openingTDS: d.openingTDS,
        openingTDSHeadId: d.openingTDSHeadId,
      })),
    };

    setSaving(true);
    try {
      let res;
      if (isEditMode && editAccId) {
        res = await bankFDAccountApi.update(editAccId, dto);
      } else {
        res = await bankFDAccountApi.create(dto);
      }

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "Saved successfully.",
          confirmButtonColor: "#0D9488",
          timer: 1500,
          showConfirmButton: false,
        });
        if (!isEditMode) resetForm();
        else navigate("/bank-fd-account");
      } else {
        throw new Error(res.message || "Save failed.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ─── Style helpers ─────────────────────────────────────────────
  const inputCls =
    "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white";
  const numInputCls =
    "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white text-right";
  const readonlyCls =
    "w-full px-3 py-2.5 border-2 border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed";

  const compIntervalLabel = (val: number) =>
    compoundingOptions.find(o => o.value === val)?.label ?? String(val);
  const statusLabel = (val: number) =>
    fdStatusOptions.find(o => o.value === val)?.label ?? String(val);
  const headLabel = (code?: number | null) =>
    accountHeads.find(h => h.value === code)?.label ?? (code ? String(code) : "-");

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Landmark className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Modify" : "Add"} Bank FD Account
                    </h1>
                    <p className="text-gray-600 text-sm">
                      {isEditMode ? "Modify existing Bank FD account" : "Create a new Bank FD account"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(isEditMode ? "/bank-fd-account" : "/account-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isEditMode ? "Back to List" : "Back to Operations"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow border border-gray-200 flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* ── Account Info Card ── */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4">Account Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Account Head
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={accountHeads}
                        value={accountHeads.find(h => h.value === accountHeadId) ?? null}
                        onChange={opt => setAccountHeadId(opt?.value ?? 0)}
                        placeholder="-- Select Head --"
                        isClearable
                        styles={{ control: b => ({ ...b, cursor: "pointer" }) }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        className={inputCls}
                        placeholder="Enter account name"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Account Opening Date <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        value={openingDate}
                        onChange={setOpeningDate}
                        workingDate={workingDate}
                        max={workingDate}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Account Number
                        {isEditMode && savedAccNo && (
                          <span className="ml-2 text-xs font-normal text-slate-400">Saved: {savedAccNo}</span>
                        )}
                        {!isEditMode && lastAccNo && (
                          <span className="ml-2 text-xs font-normal text-slate-400">Last: {lastAccNo}</span>
                        )}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-3 py-2 border border-gray-200 rounded-l-lg bg-gray-50 text-gray-600 text-sm font-mono select-none">
                          BFD-
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={accSuffixInput}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, "");
                            setAccSuffixInput(v);
                            setSuffixError("");
                            setAccSuffix(v ? parseInt(v, 10) : null);
                          }}
                          onBlur={handleSuffixBlur}
                          maxLength={10}
                          placeholder={isEditMode ? "" : "auto"}
                          className={`flex-1 px-3 py-2 border rounded-r-lg text-sm outline-none transition-all font-mono ${
                            suffixError
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              : "border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          }`}
                        />
                      </div>
                      {suffixError && (
                        <p className="mt-1 text-xs text-red-600">{suffixError}</p>
                      )}
                      {!suffixError && accSuffix && (
                        <p className="mt-1 text-xs text-slate-400">
                          Account will be saved as <span className="font-semibold text-slate-600">{accPrefix || "BFD"}-{accSuffix}</span>
                        </p>
                      )}
                      {!accSuffix && !isEditMode && (
                        <p className="mt-1 text-xs text-slate-400">Leave blank to auto-assign the next number</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── FD Details Entry Section ── */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h2 className="text-base font-semibold text-amber-800 mb-4">
                    {editingRowKey !== null ? "Edit FD Detail" : "Add FD Detail"}
                  </h2>

                  {/* Row 1: LTD No, FD Date, FD Amount, Period */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        LTD No <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={entry.ltdNo}
                        onChange={e => setEntryField("ltdNo", e.target.value)}
                        className={inputCls}
                        placeholder="FD certificate no."
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        FD Date <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        value={entry.fdDate}
                        onChange={v => setEntryField("fdDate", v)}
                        workingDate={user.workingdate}
                        min={openingDate || undefined}
                        max={user.workingdate}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        FD Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.fdAmount || ""}
                        onChange={e => {
                          const v = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(v)) setEntryField("fdAmount", v === "" ? 0 : parseFloat(v) || 0);
                        }}
                        className={numInputCls}
                        placeholder="0.00"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Period (Months / Days)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.fdPeriodMonths || ""}
                          onChange={e => {
                            const v = e.target.value;
                            if (/^\d*$/.test(v)) setEntryField("fdPeriodMonths", v === "" ? 0 : parseInt(v) || 0);
                          }}
                          className={numInputCls}
                          placeholder="Months"
                          maxLength={4}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entry.fdPeriodDays || ""}
                          onChange={e => {
                            const v = e.target.value;
                            if (/^\d*$/.test(v)) setEntryField("fdPeriodDays", v === "" ? 0 : parseInt(v) || 0);
                          }}
                          className={numInputCls}
                          placeholder="Days"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Int Rate, Compounding, Maturity Date, Maturity Amount */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Int. Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.intRate || ""}
                        onChange={e => {
                          const v = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(v)) setEntryField("intRate", v === "" ? 0 : parseFloat(v) || 0);
                        }}
                        className={numInputCls}
                        placeholder="0.00"
                        maxLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Compounding Interval
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={compoundingOptions}
                        value={compoundingOptions.find(o => o.value === entry.intCompInterval) ?? null}
                        onChange={opt => setEntryField("intCompInterval", opt?.value ?? 1)}
                        placeholder="-- Select --"


                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        FD Maturity Date
                      </label>
                      <input
                        type="text"
                        value={entry.fdMaturityDate}
                        readOnly
                        className={readonlyCls}
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Maturity Amount
                      </label>
                      <input
                        type="text"
                        value={entry.maturityAmount ? Math.round(entry.maturityAmount).toLocaleString("en-IN") : ""}
                        readOnly
                        className={readonlyCls}
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  {/* Row 3: Serial No */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Serial No</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={entry.serialNo ?? ""}
                        onChange={e => {
                          const v = e.target.value;
                          if (/^\d*$/.test(v)) setEntryField("serialNo", v === "" ? undefined : parseInt(v));
                        }}
                        className={numInputCls}
                        placeholder="Optional"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {/* Opening Balance sub-section */}
                  {isOpeningEntry && (
                    <div className="border border-amber-300 rounded-xl p-4 bg-amber-50 mt-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                        <h3 className="text-sm font-bold text-amber-800 tracking-wide uppercase">Opening Balance</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* Opening Balance */}
                        <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                          <label className="block text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">
                            Opening Balance
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={entry.openingBalance || ""}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^\d*\.?\d{0,2}$/.test(v)) setEntryField("openingBalance", v === "" ? 0 : parseFloat(v) || 0);
                            }}
                            className="w-full px-3 py-2 text-right text-gray-800 font-mono text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all bg-gray-50"
                            placeholder="0.00"
                            maxLength={15}
                          />
                        </div>

                        {/* Balance Type — pill toggle */}
                        <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                          <label className="block text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
                            Balance Type
                          </label>
                          <div className="flex rounded-md overflow-hidden border border-gray-200 w-fit">
                            {(["Cr", "Dr"] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setEntryField("openingBalanceType", type)}
                                className={`px-5 py-2 text-sm font-semibold transition-all ${
                                  entry.openingBalanceType === type
                                    ? type === "Cr"
                                      ? "bg-green-600 text-white"
                                      : "bg-red-500 text-white"
                                    : "bg-white text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* TDS Balance */}
                        <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                          <label className="block text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">
                            TDS Balance
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={entry.openingTDS || ""}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^\d*\.?\d{0,2}$/.test(v)) setEntryField("openingTDS", v === "" ? 0 : parseFloat(v) || 0);
                            }}
                            className="w-full px-3 py-2 text-right text-gray-800 font-mono text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all bg-gray-50"
                            maxLength={15}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add/Update buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddDetail}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm shadow transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {editingRowKey !== null ? "Update Detail" : "Add Detail"}
                    </button>
                    {editingRowKey !== null && (
                      <button
                        onClick={clearEntry}
                        className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Voucher Section (create mode, non-opening entry only) ── */}
                {!isOpeningEntry && !isEditMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Receipt className="text-white w-4 h-4" />
                      </div>
                      <h2 className="text-base font-semibold text-blue-900">
                        Voucher Detail <span className="text-red-500">*</span>
                      </h2>
                    </div>

                    {/* Debit info strip */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-blue-100 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Dr Account:</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {accountHeads.find(h => h.value === accountHeadId)?.label ?? "Bank FD Account"}
                        </span>
                        <span className="text-xs text-blue-500 italic">(auto)</span>
                      </div>
                      <div className="text-xs text-blue-700 font-medium">
                        Total FD: <span className="font-bold text-blue-900">
                          ₹{details.reduce((s, r) => s + r.fdAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Entry add row */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[220px]">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Credit Account <span className="text-red-500">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={generalAccounts}
                            value={generalAccounts.find(a => a.value === vEntryAccId) ?? null}
                            onChange={opt => setVEntryAccId(opt?.value ?? 0)}
                            placeholder="Select GL / Cash account..."
                            isClearable
                            styles={{ control: b => ({ ...b, cursor: "pointer", minHeight: "38px" }), menuPortal: b => ({ ...b, zIndex: 9999 }) }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                          />
                        </div>
                        <div className="w-36">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Amount <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={vEntryAmount}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "" || /^\d+(\.\d{0,2})?$/.test(val)) setVEntryAmount(val);
                            }}
                            className="w-full px-3 py-2 text-right font-mono text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white transition-all"
                            placeholder="0.00"
                            maxLength={15}
                          />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Narration</label>
                          <input
                            type="text"
                            value={vEntryNarration}
                            onChange={e => setVEntryNarration(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white transition-all"
                            placeholder="Optional"
                            maxLength={200}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(vEntryAmount);
                            if (!vEntryAccId) { Swal.fire({ icon: "warning", title: "Select credit account" }); return; }
                            if (!vEntryAmount || isNaN(amt) || amt <= 0) { Swal.fire({ icon: "warning", title: "Enter a valid amount" }); return; }
                            setVoucherEntries(prev => [...prev, { creditAccountId: vEntryAccId, amount: amt, narration: vEntryNarration.trim() }]);
                            setVEntryAccId(0);
                            setVEntryAmount("");
                            setVEntryNarration("");
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                    </div>

                    {/* Voucher entries table */}
                    <div className="overflow-x-auto rounded-lg border border-blue-200">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-100 border-b border-blue-200">
                          <tr>
                            <th className="text-center px-3 py-2 font-semibold text-blue-800 w-12">Sr.No</th>
                            <th className="text-left px-3 py-2 font-semibold text-blue-800">Credit Account</th>
                            <th className="text-right px-3 py-2 font-semibold text-blue-800 w-36">Amount</th>
                            <th className="text-left px-3 py-2 font-semibold text-blue-800">Narration</th>
                            <th className="text-center px-3 py-2 font-semibold text-blue-800 w-16">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voucherEntries.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-gray-400 italic">
                                No entries added yet. Select a credit account and click Add.
                              </td>
                            </tr>
                          ) : (
                            voucherEntries.map((ve, idx) => (
                              <tr key={idx} className="border-b border-blue-50 bg-white hover:bg-blue-50 transition-colors">
                                <td className="text-center px-3 py-2 text-gray-600">{idx + 1}</td>
                                <td className="px-3 py-2 text-gray-800">
                                  {generalAccounts.find(a => a.value === ve.creditAccountId)?.label ?? `Account #${ve.creditAccountId}`}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  ₹{ve.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{ve.narration || "—"}</td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setVoucherEntries(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {(voucherEntries.length > 0 || (parseFloat(vEntryAmount) > 0)) && (() => {
                          // Committed FD rows, excluding the one currently being edited
                          const committedFD = details
                            .filter(r => r.rowKey !== editingRowKey)
                            .reduce((s, r) => s + (Number(r.fdAmount) || 0), 0);
                          // Add current entry form's fdAmount (covers both new and edit-in-progress)
                          const pendingFD = Number(entry.fdAmount) || 0;
                          const fdTotal = committedFD + pendingFD;

                          // Committed voucher entries + whatever is currently typed in the add form
                          const committedVoucher = voucherEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                          const pendingVoucher = parseFloat(vEntryAmount) || 0;
                          const entryTotal = committedVoucher + pendingVoucher;

                          const diff = Math.abs(fdTotal - entryTotal);
                          return (
                            <tfoot className="bg-blue-50 border-t border-blue-200">
                              <tr>
                                <td colSpan={2} className="px-3 py-2 text-sm font-semibold text-blue-800 text-right">Total</td>
                                <td className={`px-3 py-2 text-right font-bold text-sm ${diff > 0.01 ? "text-red-600" : "text-green-700"}`}>
                                  ₹{entryTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  {diff > 0.01 && (
                                    <div className="text-xs font-normal text-red-500">
                                      FD Total: ₹{fdTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} — must match
                                    </div>
                                  )}
                                </td>
                                <td colSpan={2} className="px-3 py-2 text-right text-xs">
                                  {diff <= 0.01
                                    ? <span className="text-green-600 font-semibold">✓ Balanced</span>
                                    : <span className="text-red-500 font-semibold">⚠ Not balanced</span>}
                                </td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Details Grid ── */}
                {details.length > 0 && (
                  <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700">
                        FD Detail Rows ({details.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-teal-50 border-b border-teal-200">
                          <tr>
                            <th className="text-center px-2 py-2.5 font-semibold text-teal-800 w-8">#</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-teal-800 w-28">LTD No</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-teal-800 w-24">FD Date</th>
                            <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-28">Amount</th>
                            <th className="text-center px-2 py-2.5 font-semibold text-teal-800 w-20">Period</th>
                            <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-16">Rate%</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-teal-800 w-24">Comp.</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-teal-800 w-24">Mat. Date</th>
                            <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-28">Mat. Amt</th>
                            <th className="text-left px-2 py-2.5 font-semibold text-teal-800 w-16">Status</th>
                            <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-16">Sr.No</th>
                            {isOpeningEntry && (
                              <>
                                <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-24">Op. Bal</th>
                                <th className="text-center px-2 py-2.5 font-semibold text-teal-800 w-16">Type</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-teal-800 w-24">TDS Bal</th>
                              </>
                            )}
                            <th className="text-center px-2 py-2.5 font-semibold text-teal-800 w-16">Act.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.map((row, idx) => (
                            <tr
                              key={row.rowKey}
                              className={`border-b border-gray-100 ${
                                editingRowKey === row.rowKey ? "bg-amber-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-2 py-2 text-center text-gray-500 text-xs">{idx + 1}</td>
                              <td className="px-2 py-2 text-gray-800 font-medium text-xs truncate max-w-[7rem]">{row.ltdNo}</td>
                              <td className="px-2 py-2 text-gray-700 text-xs whitespace-nowrap">{row.fdDate}</td>
                              <td className="px-2 py-2 text-right text-gray-800 text-xs">
                                {row.fdAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-700 text-xs whitespace-nowrap">
                                {row.fdPeriodMonths}M {row.fdPeriodDays}D
                              </td>
                              <td className="px-2 py-2 text-right text-gray-700 text-xs">
                                {row.intRate.toFixed(2)}%
                              </td>
                              <td className="px-2 py-2 text-gray-700 text-xs">
                                {compIntervalLabel(row.intCompInterval)}
                              </td>
                              <td className="px-2 py-2 text-gray-700 text-xs whitespace-nowrap">{row.fdMaturityDate}</td>
                              <td className="px-2 py-2 text-right text-gray-800 text-xs">
                                {Math.round(row.maturityAmount).toLocaleString("en-IN")}
                              </td>
                              <td className="px-2 py-2 text-gray-700 text-xs">{statusLabel(row.fdStatus)}</td>
                              <td className="px-2 py-2 text-right text-gray-700 text-xs">
                                {row.serialNo ?? "-"}
                              </td>
                              {isOpeningEntry && (
                                <>
                                  <td className="px-2 py-2 text-right text-gray-700 text-xs">
                                    {row.openingBalance > 0
                                      ? row.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                                      : "-"}
                                  </td>
                                  <td className="px-2 py-2 text-center text-xs font-medium">
                                    {row.openingBalance > 0
                                      ? <span className={row.openingBalanceType === "Cr" ? "text-green-700" : "text-red-600"}>{row.openingBalanceType}</span>
                                      : "-"}
                                  </td>
                                  <td className="px-2 py-2 text-right text-gray-700 text-xs">
                                    {row.openingTDS > 0
                                      ? row.openingTDS.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                                      : "-"}
                                  </td>
                                </>
                              )}
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditRow(row)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRow(row.rowKey)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-teal-50 border-t-2 border-teal-200 font-semibold text-sm">
                            <td className="px-3 py-2.5 text-teal-800" colSpan={3}>
                              Total ({details.length} FD{details.length !== 1 ? "s" : ""})
                            </td>
                            <td className="px-3 py-2.5 text-right text-teal-900">
                              {details.reduce((s, r) => s + r.fdAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td colSpan={4} />
                            <td className="px-3 py-2.5 text-right text-teal-900">
                              {Math.round(details.reduce((s, r) => s + r.maturityAmount, 0)).toLocaleString("en-IN")}
                            </td>
                            <td colSpan={isOpeningEntry ? 6 : 3} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {isEditMode ? "Update Account" : "Save Account"}
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      }
    />
  );
};

export default BankFDAccountForm;
