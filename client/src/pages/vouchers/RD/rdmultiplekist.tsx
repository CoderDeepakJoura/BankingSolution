import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { ArrowLeft, Plus, Trash2, Save, RotateCcw, PiggyBank, Pencil } from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useLocation } from "react-router-dom";
import { VoucherPreview } from "../../../services/vouchers/voucherOperationsApi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import rdMultipleKistApi, { RDAccountForKist } from "../../../services/vouchers/rd/rdMultipleKistApi";

interface RDProduct { id: number; productName: string; }
interface DebitAccount { accId: number; accountName: string; }

interface GridRow {
  accountId: number;
  accNo: string;
  accountName: string;
  kistAmount: number;
}

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "48px",
    borderWidth: "2px",
    borderColor: state.isFocused ? "#6366f1" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(99,102,241,0.2)" : "none",
    "&:hover": { borderColor: "#6366f1" },
    cursor: "pointer",
  }),
};

const RDMultipleKistVoucher: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.user);
  const workingDateISO = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [rdProducts, setRDProducts] = useState<RDProduct[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);
  const [productAccounts, setProductAccounts] = useState<RDAccountForKist[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [debitAccountId, setDebitAccountId] = useState<number | null>(null);
  const [narration, setNarration] = useState("");

  // Entry row state
  const [entryAccount, setEntryAccount] = useState<RDAccountForKist | null>(null);
  const [entryKistAmount, setEntryKistAmount] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Grid
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editVoucherId, setEditVoucherId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [prodRes, debitRes] = await Promise.all([
        commonservice.fetch_rd_products(user.branchid),
        commonservice.general_accmasters_info(user.branchid),
      ]);
      if (prodRes.success) setRDProducts(prodRes.data ?? []);
      if (debitRes.success) setDebitAccounts(debitRes.data ?? []);
    };
    load();
  }, [user.branchid]);

  // Edit mode: populate from VoucherPreview passed via router state
  useEffect(() => {
    const editVoucher = (location.state as any)?.editVoucher as VoucherPreview | undefined;
    if (!editVoucher) return;

    setIsEditMode(true);
    setEditVoucherId(editVoucher.voucherId);

    // Cr entries with accountType 5 = RD kist accounts
    const crEntries = editVoucher.entries.filter(e => e.entryType === "Cr" && e.accountType === 5);
    // Dr entry = debit/cash account
    const drEntry = editVoucher.entries.find(e => e.entryType === "Dr");

    setRows(crEntries.map(e => ({
      accountId: e.accountId,
      accNo: e.accountIdentifier,
      accountName: e.accountName,
      kistAmount: e.amount,
    })));

    if (drEntry) setDebitAccountId(drEntry.accountId);

    // Derive product from first Cr entry (generalProductId)
    const productId = crEntries[0]?.generalProductId ?? null;
    if (productId) {
      setSelectedProduct(productId);
      // Load product accounts so Edit button can show full details
      rdMultipleKistApi.getAccountsForKist(user.branchid, productId).then(res => {
        if (res.success) setProductAccounts(res.data ?? []);
      });
    }
  }, []);

  const handleProductChange = async (selected: any) => {
    const productId = selected ? selected.value : null;
    setSelectedProduct(productId);
    setProductAccounts([]);
    setEntryAccount(null);
    setEntryKistAmount("");
    setRows([]);

    if (productId) {
      const res = await rdMultipleKistApi.getAccountsForKist(user.branchid, productId);
      if (res.success) {
        setProductAccounts(res.data ?? []);
        const cih = await commonservice.default_cash_in_hand_account(user.branchid);
        if (Number(cih.data) > 0) setDebitAccountId(Number(cih.data));
      }
    }
  };

  const handleAccountSelect = (selected: any) => {
    if (!selected) { setEntryAccount(null); setEntryKistAmount(""); return; }
    const acc = productAccounts.find(a => a.accId === selected.value) ?? null;
    setEntryAccount(acc);
    setEntryKistAmount(acc ? String(acc.kistAmt) : "");
  };

  const handleAddRow = () => {
    if (!entryAccount) { Swal.fire("Error", "Please select an RD account.", "warning"); return; }
    const amt = parseFloat(entryKistAmount);
    if (!amt || amt <= 0) { Swal.fire("Error", "Kist amount must be greater than 0.", "warning"); return; }
    const duplicate = rows.some((r, i) => r.accountId === entryAccount.accId && i !== editingIndex);
    if (duplicate) { Swal.fire("Error", "This account has already been added.", "warning"); return; }

    if (editingIndex !== null) {
      setRows(prev => prev.map((r, i) => i === editingIndex
        ? { ...r, kistAmount: amt }
        : r
      ));
      setEditingIndex(null);
    } else {
      setRows(prev => [...prev, {
        accountId: entryAccount.accId,
        accNo: entryAccount.accNo,
        accountName: entryAccount.accountName,
        kistAmount: amt,
      }]);
    }
    setEntryAccount(null);
    setEntryKistAmount("");
  };

  const handleEditRow = (index: number) => {
    const row = rows[index];
    const acc = productAccounts.find(a => a.accId === row.accountId) ?? {
      accId: row.accountId, accNo: row.accNo, accountName: row.accountName, kistAmt: row.kistAmount,
    };
    setEntryAccount(acc as RDAccountForKist);
    setEntryKistAmount(String(row.kistAmount));
    setEditingIndex(index);
  };

  const handleRemoveRow = async (index: number) => {
    const row = rows[index];
    const result = await Swal.fire({
      title: "Remove Entry?",
      text: `Remove ${row.accNo} - ${row.accountName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      setRows(prev => prev.filter((_, i) => i !== index));
      if (editingIndex === index) { setEditingIndex(null); setEntryAccount(null); setEntryKistAmount(""); }
    }
  };

  const totalAmount = rows.reduce((s, r) => s + r.kistAmount, 0);

  const handleSave = async () => {
    if (!selectedProduct) { Swal.fire("Error", "Please select an RD product.", "warning"); return; }
    if (!debitAccountId) { Swal.fire("Error", "Please select a debit account.", "warning"); return; }
    if (rows.length === 0) { Swal.fire("Error", "Please add at least one account.", "warning"); return; }

    setLoading(true);
    try {
      const payload = {
        brID: user.branchid,
        voucherDate: workingDateISO,
        voucherNarration: narration || `RD Multiple Kist - ${rows.length} accounts`,
        debitAccountId,
        items: rows.map(r => ({ rdAccountId: r.accountId, kistAmount: r.kistAmount })),
      };

      const res = isEditMode && editVoucherId
        ? await rdMultipleKistApi.update(editVoucherId, payload)
        : await rdMultipleKistApi.save(payload);

      if (res.success) {
        await Swal.fire({ icon: "success", title: isEditMode ? "Updated!" : "Saved!", text: res.message, confirmButtonColor: "#6366f1" });
        if (isEditMode) navigate("/voucher-search");
        else handleReset();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save.", confirmButtonColor: "#EF4444" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setDebitAccountId(null);
    setNarration("");
    setProductAccounts([]);
    setEntryAccount(null);
    setEntryKistAmount("");
    setRows([]);
  };

  const productOptions = rdProducts.map(p => ({ value: p.id, label: p.productName }));
  const debitOptions = debitAccounts.map(d => ({ value: d.accId, label: d.accountName }));
  const accountOptions = productAccounts
    .filter(a => !rows.some((r, i) => r.accountId === a.accId && i !== editingIndex))
    .map(a => ({ value: a.accId, label: `${a.accNo} - ${a.accountName}` }));

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${isEditMode ? "from-amber-500 to-orange-500" : "from-indigo-600 to-blue-600"} rounded-lg flex items-center justify-center shadow-md`}>
                    {isEditMode ? <Pencil className="w-5 h-5 text-white" /> : <PiggyBank className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-800">RD Multiple Kist Voucher</h2>
                      {isEditMode && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs font-semibold">Edit Mode</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{isEditMode ? "Modify RD Multiple Kist entries and save" : "Post kist payments for multiple RD accounts in one voucher"}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/voucher-operations")}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Operations
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Row 1: Date, Product, Debit Account */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Voucher Date</label>
                    <input
                      type="text"
                      value={workingDateISO}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">RD Product <span className="text-red-500">*</span></label>
                    <Select
                      options={productOptions}
                      value={productOptions.find(o => o.value === selectedProduct) ?? null}
                      onChange={handleProductChange}
                      placeholder="Select RD Product"
                      isClearable


                      styles={selectStyles}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Debit Account (Cash) <span className="text-red-500">*</span></label>
                    <Select
                      options={debitOptions}
                      value={debitOptions.find(o => o.value === debitAccountId) ?? null}
                      onChange={s => setDebitAccountId(s ? s.value : null)}
                      placeholder="Select Debit Account"
                      isClearable


                      styles={selectStyles}
                    />
                  </div>
                </div>

                {/* Row 2: Entry row */}
                <div className={`border rounded-xl p-4 ${editingIndex !== null ? "bg-amber-50 border-amber-300" : "bg-indigo-50 border-indigo-200"}`}>
                  <p className={`text-sm font-semibold mb-3 ${editingIndex !== null ? "text-amber-700" : "text-indigo-700"}`}>
                    {editingIndex !== null ? `Editing Row #${editingIndex + 1}` : "Add Account"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">RD Account</label>
                      <Select
                        options={accountOptions}
                        value={entryAccount ? { value: entryAccount.accId, label: `${entryAccount.accNo} - ${entryAccount.accountName}` } : null}
                        onChange={handleAccountSelect}
                        placeholder={selectedProduct ? "Select RD Account" : "Select a product first"}
                        isClearable
                        isDisabled={!selectedProduct || productAccounts.length === 0 || editingIndex !== null}
                        noOptionsMessage={() => !selectedProduct ? "Select a product first" : "No accounts found"}


                        styles={selectStyles}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Kist Amount</label>
                      <input
                        type="text"
                        value={entryKistAmount}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setEntryKistAmount(v);
                        }}
                        placeholder="Enter Kist Amount"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddRow}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-lg transition-colors shadow-md ${editingIndex !== null ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      >
                        {editingIndex !== null ? <><Pencil className="w-4 h-4" /> Update</> : <><Plus className="w-4 h-4" /> Add</>}
                      </button>
                      {editingIndex !== null && (
                        <button
                          onClick={() => { setEditingIndex(null); setEntryAccount(null); setEntryKistAmount(""); }}
                          className="px-4 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account detail card */}
                {entryAccount && (
                  <div className="bg-white border border-indigo-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Account Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        { label: "RD Number", value: entryAccount.rdNumber ?? "—" },
                        { label: "Interest Rate", value: entryAccount.interestRate != null ? `${entryAccount.interestRate}%` : "—" },
                        { label: "Kist Amount", value: entryAccount.kistAmt != null ? `₹${entryAccount.kistAmt.toFixed(2)}` : "—" },
                        { label: "RD Amount", value: entryAccount.rdAmount != null ? `₹${entryAccount.rdAmount.toFixed(2)}` : "—" },
                        { label: "First Kist Date", value: entryAccount.firstKistDate ? commonservice.splitDate(entryAccount.firstKistDate) : "—" },
                        { label: "Maturity Date", value: entryAccount.maturityDate ? commonservice.splitDate(entryAccount.maturityDate) : "—" },
                      ].map(item => (
                        <div key={item.label} className="bg-indigo-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-indigo-700">{String(item.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid */}
                {rows.length > 0 && (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold w-12">S.No</th>
                          <th className="px-4 py-3 text-left font-semibold">Account No.</th>
                          <th className="px-4 py-3 text-left font-semibold">Account Name</th>
                          <th className="px-4 py-3 text-right font-semibold">Kist Amount</th>
                          <th className="px-4 py-3 text-center font-semibold w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {rows.map((row, i) => (
                          <tr key={row.accountId} className={`transition-colors ${editingIndex === i ? "bg-amber-50" : "hover:bg-indigo-50"}`}>
                            <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                            <td className="px-4 py-3 text-gray-700 font-semibold">{row.accNo}</td>
                            <td className="px-4 py-3 text-gray-700">{row.accountName}</td>
                            <td className="px-4 py-3 text-right text-gray-800 font-semibold">₹{row.kistAmount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEditRow(i)}
                                  className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveRow(i)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700">Total Amount:</td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-700 text-base">₹{totalAmount.toFixed(2)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Narration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Narration</label>
                  <input
                    type="text"
                    value={narration}
                    onChange={e => setNarration(e.target.value)}
                    placeholder="Enter narration (optional)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={isEditMode ? () => navigate("/voucher-search") : handleReset}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all shadow-sm"
                  >
                    {isEditMode ? <><span>✕</span> Cancel</> : <><RotateCcw className="w-4 h-4" /> Reset</>}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading || rows.length === 0}
                    className={`flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r ${isEditMode ? "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : "from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"} rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {isEditMode ? "Updating..." : "Saving..."}</>
                    ) : (
                      <><Save className="w-4 h-4" /> {isEditMode ? "Update Voucher" : "Save Voucher"}</>
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

export default RDMultipleKistVoucher;
