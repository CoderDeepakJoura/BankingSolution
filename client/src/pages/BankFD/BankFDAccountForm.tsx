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
  openingBalanceHeadCode: undefined,
  openingTDS: 0,
  openingTDSHeadCode: undefined,
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
  const [voucherCreditAccId, setVoucherCreditAccId] = useState<number>(0);
  const [voucherNarration, setVoucherNarration] = useState("");

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
    setVoucherCreditAccId(0);
    setVoucherNarration("");
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
        .then(r => setGeneralAccounts((r.data ?? []).map((a: any) => ({ value: a.accId, label: a.accountName }))))
        .catch(() => {});
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
        openingBalanceHeadCode: d.openingBalance?.headCode ?? undefined,
        openingTDS: d.openingTDS?.balance ?? 0,
        openingTDSHeadCode: d.openingTDS?.headCode ?? undefined,
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

    if (editingRowKey !== null) {
      setDetails(prev =>
        prev.map(r => (r.rowKey === editingRowKey ? { ...entry, rowKey: editingRowKey } : r))
      );
    } else {
      const key = rowCounter;
      setRowCounter(k => k + 1);
      setDetails(prev => [...prev, { ...entry, rowKey: key }]);
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
    setVoucherCreditAccId(0);
    setVoucherNarration("");
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
    if (!isOpeningEntry && !isEditMode && !voucherCreditAccId) errors.push("Credit account is required for the voucher.");

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
        creditAccountId: voucherCreditAccId,
        voucherNarration: voucherNarration.trim() || undefined,
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
        openingBalanceHeadCode: d.openingBalanceHeadCode,
        openingTDS: d.openingTDS,
        openingTDSHeadCode: d.openingTDSHeadCode,
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
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
                        Account Prefix
                      </label>
                      <input
                        type="text"
                        value={accPrefix}
                        onChange={e => setAccPrefix(e.target.value)}
                        className={inputCls}
                        placeholder="BFD"
                        maxLength={20}
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
                          {accPrefix || "BFD"}-
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
                          placeholder={isEditMode ? "" : "auto"}
                          className={`flex-1 px-3 py-2 border rounded-r-lg text-sm outline-none transition-all font-mono ${
                            suffixError
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                              : "border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          }`}
                          maxLength={10}
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
                      />
                    </div>
                  </div>

                  {/* Opening Balance sub-section */}
                  {isOpeningEntry && (
                    <div className="border border-amber-300 rounded-lg p-4 bg-amber-100/50 mt-2">
                      <h3 className="text-sm font-semibold text-amber-900 mb-3">Opening Balance</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                            className={numInputCls}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Balance Type
                          </label>
                          <div className="flex items-center gap-6 mt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={`obType_${entry.rowKey}`}
                                value="Cr"
                                checked={entry.openingBalanceType === "Cr"}
                                onChange={() => setEntryField("openingBalanceType", "Cr")}
                                className="text-teal-500 focus:ring-teal-400"
                              />
                              Cr
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={`obType_${entry.rowKey}`}
                                value="Dr"
                                checked={entry.openingBalanceType === "Dr"}
                                onChange={() => setEntryField("openingBalanceType", "Dr")}
                                className="text-teal-500 focus:ring-teal-400"
                              />
                              Dr
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Head Code
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={accountHeads}
                            value={
                              accountHeads.find(h => h.value === entry.openingBalanceHeadCode) ?? null
                            }
                            onChange={opt =>
                              setEntryField("openingBalanceHeadCode", opt?.value ?? undefined)
                            }
                            placeholder="-- Select Head --"
                            isClearable


                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                            className={numInputCls}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            TDS Head Code
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={accountHeads}
                            value={
                              accountHeads.find(h => h.value === entry.openingTDSHeadCode) ?? null
                            }
                            onChange={opt =>
                              setEntryField("openingTDSHeadCode", opt?.value ?? undefined)
                            }
                            placeholder="-- Select Head --"
                            isClearable


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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Debit side — auto-filled from BankFD account head */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Debit Account
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={accountHeads.find(h => h.value === accountHeadId)?.label ?? "Bank FD Account (auto)"}
                          className={readonlyCls}
                        />
                        <p className="mt-1 text-xs text-blue-600">Auto: Bank FD account head</p>
                      </div>

                      {/* Credit side — user selects */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Credit Account <span className="text-red-500">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={generalAccounts}
                          value={generalAccounts.find(a => a.value === voucherCreditAccId) ?? null}
                          onChange={opt => setVoucherCreditAccId(opt?.value ?? 0)}
                          placeholder="Cash / GL account..."
                          isClearable
                          styles={{ control: b => ({ ...b, cursor: "pointer" }) }}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>

                      {/* Amount — auto from FD totals */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={details.length > 0
                            ? details.reduce((s, r) => s + r.fdAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                            : "0.00"}
                          className={readonlyCls}
                        />
                        <p className="mt-1 text-xs text-blue-600">Auto: sum of all FD amounts</p>
                      </div>

                      {/* Narration */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Narration
                        </label>
                        <input
                          type="text"
                          value={voucherNarration}
                          onChange={e => setVoucherNarration(e.target.value)}
                          className={inputCls}
                          placeholder="Auto-filled if left blank"
                          maxLength={200}
                        />
                      </div>
                    </div>

                    {/* Mini ledger row showing the entry */}
                    {details.length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm border border-blue-200 rounded-lg overflow-hidden">
                          <thead className="bg-blue-100 border-b border-blue-200">
                            <tr>
                              <th className="text-left px-4 py-2 font-semibold text-blue-800">Account</th>
                              <th className="text-right px-4 py-2 font-semibold text-blue-800">Debit</th>
                              <th className="text-right px-4 py-2 font-semibold text-blue-800">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-blue-100 bg-white">
                              <td className="px-4 py-2 text-gray-700">
                                {accountHeads.find(h => h.value === accountHeadId)?.label ?? "Bank FD Account"} (Dr)
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-gray-900">
                                ₹{details.reduce((s, r) => s + r.fdAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-400">—</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="px-4 py-2 text-gray-700">
                                {voucherCreditAccId
                                  ? `${generalAccounts.find(a => a.value === voucherCreditAccId)?.label ?? "—"} (Cr)`
                                  : <span className="text-red-400 italic">Select credit account</span>}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-400">—</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-900">
                                ₹{details.reduce((s, r) => s + r.fdAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
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
                            <th className="text-left px-3 py-3 font-semibold text-teal-800 w-10">S.No</th>
                            <th className="text-left px-3 py-3 font-semibold text-teal-800">LTD No</th>
                            <th className="text-left px-3 py-3 font-semibold text-teal-800">FD Date</th>
                            <th className="text-right px-3 py-3 font-semibold text-teal-800">Amount</th>
                            <th className="text-center px-3 py-3 font-semibold text-teal-800">Period</th>
                            <th className="text-right px-3 py-3 font-semibold text-teal-800">Rate %</th>
                            <th className="text-left px-3 py-3 font-semibold text-teal-800">Comp.</th>
                            <th className="text-left px-3 py-3 font-semibold text-teal-800">Maturity Date</th>
                            <th className="text-right px-3 py-3 font-semibold text-teal-800">Maturity Amt</th>
                            <th className="text-left px-3 py-3 font-semibold text-teal-800">Status</th>
                            <th className="text-right px-3 py-3 font-semibold text-teal-800">Serial No</th>
                            {isOpeningEntry && (
                              <>
                                <th className="text-right px-3 py-3 font-semibold text-teal-800">Op. Bal</th>
                                <th className="text-center px-3 py-3 font-semibold text-teal-800">Bal Type</th>
                                <th className="text-left px-3 py-3 font-semibold text-teal-800">Head</th>
                                <th className="text-right px-3 py-3 font-semibold text-teal-800">TDS Bal</th>
                                <th className="text-left px-3 py-3 font-semibold text-teal-800">TDS Head</th>
                              </>
                            )}
                            <th className="text-center px-3 py-3 font-semibold text-teal-800 w-20">
                              Actions
                            </th>
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
                              <td className="px-3 py-2.5 text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2.5 text-gray-800 font-medium">{row.ltdNo}</td>
                              <td className="px-3 py-2.5 text-gray-700">{row.fdDate}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800">
                                {row.fdAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2.5 text-center text-gray-700">
                                {row.fdPeriodMonths}M {row.fdPeriodDays}D
                              </td>
                              <td className="px-3 py-2.5 text-right text-gray-700">
                                {row.intRate.toFixed(2)}%
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">
                                {compIntervalLabel(row.intCompInterval)}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">{row.fdMaturityDate}</td>
                              <td className="px-3 py-2.5 text-right text-gray-800">
                                {Math.round(row.maturityAmount).toLocaleString("en-IN")}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">{statusLabel(row.fdStatus)}</td>
                              <td className="px-3 py-2.5 text-right text-gray-700">
                                {row.serialNo ?? "-"}
                              </td>
                              {isOpeningEntry && (
                                <>
                                  <td className="px-3 py-2.5 text-right text-gray-700">
                                    {row.openingBalance > 0
                                      ? row.openingBalance.toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                        })
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-gray-700">
                                    {row.openingBalance > 0 ? row.openingBalanceType : "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-700 max-w-[120px] truncate">
                                    {row.openingBalance > 0
                                      ? headLabel(row.openingBalanceHeadCode)
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-gray-700">
                                    {row.openingTDS > 0
                                      ? row.openingTDS.toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                        })
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-700 max-w-[120px] truncate">
                                    {row.openingTDS > 0 ? headLabel(row.openingTDSHeadCode) : "-"}
                                  </td>
                                </>
                              )}
                              <td className="px-3 py-2.5">
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
                            <td colSpan={isOpeningEntry ? 8 : 3} />
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
