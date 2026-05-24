import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  Calendar,
  Save,
  RotateCcw,
  FileText,
  Search,
  ArrowLeft,
  DollarSign,
  Percent,
  Wallet,
  PiggyBank,
  Landmark,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import rdAccountService from "../../services/accountMasters/rdaccount/rdaccountapi";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import { SavingAccounts } from "../vouchers/saving/savingdeposit";
import DatePicker from "../../components/DatePicker";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RDProduct {
  id: number;
  productName: string;
}

interface RDAccount {
  accId: number;
  accountNumber: string;
  accountName: string;
}

interface MatureRDDetail {
  rdDetailId: number;
  rdAccountId: number;
  rdAccountNo: string;
  date: string;
  product: number;
  maturityAmt: number;
  postMaturityAmt: string;
  rdDate: string;
  maturityDate: string;
  savingAccName: string;
  interestRate: number;
  receiptNo: string;
  deductedTDS: number;
  balance: number;
  intPayableAmt: string;
  pendingAmount: number;
  noOfMonths: number;
  noOfDays: number;
  kistAmt: number;
  kistInterval: number;
  firstKistDate: string;
  penaltyAmt: number;
  status: number;
  memberDateOfBirth: string;
}

interface AccountCreditDetail {
  generalAccountId: number;
  generalAmount: string;
  savingAccountId: number;
  savingAmount: string;
  loanAccountId: number;
  loanAmount: string;
  loanProduct: string;
  intPostingAmt: string;
  closingCharges: string;
  tdsAmount: string;
  penalAmount: string;
  penalAccountId: number;
  intDr: string;
  intCr: string;
  narration: string;
}

interface AccountOption {
  value: string | number;
  label: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MatureRDPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(false);
  const [isFetchingRD, setIsFetchingRD] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [activeTab, setActiveTab] = useState<"cash" | "saving" | "loan" | "additional">("cash");

  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedRDAccount, setSelectedRDAccount] = useState<number | null>(null);

  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [rdAccounts, setRdAccounts] = useState<RDAccount[]>([]);

  const [generalAccounts, setGeneralAccounts] = useState<SavingAccounts[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccounts[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<AccountOption[]>([]);
  const [loanProducts, setLoanProducts] = useState<AccountOption[]>([]);
  const [penalAccounts, setPenalAccounts] = useState<SavingAccounts[]>([]);

   const sessionDate =  commonservice.splitDate(user.workingdate);
  // ─── Blank Factories ────────────────────────────────────────────────────────

  const blankMatureDetail = (): MatureRDDetail => ({
    rdDetailId: 0,
    rdAccountId: 0,
    rdAccountNo: "",
    date: sessionDate,
    product: 0,
    maturityAmt: 0,
    postMaturityAmt: "0.00",
    rdDate: "",
    maturityDate: "",
    savingAccName: "",
    interestRate: 0,
    receiptNo: "",
    deductedTDS: 0,
    balance: 0,
    intPayableAmt: "0.00",
    pendingAmount: 0,
    noOfMonths: 0,
    noOfDays: 0,
    kistAmt: 0,
    kistInterval: 0,
    firstKistDate: "",
    penaltyAmt: 0,
    status: 0,
    memberDateOfBirth: "",
  });

  const [matureRDDetail, setMatureRDDetail] = useState<MatureRDDetail>(blankMatureDetail());

  const blankCredit = (): AccountCreditDetail => ({
    generalAccountId: 0,
    generalAmount: "",
    savingAccountId: 0,
    savingAmount: "",
    loanAccountId: 0,
    loanAmount: "",
    loanProduct: "",
    intPostingAmt: "",
    closingCharges: "",
    tdsAmount: "",
    penalAmount: "",
    penalAccountId: 0,
    intDr: "",
    intCr: "",
    narration: "",
  });

  const [accountCredit, setAccountCredit] = useState<AccountCreditDetail>(blankCredit());

  // ─── Pending Amount Calculation ─────────────────────────────────────────────

  const calculatePendingAmount = () => {
    const totalCredited =
      parseAmount(accountCredit.generalAmount) +
      parseAmount(accountCredit.savingAmount) +
      parseAmount(accountCredit.loanAmount);

    const baseAmount = Math.max(matureRDDetail.maturityAmt, matureRDDetail.balance);
    const postMaturity = parseFloat(matureRDDetail.postMaturityAmt || "0") || 0;
    const totalRequired = baseAmount + postMaturity;

    return totalRequired - totalCredited;
  };

  // ─── Custom Select Styles ────────────────────────────────────────────────────

  const customSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: "42px",
      borderWidth: "2px",
      cursor: "pointer",
      borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
      borderRadius: "0.5rem",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
      background: "linear-gradient(to right, #ffffff, #f9fafb)",
      "&:hover": { borderColor: "#3b82f6" },
      transition: "all 0.3s",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#dbeafe" : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#374151",
      padding: "10px 16px",
      cursor: "pointer",
      "&:active": { backgroundColor: "#3b82f6" },
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: "0.5rem",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      marginTop: "4px",
      zIndex: 9999,
    }),
    menuList: (base: any) => ({ ...base, padding: "4px", maxHeight: "250px" }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    placeholder: (base: any) => ({ ...base, color: "#9ca3af" }),
    singleValue: (base: any) => ({ ...base, color: "#374151" }),
    dropdownIndicator: (base: any, state: any) => ({
      ...base,
      color: state.isFocused ? "#3b82f6" : "#6b7280",
      "&:hover": { color: "#3b82f6" },
    }),
    indicatorSeparator: (base: any) => ({ ...base, backgroundColor: "#e5e7eb" }),
  };

  // ─── Number Helpers ──────────────────────────────────────────────────────────

  const validateNumberInput = (value: string, maxLength = 10): string => {
    let cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);
    if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
    return cleaned;
  };

  const parseAmount = (value: string | number | null | undefined): number =>
    typeof value === "number" ? value : parseFloat(value || "0") || 0;

  // ─── Load RD Products ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        const rdProductsRes = await commonservice.fetch_rd_products(user.branchid);
        setRdProducts(
          rdProductsRes.data && Array.isArray(rdProductsRes.data) ? rdProductsRes.data : [],
        );
      } catch {
        Swal.fire("Error", "Failed to load RD products", "error");
        setRdProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (user.branchid) fetchData();
  }, [user.branchid]);

  // ─── Load Account Dropdowns ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchAccountDropdowns = async () => {
      try {
        const [generalAccInfo, savingAccountsRes] = await Promise.all([
          commonservice.general_accmasters_info(user.branchid),
          commonservice.fetch_Saving_Accounts(user.branchid, matureRDDetail.date),
        ]);

        if (generalAccInfo.success) setGeneralAccounts(generalAccInfo.data);
        if (savingAccountsRes.success) {
          setSavingAccounts(savingAccountsRes.data);
          setPenalAccounts(savingAccountsRes.data);
        }

        setLoanAccounts([
          { value: "1", label: "Loan Account 001" },
          { value: "2", label: "Loan Account 002" },
          { value: "3", label: "Loan Account 003" },
        ]);
        setLoanProducts([
          { value: "LP-001", label: "Personal Loan" },
          { value: "LP-002", label: "Home Loan" },
          { value: "LP-003", label: "Vehicle Loan" },
        ]);
      } catch (error) {
        console.error("Error loading account dropdowns:", error);
      }
    };

    if (user.branchid) fetchAccountDropdowns();
  }, [user.branchid]);

  // ─── Fetch RD Accounts for selected product ──────────────────────────────────

  const fetchRDAccounts = async (productId: number) => {
    if (!productId) { setRdAccounts([]); return; }
    try {
      const response = await commonservice.fetch_RD_Open_Accounts(
        user.branchid,
        productId,
        matureRDDetail.date,
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        setRdAccounts(response.data);
      } else {
        setRdAccounts([]);
      }
    } catch {
      setRdAccounts([]);
    }
  };

  // ─── Product Change ──────────────────────────────────────────────────────────

  const handleProductChange = async (productId: number | null) => {
    setSelectedProduct(productId);
    setSelectedRDAccount(null);
    setRdAccounts([]);
    setMatureRDDetail(blankMatureDetail());

    if (productId && productId > 0) await fetchRDAccounts(productId);
  };

  // ─── RD Account Change ───────────────────────────────────────────────────────

 
  const handleRDAccountChange = async (accountId: number | null) => {
    setSelectedRDAccount(accountId);
    if (!accountId || !selectedProduct) return;

    setIsFetchingRD(true);
    try {
      const response = await rdAccountService.getRDAccountById(
        accountId,
        user.branchid,
        matureRDDetail.date,
      );

      if (response.success && response.data) {
        const data = response.data;
        const detail = data.rdAccountDetailDTO;
        const maturityAmt = detail?.maturityAmt || 0;
        const balance = detail?.rdAmount || 0;
      alert(JSON.stringify(detail));

        setMatureRDDetail({
          rdDetailId: detail?.detailId || 0,
          rdAccountId: accountId,
          rdAccountNo: data.accountMasterDTO?.accountNumber || "",
          date: sessionDate,
          product: selectedProduct,
          maturityAmt,
          postMaturityAmt: "0.00",
          rdDate: detail?.rdDate?.split("T")[0] || "",
          maturityDate: detail?.maturityDate?.split("T")[0] || "",
          savingAccName: data.savingAccountName || "",
          interestRate: detail?.interestRate || 0,
          receiptNo: data.accountMasterDTO?.ltdNo || "",
          deductedTDS: 0,
          balance,
          intPayableAmt: "0.00",
          pendingAmount: Math.max(maturityAmt, balance),
          noOfMonths: detail?.noOfMonths || 0,
          noOfDays: detail?.noOfDays || 0,
          kistAmt: detail?.kistAmt || 0,
          kistInterval: detail?.kistInterval || 0,
          firstKistDate: detail?.firstKistDate?.split("T")[0] || "",
          penaltyAmt: detail?.penaltyAmt || 0,
          status: detail?.status || 0,
          memberDateOfBirth: data.accountMasterDTO?.dob?.split("T")[0] || "",
        });

        Swal.fire({
          icon: "success",
          title: "RD Details Loaded",
          text: `Account: ${data.accountMasterDTO?.accountNumber}`,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "RD Account not found");
      }
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to fetch RD account details", "error");
      setMatureRDDetail(blankMatureDetail());
    } finally {
      setIsFetchingRD(false);
    }
  };

  // ─── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedRDAccount(null);
    setRdAccounts([]);
    setActiveTab("cash");
    setMatureRDDetail(blankMatureDetail());
    setAccountCredit(blankCredit());
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!matureRDDetail.rdAccountNo) {
      Swal.fire("Warning", "Please select RD account first", "warning");
      return;
    }

    const hasCashCredit =
      accountCredit.generalAccountId > 0 && parseAmount(accountCredit.generalAmount) > 0;
    const hasSavingCredit =
      accountCredit.savingAccountId > 0 && parseAmount(accountCredit.savingAmount) > 0;
    const hasLoanCredit =
      accountCredit.loanAccountId > 0 && parseAmount(accountCredit.loanAmount) > 0;

    if (!hasCashCredit && !hasSavingCredit && !hasLoanCredit) {
      Swal.fire("Warning", "At least one credit entry is required to mature the RD", "warning");
      return;
    }

    const pending = calculatePendingAmount();
    if (pending > 0) {
      Swal.fire({
        title: "Pending Amount",
        text: `There is still ₹${pending.toFixed(2)} pending. Please credit the remaining amount.`,
        icon: "warning",
      });
      return;
    }
    if (pending < 0) {
      Swal.fire({
        title: "Credit Amount Exceeds",
        text: `Credit amount exceeds by ₹${Math.abs(pending).toFixed(2)}. Please adjust.`,
        icon: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const normalizedCreditAccountDetails = {
        ...accountCredit,
        cashAmount: parseAmount(accountCredit.generalAmount),
        cashaccountId: accountCredit.generalAccountId,
        savingAmount: parseAmount(accountCredit.savingAmount),
        savingAccountId: accountCredit.savingAccountId,
        loanAmount: parseAmount(accountCredit.loanAmount),
        loanAccountId: accountCredit.loanAccountId,
        intPostingAmt: parseAmount(accountCredit.intPostingAmt),
        closingCharges: parseAmount(accountCredit.closingCharges),
        tdsAmount: parseAmount(accountCredit.tdsAmount),
        penalAmount: parseAmount(accountCredit.penalAmount),
        intDr: parseAmount(accountCredit.intDr),
        intCr: parseAmount(accountCredit.intCr),
      };

      const CommonAccMasterDTO = {
        MatureRDInfo: {
          rdAccountId: matureRDDetail.rdAccountId,
          VoucherDate: matureRDDetail.date,
          branchId: user.branchid,
          postMaturityAmount: matureRDDetail.postMaturityAmt,
          intPayableAmount: matureRDDetail.intPayableAmt,
          DetailId: matureRDDetail.rdDetailId,
          ProductId: matureRDDetail.product,
          Narration: accountCredit.narration,
          PenalAmount: normalizedCreditAccountDetails.penalAmount,
          PenalAccountId: accountCredit.penalAccountId,
          IntDr: normalizedCreditAccountDetails.intDr,
          IntCr: normalizedCreditAccountDetails.intCr
        },
        CreditAccountDetails: normalizedCreditAccountDetails,
      };

      await rdAccountService.matureRD(CommonAccMasterDTO);

      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: "RD matured successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      handleReset();
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to mature RD", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Dropdown Options ────────────────────────────────────────────────────────

  const rdProductOptions    = rdProducts.map((p)   => ({ value: p.id,      label: p.productName }));
  const rdAccountOptions    = rdAccounts.map((acc)  => ({ value: acc.accId, label: acc.accountName }));
  const generalAccountOptions = generalAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));
  const savingAccountOptions  = savingAccounts.map((acc)  => ({ value: acc.accId, label: acc.accountName }));
  const penalAccountOptions   = penalAccounts.map((acc)   => ({ value: acc.accId, label: acc.accountName }));

  const tabs = [
    { id: "cash"       as const, label: "Cash / Other",      icon: Wallet },
    { id: "saving"     as const, label: "Saving Account",    icon: PiggyBank },
    { id: "loan"       as const, label: "Loan Account",      icon: Landmark },
    { id: "additional" as const, label: "Additional Details", icon: FileSpreadsheet },
  ];

  const pendingAmount = calculatePendingAmount();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-green-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-8">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Mature Recurring Deposit Account
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                      Close and disburse your recurring deposit
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/voucher-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back To Operations
                </button>
              </div>
            </div>

            {/* ── Main Card ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* ── Search Section ── */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-green-500" /> Search RD Account
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                  {/* Date */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full" />
                      Date <span className="text-red-500 text-xs">*</span>
                    </label>
                    <DatePicker
                      value={matureRDDetail.date}
                      max={sessionDate}
                      workingDate={sessionDate}
                      disabled
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                      onChange={() => {}}
                    />
                  </div>

                  {/* Product */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
                      Product <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={rdProductOptions}
                      value={rdProductOptions.find((o) => o.value === selectedProduct) || null}
                      onChange={(option) => handleProductChange(option?.value || null)}
                      placeholder={isLoadingProducts ? "Loading..." : "Select Product"}
                      isLoading={isLoadingProducts}
                      isClearable
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  {/* RD Account */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" />
                      RD Account <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={rdAccountOptions}
                      value={rdAccountOptions.find((o) => o.value === selectedRDAccount) || null}
                      onChange={(option) => handleRDAccountChange(option?.value || null)}
                      placeholder={!selectedProduct ? "Select Product first" : "Select RD Account"}
                      isDisabled={!selectedProduct || rdAccounts.length === 0}
                      isLoading={isFetchingRD}
                      isClearable
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                </div>
              </div>

              {/* ── RD Detail Section ── */}
              {matureRDDetail.rdAccountNo && (
                <>
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-green-50/30 to-teal-50/30 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-500" /> RD Detail
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                      {/* Maturity Amount */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                          Maturity Amount
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-green-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">
                            ₹ {matureRDDetail.maturityAmt.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Post Maturity Amount */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500" />
                          Post Maturity Amount
                        </label>
                        <input
                          type="text"
                          value={matureRDDetail.postMaturityAmt}
                          onChange={(e) =>
                            setMatureRDDetail({
                              ...matureRDDetail,
                              postMaturityAmt: validateNumberInput(e.target.value, 10),
                            })
                          }
                          className="px-4 py-3 border-2 border-yellow-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all text-gray-700 bg-white font-mono text-lg font-bold"
                          placeholder="0.00"
                        />
                      </div>

                      {/* RD Date */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                          RD Date
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                          <span className="text-base font-semibold text-gray-800">
                            {matureRDDetail.rdDate &&
                              new Date(matureRDDetail.rdDate).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                          </span>
                        </div>
                      </div>

                      {/* Maturity Date */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                          Maturity Date
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-purple-500 shadow-sm">
                          <span className="text-base font-semibold text-gray-800">
                            {matureRDDetail.maturityDate &&
                              new Date(matureRDDetail.maturityDate).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                          </span>
                        </div>
                      </div>

                      {/* Saving Account Name */}
                      <div className="flex flex-col space-y-2 sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                          Saving Account Name
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                          <span className="text-base font-semibold text-gray-800">{matureRDDetail.savingAccName}</span>
                        </div>
                      </div>

                      {/* Interest Rate */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500" />
                          Interest Rate
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-rose-500 shadow-sm flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-800 font-mono">{matureRDDetail.interestRate}%</span>
                          <Percent className="w-5 h-5 text-rose-400" />
                        </div>
                      </div>

                      {/* Balance (RD Amount) */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-lime-500 to-green-500" />
                          Balance (RD Amount)
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-lime-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">₹ {matureRDDetail.balance.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Kist Amount */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
                          Kist Amount
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-teal-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">₹ {matureRDDetail.kistAmt.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Kist Interval */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                          Kist Interval (Days)
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-violet-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">{matureRDDetail.kistInterval}</span>
                        </div>
                      </div>

                      {/* No of Months */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />
                          No. of Months
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-sky-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">{matureRDDetail.noOfMonths}</span>
                        </div>
                      </div>

                      {/* Penalty Amount */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
                          Penalty Amount
                        </label>
                        <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-orange-500 shadow-sm">
                          <span className="text-lg font-bold text-gray-800 font-mono">₹ {matureRDDetail.penaltyAmt.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Interest Payable */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500" />
                          Interest Payable
                        </label>
                        <input
                          type="text"
                          value={matureRDDetail.intPayableAmt}
                          onChange={(e) =>
                            setMatureRDDetail({
                              ...matureRDDetail,
                              intPayableAmt: validateNumberInput(e.target.value, 10),
                            })
                          }
                          className="px-4 py-3 border-2 border-fuchsia-200 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 outline-none transition-all text-gray-700 bg-white font-mono text-lg font-bold"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Pending Amount */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500" />
                          Pending Amount
                        </label>
                        <div className={`bg-white px-4 py-3 rounded-lg border-l-4 shadow-sm ${
                          pendingAmount > 0 ? "border-red-500" : pendingAmount < 0 ? "border-orange-500" : "border-green-500"
                        }`}>
                          <span className={`text-lg font-bold font-mono ${
                            pendingAmount > 0 ? "text-red-600" : pendingAmount < 0 ? "text-orange-600" : "text-green-600"
                          }`}>
                            {pendingAmount < 0 ? "-" : ""}₹ {Math.abs(pendingAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pending warning banner */}
                    {pendingAmount !== 0 && (
                      <div className={`mt-6 border-l-4 p-4 rounded-lg flex items-start gap-3 ${
                        pendingAmount > 0
                          ? "bg-amber-50 border-amber-500"
                          : "bg-orange-50 border-orange-500"
                      }`}>
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          pendingAmount > 0 ? "text-amber-500" : "text-orange-500"
                        }`} />
                        <div>
                          {pendingAmount > 0 ? (
                            <>
                              <p className="text-sm font-semibold text-amber-800">
                                Pending: ₹{pendingAmount.toFixed(2)}
                              </p>
                              <p className="text-xs text-amber-600 mt-1">
                                Please credit the remaining amount before submitting
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-orange-800">
                                Excess: ₹{Math.abs(pendingAmount).toFixed(2)}
                              </p>
                              <p className="text-xs text-orange-600 mt-1">
                                Credit amount exceeds the required amount — please adjust
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Account Credit Section ── */}
                  <div className="p-6 sm:p-8 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      Account Credit Details
                      <span className="text-red-500 text-xs ml-2">(At least one entry required)</span>
                    </h3>

                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const activeStyle: React.CSSProperties = {
                          cash:       { background: "linear-gradient(to right,#3b82f6,#2563eb)", color: "#fff" },
                          saving:     { background: "linear-gradient(to right,#a855f7,#9333ea)", color: "#fff" },
                          loan:       { background: "linear-gradient(to right,#f43f5e,#e11d48)", color: "#fff" },
                          additional: { background: "linear-gradient(to right,#10b981,#059669)", color: "#fff" },
                        }[tab.id] ?? {};

                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={isActive ? activeStyle : {}}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                              isActive
                                ? "shadow-md scale-105"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Cash / Other */}
                    {activeTab === "cash" && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Cash / Other Account</label>
                            <Select
                              options={generalAccountOptions}
                              value={generalAccountOptions.find((o) => o.value === accountCredit.generalAccountId) || null}
                              onChange={(option) =>
                                setAccountCredit({ ...accountCredit, generalAccountId: Number(option?.value) || 0 })
                              }
                              placeholder="Select General Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.generalAmount}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  generalAmount: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono text-lg bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Saving Account */}
                    {activeTab === "saving" && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Saving Account</label>
                            <Select
                              options={savingAccountOptions}
                              value={savingAccountOptions.find((o) => o.value === accountCredit.savingAccountId) || null}
                              onChange={(option) =>
                                setAccountCredit({ ...accountCredit, savingAccountId: Number(option?.value) || 0 })
                              }
                              placeholder="Select Saving Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.savingAmount}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  savingAmount: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 outline-none font-mono text-lg bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loan Account */}
                    {activeTab === "loan" && (
                      <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border border-rose-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Loan Account</label>
                            <Select
                              options={loanAccounts}
                              value={loanAccounts.find((o) => o.value === accountCredit.loanAccountId) || null}
                              onChange={(option) =>
                                setAccountCredit({ ...accountCredit, loanAccountId: Number(option?.value) || 0 })
                              }
                              placeholder="Select Loan Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.loanAmount}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  loanAmount: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-rose-200 rounded-lg focus:border-rose-500 outline-none font-mono text-lg bg-white"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Loan Product</label>
                            <Select
                              options={loanProducts}
                              value={loanProducts.find((o) => o.value === accountCredit.loanProduct) || null}
                              onChange={(option) =>
                                setAccountCredit({ ...accountCredit, loanProduct: option?.value?.toString() || "" })
                              }
                              placeholder="Select product"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Details */}
                    {activeTab === "additional" && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Penal Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.penalAmount}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  penalAmount: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Penal Account</label>
                            <Select
                              options={penalAccountOptions}
                              value={penalAccountOptions.find((o) => o.value === accountCredit.penalAccountId) || null}
                              onChange={(option) =>
                                setAccountCredit({ ...accountCredit, penalAccountId: Number(option?.value) || 0 })
                              }
                              placeholder="Select penal account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Interest DR</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.intDr}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  intDr: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Interest CR</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.intCr}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  intCr: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Closing Charges</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.closingCharges}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  closingCharges: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">TDS Amount</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={accountCredit.tdsAmount}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  tdsAmount: validateNumberInput(e.target.value, 10),
                                })
                              }
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex flex-col md:col-span-2 lg:col-span-3">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Narration</label>
                            <textarea
                              rows={3}
                              value={accountCredit.narration}
                              onChange={(e) => setAccountCredit({ ...accountCredit, narration: e.target.value })}
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none bg-white resize-none"
                              placeholder="Enter narration..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Credit Summary Banner */}
                    <div className="mt-6 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90 mb-1">Total Credit Amount</p>
                          <p className="text-3xl font-bold font-mono">
                            ₹ {(
                              parseAmount(accountCredit.generalAmount) +
                              parseAmount(accountCredit.savingAmount) +
                              parseAmount(accountCredit.loanAmount)
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <DollarSign className="w-8 h-8" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Action Buttons ── */}
                  <div className="flex justify-end gap-4 p-6 sm:p-8">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all hover:scale-105 text-sm"
                    >
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md text-sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Mature RD
                        </>
                      )}
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

export default MatureRDPage;
