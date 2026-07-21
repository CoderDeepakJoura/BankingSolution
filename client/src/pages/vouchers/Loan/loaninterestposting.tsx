import React, { useState, useEffect } from "react";
import {
  ArrowLeft, RotateCcw, TrendingUp, Search, CheckSquare, Square,
  Save, AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import loanInterestPostingApi, {
  LoanInterestBatchItemDTO,
} from "../../../services/vouchers/loan/loanInterestPostingApi";

// ── Select styles ─────────────────────────────────────────────────────────────

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
  menu: (base: any) => ({ ...base, zIndex: 9999 }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateShort = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

interface LoanAccountOption {
  accId: number;
  accountName: string;
  loanAmountPassed?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

const LoanInterestPostingVoucher: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [productsLoading, setProductsLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [posting, setPosting] = useState(false);

  const [loanProducts, setLoanProducts] = useState<{ id: number; productName: string }[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<LoanAccountOption[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [narration, setNarration] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Results state ──────────────────────────────────────────────────────────
  const [batchItems, setBatchItems] = useState<LoanInterestBatchItemDTO[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [hasShown, setHasShown] = useState(false);

  // ── Load products on mount ────────────────────────────────────────────────

  useEffect(() => {
    setProductsLoading(true);
    commonservice
      .fetch_loan_products(user.branchid)
      .then((res) => {
        const list = res.data ?? (res as any).Data ?? [];
        setLoanProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        Swal.fire("Error", "Failed to load loan products.", "error");
      })
      .finally(() => setProductsLoading(false));
  }, [user.branchid]);

  // ── Product change ────────────────────────────────────────────────────────

  const handleProductChange = async (sel: any) => {
    const id = sel ? sel.value : 0;
    setSelectedProductId(id);
    setSelectedAccountId(0);
    setLoanAccounts([]);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);
    setErrors((p) => { const n = { ...p }; delete n.product; return n; });

    if (!id) return;
    setAccountsLoading(true);
    try {
      const res = await commonservice.fetch_loan_accounts_by_product(user.branchid, id, sessionDate);
      const list = res.data ?? (res as any).Data ?? [];
      setLoanAccounts(Array.isArray(list) ? list : []);
    } catch {
      Swal.fire("Error", "Failed to load accounts for this product.", "error");
    } finally {
      setAccountsLoading(false);
    }
  };

  // ── Account change ────────────────────────────────────────────────────────

  const handleAccountChange = (sel: any) => {
    setSelectedAccountId(sel ? sel.value : 0);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);
  };

  // ── Show (calculate) ──────────────────────────────────────────────────────

  const handleShow = async () => {
    if (!selectedProductId) {
      setErrors({ product: "Please select a loan product" });
      return;
    }
    setErrors({});
    setCalculating(true);
    setBatchItems([]);
    setCheckedIds(new Set());
    setHasShown(false);

    try {
      const res = await loanInterestPostingApi.batchCalculate(
        user.branchid,
        selectedProductId,
        selectedAccountId || undefined,
      );
      const data: LoanInterestBatchItemDTO[] = (res as any).data ?? (res as any).Data ?? [];
      if (!Array.isArray(data)) {
        throw new Error((res as any).message ?? "Unexpected response from server.");
      }
      const postable = data.filter((x) => x.totalPostable > 0);
      setBatchItems(postable);
      setCheckedIds(new Set(postable.map((x) => x.loanAccId)));
      setHasShown(true);

      if (postable.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Interest to Post",
          text: "No unposted interest found for the selected criteria.",
        });
      }
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to calculate interest. Please try again.", "error");
    } finally {
      setCalculating(false);
    }
  };

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  const allChecked = batchItems.length > 0 && checkedIds.size === batchItems.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < batchItems.length;

  const toggleAll = () => {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(batchItems.map((x) => x.loanAccId)));
  };

  const toggleOne = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Post selected ─────────────────────────────────────────────────────────

  const handlePost = async () => {
    const selected = batchItems.filter((x) => checkedIds.has(x.loanAccId));
    if (selected.length === 0) {
      Swal.fire("Warning", "No accounts selected for posting.", "warning");
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirm Posting",
      text: `Post interest for ${selected.length} account(s)?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Post",
      confirmButtonColor: "#3B82F6",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await loanInterestPostingApi.batchPost({
        brId: user.branchid,
        voucherDate: sessionDate,
        narration: narration || undefined,
        items: selected.map((x) => ({
          loanAccountId: x.loanAccId,
          stdInterestAmount: x.stdInterest,
          penalInterestAmount: x.penalInterest,
        })),
      });

      const result = (res as any).data ?? (res as any).Data;
      if (result) {
        const { successCount, failCount, errors: errs } = result;
        if (failCount === 0) {
          await Swal.fire({
            icon: "success",
            title: "Posted Successfully",
            text: `Interest posted for ${successCount} account(s).`,
            confirmButtonColor: "#3B82F6",
          });
        } else {
          await Swal.fire({
            icon: "warning",
            title: `Posted: ${successCount}, Failed: ${failCount}`,
            html: errs.length
              ? `<ul class="text-left text-sm mt-2">${errs.map((e: string) => `<li>• ${e}</li>`).join("")}</ul>`
              : undefined,
          });
        }
        // Re-calculate to refresh table
        await handleShow();
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to post interest." });
    } finally {
      setPosting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSelectedProductId(0);
    setSelectedAccountId(0);
    setLoanAccounts([]);
    setBatchItems([]);
    setCheckedIds(new Set());
    setNarration("");
    setErrors({});
    setHasShown(false);
  };

  // ── Options ───────────────────────────────────────────────────────────────

  const loanProductOptions = loanProducts.map((p) => ({ value: p.id, label: p.productName }));
  const loanAccountOptions = loanAccounts.map((a) => ({ value: a.accId, label: a.accountName }));

  const totalSelected = batchItems
    .filter((x) => checkedIds.has(x.loanAccId))
    .reduce((s, x) => s + x.totalPostable, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* ── Filter Card ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Loan Interest Posting Voucher</h2>
                      <p className="text-sm text-gray-600">Select product and account, then click Show to calculate interest</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>

              {/* Filter row */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

                  {/* Voucher Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher Date</label>
                    <input
                      type="text"
                      readOnly
                      value={sessionDate}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-not-allowed text-sm"
                    />
                  </div>

                  {/* Loan Product */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Loan Product <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={loanProductOptions}
                      value={loanProductOptions.find((o) => o.value === selectedProductId) ?? null}
                      onChange={handleProductChange}
                      placeholder={productsLoading ? "Loading…" : "Select Product"}
                      isClearable
                      isLoading={productsLoading}
                      noOptionsMessage={() => productsLoading ? "Loading…" : "No products"}
                      styles={selectStyles(!!errors.product)}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    {errors.product && <p className="mt-1 text-xs text-red-600">{errors.product}</p>}
                  </div>

                  {/* Loan Account (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Loan Account
                      <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <Select
                      options={loanAccountOptions}
                      value={loanAccountOptions.find((o) => o.value === selectedAccountId) ?? null}
                      onChange={handleAccountChange}
                      placeholder={accountsLoading ? "Loading…" : "All accounts"}
                      isClearable
                      isLoading={accountsLoading}
                      isDisabled={!selectedProductId || accountsLoading}
                      noOptionsMessage={() => !selectedProductId ? "Select product first" : "No accounts"}
                      styles={selectStyles()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  {/* Show + Reset buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleShow}
                      disabled={calculating || !selectedProductId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {calculating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calculating…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Show
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                      title="Reset"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Narration (shown when results are present) */}
                {hasShown && batchItems.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Narration</label>
                    <input
                      type="text"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      placeholder="Optional narration for the posting vouchers"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Results Table ─────────────────────────────────────────── */}
            {hasShown && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

                {/* Table header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      Interest Calculation Results
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {batchItems.length} account(s) with postable interest
                      {checkedIds.size > 0 && (
                        <span className="ml-2 text-blue-700 font-medium">
                          · {checkedIds.size} selected · Total: ₹{fmt(totalSelected)}
                        </span>
                      )}
                    </p>
                  </div>
                  {batchItems.length > 0 && (
                    <button
                      onClick={handlePost}
                      disabled={posting || checkedIds.size === 0}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {posting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Posting…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Post Selected ({checkedIds.size})
                        </>
                      )}
                    </button>
                  )}
                </div>

                {batchItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <AlertCircle className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">No unposted interest found</p>
                    <p className="text-xs mt-1">All accounts are up-to-date for this product</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <button onClick={toggleAll} className="flex items-center cursor-pointer">
                              {allChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : someChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-400 opacity-60" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Sr
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Account No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Member Name
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Principal Bal
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase tracking-wide">
                            Std Interest
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-rose-700 uppercase tracking-wide">
                            Penal Interest
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            Std Recoverable
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wide">
                            Total Postable
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Interest Detail
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchItems.map((item, idx) => {
                          const checked = checkedIds.has(item.loanAccId);
                          return (
                            <tr
                              key={item.loanAccId}
                              onClick={() => toggleOne(item.loanAccId)}
                              className={`cursor-pointer transition-colors ${
                                checked ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-4 py-3">
                                {checked ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-400" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-800 font-semibold">
                                {item.accountNumber}
                              </td>
                              <td className="px-4 py-3 text-gray-800">
                                <div className="font-medium">{item.memberName}</div>
                                {item.memberRelativeName && (
                                  <div className="text-xs text-gray-400">{item.memberRelativeName}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700">
                                ₹{fmt(item.principalBalance)}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-700 font-semibold">
                                ₹{fmt(item.stdInterest)}
                              </td>
                              <td className="px-4 py-3 text-right text-rose-700 font-semibold">
                                {item.penalInterest > 0 ? `₹${fmt(item.penalInterest)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right text-purple-700 font-semibold">
                                {item.stdRecoverable > 0 ? `₹${fmt(item.stdRecoverable)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-right text-green-700 font-bold">
                                ₹{fmt(item.totalPostable)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-600 leading-relaxed">
                                  <div>
                                    {fmtDateShort(item.calcFromDate)} → {fmtDateShort(item.calcToDate)}
                                  </div>
                                  <div className="text-gray-400">
                                    Std {item.stdInterestRate ?? "—"}%
                                    {item.overdueInterestRate ? ` · Penal ${item.overdueInterestRate}%` : ""}
                                    {" · "}{item.intCalcMethod}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Footer totals */}
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
                            Totals ({batchItems.length} accounts)
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">
                            ₹{fmt(batchItems.reduce((s, x) => s + x.stdInterest, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-rose-700">
                            ₹{fmt(batchItems.reduce((s, x) => s + x.penalInterest, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">
                            ₹{fmt(batchItems.reduce((s, x) => s + x.stdRecoverable, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                            ₹{fmt(batchItems.reduce((s, x) => s + x.totalPostable, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default LoanInterestPostingVoucher;
