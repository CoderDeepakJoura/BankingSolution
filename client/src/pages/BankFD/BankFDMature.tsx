import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  ArrowLeft, Landmark, Search, FileText, RefreshCw, DollarSign, Save, RotateCcw, AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import DatePicker from "../../components/DatePicker";
import bankFDMatureApi, {
  BFDAccountOption, BFDDetailItem, BFDAccountDetailsResponse,
  TDSSlab, calcBFDMaturityAmount, findTDSRate,
} from "../../services/bankfd/bankFDMatureApi";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const compLabel = (v: number) => ({ 12: "Monthly", 4: "Quarterly", 2: "Half-Yearly", 1: "Yearly", 0: "No Compounding" }[v] ?? String(v));

interface GenAcc { value: number; label: string; }

const BankFDMaturePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const workingDate = commonservice.parseWorkingDate(user.workingdate);

  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BFDAccountOption[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<number | null>(null);
  const [accountData, setAccountData] = useState<BFDAccountDetailsResponse | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<BFDDetailItem | null>(null);
  const [generalAccounts, setGeneralAccounts] = useState<GenAcc[]>([]);

  // TDS
  const [hasTDSSetting, setHasTDSSetting] = useState(false);
  const [tdsAccId, setTdsAccId] = useState<number | null>(null);
  const [withPan, setWithPan] = useState(false);
  const [tdsRate, setTdsRate] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);

  // Payout
  const [payoutAccId, setPayoutAccId] = useState<number | null>(null);
  const [intIncomeAccId, setIntIncomeAccId] = useState<number | null>(null);
  const [narration, setNarration] = useState("");

  // Interest override — null means use DB-derived value
  const [overrideInterest, setOverrideInterest] = useState<number | null>(null);

  // Renew
  const [isRenew, setIsRenew] = useState(false);
  const [renewMonths, setRenewMonths] = useState("");
  const [renewDays, setRenewDays] = useState("");
  const [renewMatAmt, setRenewMatAmt] = useState(0);

  const selectStyles = {
    control: (b: any, s: any) => ({
      ...b, minHeight: "42px", borderWidth: "2px", cursor: "pointer",
      borderColor: s.isFocused ? "#3b82f6" : "#e5e7eb", borderRadius: "0.5rem",
      boxShadow: s.isFocused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    option: (b: any, s: any) => ({
      ...b, backgroundColor: s.isSelected ? "#3b82f6" : s.isFocused ? "#dbeafe" : "#fff",
      color: s.isSelected ? "#fff" : "#374151", cursor: "pointer",
    }),
    menu: (b: any) => ({ ...b, borderRadius: "0.5rem", zIndex: 9999 }),
    menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
    placeholder: (b: any) => ({ ...b, color: "#9ca3af" }),
  };

  // Load accounts on mount
  useEffect(() => {
    if (!user.branchid) return;
    bankFDMatureApi.getMaturedAccounts(user.branchid, workingDate)
      .then(r => setAccounts((r as any)?.data ?? []));
    commonservice.general_accmasters_info(user.branchid)
      .then(r => setGeneralAccounts((r.data ?? []).map((a: any) => ({ value: a.accId, label: a.accountName }))));
  }, [user.branchid]);

  // Load account details on selection
  const handleAccountChange = async (accId: number | null) => {
    setSelectedAccId(accId);
    setSelectedDetail(null);
    setAccountData(null);
    resetPayoutSection();
    if (!accId) return;
    const res = await bankFDMatureApi.getAccountDetails(user.branchid, accId, workingDate, false);
    const data: BFDAccountDetailsResponse = (res as any)?.data;
    if (!data) return;
    setAccountData(data);
    const hasSetting = !!data.tdsSetting;
    setHasTDSSetting(hasSetting);
    setTdsAccId(hasSetting ? data.tdsSetting!.tdsAccId : null);
    setIntIncomeAccId(data.intIncomeSetting?.intIncomeAccId ?? null);
  };

  const handleDetailSelect = (detail: BFDDetailItem) => {
    setSelectedDetail(detail);
    setOverrideInterest(null);
    resetPayoutSection();
    recalcTDS(detail, accountData?.tdsSlabs ?? []);
  };

  const recalcTDS = (detail: BFDDetailItem, slabs: TDSSlab[], interestOverride?: number) => {
    if (!hasTDSSetting || slabs.length === 0) { setTdsRate(0); setTdsAmount(0); return; }
    const interest = interestOverride ?? Math.max(0, detail.maturityAmount - detail.fdAmount);
    const rate = findTDSRate(interest, slabs, withPan);
    const tds = Math.round((interest * rate) / 100 * 100) / 100;
    setTdsRate(rate);
    setTdsAmount(tds);
  };

  const resetPayoutSection = () => {
    setPayoutAccId(null);
    setIntIncomeAccId(null);
    setNarration("");
    setTdsRate(0);
    setTdsAmount(0);
    setIsRenew(false);
    setRenewMonths("");
    setRenewDays("");
    setRenewMatAmt(0);
  };

  const handleReset = () => {
    setSelectedAccId(null);
    setSelectedDetail(null);
    setAccountData(null);
    setOverrideInterest(null);
    resetPayoutSection();
  };

  // Recalculate renew maturity amount when period changes
  useEffect(() => {
    if (!selectedDetail || !isRenew) return;
    const months = parseInt(renewMonths) || 0;
    const days = parseInt(renewDays) || 0;
    if (!months && !days) { setRenewMatAmt(0); return; }
    const baseInt = Math.max(0, selectedDetail.maturityAmount - selectedDetail.fdAmount);
    const effInt = overrideInterest !== null ? overrideInterest : baseInt;
    const effMatAmt = selectedDetail.fdAmount + effInt;
    const newPrincipal = effMatAmt - tdsAmount;
    const newFDDate = workingDate;
    const start = new Date(newFDDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() + days);
    const matDate = end.toISOString().split("T")[0];
    const amt = calcBFDMaturityAmount(newPrincipal, selectedDetail.intRate, selectedDetail.intCompInterval, newFDDate, matDate);
    setRenewMatAmt(amt);
  }, [renewMonths, renewDays, isRenew, selectedDetail, tdsAmount, overrideInterest]);

  const handleSubmit = async () => {
    if (!selectedDetail || !selectedAccId) {
      Swal.fire("Warning", "Please select an FD detail.", "warning"); return;
    }
    if (!isRenew && !payoutAccId) {
      Swal.fire("Warning", "Please select a Payout Account.", "warning"); return;
    }
    if (!intIncomeAccId) {
      Swal.fire("Warning", "Please select an Interest Income Account.", "warning"); return;
    }
    if (isRenew && !parseInt(renewMonths) && !parseInt(renewDays)) {
      Swal.fire("Warning", "Please enter the renewal period (months or days).", "warning"); return;
    }

    setLoading(true);
    try {
      const effMatAmt = overrideInterest !== null
        ? selectedDetail.fdAmount + overrideInterest
        : undefined;
      const res = await bankFDMatureApi.mature({
        branchId: user.branchid,
        accId: selectedAccId,
        detailId: selectedDetail.id,
        voucherDate: workingDate,
        payoutAccId: payoutAccId ?? 0,
        intIncomeAccId: intIncomeAccId!,
        tDSAmount: hasTDSSetting ? tdsAmount : 0,
        tDSAccId: hasTDSSetting && tdsAmount > 0 ? tdsAccId : null,
        narration,
        isRenew,
        renewMonths: parseInt(renewMonths) || 0,
        renewDays: parseInt(renewDays) || 0,
        renewMaturityAmount: renewMatAmt,
        overrideMaturityAmount: effMatAmt,
      });
      await Swal.fire({ icon: "success", title: "Success!", text: (res as any).message || "Saved successfully.", timer: 1800, showConfirmButton: false });
      handleReset();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save.", "error");
    } finally {
      setLoading(false);
    }
  };

  const baseInterest = selectedDetail ? Math.max(0, selectedDetail.maturityAmount - selectedDetail.fdAmount) : 0;
  const interest = overrideInterest !== null ? overrideInterest : baseInterest;
  const effectiveMaturityAmount = selectedDetail ? selectedDetail.fdAmount + interest : 0;
  const netPayout = selectedDetail ? effectiveMaturityAmount - (hasTDSSetting ? tdsAmount : 0) : 0;

  const accOptions = accounts.map(a => ({ value: a.accId, label: `${a.accNo} — ${a.accountName}` }));

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Landmark className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Bank FD — Mature / Renew
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Close or renew a matured Bank Fixed Deposit</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/voucher-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Operations
                </button>
              </div>
            </div>

            {/* Main card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* Search section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-500" /> Select Account
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Voucher Date</label>
                    <DatePicker value={workingDate} disabled onChange={() => {}} workingDate={workingDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank FD Account <span className="text-red-500">*</span></label>
                    <Select
                      options={accOptions}
                      value={accOptions.find(o => o.value === selectedAccId) ?? null}
                      onChange={o => handleAccountChange(o?.value ?? null)}
                      placeholder="Select matured account..."
                      isClearable styles={selectStyles}
                      menuPortalTarget={document.body} menuPosition="fixed"
                    />
                  </div>
                </div>
              </div>

              {/* Eligible details table */}
              {accountData && accountData.details.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> Matured FD Details — select one to close
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        <tr>
                          {["LTD No", "FD Date", "Maturity Date", "Principal", "Rate", "Compounding", "Maturity Amt", ""].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {accountData.details.map((d, i) => {
                          const isSelected = selectedDetail?.id === d.id;
                          return (
                            <tr key={d.id} className={`border-b border-gray-100 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                              <td className="px-4 py-2.5 font-mono text-gray-700">{d.ltdNo}</td>
                              <td className="px-4 py-2.5 text-gray-700">{new Date(d.fdDate).toLocaleDateString("en-GB")}</td>
                              <td className="px-4 py-2.5 text-gray-700">{new Date(d.fdMaturityDate).toLocaleDateString("en-GB")}</td>
                              <td className="px-4 py-2.5 text-right font-mono">₹{fmt(d.fdAmount)}</td>
                              <td className="px-4 py-2.5 text-center">{d.intRate.toFixed(2)}%</td>
                              <td className="px-4 py-2.5 text-center">{compLabel(d.intCompInterval)}</td>
                              <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">₹{Math.round(d.maturityAmount).toLocaleString("en-IN")}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => handleDetailSelect(d)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-blue-100 text-gray-700"}`}
                                >
                                  {isSelected ? "Selected" : "Select"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FD info + payout section */}
              {selectedDetail && (
                <>
                  {/* Info panel */}
                  <div className="p-6 bg-gradient-to-br from-blue-50/40 to-purple-50/40 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" /> FD Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        { label: "Principal", value: `₹${fmt(selectedDetail.fdAmount)}`, color: "border-blue-500" },
                        { label: "Maturity Amount", value: `₹${fmt(effectiveMaturityAmount)}`, color: "border-purple-500" },
                        { label: "TDS Deducted", value: hasTDSSetting ? `₹${fmt(tdsAmount)}` : "No TDS Setting", color: "border-orange-500" },
                        { label: "Net Payout", value: `₹${fmt(netPayout)}`, color: "border-green-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`bg-white rounded-lg border-l-4 ${color} px-4 py-3 shadow-sm`}>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                          <p className="text-base font-bold text-gray-800 font-mono">{value}</p>
                        </div>
                      ))}
                      {/* Editable Interest Earned */}
                      <div className="bg-white rounded-lg border-l-4 border-emerald-500 px-4 py-3 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          Interest Earned
                          {overrideInterest !== null && (
                            <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded font-medium">Edited</span>
                          )}
                        </p>
                        <input
                          type="number"
                          value={interest}
                          min={0}
                          step={0.01}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setOverrideInterest(val);
                            if (hasTDSSetting && accountData?.tdsSlabs.length) {
                              const r = findTDSRate(val, accountData.tdsSlabs, withPan);
                              setTdsRate(r);
                              setTdsAmount(Math.round(val * r / 100 * 100) / 100);
                            }
                          }}
                          className="w-full text-base font-bold text-gray-800 font-mono bg-transparent border-b-2 border-emerald-300 outline-none focus:border-emerald-600 py-0.5"
                        />
                        {overrideInterest !== null && (
                          <button
                            onClick={() => { setOverrideInterest(null); recalcTDS(selectedDetail!, accountData?.tdsSlabs ?? []); }}
                            className="text-xs text-gray-400 hover:text-emerald-600 mt-1 underline"
                          >
                            ↩ Reset to {fmt(baseInterest)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TDS section */}
                  {hasTDSSetting && (
                    <div className="p-6 border-b border-gray-200 bg-amber-50">
                      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        TDS (Section 194A)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="withPan" checked={withPan}
                            onChange={e => { setWithPan(e.target.checked); recalcTDS(selectedDetail, accountData?.tdsSlabs ?? []); }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                          <label htmlFor="withPan" className="text-sm font-medium text-gray-700 cursor-pointer">Customer has PAN Card</label>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">TDS Rate %</label>
                          <input type="number" value={tdsRate} min={0} step={0.01}
                            onChange={e => {
                              const r = parseFloat(e.target.value) || 0;
                              setTdsRate(r);
                              setTdsAmount(Math.round(interest * r / 100 * 100) / 100);
                            }}
                            className="w-full px-3 py-2.5 border-2 border-amber-300 rounded-lg text-sm outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">TDS Amount ₹</label>
                          <input type="number" value={tdsAmount} min={0} step={0.01}
                            onChange={e => setTdsAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2.5 border-2 border-amber-300 rounded-lg text-sm outline-none focus:border-amber-500 font-mono" />
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasTDSSetting && (
                    <div className="mx-6 my-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      No TDS account is linked to this FD's account head. TDS will not be deducted.
                    </div>
                  )}

                  {/* Renew toggle */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-purple-50/40">
                    <label className="flex items-center gap-3 cursor-pointer w-fit">
                      <div className="relative">
                        <input type="checkbox" checked={isRenew} onChange={e => setIsRenew(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                      </div>
                      <div>
                        <span className="text-base font-semibold text-gray-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-500" /> Renew FD</span>
                        <p className="text-xs text-gray-500">Roll over into a new FD instead of paying out</p>
                      </div>
                    </label>

                    {isRenew && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Renewal Period — Months</label>
                          <input type="number" value={renewMonths} min={0} onChange={e => setRenewMonths(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-lg text-sm outline-none focus:border-purple-500" placeholder="e.g. 12" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Renewal Period — Days</label>
                          <input type="number" value={renewDays} min={0} onChange={e => setRenewDays(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-lg text-sm outline-none focus:border-purple-500" placeholder="e.g. 0" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Principal (after TDS)</label>
                          <div className="px-3 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm">
                            ₹{Math.round(Math.max(0, effectiveMaturityAmount - (hasTDSSetting ? tdsAmount : 0))).toLocaleString("en-IN")}
                          </div>
                        </div>
                        {renewMatAmt > 0 && (
                          <div className="sm:col-span-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2.5 text-sm text-purple-800">
                            Projected new maturity amount: <span className="font-bold font-mono">₹{fmt(renewMatAmt)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payout section */}
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" /> Accounts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {!isRenew && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payout Account (Dr) <span className="text-red-500">*</span></label>
                          <Select
                            options={generalAccounts}
                            value={generalAccounts.find(o => o.value === payoutAccId) ?? null}
                            onChange={o => setPayoutAccId(o?.value ?? null)}
                            placeholder="Cash / bank account..."
                            isClearable styles={selectStyles}
                            menuPortalTarget={document.body} menuPosition="fixed"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Interest Income Account (Cr) <span className="text-red-500">*</span></label>
                        <Select
                          options={generalAccounts}
                          value={generalAccounts.find(o => o.value === intIncomeAccId) ?? null}
                          onChange={o => setIntIncomeAccId(o?.value ?? null)}
                          placeholder="Interest income GL..."
                          isClearable styles={selectStyles}
                          menuPortalTarget={document.body} menuPosition="fixed"
                        />
                      </div>
                      <div className={!isRenew ? "" : "sm:col-span-2"}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Narration</label>
                        <input value={narration} onChange={e => setNarration(e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                          placeholder="Optional narration..." />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-4 p-6">
                    <button onClick={handleReset}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                        : <><Save className="w-4 h-4" /> {isRenew ? "Renew FD" : "Mature FD"}</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
};

export default BankFDMaturePage;
