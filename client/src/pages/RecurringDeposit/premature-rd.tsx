import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Landmark,
  PiggyBank,
  RotateCcw,
  Save,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import { useSelector } from "react-redux";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import rdAccountService from "../../services/accountMasters/rdaccount/rdaccountapi";
import { RootState } from "../../redux";
import { SavingAccounts } from "../vouchers/saving/savingdeposit";

type Option = { value: string | number; label: string };
type RDProduct = { id: number; productName: string };
type RDAccount = { accId: number; accountNumber: string; accountName: string };

const numberInput = (value: string, maxLength = 12) => {
  let cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  if (parts.length === 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return cleaned.slice(0, maxLength);
};

const amount = (value: string | number | null | undefined) =>
  typeof value === "number" ? value : parseFloat(value || "0") || 0;

const genderText = (value: string | number | undefined) =>
  value === 1 || value === "1" ? "Male" : value === 2 || value === "2" ? "Female" : value === 3 || value === "3" ? "Other" : value?.toString() || "";

const PrematureRDPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cash" | "saving" | "loan" | "additional">("cash");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [rdAccounts, setRdAccounts] = useState<RDAccount[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<SavingAccounts[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccounts[]>([]);
  const [loanOptions, setLoanOptions] = useState<Option[]>([]);
  const [loanProducts, setLoanProducts] = useState<Option[]>([]);

  const [personal, setPersonal] = useState({
    name: "", relativeName: "", relation: "", gender: "", addressLine: "", station: "", phoneNo: "", aadhaar: "", pan: "",
  });
  const [rd, setRd] = useState({
    date: sessionDate, rdAccountId: 0, rdNo: "", rdDate: "", rdAmount: 0, rdPeriod: 0, kistAmount: 0, kistInterval: 0,
    maturityAmt: 0, maturityDate: "", preMaturityAmt: "0.00", interestRate: 0, balance: 0, savingProduct: "", savingAccNo: "",
    savingAccName: "", savingBal: 0, DetailId: 0
  });
  const [credit, setCredit] = useState({
    cashAccountId: 0, cashAmount: "", savingAccountId: 0, savingAmount: "", loanProduct: "", loanAccountId: 0, loanBalance: 0,
    loanAmount: "", incomeAccountId: 0, incomeAmount: "", expenseAmount: "", closingCharges: "", narration: "",
  });

  const pendingAmount = amount(rd.preMaturityAmt) - amount(credit.cashAmount) - amount(credit.savingAmount) - amount(credit.loanAmount);
  const totalSettlement = amount(credit.cashAmount) + amount(credit.savingAmount) + amount(credit.loanAmount);
  const netVoucherImpact = totalSettlement + amount(credit.incomeAmount) - amount(credit.expenseAmount) - amount(credit.closingCharges);

  const selectStyles = {
    control: (base: any, state: any) => ({ ...base, minHeight: "42px", borderWidth: "2px", borderRadius: "0.75rem", cursor: "pointer", borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb", boxShadow: "none", "&:hover": { borderColor: "#60a5fa" } }),
    option: (base: any, state: any) => ({ ...base, cursor: "pointer", backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#dbeafe" : "#fff", color: state.isSelected ? "#fff" : "#334155" }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  useEffect(() => {
    const load = async () => {
      const [products, generals, savings] = await Promise.all([
        commonservice.fetch_rd_products(user.branchid),
        commonservice.general_accmasters_info(user.branchid),
        commonservice.fetch_Saving_Accounts(user.branchid, sessionDate),
      ]);
      setRdProducts(Array.isArray(products.data) ? products.data : []);
      if (generals.success) setGeneralAccounts(generals.data || []);
      if (savings.success) setSavingAccounts(savings.data || []);
      setLoanOptions([{ value: "1", label: "Loan Account 001" }, { value: "2", label: "Loan Account 002" }]);
      setLoanProducts([{ value: "LP-001", label: "Personal Loan" }, { value: "LP-002", label: "Home Loan" }]);
    };
    if (user.branchid) load();
  }, [user.branchid, sessionDate]);

  const resetAll = () => {
    setSelectedProduct(null);
    setSelectedAccount(null);
    setRdAccounts([]);
    setPersonal({ name: "", relativeName: "", relation: "", gender: "", addressLine: "", station: "", phoneNo: "", aadhaar: "", pan: "" });
    setRd({ date: sessionDate, rdAccountId: 0, rdNo: "", rdDate: "", rdAmount: 0, rdPeriod: 0, kistAmount: 0, kistInterval: 0, maturityAmt: 0, maturityDate: "", preMaturityAmt: "0.00", interestRate: 0, balance: 0, savingProduct: "", savingAccNo: "", savingAccName: "", savingBal: 0, DetailId: 0 });
    setCredit({ cashAccountId: 0, cashAmount: "", savingAccountId: 0, savingAmount: "", loanProduct: "", loanAccountId: 0, loanBalance: 0, loanAmount: "", incomeAccountId: 0, incomeAmount: "", expenseAmount: "", closingCharges: "", narration: "" });
  };

  const onProductChange = async (productId: number | null) => {
    setSelectedProduct(productId);
    setSelectedAccount(null);
    setPersonal({ name: "", relativeName: "", relation: "", gender: "", addressLine: "", station: "", phoneNo: "", aadhaar: "", pan: "" });
    setRd({ ...rd, rdAccountId: 0, rdNo: "", savingProduct: rdProducts.find((x) => x.id === productId)?.productName || "" });
    if (!productId) return setRdAccounts([]);
    const response = await commonservice.fetch_RD_Open_Accounts_For_Premature(user.branchid, productId, sessionDate);
    setRdAccounts(response.success && Array.isArray(response.data) ? response.data : []);
  };

  const onAccountChange = async (accountId: number | null) => {
    setSelectedAccount(accountId);
    if (!accountId || !selectedProduct) return;
    const response = await rdAccountService.getRDAccountById(accountId, user.branchid, sessionDate);
    if (!response.success || !response.data) return Swal.fire("Error", response.message || "Failed to fetch RD details", "error");
    const data = response.data;
    const detail = data.rdAccountDetailDTO || {};
    const master = data.accountMasterDTO || {};
    setPersonal({
      name: master.accountName || "", relativeName: master.relativeName || "", relation: "", gender: genderText(master.gender),
      addressLine: master.addressLine || "", station: "", phoneNo: master.phoneNo1 || "", aadhaar: "", pan: "",
    });
    setRd({
      date: sessionDate,
      rdAccountId: accountId,
      rdNo: master.accountNumber || "",
      rdDate: detail.rdDate?.split("T")[0] || "",
      rdAmount: detail.rdAmount || 0,
      rdPeriod: detail.noOfMonths || 0,
      kistAmount: detail.kistAmt || 0,
      kistInterval: detail.kistInterval || 0,
      maturityAmt: detail.maturityAmt || 0,
      maturityDate: detail.maturityDate?.split("T")[0] || "",
      preMaturityAmt: (data.preMaturityAmount || detail.maturityAmt || 0).toFixed(2),
      interestRate: detail.interestRate || 0,
      balance: detail.rdAmount || 0,
      savingProduct: "",
      savingAccNo: "",
      savingAccName: data.savingAccountName || "",
      savingBal: 0,
      DetailId: detail.detailId || 0,
    });
  };

  const submit = async () => {
    if (!rd.rdAccountId) return Swal.fire("Warning", "Please select RD account first", "warning");
    if (totalSettlement <= 0) return Swal.fire("Warning", "At least one settlement amount is required", "warning");
    if (pendingAmount !== 0) return Swal.fire("Warning", `Pending amount must be zero. Current difference is ₹${Math.abs(pendingAmount).toFixed(2)}`, "warning");
    setLoading(true);
    try {
      const normalizedCreditAccountDetails = {
        ...credit,
        cashAmount: amount(credit.cashAmount),
        cashaccountId: credit.cashAccountId,
        savingAmount: amount(credit.savingAmount),
        savingAccountId: credit.savingAccountId,
        loanAmount: amount(credit.loanAmount),
        loanAccountId: credit.loanAccountId,
        intPostingAmt: amount(credit.incomeAmount),
        closingCharges: amount(credit.closingCharges),
        tdsAmount: amount(credit.expenseAmount),
      };

      const CommonAccMasterDTO = {
        MatureRDInfo: {
          BranchId: user.branchid,
          RDAccountId: rd.rdAccountId,
          DetailId: rd.DetailId,
          CreditAccountId: credit.savingAccountId || credit.cashAccountId || credit.loanAccountId,
          DebitAccountId: credit.cashAccountId,
          IncomeAccountId: credit.incomeAccountId,
          VoucherDate: rd.date,
          TotalAmount: totalSettlement,
          TotalInterestAmount: amount(credit.incomeAmount),
          Narration: credit.narration,
          ClosingCharges: normalizedCreditAccountDetails.closingCharges,
          RDProductId: selectedProduct || 0,
          IsPrematureClosure: true,
          PreMaturityAmount: amount(rd.preMaturityAmt),
        },
        CreditAccountDetails: normalizedCreditAccountDetails,
      };

      await rdAccountService.preMatureRD(CommonAccMasterDTO);
      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: "RD premature voucher saved successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      resetAll();
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to save premature RD voucher", "error");
    } finally {
      setLoading(false);
    }
  };

  const productOptions = rdProducts.map((x) => ({ value: x.id, label: x.productName }));
  const accountOptions = rdAccounts.map((x) => ({ value: x.accId, label: x.accountName }));
  const generalOptions = generalAccounts.map((x) => ({ value: x.accId, label: x.accountName }));
  const savingOptions = savingAccounts.map((x) => ({ value: x.accId, label: x.accountName }));
  const tabs = [
    { id: "cash" as const, label: "Cash / Other", icon: Wallet },
    { id: "saving" as const, label: "Saving Account", icon: PiggyBank },
    { id: "loan" as const, label: "Loan Account", icon: Landmark },
    { id: "additional" as const, label: "Additional Details", icon: FileSpreadsheet },
  ];
  const show = (label: string, value: React.ReactNode, tone = "text-gray-800", border = "border-green-500") => (
    <div className="flex flex-col space-y-2">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500" />
        {label}
      </label>
      <div className={`bg-white px-4 py-3 rounded-lg border-l-4 shadow-sm ${border}`}>
        <span className={`text-base font-semibold ${tone}`}>{value || <span className="text-gray-400">-</span>}</span>
      </div>
    </div>
  );
  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
      {icon}
      {title}
    </h3>
  );
  const inputClass = "px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-700 bg-white";

  return (
    <DashboardLayout enableScroll={true} mainContent={
      <div className="bg-gradient-to-br from-gray-100 to-green-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Premature Recurring Deposit Account
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    Close and settle your recurring deposit before maturity
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => Swal.fire("Info", "Joint account detail view can be wired here next.", "info")} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all font-medium text-sm">Joint Acc Detail</button>
                <button type="button" onClick={() => navigate("/voucher-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium text-sm"><ArrowLeft className="w-4 h-4" /> Back To Operations</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200 p-6">
              {sectionTitle(<Search className="h-5 w-5 text-sky-600" />, "Search RD Account")}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div><label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><div className="w-2 h-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full" />Date <span className="text-red-500 text-xs">*</span></label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="date" readOnly value={rd.date} className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-700 bg-gradient-to-r from-white to-gray-50" /></div></div>
                <div><label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />RD Product <span className="text-red-500 text-xs">*</span></label><Select options={productOptions} value={productOptions.find((x) => x.value === selectedProduct) || null} onChange={(o) => onProductChange(Number(o?.value) || null)} isClearable styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed" /></div>
                <div><label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" />RD Account <span className="text-red-500 text-xs">*</span></label><Select options={accountOptions} value={accountOptions.find((x) => x.value === selectedAccount) || null} onChange={(o) => onAccountChange(Number(o?.value) || null)} isDisabled={!selectedProduct} isClearable styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed" /></div>
              </div>
            </div>

            {!!rd.rdNo && <>
              <div className="p-6 sm:p-8 border-b border-gray-200">
                {sectionTitle(<UserRound className="w-5 h-5 text-green-500" />, "Personal Detail")}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {show("Name", personal.name, "text-slate-900")}{show("Relative Name", personal.relativeName)}{show("Relation", personal.relation)}{show("Gender", personal.gender)}{show("Address Line", personal.addressLine)}{show("Station", personal.station)}{show("Phone No.", personal.phoneNo)}{show("Aadhaar Card", personal.aadhaar)}<div className="md:col-span-2 xl:col-span-4">{show("PAN Card No.", personal.pan)}</div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-gradient-to-br from-green-50/30 to-teal-50/30 border-b border-gray-200">
                {sectionTitle(<PiggyBank className="w-5 h-5 text-green-500" />, "RD Detail")}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {show("RD No.", rd.rdNo, "text-slate-900")}{show("RD Date", rd.rdDate)}{show("RD Amount", `₹ ${rd.rdAmount.toFixed(2)}`, "text-emerald-700")}{show("RD Period", rd.rdPeriod ? `${rd.rdPeriod} Months` : "")}{show("Kist Amount", `₹ ${rd.kistAmount.toFixed(2)}`, "text-sky-700")}{show("Kist Int", rd.kistInterval)}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pre-Maturity Amt</p><input type="text" inputMode="decimal" value={rd.preMaturityAmt} onChange={(e) => setRd({ ...rd, preMaturityAmt: numberInput(e.target.value) })} className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-amber-800 outline-none focus:border-amber-400" /></div>
                  {show("Interest Rate", `${rd.interestRate}%`)}{show("Balance", `₹ ${rd.balance.toFixed(2)}`, "text-blue-700")}{show("Maturity Amt", `₹ ${rd.maturityAmt.toFixed(2)}`, "text-emerald-700")}{show("Maturity Date", rd.maturityDate)}{show("Saving Product", rd.savingProduct)}{show("Saving Acc No.", rd.savingAccNo)}{show("Saving Acc Name", rd.savingAccName)}{show("Saving Bal.", rd.savingBal ? `₹ ${rd.savingBal.toFixed(2)}` : "")}{show("Pending Amount", `₹ ${Math.abs(pendingAmount).toFixed(2)}`, pendingAmount > 0 ? "text-red-600" : pendingAmount < 0 ? "text-orange-600" : "text-emerald-600")}
                </div>
                {pendingAmount !== 0 && <div className={`mt-6 border-l-4 p-4 rounded-lg flex items-start gap-3 ${pendingAmount > 0 ? "bg-amber-50 border-amber-500" : "bg-orange-50 border-orange-500"}`}><AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${pendingAmount > 0 ? "text-amber-500" : "text-orange-500"}`} /><div><p className="text-sm font-semibold text-gray-800">{pendingAmount > 0 ? `Pending: ₹${pendingAmount.toFixed(2)}` : `Excess: ₹${Math.abs(pendingAmount).toFixed(2)}`}</p><p className="text-xs mt-1 text-gray-600">Adjust the settlement amounts below so the premature amount matches exactly.</p></div></div>}
              </div>

              <div className="p-6 sm:p-8 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Account Credit Details
                  <span className="text-red-500 text-xs ml-2">(At least one entry required)</span>
                </h3>

                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const activeStyle: React.CSSProperties = {
                      cash: { background: "linear-gradient(to right,#3b82f6,#2563eb)", color: "#fff" },
                      saving: { background: "linear-gradient(to right,#a855f7,#9333ea)", color: "#fff" },
                      loan: { background: "linear-gradient(to right,#f43f5e,#e11d48)", color: "#fff" },
                      additional: { background: "linear-gradient(to right,#10b981,#059669)", color: "#fff" },
                    }[tab.id] ?? {};

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={isActive ? activeStyle : {}}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                          isActive ? "shadow-md scale-105" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {activeTab === "cash" && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Cash / Other Account</label>
                        <Select
                          options={generalOptions}
                          value={generalOptions.find((x) => x.value === credit.cashAccountId) || null}
                          onChange={(o) => setCredit({ ...credit, cashAccountId: Number(o?.value) || 0 })}
                          placeholder="Select General Account"
                          isClearable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.cashAmount}
                          onChange={(e) => setCredit({ ...credit, cashAmount: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono text-lg bg-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "saving" && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Saving Account</label>
                        <Select
                          options={savingOptions}
                          value={savingOptions.find((x) => x.value === credit.savingAccountId) || null}
                          onChange={(o) => setCredit({ ...credit, savingAccountId: Number(o?.value) || 0 })}
                          placeholder="Select Saving Account"
                          isClearable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.savingAmount}
                          onChange={(e) => setCredit({ ...credit, savingAmount: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none font-mono text-lg bg-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "loan" && (
                  <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border border-rose-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Loan Account</label>
                        <Select
                          options={loanOptions}
                          value={loanOptions.find((x) => x.value === credit.loanAccountId) || null}
                          onChange={(o) => setCredit({ ...credit, loanAccountId: Number(o?.value) || 0 })}
                          placeholder="Select Loan Account"
                          isClearable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.loanAmount}
                          onChange={(e) => setCredit({ ...credit, loanAmount: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-rose-200 rounded-lg focus:border-rose-500 outline-none font-mono text-lg bg-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Loan Product</label>
                        <Select
                          options={loanProducts}
                          value={loanProducts.find((x) => x.value === credit.loanProduct) || null}
                          onChange={(o) => setCredit({ ...credit, loanProduct: o?.value?.toString() || "" })}
                          placeholder="Select product"
                          isClearable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "additional" && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Income Account (Cr)</label>
                        <Select
                          options={generalOptions}
                          value={generalOptions.find((x) => x.value === credit.incomeAccountId) || null}
                          onChange={(o) => setCredit({ ...credit, incomeAccountId: Number(o?.value) || 0 })}
                          placeholder="Select income account"
                          isClearable
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Income Amount (Cr)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.incomeAmount}
                          onChange={(e) => setCredit({ ...credit, incomeAmount: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Expense Amount (Dr)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.expenseAmount}
                          onChange={(e) => setCredit({ ...credit, expenseAmount: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Closing Charges</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={credit.closingCharges}
                          onChange={(e) => setCredit({ ...credit, closingCharges: numberInput(e.target.value) })}
                          className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Loan Acc. Balance</label>
                        <div className="px-4 py-3 border-2 border-emerald-200 rounded-lg bg-white font-mono">
                          {credit.loanBalance.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex flex-col md:col-span-2 lg:col-span-3">
                        <label className="text-sm font-semibold text-gray-700 mb-2">Narration</label>
                        <textarea
                          rows={3}
                          value={credit.narration}
                          onChange={(e) => setCredit({ ...credit, narration: e.target.value })}
                          className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none bg-white resize-none"
                          placeholder="Enter narration..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Total Credit Amount</p>
                      <p className="text-3xl font-bold font-mono">₹ {totalSettlement.toFixed(2)}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-b border-gray-200">
                {sectionTitle(<FileSpreadsheet className="w-5 h-5 text-green-500" />, "Interest Detail")}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200"><label className="mb-2 block text-sm font-semibold text-gray-700">Narration</label><textarea rows={6} value={credit.narration} onChange={(e) => setCredit({ ...credit, narration: e.target.value })} className="w-full resize-none px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none bg-white" placeholder="Add voucher narration or premature closure remarks..." /></div>
                  <div className="space-y-4">{show("Total Settlement", `₹ ${totalSettlement.toFixed(2)}`, "text-emerald-700")}{show("Net Voucher Impact", `₹ ${netVoucherImpact.toFixed(2)}`, "text-sky-700")}{show("Income Amount", `₹ ${amount(credit.incomeAmount).toFixed(2)}`)}{show("Closing Charges", `₹ ${amount(credit.closingCharges).toFixed(2)}`)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-4 p-6 sm:p-8">
                <button type="button" onClick={resetAll} className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all hover:scale-105 text-sm"><RotateCcw className="w-4 h-4" /> Reset</button>
                <button type="button" onClick={submit} disabled={loading} className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md text-sm"><Save className="w-4 h-4" />{loading ? "Processing..." : "Premature RD"}</button>
              </div>
            </>}
          </div>
        </div>
      </div>
    } />
  );
};

export default PrematureRDPage;
