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
import DashboardLayout from "../../../Common/Layout";
import commonservice from "../../../services/common/commonservice";
import fdAccountService from "../../../services/accountMasters/fdaccount/fdaccountapi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { SavingAccounts } from "../../vouchers/saving/savingdeposit";
import DatePicker from "../../../components/DatePicker";

interface FDProduct {
  id: number;
  productName: string;
}

interface FDAccount {
  accId: number;
  accountNumber: string;
  accountName: string;
}

interface PreMatureFDDetail {
  fdAccountId: number;
  fdAccountNo: string;
  date: string;
  product: number;
  preMaturityAmt: number;
  postMaturityAmt: string;
  fdDate: string;
  maturityDate: string;
  savingAccName: string;
  intRate: number;
  receiptNo: string;
  deductedTDS: number;
  balance: number;
  intPayableAmt: string;
  pendingAmount: number;
  fdDetailId: number;
}

interface AccountCreditDetail {
  generalAccountId: number;
  generalAmount: string;
  savingAccountId: number;
  savingAmount: string;
  loanAccountId: number;
  loanAmount: string;
  loanProduct: string;
  intPostingAmt: number;
  closingCharges: number;
  tdsAmount: number;
  loanAccBalance: number;
  cashAccBalance: number;
  narration: string;
}

interface AccountOption {
  value: string;
  label: string;
}

const PrePreMatureFDPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();
  const [loading, setLoading] = useState(false);
  const [isFetchingFD, setIsFetchingFD] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "cash" | "saving" | "loan" | "additional"
  >("cash");

  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedFDAccount, setSelectedFDAccount] = useState<number | null>(null);

  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);
  const [fdAccounts, setFdAccounts] = useState<FDAccount[]>([]);

  const [generalAccounts, setGeneralAccounts] = useState<SavingAccounts[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccounts[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<AccountOption[]>([]);
  const [loanProducts, setLoanProducts] = useState<AccountOption[]>([]);

  const [preMatureFDDetail, setPreMatureFDDetail] = useState<PreMatureFDDetail>({
    fdDetailId: 0,
    fdAccountId: 0,
    fdAccountNo: "",
    date: user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate(),
    product: 0,
    preMaturityAmt: 0,
    postMaturityAmt: "0.00",
    fdDate: "",
    maturityDate: "",
    savingAccName: "",
    intRate: 0,
    receiptNo: "",
    deductedTDS: 0,
    balance: 0,
    intPayableAmt: "0.00",
    pendingAmount: 0,
  });

  const [accountCredit, setAccountCredit] = useState<AccountCreditDetail>({
    generalAccountId: 0,
    generalAmount: "0.00",
    savingAccountId: 0,
    savingAmount: "0.00",
    loanAccountId: 0,
    loanAmount: "0.00",
    loanProduct: "",
    intPostingAmt: 0,
    closingCharges: 0,
    tdsAmount: 0,
    loanAccBalance: 0,
    cashAccBalance: 0,
    narration: "",
  });

  const calculatePendingAmount = () => {
    const totalCredited =
      parseFloat(accountCredit.generalAmount || "0") +
      parseFloat(accountCredit.savingAmount || "0") +
      parseFloat(accountCredit.loanAmount || "0");

    const baseAmount = Number(preMatureFDDetail.preMaturityAmt) || 0;

    const postMaturity = parseFloat(preMatureFDDetail.postMaturityAmt || "0") || 0;
    const totalRequired = baseAmount + postMaturity;

    return totalRequired - totalCredited;
  };

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
      transition: "all 0.2s",
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
      transition: "all 0.3s",
      "&:hover": { color: "#3b82f6" },
    }),
    indicatorSeparator: (base: any) => ({ ...base, backgroundColor: "#e5e7eb" }),
  };

  const validateNumberInput = (value: string, maxLength: number = 10): string => {
    let cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);
    if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
    return cleaned;
  };

  // Load FD Products
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        const fdProductsRes = await commonservice.fetch_fd_products(user.branchid);
        if (fdProductsRes.data && Array.isArray(fdProductsRes.data)) {
          setFdProducts(fdProductsRes.data);
        } else {
          setFdProducts([]);
        }
      } catch (error) {
        console.error("Error loading FD products:", error);
        Swal.fire("Error", "Failed to load FD products", "error");
        setFdProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    if (user.branchid) fetchData();
  }, [user.branchid]);

  // Load Account Dropdowns
  useEffect(() => {
    const fetchAccountDropdowns = async () => {
      try {
        const generalAccInfo = await commonservice.general_accmasters_info(user.branchid);
        if (generalAccInfo.success) setGeneralAccounts(generalAccInfo.data);

        const savingAccountsRes = await commonservice.fetch_Saving_Accounts(
          user.branchid,
          preMatureFDDetail.date,
        );
        if (savingAccountsRes.success) setSavingAccounts(savingAccountsRes.data);

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

  const fetchFDAccounts = async (productId: number) => {
    if (!productId) { setFdAccounts([]); return; }
    try {
      const response = await commonservice.fetch_FD_Open_Accounts_For_Premature(
        user.branchid, productId, preMatureFDDetail.date,
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        setFdAccounts(response.data);
      } else {
        setFdAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching FD accounts:", error);
      setFdAccounts([]);
    }
  };

  const handleProductChange = async (productId: number | null) => {
    setSelectedProduct(productId);
    setSelectedFDAccount(null);
    setFdAccounts([]);
    setPreMatureFDDetail({
      fdDetailId: 0, fdAccountId: 0, fdAccountNo: "",
      date: sessionDate, product: 0,
      preMaturityAmt: 0, postMaturityAmt: "0.00", fdDate: "",
      maturityDate: "", savingAccName: "", intRate: 0,
      receiptNo: "", deductedTDS: 0, balance: 0,
      intPayableAmt: "0.00", pendingAmount: 0,
    });
    if (productId && productId > 0) await fetchFDAccounts(productId);
  };

  const handleFDAccountChange = async (accountId: number | null) => {
    setPreMatureFDDetail({
      fdDetailId: 0, fdAccountId: 0, fdAccountNo: "",
      date: sessionDate, product: 0,
      preMaturityAmt: 0, postMaturityAmt: "0.00", fdDate: "",
      maturityDate: "", savingAccName: "", intRate: 0,
      receiptNo: "", deductedTDS: 0, balance: 0,
      intPayableAmt: "0.00", pendingAmount: 0,
    });
    setSelectedFDAccount(accountId);
    if (!accountId || !selectedProduct) return;
    setIsFetchingFD(true);
    try {
      const response = await fdAccountService.getFDAccountById(accountId, user.branchid, preMatureFDDetail.date);
      if (response.success && response.data) {
        const data = response.data;
        const preMaturityAmt = data.preMaturityAmount || 0;
        const balance = data.fdAccountDetailDTOSingle.fdAmount || 0;
        const pendingAmt = preMaturityAmt;
        setPreMatureFDDetail({
          fdDetailId: data.fdAccountDetailDTOSingle.id || 0,
          fdAccountId: accountId,
          fdAccountNo: data.accountMasterDTO?.accountNumber || "",
          date: sessionDate,
          product: selectedProduct,
          preMaturityAmt,
          postMaturityAmt: (0.0).toString(),
          fdDate: data.fdAccountDetailDTOSingle.fdDate?.split("T")[0] || "",
          maturityDate: data.fdAccountDetailDTOSingle.fdMaturityDate?.split("T")[0] || "",
          savingAccName: data.savingAccountName || "",
          intRate: data.fdAccountDetailDTOSingle.intRate || 0,
          receiptNo: data.fdAccountDetailDTOSingle.ltdNo || "",
          deductedTDS: data.fdAccountDetailDTOSingle.tdsAmount || 0,
          balance,
          intPayableAmt: (data.fdAccountDetailDTOSingle.interestPayable || 0).toFixed(2),
          pendingAmount: pendingAmt,
        });
        Swal.fire({
          icon: "success", title: "FD Details Loaded",
          text: `Account: ${data.accountMasterDTO?.accountNumber}`,
          timer: 1500, showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "FD Account not found");
      }
    } catch (error: any) {
      console.error("Error fetching FD details:", error);
      Swal.fire("Error", error.message || "Failed to fetch FD account details", "error");
      setPreMatureFDDetail({
        fdDetailId: 0, fdAccountId: 0, fdAccountNo: "",
        date: sessionDate, product: 0,
        preMaturityAmt: 0, postMaturityAmt: "0.00", fdDate: "",
        maturityDate: "", savingAccName: "", intRate: 0,
        receiptNo: "", deductedTDS: 0, balance: 0,
        intPayableAmt: "0.00", pendingAmount: 0,
      });
    } finally {
      setIsFetchingFD(false);
    }
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedFDAccount(null);
    setFdAccounts([]);
    setActiveTab("cash");
    setPreMatureFDDetail({
      fdDetailId: 0, fdAccountId: 0, fdAccountNo: "",
      date: sessionDate, product: 0,
      preMaturityAmt: 0, postMaturityAmt: "0.00", fdDate: "",
      maturityDate: "", savingAccName: "", intRate: 0,
      receiptNo: "", deductedTDS: 0, balance: 0,
      intPayableAmt: "0.00", pendingAmount: 0,
    });
    setAccountCredit({
      generalAccountId: 0, generalAmount: "0.00",
      savingAccountId: 0, savingAmount: "0.00",
      loanAccountId: 0, loanAmount: "0.00", loanProduct: "",
      intPostingAmt: 0, closingCharges: 0, tdsAmount: 0,
      loanAccBalance: 0, cashAccBalance: 0, narration: "",
    });
  };

  const handleSubmit = async () => {
    if (!preMatureFDDetail.fdAccountNo) {
      Swal.fire("Warning", "Please select FD account first", "warning");
      return;
    }

    const hasCashCredit = accountCredit.generalAccountId > 0 && parseFloat(accountCredit.generalAmount) > 0;
    const hasSavingCredit = accountCredit.savingAccountId > 0 && parseFloat(accountCredit.savingAmount) > 0;
    const hasLoanCredit = accountCredit.loanAccountId > 0 && parseFloat(accountCredit.loanAmount) > 0;

    if (!hasCashCredit && !hasSavingCredit && !hasLoanCredit) {
      Swal.fire("Warning", "At least one credit entry is required", "warning");
      return;
    }

    const pending = calculatePendingAmount();
    if (pending !== 0) {
      if (pending > 0) {
        Swal.fire({
          title: "Pending Amount",
          text: `There is still ₹${pending.toFixed(2)} pending. Please credit the remaining amount.`,
          icon: "warning", confirmButtonText: "OK",
        });
        return;
      } else {
        Swal.fire({
          title: "Credit Amount Exceeds",
          text: `Credit amount exceeds by ₹${Math.abs(pending).toFixed(2)}. Please adjust the credit amounts.`,
          icon: "error", confirmButtonText: "OK",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const preMatureFdDto = {
        fdAccountId: preMatureFDDetail.fdAccountId,
        VoucherDate: preMatureFDDetail.date,
        branchId: user.branchid,
        postMaturityAmount: 0,
        preMaturityAmount: Number(preMatureFDDetail.preMaturityAmt) || 0,
        intPayableAmount: Number(preMatureFDDetail.intPayableAmt),
        DetailId: preMatureFDDetail.fdDetailId,
        ProductId: preMatureFDDetail.product,
        isRenewFD: false,
        Narration: accountCredit.narration
      };
      let creditData = {
        generalAccountId: accountCredit.generalAccountId,
        generalAmount: Number(accountCredit.generalAmount),
        savingAccountId: accountCredit.savingAccountId,
        savingAmount: Number(accountCredit.savingAmount),
        loanAccountId: accountCredit.loanAccountId,
        loanAmount: Number(accountCredit.loanAmount),
        loanProduct: accountCredit.loanProduct,
        intPostingAmt: accountCredit.intPostingAmt,
        closingCharges: accountCredit.closingCharges,
        tdsAmount: accountCredit.tdsAmount
      }
      const dto = {
        MatureOrRenewFDInfo: preMatureFdDto,
        CreditAccountDetails: creditData,
      };
      await fdAccountService.preMatureFD(dto);
      await Swal.fire({
        icon: "success", title: "Success!",
        text: "FD pre-matured successfully!",
        timer: 1500, showConfirmButton: false,
      });
      handleReset();
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to process FD", "error");
    } finally {
      setLoading(false);
    }
  };

  const fdProductOptions = fdProducts.map((p) => ({ value: p.id, label: p.productName }));
  const fdAccountOptions = fdAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));
  const generalAccountOptions = generalAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));
  const savingAccountOptions = savingAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));

  const tabs = [
    { id: "cash" as const, label: "Cash / Other", icon: Wallet, color: "blue" },
    { id: "saving" as const, label: "Saving Account", icon: PiggyBank, color: "purple" },
    { id: "loan" as const, label: "Loan Account", icon: Landmark, color: "rose" },
    { id: "additional" as const, label: "Additional Details", icon: FileSpreadsheet, color: "emerald" },
  ];

  const pendingAmount = calculatePendingAmount();

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-8">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Pre-Mature Fixed Deposit Account
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                      Pre-Mature your fixed deposit account
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/voucher-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  <ArrowLeft className="text-sm" />
                  Back To Operations
                </button>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">

              {/* Search Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-500" />
                  Search FD Account
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Date */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                      Date <span className="text-red-500 text-xs">*</span>
                    </label>
                    <DatePicker
                      value={preMatureFDDetail.date}
                      max={sessionDate}
                      workingDate={sessionDate}
                      disabled
                      className="w-full px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg outline-none"
                      onChange={() => {}}
                    />
                  </div>

                  {/* Product */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      Product <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={fdProductOptions}
                      value={fdProductOptions.find((opt) => opt.value === selectedProduct) || null}
                      onChange={(option) => handleProductChange(option?.value || null)}
                      placeholder={isLoadingProducts ? "Loading products..." : fdProducts.length === 0 ? "No products available" : "Select Product"}
                      noOptionsMessage={() => "No products found"}
                      isLoading={isLoadingProducts}
                      isClearable
                      className="text-sm"
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  {/* FD Account */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                      FD Account <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={fdAccountOptions}
                      value={fdAccountOptions.find((opt) => opt.value === selectedFDAccount) || null}
                      onChange={(option) => handleFDAccountChange(option?.value || null)}
                      placeholder={!selectedProduct ? "Select Product first" : fdAccounts.length === 0 ? "No FD accounts available" : "Select FD Account"}
                      noOptionsMessage={() => "No FD accounts found"}
                      isDisabled={!selectedProduct || fdAccounts.length === 0}
                      isLoading={isFetchingFD}
                      isClearable
                      className="text-sm"
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                </div>
              </div>

              {/* FD Detail Section */}
              {preMatureFDDetail.fdAccountNo && (
                <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    FD Detail
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Maturity Amt */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                        Pre-Maturity Amount
                      </label>
                      <input
                        type="text"
                        value={preMatureFDDetail.preMaturityAmt || ""}
                        onChange={(e) => {
                          const validated = validateNumberInput(e.target.value, 10);
                          setPreMatureFDDetail({
                            ...preMatureFDDetail,
                            preMaturityAmt: Number(validated || 0),
                          });
                        }}
                        maxLength={10}
                        className="px-4 py-3 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono text-lg font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    {/* Receipt No */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                        Receipt No
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-teal-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800 font-mono">{preMatureFDDetail.receiptNo}</span>
                      </div>
                    </div>

                    {/* FD Date */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                        FD Date
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">
                          {preMatureFDDetail.fdDate && new Date(preMatureFDDetail.fdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Maturity Date */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                        Maturity Date
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-purple-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">
                          {preMatureFDDetail.maturityDate && new Date(preMatureFDDetail.maturityDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Saving Acc. Name */}
                    <div className="flex flex-col space-y-2 sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></div>
                        Saving Account Name
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">{preMatureFDDetail.savingAccName}</span>
                      </div>
                    </div>

                    {/* Int. Rate */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
                        Interest Rate
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-rose-500 shadow-sm flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-800 font-mono">{preMatureFDDetail.intRate}%</span>
                        <Percent className="w-5 h-5 text-rose-400" />
                      </div>
                    </div>

                    

                    {/* Balance */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"></div>
                        Balance
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-lime-500 shadow-sm">
                        <span className="text-lg font-bold text-gray-800 font-mono">₹ {preMatureFDDetail.balance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Deducted TDS */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                        Deducted TDS
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-orange-500 shadow-sm">
                        <span className="text-lg font-bold text-gray-800 font-mono">₹ {preMatureFDDetail.deductedTDS.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Int Payable Amt */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
                        Interest Payable
                      </label>
                      <input
                        type="text"
                        value={preMatureFDDetail.intPayableAmt}
                        onChange={(e) => {
                          const validated = validateNumberInput(e.target.value, 10);
                          setPreMatureFDDetail({ ...preMatureFDDetail, intPayableAmt: validated });
                        }}
                        maxLength={10}
                        className="px-4 py-3 border-2 border-violet-200 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono text-lg font-bold"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Pending Amount */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></div>
                        Pending Amount
                      </label>
                      <div className={`bg-white px-4 py-3 rounded-lg border-l-4 shadow-sm ${pendingAmount > 0 ? "border-red-500" : pendingAmount < 0 ? "border-orange-500" : "border-green-500"}`}>
                        <span className={`text-lg font-bold font-mono ${pendingAmount > 0 ? "text-red-600" : pendingAmount < 0 ? "text-orange-600" : "text-green-600"}`}>
                          {pendingAmount < 0 ? "-" : ""}₹ {Math.abs(pendingAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pending/Excess Warning */}
                  {pendingAmount !== 0 && (
                    <div className={`mt-4 ${pendingAmount > 0 ? "bg-amber-50 border-amber-500" : "bg-orange-50 border-orange-500"} border-l-4 p-4 rounded-lg flex items-start gap-3`}>
                      <AlertCircle className={`w-5 h-5 ${pendingAmount > 0 ? "text-amber-500" : "text-orange-500"} flex-shrink-0 mt-0.5`} />
                      <div>
                        {pendingAmount > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-amber-800">Pending Amount: ₹{pendingAmount.toFixed(2)}</p>
                            <p className="text-xs text-amber-600 mt-1">Please credit the remaining amount to complete the transaction</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-orange-800">Credit Amount Exceeds: ₹{Math.abs(pendingAmount).toFixed(2)}</p>
                            <p className="text-xs text-orange-600 mt-1">The credited amount exceeds the required amount</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Account Credit Section */}
              {preMatureFDDetail.fdAccountNo && (
                <div className="p-6 sm:p-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Account Credit Details
                    <span className="text-red-500 text-xs ml-2">(At least one entry required)</span>
                  </h3>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                            isActive
                              ? tab.color === "blue" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105"
                                : tab.color === "purple" ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md scale-105"
                                : tab.color === "rose" ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md scale-105"
                                : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md scale-105"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    {/* Cash Tab */}
                    {activeTab === "cash" && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                              Cash / Other Account
                            </label>
                            <Select
                              options={generalAccountOptions}
                              value={generalAccountOptions.find((opt) => opt.value === accountCredit.generalAccountId) || null}
                              onChange={(option) => setAccountCredit({ ...accountCredit, generalAccountId: option?.value || 0 })}
                              placeholder="Select General Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                              Amount
                            </label>
                            <input
                              type="text"
                              value={accountCredit.generalAmount}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, generalAmount: validated || "" });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono text-lg"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Saving Tab */}
                    {activeTab === "saving" && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                              Saving Account
                            </label>
                            <Select
                              options={savingAccountOptions}
                              value={savingAccountOptions.find((opt) => opt.value === accountCredit.savingAccountId) || null}
                              onChange={(option) => setAccountCredit({ ...accountCredit, savingAccountId: option?.value || 0 })}
                              placeholder="Select Saving Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                              Amount
                            </label>
                            <input
                              type="text"
                              value={accountCredit.savingAmount}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, savingAmount: validated || "" });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono text-lg"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loan Tab */}
                    {activeTab === "loan" && (
                      <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border border-rose-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
                              Account
                            </label>
                            <Select
                              options={loanAccounts}
                              value={loanAccounts.find((opt) => opt.value === accountCredit.loanAccountId) || null}
                              onChange={(option) => setAccountCredit({ ...accountCredit, loanAccountId: option?.value || 0 })}
                              placeholder="Select Loan Account"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                              Amount
                            </label>
                            <input
                              type="text"
                              value={accountCredit.loanAmount}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, loanAmount: validated || "" });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-rose-200 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono text-lg"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></div>
                              Product
                            </label>
                            <Select
                              options={loanProducts}
                              value={loanProducts.find((opt) => opt.value === accountCredit.loanProduct) || null}
                              onChange={(option) => setAccountCredit({ ...accountCredit, loanProduct: option?.value || "" })}
                              placeholder="Select loan product"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Tab */}
                    {activeTab === "additional" && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                              Int Posting Amt
                            </label>
                            <input
                              type="text"
                              value={accountCredit.intPostingAmt}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, intPostingAmt: Number(validated || 0) });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                              Closing Charges
                            </label>
                            <input
                              type="text"
                              value={accountCredit.closingCharges}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, closingCharges: Number(validated || 0) });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
                              TDS Amount
                            </label>
                            <input
                              type="text"
                              value={accountCredit.tdsAmount}
                              onChange={(e) => {
                                const validated = validateNumberInput(e.target.value, 10);
                                setAccountCredit({ ...accountCredit, tdsAmount: Number(validated || 0) });
                              }}
                              maxLength={10}
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 bg-white font-mono"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col md:col-span-2 lg:col-span-1">
                            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                              Narration
                            </label>
                            <textarea
                              rows={3}
                              value={accountCredit.narration}
                              onChange={(e) => setAccountCredit({ ...accountCredit, narration: e.target.value })}
                              className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 bg-white resize-none"
                              placeholder="Enter narration..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Card */}
                  <div className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Total Credit Amount</p>
                        <p className="text-3xl font-bold font-mono">
                          ₹ {(parseFloat(accountCredit.generalAmount || "0") + parseFloat(accountCredit.savingAmount || "0") + parseFloat(accountCredit.loanAmount || "0")).toFixed(2)}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {preMatureFDDetail.fdAccountNo && (
                <div className="flex justify-end gap-4 p-6 sm:p-8 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Pre-Mature FD
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
};

export default PrePreMatureFDPage;

