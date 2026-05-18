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
  CreditCard,
  Percent,
  Wallet,
  PiggyBank,
  Landmark,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import commonservice from "../../../services/common/commonservice";
import DatePicker from "../../../components/DatePicker";
import fdAccountService from "../../../services/accountMasters/fdaccount/fdaccountapi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import { SavingAccounts } from "../../vouchers/saving/savingdeposit";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface FDProduct {
  id: number;
  productName: string;
}

interface FDAccount {
  accId: number;
  accountNumber: string;
  accountName: string;
}

interface MatureFDDetail {
  fdAccountId: number;
  fdAccountNo: string;
  date: string;
  product: number;
  maturityAmt: number;
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
  // Stored for renew amount validation
  memberDateOfBirth: string;
}

/**
 * RenewFDDetail mirrors the FDAccountMaster fdDetailForm shape so the same
 * API helper (fetch_fd_related_info) can be reused for maturity calculation.
 */
interface RenewFDDetail {
  accountPrefix: string;
  accountSuffix: string;
  fdDate: string;
  receiptNo: string;
  fdAmount: string;        // must be >= maturityAmt
  days: string;
  months: string;
  intRate: string;         // auto-fetched from slab
  compoundingInterval: string;
  slabName: string;
  maturityDate: string;    // auto-calculated
  maturityAmount: string;  // auto-calculated
  slabId: number;
  agent: string;
}

interface AccountCreditDetail {
  generalAccountId: number;
  generalAmount: number;
  savingAccountId: number;
  savingAmount: number;
  loanAccountId: number;
  loanAmount: number;
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

interface RenewValidationErrors {
  accountPrefix?: string;
  accountSuffix?: string;
  fdDate?: string;
  receiptNo?: string;
  daysMonths?: string;
  fdAmount?: string;
  maturityDate?: string;
  maturityAmount?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MatureFDPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [loading, setLoading] = useState(false);
  const [isRenewFD, setIsRenewFD] = useState(false);
  const [isFetchingFD, setIsFetchingFD] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  // NEW: tracks whether API call to get maturity info is in progress
  const [isFetchingRenewInfo, setIsFetchingRenewInfo] = useState(false);

  const [validationErrors, setValidationErrors] = useState<RenewValidationErrors>({});

  const [activeTab, setActiveTab] = useState<"cash" | "saving" | "loan" | "additional">("cash");

  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedFDAccount, setSelectedFDAccount] = useState<number | null>(null);

  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);
  const [fdAccounts, setFdAccounts] = useState<FDAccount[]>([]);

  const [generalAccounts, setGeneralAccounts] = useState<SavingAccounts[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccounts[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<AccountOption[]>([]);
  const [loanProducts, setLoanProducts] = useState<AccountOption[]>([]);

  // ─── Mature FD State ──────────────────────────────────────────────────────

  const blankMatureDetail = (): MatureFDDetail => ({
    fdDetailId: 0,
    fdAccountId: 0,
    fdAccountNo: "",
    date: sessionDate,
    product: 0,
    maturityAmt: 0,
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
    memberDateOfBirth: "",
  });

  const [matureFDDetail, setMatureFDDetail] = useState<MatureFDDetail>(blankMatureDetail());

  // ─── Renew FD State ───────────────────────────────────────────────────────

  const blankRenewDetail = (): RenewFDDetail => ({
    accountPrefix: "",
    accountSuffix: "",
    fdDate: sessionDate,
    receiptNo: "",
    fdAmount: "",
    days: "",
    months: "",
    intRate: "",
    compoundingInterval: "Yearly",
    slabName: "",
    maturityDate: "",
    maturityAmount: "",
    slabId: 0,
    agent: "",
  });

  const [renewFDDetail, setRenewFDDetail] = useState<RenewFDDetail>(blankRenewDetail());

  // ─── Account Credit State ─────────────────────────────────────────────────

  const blankCredit = (): AccountCreditDetail => ({
    generalAccountId: 0,
    generalAmount: 0,
    savingAccountId: 0,
    savingAmount: 0,
    loanAccountId: 0,
    loanAmount: 0,
    loanProduct: "",
    intPostingAmt: 0,
    closingCharges: 0,
    tdsAmount: 0,
    loanAccBalance: 0,
    cashAccBalance: 0,
    narration: "",
  });

  const [accountCredit, setAccountCredit] = useState<AccountCreditDetail>(blankCredit());

  // ─── Pending Amount Calculation ───────────────────────────────────────────

  const calculatePendingAmount = () => {
    const totalCredited =
      accountCredit.generalAmount +
      accountCredit.savingAmount +
      accountCredit.loanAmount;

    const baseAmount = Math.max(matureFDDetail.maturityAmt, matureFDDetail.balance);
    const postMaturity = parseFloat(matureFDDetail.postMaturityAmt || "0") || 0;
    const totalRequired = baseAmount + postMaturity;

    return totalRequired - totalCredited;
  };

  // ─── Custom Select Styles ─────────────────────────────────────────────────

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

  // ─── Number Helpers ───────────────────────────────────────────────────────

  const validateNumberInput = (value: string, maxLength = 10): string => {
    let cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);
    if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
    return cleaned;
  };

  // ─── Fetch Renew FD Info from API (mirrors FDAccountMaster fetchMaturityDate) ──

  /**
   * Calls the same API endpoint used in FDAccountMaster to get:
   *   - maturityDate
   *   - interestRate (slabRate)
   *   - compoundingInterval
   *   - maturityAmount
   *   - slabId
   *
   * Triggered whenever fdDate, months, days, or fdAmount changes in the renew form.
   */
  const fetchRenewMaturityInfo = async (
    fdDate: string,
    months: number,
    days: number,
    fdAmount: number,
  ) => {
    if (!fdDate || (!months && !days) || fdAmount <= 0 || !selectedProduct) return;

    setIsFetchingRenewInfo(true);
    try {
      const response = await commonservice.fetch_fd_related_info(
        fdDate,
        months,
        days,
        matureFDDetail.memberDateOfBirth,   // same as FDAccountMaster memberDetailsData.dateOfBirth
        selectedProduct,                     // same as formData.accountMasterDTO.fdProductId
        fdAmount,
        user.branchid,
      );

      if (response.success && response.data) {
        setRenewFDDetail((prev) => ({
          ...prev,
          maturityDate: commonservice.splitDate(response.data.maturityDate),
          intRate: response.data.interestRate?.toString() || "",
          compoundingInterval: response.data.compoundingInterval || "Yearly",
          maturityAmount: response.data.maturityAmount?.toString() || "",
          slabId: response.data.slabId || 0,
          slabName: response.data.slabName || "",
        }));

        // Clear stale validation errors for fields that are now filled
        setValidationErrors((prev) => ({
          ...prev,
          maturityDate: undefined,
          maturityAmount: undefined,
        }));
      } else {
        // API returned no slab — clear auto-fields and warn user
        setRenewFDDetail((prev) => ({
          ...prev,
          maturityDate: "",
          intRate: "",
          compoundingInterval: "Yearly",
          maturityAmount: "",
          slabId: 0,
          slabName: "",
        }));
      }
    } catch (error) {
      console.error("Error fetching renew maturity info:", error);
    } finally {
      setIsFetchingRenewInfo(false);
    }
  };

  // ─── Renew Field Change Handler ───────────────────────────────────────────

  /**
   * Central handler for all renewFDDetail fields.
   * After updating state, triggers the API call whenever the relevant
   * fields (fdDate, months, days, fdAmount) change — matching FDAccountMaster behaviour.
   */
  const handleRenewFieldChange = async (field: keyof RenewFDDetail, value: string) => {
    // Update the field immediately
    setRenewFDDetail((prev) => ({ ...prev, [field]: value }));

    // Clear inline validation error for that field
    if (validationErrors[field as keyof RenewValidationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Decide whether to hit the API
    const apiTriggerFields: (keyof RenewFDDetail)[] = ["fdDate", "months", "days", "fdAmount"];
    if (!apiTriggerFields.includes(field)) return;

    // Build the latest values (current state + this new value)
    const latestForm = { ...renewFDDetail, [field]: value };

    const fdDate = latestForm.fdDate;
    const months = parseInt(latestForm.months) || 0;
    const days = parseInt(latestForm.days) || 0;
    const fdAmount = parseFloat(latestForm.fdAmount) || 0;

    if (fdDate && (months || days) && fdAmount > 0) {
      await fetchRenewMaturityInfo(fdDate, months, days, fdAmount);
    } else {
      // Not enough data yet — clear calculated fields
      setRenewFDDetail((prev) => ({
        ...prev,
        [field]: value,
        maturityDate: "",
        intRate: "",
        compoundingInterval: "Yearly",
        maturityAmount: "",
        slabId: 0,
        slabName: "",
      }));
    }
  };

  // ─── Renew FD Validation ──────────────────────────────────────────────────

  const validateRenewFDDetails = (): boolean => {
    const errors: RenewValidationErrors = {};

    if (!renewFDDetail.accountPrefix.trim()) {
      errors.accountPrefix = "Account prefix is required";
    }

    if (!renewFDDetail.accountSuffix.trim()) {
      errors.accountSuffix = "Account suffix is required";
    }

    if (!renewFDDetail.receiptNo.trim()) {
      errors.receiptNo = "Receipt number is required";
    }

    // NEW: FD date must be >= old maturity date (renew after maturity)
    if (!renewFDDetail.fdDate) {
      errors.fdDate = "FD date is required";
    } else if (matureFDDetail.maturityDate) {
      const newFDDate = new Date(renewFDDetail.fdDate);
      const maturityDate = new Date(matureFDDetail.maturityDate);
      if (newFDDate < maturityDate) {
        errors.fdDate = "New FD date must be on or after the old maturity date";
      }
    }

    const hasDays = renewFDDetail.days && parseInt(renewFDDetail.days) > 0;
    const hasMonths = renewFDDetail.months && parseInt(renewFDDetail.months) > 0;
    if (!hasDays && !hasMonths) {
      errors.daysMonths = "Either days or months must be provided";
    }

    // NEW: Amount >= maturityAmt
    const enteredAmount = parseFloat(renewFDDetail.fdAmount) || 0;
    if (enteredAmount <= 0) {
      errors.fdAmount = "Renew amount must be greater than 0";
    } else if (enteredAmount < matureFDDetail.maturityAmt) {
      errors.fdAmount = `Renew amount (₹${enteredAmount.toFixed(2)}) must be ≥ maturity amount (₹${matureFDDetail.maturityAmt.toFixed(2)})`;
    }

    // Maturity date must have been calculated
    if (!renewFDDetail.maturityDate || !renewFDDetail.maturityAmount || parseFloat(renewFDDetail.maturityAmount) <= 0) {
      errors.maturityDate = "Maturity date could not be calculated — check period/slab configuration";
    }


    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      Swal.fire({
        title: "Validation Errors",
        html: `<div style="text-align:left;white-space:pre-line;">${Object.values(errors)
          .map((e) => `• ${e}`)
          .join("<br>")}</div>`,
        icon: "error",
        confirmButtonText: "OK",
      });
      return false;
    }

    return true;
  };

  // ─── Load FD Products ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        const fdProductsRes = await commonservice.fetch_fd_products(user.branchid);
        setFdProducts(
          fdProductsRes.data && Array.isArray(fdProductsRes.data) ? fdProductsRes.data : [],
        );
      } catch (error) {
        Swal.fire("Error", "Failed to load FD products", "error");
        setFdProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (user.branchid) fetchData();
  }, [user.branchid]);

  // ─── Load Account Dropdowns ───────────────────────────────────────────────

  useEffect(() => {
    const fetchAccountDropdowns = async () => {
      try {
        const [generalAccInfo, savingAccountsRes] = await Promise.all([
          commonservice.general_accmasters_info(user.branchid),
          commonservice.fetch_Saving_Accounts(user.branchid, matureFDDetail.date),
        ]);

        if (generalAccInfo.success) setGeneralAccounts(generalAccInfo.data);
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

  // ─── Fetch FD Accounts for selected product ───────────────────────────────

  const fetchFDAccounts = async (productId: number) => {
    if (!productId) { setFdAccounts([]); return; }
    try {
      const response = await commonservice.fetch_FD_Open_Accounts(
        user.branchid,
        productId,
        matureFDDetail.date,
      );
      if (response.success && response.data && Array.isArray(response.data)) {
        setFdAccounts(response.data);
      } else {
        setFdAccounts([]);
      }
    } catch (error) {
      setFdAccounts([]);
    }
  };

  // ─── Product Change ───────────────────────────────────────────────────────

  const handleProductChange = async (productId: number | null) => {
    setSelectedProduct(productId);
    setSelectedFDAccount(null);
    setFdAccounts([]);
    setMatureFDDetail(blankMatureDetail());
    setRenewFDDetail(blankRenewDetail());
    setValidationErrors({});

    if (productId && productId > 0) await fetchFDAccounts(productId);
  };

  // ─── FD Account Change (fetch FD details) ─────────────────────────────────

  const handleFDAccountChange = async (accountId: number | null) => {
    setSelectedFDAccount(accountId);
    if (!accountId || !selectedProduct) return;

    setIsFetchingFD(true);
    try {
      const response = await fdAccountService.getFDAccountById(
        accountId,
        user.branchid,
        matureFDDetail.date,
      );

      if (response.success && response.data) {
        const data = response.data;
        const maturityAmt = data.fdAccountDetailDTOSingle.maturityAmount || 0;
        const balance = data.fdAccountDetailDTOSingle.fdAmount || 0;

        setMatureFDDetail({
          fdDetailId: data.fdAccountDetailDTOSingle.id || 0,
          fdAccountId: accountId,
          fdAccountNo: data.accountMasterDTO?.accountNumber || "",
          date: sessionDate,
          product: selectedProduct,
          maturityAmt,
          postMaturityAmt: "0.00",
          fdDate: data.fdAccountDetailDTOSingle.fdDate?.split("T")[0] || "",
          maturityDate: data.fdAccountDetailDTOSingle.fdMaturityDate?.split("T")[0] || "",
          savingAccName: data.savingAccountName || "",
          intRate: data.fdAccountDetailDTOSingle.intRate || 0,
          receiptNo: data.fdAccountDetailDTOSingle.ltdNo || "",
          deductedTDS: data.fdAccountDetailDTOSingle.tdsAmount || 0,
          balance,
          intPayableAmt: (data.fdAccountDetailDTOSingle.interestPayable || 0).toFixed(2),
          pendingAmount: Math.max(maturityAmt, balance),
          // Store member DOB for slab API (matches FDAccountMaster usage)
          memberDateOfBirth: data.accountMasterDTO?.dob?.split("T")[0] || "",
        });

        // Auto-populate renew prefix/suffix from existing account
        const prefix = data.accountMasterDTO?.accPrefix || "";
        const suffix = (data.accountMasterDTO?.accSuffix || "").toString();
        setRenewFDDetail((prev) => ({
          ...prev,
          accountPrefix: prefix,
          accountSuffix: suffix,
          // Pre-fill renew amount with maturity amount (user can increase, not decrease)
          fdAmount: maturityAmt > 0 ? maturityAmt.toFixed(2) : "",
          // Pre-fill renew date with old maturity date as minimum
          fdDate: data.fdAccountDetailDTOSingle.fdMaturityDate?.split("T")[0] || sessionDate,
        }));

        Swal.fire({
          icon: "success",
          title: "FD Details Loaded",
          text: `Account: ${data.accountMasterDTO?.accountNumber}`,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response.message || "FD Account not found");
      }
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to fetch FD account details", "error");
      setMatureFDDetail(blankMatureDetail());
    } finally {
      setIsFetchingFD(false);
    }
  };

  // ─── Renew Toggle ─────────────────────────────────────────────────────────

  const handleRenewFDChange = (checked: boolean) => {
    setIsRenewFD(checked);
    setValidationErrors({});
    if (!checked) {
      setRenewFDDetail((prev) => ({
      ...blankRenewDetail(),
      accountPrefix: prev.accountPrefix,
      accountSuffix: prev.accountSuffix,
      fdAmount: prev.fdAmount,
    }));
    }
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSelectedProduct(null);
    setSelectedFDAccount(null);
    setFdAccounts([]);
    setIsRenewFD(false);
    setActiveTab("cash");
    setValidationErrors({});
    setMatureFDDetail(blankMatureDetail());
    setRenewFDDetail(blankRenewDetail());
    setAccountCredit(blankCredit());
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!matureFDDetail.fdAccountNo) {
      Swal.fire("Warning", "Please select FD account first", "warning");
      return;
    }

    if (isRenewFD && !validateRenewFDDetails()) return;

    const totalCredited =
      accountCredit.generalAmount +
      accountCredit.savingAmount +
      accountCredit.loanAmount;

    if (isRenewFD) {
      // When renewing: total credited must be >= required amount.
      // Account selection is NOT mandatory — user may leave all tabs empty
      // and the renew amount itself covers the transaction.
      const baseAmount = Math.max(matureFDDetail.maturityAmt, matureFDDetail.balance);
      const postMaturity = parseFloat(matureFDDetail.postMaturityAmt || "0") || 0;
      const totalRequired = baseAmount + postMaturity;

      if (totalCredited > 0 && totalCredited < totalRequired) {
        // They started filling credit but didn't cover the full amount
        Swal.fire({
          title: "Insufficient Credit",
          text: `Credited amount ₹${totalCredited.toFixed(2)} is less than required ₹${totalRequired.toFixed(2)}. Either credit the full amount or leave all credit fields empty.`,
          icon: "warning",
        });
        return;
      }
    } else {
      // When maturing: at least one credit entry with account + amount is required
      const hasCashCredit = accountCredit.generalAccountId > 0 && accountCredit.generalAmount > 0;
      const hasSavingCredit = accountCredit.savingAccountId > 0 && accountCredit.savingAmount > 0;
      const hasLoanCredit = accountCredit.loanAccountId > 0 && accountCredit.loanAmount > 0;

      if (!hasCashCredit && !hasSavingCredit && !hasLoanCredit) {
        Swal.fire("Warning", "At least one credit entry is required to mature the FD", "warning");
        return;
      }

      const pending = calculatePendingAmount();
      if (pending !== 0) {
        if (pending > 0) {
          Swal.fire({
            title: "Pending Amount",
            text: `There is still ₹${pending.toFixed(2)} pending. Please credit the remaining amount.`,
            icon: "warning",
          });
        } else {
          Swal.fire({
            title: "Credit Amount Exceeds",
            text: `Credit amount exceeds by ₹${Math.abs(pending).toFixed(2)}. Please adjust.`,
            icon: "error",
          });
        }
        return;
      }
    }

    setLoading(true);
    try {
      const matureFdDto = {
        fdAccountId: matureFDDetail.fdAccountId,
        VoucherDate: matureFDDetail.date,
        branchId: user.branchid,
        postMaturityAmount: matureFDDetail.postMaturityAmt,
        intPayableAmount: matureFDDetail.intPayableAmt,
        DetailId: matureFDDetail.fdDetailId,
        ProductId: matureFDDetail.product,
        isRenew: isRenewFD,
        Narration: accountCredit.narration,
      };

      // NEW: Build renew FD DTO using same field names as FDAccountMaster createFDAccount
      const renewFdDto = isRenewFD
        ? {
            branchId: user.branchid,
            fdAccountNo: `${renewFDDetail.accountPrefix}-${renewFDDetail.accountSuffix}`,
            fdDate: renewFDDetail.fdDate,
            fdstatus: 1,
            receiptNo: renewFDDetail.receiptNo,
            fdAmount: parseFloat(renewFDDetail.fdAmount),
            fdPeriodMonths: parseInt(renewFDDetail.months) || 0,
            fdPeriodDays: parseInt(renewFDDetail.days) || 0,
            intRate: parseFloat(renewFDDetail.intRate) || 0,
            compoundingInterval: renewFDDetail.compoundingInterval,
            fdMaturityDate: renewFDDetail.maturityDate,
            maturityAmount: parseFloat(renewFDDetail.maturityAmount) || 0,
            slabId: renewFDDetail.slabId,
            LTDNo: renewFDDetail.receiptNo,
            agent: renewFDDetail.agent,

          }
        : null;

      const dto = {
        MatureOrRenewFDInfo: matureFdDto,
        FDAccountDetailDTOSingle: renewFdDto,
        CreditAccountDetails: accountCredit,
      };

      await fdAccountService.matureFD(dto);

      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: `FD ${isRenewFD ? "renewed" : "matured"} successfully!`,
        timer: 1500,
        showConfirmButton: false,
      });
      handleReset();
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to process FD", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Dropdown Options ─────────────────────────────────────────────────────

  const fdProductOptions = fdProducts.map((p) => ({ value: p.id, label: p.productName }));
  const fdAccountOptions = fdAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));
  const generalAccountOptions = generalAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));
  const savingAccountOptions = savingAccounts.map((acc) => ({ value: acc.accId, label: acc.accountName }));

  const compoundingOptions = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "Half-Yearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Yearly" },
  ];

  const tabs = [
    { id: "cash" as const, label: "Cash / Other", icon: Wallet },
    { id: "saving" as const, label: "Saving Account", icon: PiggyBank },
    { id: "loan" as const, label: "Loan Account", icon: Landmark },
    { id: "additional" as const, label: "Additional Details", icon: FileSpreadsheet },
  ];

  const pendingAmount = calculatePendingAmount();

  // ─── Renew amount vs maturity amount indicator ─────────────────────────────

  const renewAmount = parseFloat(renewFDDetail.fdAmount) || 0;
  const renewAmountValid = renewAmount >= matureFDDetail.maturityAmt;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Mature Fixed Deposit Account
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                      Mature or renew your fixed deposit
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

              {/* Re-New FD Toggle */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 p-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isRenewFD}
                      onChange={(e) => handleRenewFDChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold text-gray-800">Re-New FD</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enable to renew instead of close the FD
                    </p>
                  </div>
                </label>
              </div>

              {/* ── Search Section ── */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-500" /> Search FD Account
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                  {/* Date */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                      Date <span className="text-red-500 text-xs">*</span>
                    </label>
                    <DatePicker
                      value={matureFDDetail.date}
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
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                      Product <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={fdProductOptions}
                      value={fdProductOptions.find((o) => o.value === selectedProduct) || null}
                      onChange={(option) => handleProductChange(option?.value || null)}
                      placeholder={isLoadingProducts ? "Loading..." : "Select Product"}
                      isLoading={isLoadingProducts}
                      isClearable
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  {/* FD Account */}
                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                      FD Account <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      options={fdAccountOptions}
                      value={fdAccountOptions.find((o) => o.value === selectedFDAccount) || null}
                      onChange={(option) => handleFDAccountChange(option?.value || null)}
                      placeholder={!selectedProduct ? "Select Product first" : "Select FD Account"}
                      isDisabled={!selectedProduct || fdAccounts.length === 0}
                      isLoading={isFetchingFD}
                      isClearable
                      styles={customSelectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                </div>
              </div>

              {/* ── FD Detail Section ── */}
              {matureFDDetail.fdAccountNo && (
                <div className="p-6 sm:p-8 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" /> FD Detail
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                    {/* Maturity Amount */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                        Maturity Amount
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-green-500 shadow-sm">
                        <span className="text-lg font-bold text-gray-800 font-mono">
                          ₹ {matureFDDetail.maturityAmt.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Post Maturity */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" />
                        Post Maturity Amount
                      </label>
                      <input
                        type="text"
                        value={matureFDDetail.postMaturityAmt}
                        onChange={(e) =>
                          setMatureFDDetail({
                            ...matureFDDetail,
                            postMaturityAmt: validateNumberInput(e.target.value, 10),
                          })
                        }
                        className="px-4 py-3 border-2 border-yellow-200 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 outline-none transition-all text-gray-700 bg-white font-mono text-lg font-bold"
                        placeholder="0.00"
                      />
                    </div>

                    {/* FD Date */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                        FD Date
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">
                          {matureFDDetail.fdDate &&
                            new Date(matureFDDetail.fdDate).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                        </span>
                      </div>
                    </div>

                    {/* Maturity Date */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                        Maturity Date
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-purple-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">
                          {matureFDDetail.maturityDate &&
                            new Date(matureFDDetail.maturityDate).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                        </span>
                      </div>
                    </div>

                    {/* Saving Account Name */}
                    <div className="flex flex-col space-y-2 sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" />
                        Saving Account Name
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">{matureFDDetail.savingAccName}</span>
                      </div>
                    </div>

                    {/* Interest Rate */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full" />
                        Interest Rate
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-rose-500 shadow-sm flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-800 font-mono">{matureFDDetail.intRate}%</span>
                        <Percent className="w-5 h-5 text-rose-400" />
                      </div>
                    </div>

                    {/* Receipt No */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
                        Receipt No
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-teal-500 shadow-sm">
                        <span className="text-base font-semibold text-gray-800 font-mono">{matureFDDetail.receiptNo}</span>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-full" />
                        Balance
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-lime-500 shadow-sm">
                        <span className="text-lg font-bold text-gray-800 font-mono">₹ {matureFDDetail.balance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Deducted TDS */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                        Deducted TDS
                      </label>
                      <div className="bg-white px-4 py-3 rounded-lg border-l-4 border-orange-500 shadow-sm">
                        <span className="text-lg font-bold text-gray-800 font-mono">₹ {matureFDDetail.deductedTDS.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Int Payable */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                        Interest Payable
                      </label>
                      <input
                        type="text"
                        value={matureFDDetail.intPayableAmt}
                        onChange={(e) =>
                          setMatureFDDetail({
                            ...matureFDDetail,
                            intPayableAmt: validateNumberInput(e.target.value, 10),
                          })
                        }
                        className="px-4 py-3 border-2 border-violet-200 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-gray-700 bg-white font-mono text-lg font-bold"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Pending Amount */}
                    <div className="flex flex-col space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full" />
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

                  {/* Pending warning */}
                  {pendingAmount !== 0 && (
                    <div className={`mt-4 ${
                      pendingAmount > 0 ? "bg-amber-50 border-amber-500" : "bg-orange-50 border-orange-500"
                    } border-l-4 p-4 rounded-lg flex items-start gap-3`}>
                      <AlertCircle className={`w-5 h-5 ${pendingAmount > 0 ? "text-amber-500" : "text-orange-500"} flex-shrink-0 mt-0.5`} />
                      <div>
                        {pendingAmount > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-amber-800">Pending: ₹{pendingAmount.toFixed(2)}</p>
                            <p className="text-xs text-amber-600 mt-1">Please credit the remaining amount</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-orange-800">Excess: ₹{Math.abs(pendingAmount).toFixed(2)}</p>
                            <p className="text-xs text-orange-600 mt-1">Credit amount exceeds the required amount</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Renew FD Section (mirrors FDAccountMaster fdDetailForm) ── */}
              {isRenewFD && matureFDDetail.fdAccountNo && (
                <div className="p-6 sm:p-8 border-t border-gray-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30">

                  {/* Section header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-500" />
                      New FD Detail
                      {isFetchingRenewInfo && (
                        <span className="ml-2 flex items-center gap-1 text-xs text-blue-600 font-normal">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Fetching slab info…
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                      Min. renew amount: <span className="font-bold text-purple-700">₹{matureFDDetail.maturityAmt.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                      <h4 className="text-base font-semibold text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Renewal Details
                        <span className="ml-2 text-xs font-normal text-white/70">
                          Fields marked <span className="text-red-300">*</span> are mandatory
                        </span>
                      </h4>
                    </div>

                    <div className="p-6 space-y-6">

                      {/* ── Row 1: Account Number ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Account Number (Prefix – Suffix) */}
                        <div className="flex flex-col lg:col-span-1">
                          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            Account Number <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={renewFDDetail.accountPrefix}
                                onChange={(e) => handleRenewFieldChange("accountPrefix", e.target.value)}
                                placeholder="Prefix"
                                readOnly  // Prefix is read-only as it's auto-populated from existing account
                                className={`w-full px-3 py-2.5 border-2 ${
                                  validationErrors.accountPrefix ? "border-red-400" : "border-gray-200"
                                } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm`}
                              />
                              {validationErrors.accountPrefix && (
                                <p className="text-xs text-red-500 mt-1">{validationErrors.accountPrefix}</p>
                              )}
                            </div>
                            <span className="mt-2.5 font-bold text-gray-400 text-lg select-none">-</span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={renewFDDetail.accountSuffix}
                                readOnly  // Suffix is read-only as it's auto-populated from existing account
                                onChange={(e) => handleRenewFieldChange("accountSuffix", e.target.value)}
                                placeholder="Suffix"
                                className={`w-full px-3 py-2.5 border-2 ${
                                  validationErrors.accountSuffix ? "border-red-400" : "border-gray-200"
                                } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm`}
                              />
                              {validationErrors.accountSuffix && (
                                <p className="text-xs text-red-500 mt-1">{validationErrors.accountSuffix}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* FD Date */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            FD Date <span className="text-red-500">*</span>
                          </label>
                          <DatePicker
                            value={renewFDDetail.fdDate}
                            onChange={(val) => handleRenewFieldChange("fdDate", val)}
                            min={matureFDDetail.maturityDate}
                            max={sessionDate}
                            workingDate={sessionDate}
                            className={`w-full px-3 py-2.5 border-2 ${
                              validationErrors.fdDate ? "border-red-400" : "border-gray-200"
                            } rounded-lg outline-none text-sm`}
                          />
                          {validationErrors.fdDate && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.fdDate}</p>
                          )}
                        </div>

                        {/* Receipt No */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            Receipt / LTD No <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={renewFDDetail.receiptNo}
                            onChange={(e) => handleRenewFieldChange("receiptNo", e.target.value)}
                            maxLength={10}
                            placeholder="Enter receipt number"
                            className={`w-full px-3 py-2.5 border-2 ${
                              validationErrors.receiptNo ? "border-red-400" : "border-gray-200"
                            } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm`}
                          />
                          {validationErrors.receiptNo && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.receiptNo}</p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* ── Row 2: Amount, Period ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* FD Amount (>= maturityAmt) */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            FD Amount <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={renewFDDetail.fdAmount}
                              onChange={(e) => {
                                if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                                  handleRenewFieldChange("fdAmount", e.target.value);
                                }
                              }}
                              maxLength={14}
                              placeholder="Enter amount"
                              className={`w-full px-3 py-2.5 border-2 ${
                                validationErrors.fdAmount
                                  ? "border-red-400"
                                  : renewAmount > 0 && renewAmountValid
                                  ? "border-green-400"
                                  : "border-gray-200"
                              } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm pr-8`}
                            />
                            {renewAmount > 0 && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {renewAmountValid
                                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                                  : <XCircle className="w-4 h-4 text-red-500" />
                                }
                              </span>
                            )}
                          </div>
                          {/* Live inline feedback */}
                          {renewAmount > 0 && !renewAmountValid && (
                            <p className="text-xs text-red-500 mt-1">
                              Must be ≥ ₹{matureFDDetail.maturityAmt.toFixed(2)}
                            </p>
                          )}
                          {renewAmount > 0 && renewAmountValid && (
                            <p className="text-xs text-green-600 mt-1">Amount is valid ✓</p>
                          )}
                          {validationErrors.fdAmount && !renewAmount && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.fdAmount}</p>
                          )}
                        </div>

                        {/* Months */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2">
                            Months
                            <span className="text-xs text-gray-400 ml-1">(or days)</span>
                          </label>
                          <input
                            type="text"
                            value={renewFDDetail.months}
                            onChange={(e) =>
                              handleRenewFieldChange("months", e.target.value.replace(/\D/g, "").slice(0, 3))
                            }
                            maxLength={3}
                            placeholder="e.g. 12"
                            className={`w-full px-3 py-2.5 border-2 ${
                              validationErrors.daysMonths && !renewFDDetail.months ? "border-red-400" : "border-gray-200"
                            } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm`}
                          />
                        </div>

                        {/* Days */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2">
                            Days
                            <span className="text-xs text-gray-400 ml-1">(or months)</span>
                          </label>
                          <input
                            type="text"
                            value={renewFDDetail.days}
                            onChange={(e) =>
                              handleRenewFieldChange("days", e.target.value.replace(/\D/g, "").slice(0, 3))
                            }
                            maxLength={3}
                            placeholder="e.g. 0"
                            className={`w-full px-3 py-2.5 border-2 ${
                              validationErrors.daysMonths && !renewFDDetail.days ? "border-red-400" : "border-gray-200"
                            } rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm`}
                          />
                          {validationErrors.daysMonths && !renewFDDetail.months && !renewFDDetail.days && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.daysMonths}</p>
                          )}
                        </div>

                        {/* Agent */}
                        <div className="flex flex-col">
                          <label className="text-sm font-semibold text-gray-700 mb-2">Agent</label>
                          <input
                            type="text"
                            value={renewFDDetail.agent}
                            onChange={(e) => handleRenewFieldChange("agent", e.target.value)}
                            placeholder="Agent name (optional)"
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* ── Row 3: Auto-calculated fields (read-only) ── */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Auto-calculated (from slab API)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                          {/* Interest Rate */}
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Interest Rate %
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={renewFDDetail.intRate}
                                readOnly
                                placeholder="Auto from slab"
                                className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed text-sm"
                              />
                              {isFetchingRenewInfo && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          </div>

                          {/* Compounding */}
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Compounding
                            </label>
                            <Select
                              options={compoundingOptions}
                              value={compoundingOptions.find(
                                (o) => o.value === renewFDDetail.compoundingInterval,
                              )}
                              isDisabled
                              className="text-sm"
                              styles={customSelectStyles}
                            />
                          </div>

                          {/* Maturity Date */}
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Maturity Date
                            </label>
                            <DatePicker
                              value={renewFDDetail.maturityDate}
                              disabled
                              className={`w-full px-3 py-2.5 border-2 ${
                                validationErrors.maturityDate ? "border-red-300" : "border-gray-100"
                              } rounded-lg outline-none text-sm`}
                              onChange={() => {}}
                            />
                            {validationErrors.maturityDate && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.maturityDate}</p>
                            )}
                          </div>

                          {/* Maturity Amount */}
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Maturity Amount
                            </label>
                            <input
                              type="text"
                              value={renewFDDetail.maturityAmount}
                              readOnly
                              disabled
                              placeholder="Auto-calculated"
                              className={`w-full px-3 py-2.5 border-2 ${
                                validationErrors.maturityAmount ? "border-red-300" : "border-gray-100"
                              } rounded-lg bg-gray-50 text-gray-700 font-mono font-bold cursor-not-allowed text-sm`}
                            />
                            {validationErrors.maturityAmount && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.maturityAmount}</p>
                            )}
                          </div>

                          {/* Slab Name */}
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">
                              Slab Name
                            </label>
                            <input
                              type="text"
                              value={renewFDDetail.slabName}
                              readOnly
                              disabled
                              placeholder="Auto-fetched"
                              className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── Renew amount summary banner ── */}
                      {renewAmount > 0 && matureFDDetail.maturityAmt > 0 && (
                        <div className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
                          renewAmountValid
                            ? "bg-green-50 border-green-500"
                            : "bg-red-50 border-red-500"
                        }`}>
                          {renewAmountValid
                            ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          }
                          <div>
                            <p className={`text-sm font-semibold ${renewAmountValid ? "text-green-800" : "text-red-800"}`}>
                              {renewAmountValid
                                ? `Renew amount ₹${renewAmount.toFixed(2)} is valid (≥ maturity ₹${matureFDDetail.maturityAmt.toFixed(2)})`
                                : `Renew amount ₹${renewAmount.toFixed(2)} is less than maturity amount ₹${matureFDDetail.maturityAmt.toFixed(2)}`
                              }
                            </p>
                            {renewAmount > matureFDDetail.maturityAmt && (
                              <p className="text-xs text-green-600 mt-0.5">
                                Additional top-up: ₹{(renewAmount - matureFDDetail.maturityAmt).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {/* ── Account Credit Section ── */}
              {matureFDDetail.fdAccountNo && (
                <div className="p-6 sm:p-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Account Credit Details
                    {isRenewFD ? (
                      <span className="text-blue-500 text-xs ml-2">(Optional when renewing — credit full amount if entered)</span>
                    ) : (
                      <span className="text-red-500 text-xs ml-2">(At least one entry required)</span>
                    )}
                  </h3>

                  {/* Tab Navigation */}
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;

                      // Explicit active background per tab — avoids Tailwind JIT purging dynamic class names
                      const activeStyle: React.CSSProperties = {
                        cash:       { background: "linear-gradient(to right, #3b82f6, #2563eb)", color: "#fff" },
                        saving:     { background: "linear-gradient(to right, #a855f7, #9333ea)", color: "#fff" },
                        loan:       { background: "linear-gradient(to right, #f43f5e, #e11d48)", color: "#fff" },
                        additional: { background: "linear-gradient(to right, #10b981, #059669)", color: "#fff" },
                      }[tab.id] ?? {};

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          style={isActive ? activeStyle : {}}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm
                            ${isActive
                              ? "shadow-md scale-105"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Content */}
                  <div className="mt-4">

                    {/* Cash/Other */}
                    {activeTab === "cash" && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-2">Cash / Other Account</label>
                            <Select
                              options={generalAccountOptions}
                              value={generalAccountOptions.find((o) => o.value === accountCredit.generalAccountId) || null}
                              onChange={(option) => setAccountCredit({ ...accountCredit, generalAccountId: option?.value || 0 })}
                              placeholder="Select general account"
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
                              value={accountCredit.generalAmount || ""}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  generalAmount: Number(validateNumberInput(e.target.value, 10) || 0),
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
                              onChange={(option) => setAccountCredit({ ...accountCredit, savingAccountId: option?.value || 0 })}
                              placeholder="Select saving account"
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
                              value={accountCredit.savingAmount || ""}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  savingAmount: Number(validateNumberInput(e.target.value, 10) || 0),
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
                              onChange={(option) => setAccountCredit({ ...accountCredit, loanAccountId: option?.value || 0 })}
                              placeholder="Select loan account"
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
                              value={accountCredit.loanAmount || ""}
                              onChange={(e) =>
                                setAccountCredit({
                                  ...accountCredit,
                                  loanAmount: Number(validateNumberInput(e.target.value, 10) || 0),
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
                              onChange={(option) => setAccountCredit({ ...accountCredit, loanProduct: option?.value || "" })}
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
                          {[
                            { label: "Int Posting Amt", field: "intPostingAmt" as const },
                            { label: "Closing Charges", field: "closingCharges" as const },
                            { label: "TDS Amount", field: "tdsAmount" as const },
                          ].map(({ label, field }) => (
                            <div key={field} className="flex flex-col">
                              <label className="text-sm font-semibold text-gray-700 mb-2">{label}</label>
                              <input
                                type="text"
                                value={accountCredit[field] || ""}
                                onChange={(e) =>
                                  setAccountCredit({
                                    ...accountCredit,
                                    [field]: Number(validateNumberInput(e.target.value, 10) || 0),
                                  })
                                }
                                className="px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-mono bg-white"
                                placeholder="0.00"
                              />
                            </div>
                          ))}
                          <div className="flex flex-col md:col-span-2 lg:col-span-1">
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
                  </div>

                  {/* Total Credit Summary */}
                  <div className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Total Credit Amount</p>
                        <p className="text-3xl font-bold font-mono">
                          ₹ {(accountCredit.generalAmount + accountCredit.savingAmount + accountCredit.loanAmount).toFixed(2)}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action Buttons ── */}
              {matureFDDetail.fdAccountNo && (
                <div className="flex justify-end gap-4 p-6 sm:p-8 border-t border-gray-200">
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
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md text-sm"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isRenewFD ? "Renew FD" : "Mature FD"}
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

export default MatureFDPage;