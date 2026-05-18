import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import { decryptId, encryptId } from "../../../utils/encryption";
import {
  Save, RotateCcw, ArrowLeft, Plus, Trash2,
  User, CreditCard, AlertCircle, Calendar, IndianRupee, Building, UserCheck,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import savingAccountService from "../../../services/accountMasters/savingaccount/savingaccountapi";
import loanSlabService, { CombinedLoanSlabDTO } from "../../../services/interestslab/loanslabservice";
import {
  loanAccountApi,
  CombinedLoanAccountDTO,
  LoanProductInfoDTO,
  AccountKistScheduleDTO,
  AccountLimitDetailDTO,
  NomineeDTO,
  LoanAccFDPledgeDTO,
  LoanAccRDPledgeDTO,
  LoanAccountBalanceDetailDTO,
} from "../../../services/accountMasters/loanaccount/loanaccountapi";
import {
  canEnterOpeningBalance,
  getFirstSessionFromDate,
} from "../../../utils/session";
import DatePicker from "../../../components/DatePicker";

// ─── Loan type constants ──────────────────────────────────────────────────────
const LOAN_TYPE_INSTALLMENT = [1, 2, 3]; // Installment, Overdraft, Demand Loan
const LOAN_TYPE_LIMITWISE = 4;
const SECURITY_FD_RD = 5; // FD/RD Pledge security ID
const INT_FORMULAE_FLAT = 1;     // Add in Balance
const INT_FORMULAE_REDUCING = 2; // Stand
const INT_SCHEDULE_WITH = 1;     // With Interest
const INT_SCHEDULE_WITHOUT = 2;  // Without Interest
const CATEGORY_UNSECURE = 1;

interface LoanProduct { id: number; productName: string; }
interface Relation { relationId: number; description: string; }
interface FDAccount { accId: number; accountNumber: string; accountName: string; }
interface RDAccount { accId: number; accountNumber: string; accountName: string; }
interface ActiveMember { memberId: number; memberBrId: number; memberName: string; relativeName: string; permanentMembershipNo?: string; nominalMembershipNo?: string; }

// ─── Component ────────────────────────────────────────────────────────────────
const LoanAccountMaster: React.FC = () => {
  const navigate = useNavigate();
  const { accountId: encryptedId } = useParams<{ accountId?: string }>();
  const accountId = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!accountId;
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();

  const [activeTab, setActiveTab] = useState("loan-detail");
  const [loading, setLoading] = useState(false);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [fdAccounts, setFDAccounts] = useState<FDAccount[]>([]);
  const [rdAccounts, setRDAccounts] = useState<RDAccount[]>([]);
  const [productInfo, setProductInfo] = useState<LoanProductInfoDTO | null>(null);
  const [loanSlabs, setLoanSlabs] = useState<CombinedLoanSlabDTO[]>([]);

  // Member lookup mode (same as saving master)
  const [inputMode, setInputMode] = useState<"account" | "membership">("account");
  const [memberType, setMemberType] = useState(2); // 2 = Permanent, 1 = Nominal

  // Member details (same structure as saving master)
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [memberDetailsData, setMemberDetailsData] = useState({
    memberName: "", gender: 0, dateOfBirth: "",
    mobileNo: "", emailId: "", addressLine1: "", relativeName: "",
  });

  // Share money account details
  const [shareMoneyAccDetails, setShareMoneyAccDetails] = useState<{
    accId: number; accountName: string; accountNumber: string; isAccClosed: boolean;
  } | null>(null);
  const [shareMoneyLoading, setShareMoneyLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    branchId: user.branchid,
    selectedProductId: 0,
    openingDate: sessionDate,
    shareMoneyAccNo: "",
    memberAccountNo: "",
    membershipNo: "",
    agent: "",
    accountNumber: "",
    accPrefix: "",
    accSuffix: 0,
    headId: 0,
    headCode: 0,
    relationId: 0,
  });

  // Kist (installment) detail
  const [kistData, setKistData] = useState({
    loanAmount: "",
    loanDate: sessionDate,
    stdIntRate: "",
    overIntRate: "",
    marginAmount: "",
    loanPeriod: "",
    kistInterval: "",
    firstKistDate: sessionDate,
    slabId: 0,
    loanNo: "",
    kistPrintPart: "",
    intFormulae: INT_FORMULAE_REDUCING,
    intSchedule: INT_SCHEDULE_WITH,
    // computed
    kistAmount: 0,
    kistIntPart: 0,
    intAmount: 0,
  });

  // Limit entry form
  const [limitEntry, setLimitEntry] = useState({
    loanNo: "", loanDate: sessionDate,
    loanAmount: "", periodMonths: "", periodDays: "",
    stdIntRate: "", overIntRate: "", slabId: 0,
  });

  // Active members for guarantor autocomplete
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([]);

  // Lists
  const [schedule, setSchedule] = useState<AccountKistScheduleDTO[]>([]);
  const [limitDetails, setLimitDetails] = useState<AccountLimitDetailDTO[]>([]);
  const [nominees, setNominees] = useState<NomineeDTO[]>([]);
  const [fdPledges, setFDPledges] = useState<LoanAccFDPledgeDTO[]>([]);
  const [rdPledges, setRDPledges] = useState<LoanAccRDPledgeDTO[]>([]);
  const [openingBalDetails, setOpeningBalDetails] = useState<LoanAccountBalanceDetailDTO[]>([]);

  // Guarantors / Witnesses (store member IDs)
  const [guarantorData, setGuarantorData] = useState({
    guar1MemId: 0, guar1MemBrId: 0,
    guar2MemId: 0, guar2MemBrId: 0,
    witness1MemId: 0, wit1MemBrId: 0,
    witness2MemId: 0, wit2MemBrId: 0,
  });

  // Opening balance header
  const [openingBal, setOpeningBal] = useState({
    totalBalance: "", balType: "Dr", overDueBal: "", openInt: "", openOverInt: "",
  });

  // Opening balance entry row
  const [obEntry, setObEntry] = useState({
    date: sessionDate, entryType: "",
    amountDr: "", amountCr: "", intDr: "", intCr: "",
  });

  // Nominee entry
  const [nomineeEntry, setNomineeEntry] = useState({
    nomineeName: "", nomineeDob: "", relationId: 0,
    addressLine: "", isMinor: 0, nameOfGuardian: "",
  });

  // FD/RD pledge entry
  const [fdPledgeEntry, setFdPledgeEntry] = useState<{ accId: number; accNumber: string; fdAmount: string; interest: string }>({ accId: 0, accNumber: "", fdAmount: "", interest: "" });
  const [rdPledgeEntry, setRdPledgeEntry] = useState<{ accId: number; accNumber: string; rdAmount: string; interest: string }>({ accId: 0, accNumber: "", rdAmount: "", interest: "" });

  // ── Derived flags ────────────────────────────────────────────────────────────
  const isInstallment = productInfo ? LOAN_TYPE_INSTALLMENT.includes(productInfo.typeId) : true;
  const isLimitWise   = productInfo?.typeId === LOAN_TYPE_LIMITWISE;
  const isUnsecure    = productInfo?.categoryId === CATEGORY_UNSECURE;
  const hasFDRDPledge = productInfo?.securityIds?.split(",").map(s => s.trim()).includes(String(SECURITY_FD_RD)) ?? false;

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const showOpeningBal = canEnterOpeningBalance(user, formData.openingDate);

  const allTabs = [
    { id: "loan-detail", label: "Loan Detail" },
    { id: "nominee", label: "Nominee Detail" },
    { id: "opening-balance", label: "Opening Balance Detail", show: showOpeningBal },
    { id: "guarantors", label: "Guarantors And Witness Detail", show: isUnsecure || !productInfo },
    { id: "fd-pledge", label: "Fd Pledge Detail", show: hasFDRDPledge },
    { id: "rd-pledge", label: "Rd Pledge Detail", show: hasFDRDPledge },
  ];
  const visibleTabs = allTabs.filter(t => t.show === undefined || t.show);

  // ── Load initial data ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, relRes, membersRes] = await Promise.all([
          commonservice.fetch_loan_products(user.branchid),
          commonservice.relation_info(),
          commonservice.fetch_active_members(user.branchid),
        ]);
        setLoanProducts(prodRes.data ?? []);
        setRelations(relRes.data ?? []);
        setActiveMembers((membersRes as any).data ?? []);
      } catch {
        Swal.fire("Error", "Failed to load required data", "error");
      }
    })();
  }, [user.branchid]);

  // ── Auto-compute principal part per installment ──────────────────────────────
  useEffect(() => {
    const loan     = parseFloat(kistData.loanAmount);
    const period   = parseInt(kistData.loanPeriod);
    const interval = parseInt(kistData.kistInterval);
    if (!loan || !period || !interval || interval === 0) {
      setKistData(p => ({ ...p, kistPrintPart: "" }));
      return;
    }
    const numInstallments = Math.floor(period / interval);
    if (numInstallments === 0) return;
    const prinPart = Math.round((loan / numInstallments) * 100) / 100;
    setKistData(p => ({ ...p, kistPrintPart: prinPart.toString() }));
  }, [kistData.loanAmount, kistData.loanPeriod, kistData.kistInterval]);

  // ── FD/RD accounts filtered by opening date ──────────────────────────────────
  useEffect(() => {
    if (!formData.openingDate) return;
    (async () => {
      const [fdRes, rdRes] = await Promise.all([
        commonservice.fetch_fd_accounts_for_pledge(user.branchid, formData.openingDate),
        commonservice.fetch_rd_accounts_for_pledge(user.branchid, formData.openingDate),
      ]);
      setFDAccounts((fdRes as any).data ?? []);
      setRDAccounts((rdRes as any).data ?? []);
    })();
  }, [formData.openingDate, user.branchid]);

  // ── Load edit data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !accountId) return;
    (async () => {
      try {
        Swal.fire({ title: "Loading...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const modifyCheck = await commonservice.can_modify_account(Number(accountId), user.branchid);
        if (!modifyCheck.success) {
          Swal.close();
          await Swal.fire({ icon: "error", title: "Not Allowed", text: modifyCheck.message || "This account can only be modified in the session it was opened in." });
          navigate("/loan-acc-info");
          return;
        }

        const res = await loanAccountApi.getLoanAccountById(accountId, user.branchid);
        if (res.success && res.data) {
          const d = res.data;
          const acc = d.accountMasterDTO;

          const addedUsing = acc.addedUsing ?? "A";
          const resolvedMode: "account" | "membership" = addedUsing === "A" ? "account" : "membership";
          const resolvedMemberType = addedUsing === "NM" ? 1 : 2;
          setInputMode(resolvedMode);
          setMemberType(resolvedMemberType);

          setFormData(prev => ({
            ...prev, selectedProductId: acc.generalProductId ?? 0,
            openingDate: commonservice.splitDate(acc.accOpeningDate),
            accountNumber: acc.accPrefix ? `${acc.accPrefix}-${acc.accSuffix}` : (acc.accountNumber ?? ""),
            accPrefix: acc.accPrefix ?? "",
            accSuffix: acc.accSuffix ?? 0, headId: acc.headId, headCode: acc.headCode,
            memberAccountNo: resolvedMode === "account" ? (acc.accountNumber ?? "") : "",
            membershipNo: resolvedMode === "membership" ? (acc.membershipNo ?? "") : "",
          }));
          setMemberDetails({ memberId: acc.memberId ?? 0, memberBranchId: acc.memberBranchId ?? 0 });
          setMemberDetailsData({
            memberName: acc.accountName ?? "",
            gender: acc.gender ?? 0,
            relativeName: acc.relativeName ?? "",
            mobileNo: acc.phoneNo1 ?? "",
            emailId: acc.email ?? "",
            addressLine1: acc.addressLine ?? "",
            dateOfBirth: acc.dob ? String(acc.dob).split("T")[0] : "",
          });

          if (acc.generalProductId) {
            const [infoRes, slabRes] = await Promise.all([
              loanAccountApi.getLoanProductInfo(acc.generalProductId, user.branchid),
              loanSlabService.fetchLoanSlabs(user.branchid, { pageNumber: 1, pageSize: 100, searchTerm: "" }),
            ]);
            if (infoRes.success && infoRes.data) {
              setProductInfo(infoRes.data);
            }
            if (slabRes.success && (slabRes as any).loanSlabs) {
              const filtered: CombinedLoanSlabDTO[] = ((slabRes as any).loanSlabs as CombinedLoanSlabDTO[])
                .filter(s => s.loanSlab.loanProductId === acc.generalProductId);
              setLoanSlabs(filtered);
            }
          }
          if (d.kistDetail) {
            const k = d.kistDetail;
            setKistData(prev => ({
              ...prev,
              loanAmount: k.loanAmountPassed?.toString() ?? "",
              loanDate: commonservice.splitDate(k.loanDate),
              stdIntRate: k.standardInterestRate?.toString() ?? "",
              overIntRate: k.overdueInterestRate?.toString() ?? "",
              marginAmount: k.marginMoney?.toString() ?? "",
              loanPeriod: k.loanPeriod?.toString() ?? "",
              kistInterval: k.kistInterval?.toString() ?? "",
              firstKistDate: commonservice.splitDate(k.kistFirstDate),
              loanNo: k.loanNo ?? "",
              kistAmount: k.kistAmount ?? 0,
              intAmount: k.kislIntAmt ?? 0,
            }));
          }
          setSchedule(d.kistSchedule ?? []);
          setLimitDetails(d.limitDetails ?? []);
          setNominees(d.nominees ?? []);
          if (d.guarantor) setGuarantorData({
            guar1MemId: d.guarantor.guar1MemId ?? 0, guar1MemBrId: d.guarantor.guar1MemBrId ?? 0,
            guar2MemId: d.guarantor.guar2MemId ?? 0, guar2MemBrId: d.guarantor.guar2MemBrId ?? 0,
            witness1MemId: d.guarantor.witness1MemId ?? 0, wit1MemBrId: d.guarantor.wit1MemBrId ?? 0,
            witness2MemId: d.guarantor.witness2MemId ?? 0, wit2MemBrId: d.guarantor.wit2MemBrId ?? 0,
          });
          setFDPledges(d.fDPledges ?? []);
          setRDPledges(d.rDPledges ?? []);
          setOpeningBalDetails(d.openingBalanceDetails ?? []);
        }
        Swal.close();
      } catch (error: any) {
        Swal.close();
        Swal.fire("Error", error?.message || "Failed to load loan account data.", "error");
        navigate("/loan-acc-info");
      }
    })();
  }, [accountId, isEditMode, user.branchid]);

  // ── Product selection ────────────────────────────────────────────────────────
  const handleProductChange = async (opt: any) => {
    const productId = opt?.value ?? 0;
    setFormData(prev => ({ ...prev, selectedProductId: productId }));
    setLoanSlabs([]);
    setKistData(prev => ({ ...prev, slabId: 0, stdIntRate: "", overIntRate: "" }));
    if (!productId) { setProductInfo(null); return; }

    const [infoRes, numRes, slabRes] = await Promise.all([
      loanAccountApi.getLoanProductInfo(productId, user.branchid),
      loanAccountApi.getNextAccountNumber(productId, user.branchid),
      loanSlabService.fetchLoanSlabs(user.branchid, { pageNumber: 1, pageSize: 100, searchTerm: "" }),
    ]);

    if (infoRes.success && infoRes.data) {
      setProductInfo(infoRes.data);
      setKistData(prev => ({
        ...prev,
        intFormulae: infoRes.data!.intFormulae ?? INT_FORMULAE_REDUCING,
        intSchedule: infoRes.data!.intSchedule ?? INT_SCHEDULE_WITH,
      }));
    }

    if (numRes.success && numRes.data) {
      const parts = String(numRes.data).split("-");
      setFormData(prev => ({
        ...prev,
        accPrefix: parts[0] ?? "",
        accSuffix: parseInt(parts[parts.length - 1] ?? "1"),
        accountNumber: String(numRes.data),
      }));
      setKistData(prev => ({ ...prev, loanNo: String(numRes.data) }));
    }

    if (slabRes.success && (slabRes as any).loanSlabs) {
      // Filter slabs for this product
      const filtered: CombinedLoanSlabDTO[] = ((slabRes as any).loanSlabs as CombinedLoanSlabDTO[])
        .filter(s => s.loanSlab.loanProductId === productId);
      setLoanSlabs(filtered);
    }
  };

  // ── Auto-detect slab by amount + period + effective date ─────────────────────
  const applySlabRates = (amountStr: string, periodStr?: string) => {
    if (!amountStr || loanSlabs.length === 0) return;
    const amount = parseFloat(amountStr);
    const period = parseInt(periodStr ?? kistData.loanPeriod);
    if (isNaN(amount)) return;

    // Latest slab first (newest date wins when multiple slabs exist for a product)
    const effectiveSlabs = [...loanSlabs]
      .sort((a, b) => new Date(b.loanSlab.date).getTime() - new Date(a.loanSlab.date).getTime());

    for (const slab of effectiveSlabs) {
      const detail = slab.loanSlabDetails.find(d => {
        const amountOk = amount >= d.fromAmount && amount <= d.toAmount;
        const periodOk = (d.periodFrom != null && d.periodTo != null && !isNaN(period))
          ? period >= d.periodFrom && period <= d.periodTo
          : true;
        return amountOk && periodOk;
      });
      if (detail) {
        setKistData(prev => ({
          ...prev,
          slabId: slab.loanSlab.id ?? 0,
          stdIntRate: detail.stdIntRate?.toString() ?? "",
          overIntRate: detail.penalIntRate?.toString() ?? "",
        }));
        return;
      }
    }
    Swal.fire("Warning", "No matching slab found for this loan amount and period. Please verify the slab configuration.", "warning");
    setKistData(prev => ({ ...prev, slabId: 0, stdIntRate: "", overIntRate: "" }));
  };

  // ── Member search (same as saving master) ────────────────────────────────────
  const handleMemberSearch = async () => {
    const searchValue = inputMode === "account"
      ? formData.memberAccountNo
      : formData.membershipNo;

    if (!searchValue || searchValue.trim() === "") {
      Swal.fire("Warning", `Please enter ${inputMode === "account" ? "Member Account Number" : "Membership Number"}`, "warning");
      return;
    }

    try {
      Swal.fire({ title: "Searching Member...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const response = inputMode === "account"
        ? await savingAccountService.getMemberByAccountNo(user.branchid, searchValue)
        : await savingAccountService.getMemberByMembershipNo(user.branchid, searchValue, memberType);

      Swal.close();

      if (response.success && response.data) {
        setMemberDetails(response.data);
        setMemberDetailsData({
          memberName: response.data.memberName || "",
          gender: Number(response.data.gender) || 0,
          dateOfBirth: response.data.dateOfBirth ? response.data.dateOfBirth.split("T")[0] : "",
          mobileNo: response.data.phoneNo || "",
          emailId: response.data.emailId || "",
          addressLine1: response.data.addressLine1 || "",
          relativeName: response.data.relativeName || "",
        });
        Swal.fire({ icon: "success", title: "Member Found!", text: `Member: ${response.data.memberName}`, timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire("Error", "Member not found", "error");
      }
    } catch (error: any) {
      Swal.close();
      Swal.fire("Error", error.message || "Failed to fetch member details", "error");
    }
  };

  // Toggle input mode (same as saving master)
  const handleInputModeChange = (mode: "account" | "membership") => {
    setInputMode(mode);
    if (!isEditMode) {
      setFormData(p => ({ ...p, memberAccountNo: "", membershipNo: "" }));
      setMemberDetails(null);
      setMemberDetailsData({ memberName: "", gender: 0, dateOfBirth: "", mobileNo: "", emailId: "", addressLine1: "", relativeName: "" });
    }
  };

  // ── Share money account lookup ───────────────────────────────────────────────
  const handleShareMoneyLookup = async (accNo: string) => {
    const trimmed = accNo.trim();
    if (!trimmed) { setShareMoneyAccDetails(null); return; }

    setShareMoneyLoading(true);
    try {
      const res = await commonservice.fetch_saving_account_by_accno(user.branchid, trimmed);
      if (res.success && (res as any).data) {
        const d = (res as any).data;
        setShareMoneyAccDetails({
          accId: d.accId,
          accountName: d.accountName ?? "",
          accountNumber: d.accountNumber ?? "",
          isAccClosed: d.isAccClosed ?? false,
        });
        if (d.isAccClosed) {
          Swal.fire("Warning", "This saving account is already closed.", "warning");
        }
      } else {
        setShareMoneyAccDetails(null);
        Swal.fire("Not Found", "No saving account found with this account number.", "warning");
        setFormData(p => ({ ...p, shareMoneyAccNo: "" }));
      }
    } finally {
      setShareMoneyLoading(false);
    }
  };

  // ── Auto-detect slab for limit entry (amount + period + effective date) ───────
  const applySlabRatesForLimit = (amountStr: string, periodStr?: string) => {
    if (!amountStr || loanSlabs.length === 0) return;
    const amount = parseFloat(amountStr);
    const period = parseInt(periodStr ?? limitEntry.periodMonths);
    if (isNaN(amount)) return;

    // Latest slab first (newest date wins when multiple slabs exist for a product)
    const effectiveSlabs = [...loanSlabs]
      .sort((a, b) => new Date(b.loanSlab.date).getTime() - new Date(a.loanSlab.date).getTime());

    for (const slab of effectiveSlabs) {
      const detail = slab.loanSlabDetails.find(d => {
        const amountOk = amount >= d.fromAmount && amount <= d.toAmount;
        const periodOk = (d.periodFrom != null && d.periodTo != null && !isNaN(period))
          ? period >= d.periodFrom && period <= d.periodTo
          : true;
        return amountOk && periodOk;
      });
      if (detail) {
        setLimitEntry(prev => ({
          ...prev,
          slabId: slab.loanSlab.id ?? 0,
          stdIntRate: detail.stdIntRate?.toString() ?? "",
          overIntRate: detail.penalIntRate?.toString() ?? "",
        }));
        return;
      }
    }
    Swal.fire("Warning", "No matching slab found for this loan amount and period. Please verify the slab configuration.", "warning");
    setLimitEntry(prev => ({ ...prev, slabId: 0, stdIntRate: "", overIntRate: "" }));
  };

  // ── Session date range (parsed from "YYYY-YYYY", fiscal year Apr–Mar) ─────────
  const sessionParts = user.sessionInfo ? user.sessionInfo.split('-') : [];
  const sessionFrom  = getFirstSessionFromDate(user);
  const sessionTo    = sessionParts.length === 2 ? `${sessionParts[1]}-03-31` : "";
  // effective max: whichever is earlier — session end or working date
  const sessionMaxDate = (sessionTo && sessionTo < sessionDate)
    ? sessionTo
    : sessionDate;
  const isFirstSession = user.isFirstSession === "True";
  const sessionMinDate = isFirstSession
    ? undefined
    : sessionParts.length >= 1 ? `${sessionParts[0]}-04-01` : undefined;

  // ── Future-date guard (always computes current date fresh) ───────────────────
  const validateNotFuture = (date: string): boolean => {
    if (date && date > commonservice.getTodaysDate()) {
      Swal.fire({ icon: "warning", title: "Invalid Date", text: "Cannot select a future date. Please select today or an earlier date." });
      return false;
    }
    return true;
  };

  // ── Session range guard ───────────────────────────────────────────────────────
  const validateInSession = (date: string): boolean => {
    if (!date) return true;
    if (sessionTo && date > sessionTo) {
      Swal.fire({ icon: "warning", title: "Invalid Date", text: `Account opening date must fall within the current session (${user.sessionInfo}).` });
      return false;
    }
    return true;
  };

  // ── Loan date must not be before account opening date or in the future ────────
  const validateLoanDate = (loanDate: string): boolean => {
    if (!loanDate) return true;
    if (!validateNotFuture(loanDate)) return false;
    if (formData.openingDate && new Date(loanDate) < new Date(formData.openingDate)) {
      Swal.fire("Validation", "Loan date cannot be before the account opening date.", "warning");
      return false;
    }
    return true;
  };

  // ── Installment schedule (backend calculation) ───────────────────────────────
  const handleGenerateSchedule = async () => {
    const loan     = parseFloat(kistData.loanAmount);
    const rate     = parseFloat(kistData.stdIntRate);
    const period   = parseInt(kistData.loanPeriod);
    const interval = parseInt(kistData.kistInterval);

    if (!loan || !rate || !period || !interval || !kistData.firstKistDate) {
      Swal.fire("Incomplete", "Please fill Loan Amount, Std Int Rate, Loan Period, Kist Interval, and First Kist Date.", "warning");
      return;
    }
    if (!validateLoanDate(kistData.loanDate)) return;

    try {
      Swal.fire({ title: "Calculating...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await loanAccountApi.calculateSchedule({
        loanAmount:    loan,
        stdIntRate:    rate,
        loanPeriod:    period,
        kistInterval:  interval,
        firstKistDate: kistData.firstKistDate,
        intFormulae:   kistData.intFormulae,
        intSchedule:   kistData.intSchedule,
      });
      Swal.close();

      if (res.success && (res as any).data) {
        const d: import("../../../services/accountMasters/loanaccount/loanaccountapi").ScheduleResponseDTO = (res as any).data;
        setSchedule(d.schedule ?? []);
        setKistData(prev => ({
          ...prev,
          kistAmount:    d.kistAmount,
          kistIntPart:   d.kistIntPart,
          kistPrintPart: d.kistPrinPart?.toString() ?? prev.kistPrintPart,
          intAmount:     d.totalInterest,
        }));
      } else {
        Swal.fire("Error", "Failed to calculate schedule.", "error");
      }
    } catch {
      Swal.close();
      Swal.fire("Error", "An error occurred while calculating the schedule.", "error");
    }
  };

  // ── Limit Detail handlers ────────────────────────────────────────────────────
  const handleAddLimitEntry = () => {
    const { loanNo, loanDate, loanAmount, periodMonths, periodDays, stdIntRate, overIntRate, slabId } = limitEntry;
    if (!loanNo || !loanAmount || !periodMonths) {
      Swal.fire("Validation", "Loan No, Loan Amount and Period (Months) are required.", "warning");
      return;
    }
    if (!validateLoanDate(loanDate)) return;
    setLimitDetails(prev => [...prev, {
      brId: user.branchid, accountId: 0, loanNo, loanDate,
      loanAmountPassed: parseFloat(loanAmount), loanLimitPeriodInMonths: parseInt(periodMonths),
      loanLimitPeriodInDays: parseInt(periodDays || "0"), slabId,
      standardInterestRate: parseFloat(stdIntRate || "0"),
      overdueInterestRate: parseFloat(overIntRate || "0"),
    }]);
    setLimitEntry({ loanNo: "", loanDate: sessionDate, loanAmount: "", periodMonths: "", periodDays: "", stdIntRate: "", overIntRate: "", slabId: 0 });
  };

  // ── Nominee handlers ─────────────────────────────────────────────────────────
  const handleAddNominee = () => {
    if (!nomineeEntry.nomineeName || !nomineeEntry.nomineeDob || !nomineeEntry.relationId) {
      Swal.fire("Validation", "Nominee name, DOB and relation are required.", "warning");
      return;
    }
    setNominees(prev => [...prev, {
      branchId: user.branchid, accountId: 0,
      nomineeName: nomineeEntry.nomineeName,
      nomineeDob: nomineeEntry.nomineeDob,
      relationWithAccHolder: nomineeEntry.relationId,
      addressLine: "",
      nomineeDate: sessionDate,
      isMinor: nomineeEntry.isMinor,
      nameOfGuardian: nomineeEntry.isMinor ? nomineeEntry.nameOfGuardian : undefined,
    }]);
    setNomineeEntry({ nomineeName: "", nomineeDob: "", relationId: 0, addressLine: "", isMinor: 0, nameOfGuardian: "" });
  };

  // ── Pledge handlers ──────────────────────────────────────────────────────────
  const handleAddFDPledge = () => {
    if (!fdPledgeEntry.accId) { Swal.fire("Validation", "Select FD Account.", "warning"); return; }
    setFDPledges(prev => [...prev, {
      brId: user.branchid, loanAccId: 0,
      fDAccId: fdPledgeEntry.accId,
      fDAccNumber: fdPledgeEntry.accNumber,
      fDAmount: parseFloat(fdPledgeEntry.fdAmount || "0"),
      interest: parseFloat(fdPledgeEntry.interest || "0"),
      date: sessionDate,
    }]);
    setFdPledgeEntry({ accId: 0, accNumber: "", fdAmount: "", interest: "" });
  };

  const handleAddRDPledge = () => {
    if (!rdPledgeEntry.accId) { Swal.fire("Validation", "Select RD Account.", "warning"); return; }
    setRDPledges(prev => [...prev, {
      brId: user.branchid, loanAccId: 0,
      rDAccId: rdPledgeEntry.accId,
      rDAccNumber: rdPledgeEntry.accNumber,
      rDAmount: parseFloat(rdPledgeEntry.rdAmount || "0"),
      interest: parseFloat(rdPledgeEntry.interest || "0"),
      date: sessionDate,
    }]);
    setRdPledgeEntry({ accId: 0, accNumber: "", rdAmount: "", interest: "" });
  };

  // ── Opening balance entry ────────────────────────────────────────────────────
  const handleAddObEntry = () => {
    if (!obEntry.date || !obEntry.entryType) { Swal.fire("Validation", "Date and Entry Type are required.", "warning"); return; }
    setOpeningBalDetails(prev => [...prev, {
      brId: user.branchid, loanOpenBalId: 0, accountId: 0,
      amountDr: parseFloat(obEntry.amountDr || "0"),
      amountCr: parseFloat(obEntry.amountCr || "0"),
      intDr: parseFloat(obEntry.intDr || "0"),
      intCr: parseFloat(obEntry.intCr || "0"),
      date: obEntry.date, valueDate: obEntry.date, status: "A",
    }]);
    setObEntry({ date: sessionDate, entryType: "", amountDr: "", amountCr: "", intDr: "", intCr: "" });
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.selectedProductId) { Swal.fire("Validation", "Please select a Loan Product.", "warning"); return; }
    if (!memberDetails) { Swal.fire("Validation", "Please search and select a member.", "warning"); return; }
    if (isInstallment && schedule.length === 0) { Swal.fire("Validation", "Please generate the installment schedule first.", "warning"); return; }
    if (nominees.length === 0) { Swal.fire("Validation", "At least one nominee is required.", "warning"); setActiveTab("nominee"); return; }
    if (isUnsecure) {
      if (!guarantorData.guar1MemId) { Swal.fire("Validation", "Guarantor 1 is mandatory for unsecured loans.", "warning"); setActiveTab("guarantors"); return; }
      if (!guarantorData.guar2MemId) { Swal.fire("Validation", "Guarantor 2 is mandatory for unsecured loans.", "warning"); setActiveTab("guarantors"); return; }
    }

    setLoading(true);
    try {
      const dto: CombinedLoanAccountDTO = {
        accountMasterDTO: {
          branchId: user.branchid,
          headId: formData.headId,
          headCode: formData.headCode,
          accTypeId: 1, // Loan = 1
          generalProductId: formData.selectedProductId,
          accountNumber: formData.accountNumber,
          accPrefix: formData.accPrefix,
          accSuffix: formData.accSuffix,
          accountName: memberDetailsData.memberName,
          memberId: memberDetails?.memberId,
          memberBranchId: memberDetails?.memberBranchId,
          accOpeningDate: formData.openingDate,
          isAccClosed: false,
          isAccAddedManually: 0,
          relativeName: memberDetailsData.relativeName,
          gender: memberDetailsData.gender,
          addedUsing: inputMode === "account" ? "A" : "PM",
          phoneNo1: memberDetailsData.mobileNo,
          email: memberDetailsData.emailId,
          addressLine: memberDetailsData.addressLine1,
          dob: memberDetailsData.dateOfBirth || undefined,
        },
        kistDetail: isInstallment && kistData.loanAmount ? {
          brId: user.branchid, accountId: 0,
          loanAmountPassed: parseFloat(kistData.loanAmount),
          loanPeriod: parseInt(kistData.loanPeriod),
          standardInterestRate: parseFloat(kistData.stdIntRate),
          overdueInterestRate: parseFloat(kistData.overIntRate || "0"),
          loanDate: kistData.loanDate,
          kistInterval: parseInt(kistData.kistInterval),
          kistFirstDate: kistData.firstKistDate,
          kistAmount: kistData.kistAmount,
          kistPrinPart: kistData.intFormulae === INT_FORMULAE_FLAT ? Math.round((parseFloat(kistData.loanAmount) / Math.floor(parseInt(kistData.loanPeriod) / parseInt(kistData.kistInterval))) * 100) / 100 : 0,
          kistIntPart: kistData.kistIntPart,
          loanNo: kistData.loanNo,
          kistWithInterest: kistData.intSchedule === INT_SCHEDULE_WITH ? "WI" : "WO",
          kislIntAmt: kistData.intAmount,
          marginMoney: parseFloat(kistData.marginAmount || "0"),
          slabId: kistData.slabId,
        } : undefined,
        kistSchedule: schedule.map(s => ({ ...s, brId: user.branchid })),
        limitDetails: limitDetails.map(l => ({ ...l, brId: user.branchid })),
        nominees: nominees.map(n => ({ ...n, branchId: user.branchid })),
        guarantor: (isUnsecure || !productInfo) ? {
          brId:          user.branchid,
          guar1MemId:    guarantorData.guar1MemId   || undefined,
          guar1MemBrId:  guarantorData.guar1MemBrId,
          guar2MemId:    guarantorData.guar2MemId   || undefined,
          guar2MemBrId:  guarantorData.guar2MemBrId,
          witness1MemId: guarantorData.witness1MemId || undefined,
          wit1MemBrId:   guarantorData.wit1MemBrId  || undefined,
          witness2MemId: guarantorData.witness2MemId || undefined,
          wit2MemBrId:   guarantorData.wit2MemBrId,
        } : undefined,
        openingBalance: openingBalDetails.length > 0 ? {
          branchId: user.branchid, totalBalance: parseFloat(openingBal.totalBalance || "0"),
          balType: openingBal.balType,
        } : undefined,
        openingBalanceDetails: openingBalDetails,
        fDPledges: fdPledges,
        rDPledges: rdPledges,
      };

      const res = isEditMode && accountId
        ? await loanAccountApi.updateLoanAccount(accountId, dto)
        : await loanAccountApi.createLoanAccount(dto);

      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message, showConfirmButton: false, timer: 2000 });
        navigate(isEditMode ? "/loan-acc-info" : "/loan-acc-master");
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save loan account.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ branchId: user.branchid, selectedProductId: 0, openingDate: sessionDate, shareMoneyAccNo: "", memberAccountNo: "", membershipNo: "", agent: "", accountNumber: "", accPrefix: "", accSuffix: 0, headId: 0, headCode: 0, relationId: 0 });
    setMemberDetails(null);
    setMemberDetailsData({ memberName: "", gender: 0, dateOfBirth: "", mobileNo: "", emailId: "", addressLine1: "", relativeName: "" });
    setInputMode("account"); setMemberType(2);
    setKistData({ loanAmount: "", loanDate: sessionDate, stdIntRate: "", overIntRate: "", marginAmount: "", loanPeriod: "", kistInterval: "", firstKistDate: sessionDate, slabId: 0, loanNo: "", kistPrintPart: "", intFormulae: INT_FORMULAE_REDUCING, intSchedule: INT_SCHEDULE_WITH, kistAmount: 0, kistIntPart: 0, intAmount: 0 });
    setSchedule([]); setLimitDetails([]); setNominees([]); setFDPledges([]); setRDPledges([]);
    setGuarantorData({ guar1MemId: 0, guar1MemBrId: 0, guar2MemId: 0, guar2MemBrId: 0, witness1MemId: 0, wit1MemBrId: 0, witness2MemId: 0, wit2MemBrId: 0 });
    setOpeningBalDetails([]); setProductInfo(null); setShareMoneyAccDetails(null);
    setLoanSlabs([]);
  };

  const memberOptions = activeMembers.map(m => ({
    value: m.memberId,
    brId: m.memberBrId,
    label: m.memberName,
    subLabel: m.relativeName
      + (m.permanentMembershipNo ? ` · PM ${m.permanentMembershipNo}` : '')
      + (m.nominalMembershipNo   ? ` · NM ${m.nominalMembershipNo}`   : ''),
  }));

  const productOptions = loanProducts.map(p => ({ value: p.id, label: p.productName }));
  const relationOptions = relations.map(r => ({ value: r.relationId, label: r.description }));
  const fdOptions = fdAccounts.map(a => ({ value: a.accId, label: `${a.accountNumber} - ${a.accountName}` }));
  const rdOptions = rdAccounts.map(a => ({ value: a.accId, label: `${a.accountNumber} - ${a.accountName}` }));

  // Interest formula options filtered by loan type
  const typeId = productInfo?.typeId ?? 0;
  const allFormulaeOptions = [
    { value: INT_FORMULAE_FLAT,      label: "Flat / Add in Balance" },
    { value: INT_FORMULAE_REDUCING,  label: "Reducing Balance" },
  ];
  const allScheduleOptions = [
    { value: INT_SCHEDULE_WITH,    label: "With Interest" },
    { value: INT_SCHEDULE_WITHOUT, label: "Without Interest" },
  ];
  // typeId=2 (Overdraft): reducing only + with-interest only
  // typeId=3 (Demand Loan): flat only (simple interest lump sum)
  // typeId=1 (Installment): all options
  const formulaeOptions = typeId === 2
    ? allFormulaeOptions.filter(o => o.value === INT_FORMULAE_REDUCING)
    : typeId === 3
    ? allFormulaeOptions.filter(o => o.value === INT_FORMULAE_FLAT)
    : allFormulaeOptions;
  const scheduleOptions = typeId === 2
    ? allScheduleOptions.filter(o => o.value === INT_SCHEDULE_WITH)
    : allScheduleOptions;
  // allow digits + at most one decimal point
  const num = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  // allow digits only (no decimal)
  const int = (v: string) => v.replace(/[^0-9]/g, '');

  const inputCls = "w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout mainContent={
      <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Header */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEditMode ? "Modify" : "Add"} Loan Account Master</h1>
                  <p className="text-gray-500 text-xs">Fields marked with * are mandatory</p>
                </div>
              </div>
              <button onClick={() => navigate(isEditMode ? "/loan-acc-info" : "/account-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* ── Core Product & Membership Information ── */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Core Product & Membership Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Loan Product */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" /> Loan Product <span className="text-red-500">*</span>
                  </label>
                  <Select options={productOptions}
                    value={productOptions.find(o => o.value === formData.selectedProductId) || null}
                    onChange={handleProductChange} placeholder="Select Loan Product"
                    isDisabled={isEditMode} menuPortalTarget={document.body}
                    styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }}
                    className="text-sm" />
                </div>

                {/* Opening Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" /> A/C Opening Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.openingDate}
                    min={sessionMinDate}
                    max={sessionMaxDate}
                    workingDate={sessionDate}
                    disabled={isEditMode}
                    onChange={v => {
                      if (!validateInSession(v)) return;
                      setFormData(p => ({ ...p, openingDate: v }));
                    }}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                  />
                </div>

                {/* Search By toggle */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search By:</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button type="button"
                      onClick={() => handleInputModeChange("account")}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${inputMode === "account" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"}`}>
                      Account Number
                    </button>
                    <button type="button"
                      onClick={() => handleInputModeChange("membership")}
                      disabled={isEditMode && formData.membershipNo === ""}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${inputMode === "membership" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"}`}>
                      Membership Number
                    </button>
                  </div>
                </div>

                {/* Member Type (only in membership mode) */}
                {inputMode === "membership" && (
                  <div className="space-y-2 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-green-500" /> Member Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="memberType" value={2} checked={memberType === 2}
                          onChange={() => setMemberType(2)} disabled={isEditMode} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Permanent</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="memberType" value={1} checked={memberType === 1}
                          onChange={() => setMemberType(1)} disabled={isEditMode} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Nominal</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Member A/C No. / Membership No. */}
                <div className="space-y-2 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    {inputMode === "account" ? "Account Number" : "Membership Number"} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="text"
                      value={inputMode === "account" ? formData.memberAccountNo : formData.membershipNo}
                      onChange={e => {
                        const field = inputMode === "account" ? "memberAccountNo" : "membershipNo";
                        setFormData(p => ({ ...p, [field]: e.target.value }));
                      }}
                      readOnly={isEditMode}
                      placeholder={`Enter ${inputMode === "account" ? "Member Account Number" : "Membership Number"}`}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                    <button type="button" onClick={handleMemberSearch} disabled={isEditMode}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all whitespace-nowrap">
                      Search Member
                    </button>
                  </div>
                </div>

                {/* Loan A/C No. (auto-generated) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Loan A/C No.</label>
                  <input type="text" value={formData.accountNumber} readOnly
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none" placeholder="Auto-generated" />
                </div>

              </div>
            </div>

            {/* ── Member Details (same as saving master) ── */}
            {memberDetails && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-4">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" /> Member Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                    <input type="text" value={memberDetailsData.memberName}
                      onChange={e => setMemberDetailsData(p => ({ ...p, memberName: e.target.value }))}
                      placeholder="Enter Name"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Relative Name</label>
                    <input type="text" value={memberDetailsData.relativeName}
                      onChange={e => setMemberDetailsData(p => ({ ...p, relativeName: e.target.value }))}
                      placeholder="Enter Relative Name"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Gender <span className="text-red-500">*</span></label>
                    <select value={memberDetailsData.gender}
                      onChange={e => setMemberDetailsData(p => ({ ...p, gender: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none">
                      <option value="">Select Gender</option>
                      <option value="1">Male</option>
                      <option value="2">Female</option>
                      <option value="3">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></label>
                    <DatePicker
                      value={memberDetailsData.dateOfBirth}
                      onChange={val => setMemberDetailsData(p => ({ ...p, dateOfBirth: val }))}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Mobile No</label>
                    <input type="text" value={memberDetailsData.mobileNo}
                      onChange={e => setMemberDetailsData(p => ({ ...p, mobileNo: e.target.value }))}
                      placeholder="Enter Mobile Number"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" value={memberDetailsData.emailId}
                      onChange={e => setMemberDetailsData(p => ({ ...p, emailId: e.target.value }))}
                      placeholder="Enter Email Address"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea value={memberDetailsData.addressLine1}
                      onChange={e => setMemberDetailsData(p => ({ ...p, addressLine1: e.target.value }))}
                      rows={3} placeholder="Enter Address"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none" />
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Tabs — only visible after member is selected */}
          {memberDetails && <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ── Loan Detail Tab ────────────────────────────────────────────── */}
              {activeTab === "loan-detail" && (
                <div className="space-y-6">
                  {isInstallment && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-800 mb-4">Installment Detail</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className={labelCls}>Loan Amount <span className="text-red-500">*</span></label>
                            <input type="text" inputMode="decimal" value={kistData.loanAmount}
                              onChange={e => setKistData(p => ({ ...p, loanAmount: num(e.target.value) }))}
                              onBlur={e => { if (e.target.value && kistData.loanPeriod) applySlabRates(e.target.value, kistData.loanPeriod); }}
                              className={inputCls} placeholder="0" />
                          </div>
                          <div>
                            <label className={labelCls}>Loan Date <span className="text-red-500">*</span></label>
                            <DatePicker
                              value={kistData.loanDate}
                              min={formData.openingDate || sessionMinDate}
                              max={sessionMaxDate}
                              workingDate={sessionDate}
                              onChange={val => { setKistData(p => ({ ...p, loanDate: val })); validateLoanDate(val); }}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Loan No. <span className="text-red-500">*</span></label>
                            <input type="text" value={kistData.loanNo} onChange={e => setKistData(p => ({ ...p, loanNo: e.target.value }))} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Std Int Rate <span className="text-red-500">*</span></label>
                            <input type="text" inputMode="decimal" value={kistData.stdIntRate}
                              readOnly={!kistData.slabId}
                              onChange={e => setKistData(p => ({ ...p, stdIntRate: num(e.target.value) }))}
                              className={`${inputCls} ${kistData.slabId ? 'bg-yellow-50' : 'bg-gray-100 cursor-not-allowed'}`}
                              placeholder={kistData.slabId ? "Auto from slab" : "Enter loan amount first"} />
                          </div>
                          <div>
                            <label className={labelCls}>Over Int Rate <span className="text-red-500">*</span></label>
                            <input type="text" inputMode="decimal" value={kistData.overIntRate}
                              readOnly={!kistData.slabId}
                              onChange={e => setKistData(p => ({ ...p, overIntRate: num(e.target.value) }))}
                              className={`${inputCls} ${kistData.slabId ? 'bg-yellow-50' : 'bg-gray-100 cursor-not-allowed'}`}
                              placeholder={kistData.slabId ? "Auto from slab" : "Enter loan amount first"} />
                          </div>
                          <div>
                            <label className={labelCls}>Loan Period (months) <span className="text-red-500">*</span></label>
                            <input type="text" inputMode="decimal" value={kistData.loanPeriod}
                              onChange={e => setKistData(p => ({ ...p, loanPeriod: int(e.target.value) }))}
                              onBlur={e => { if (kistData.loanAmount && e.target.value) applySlabRates(kistData.loanAmount, e.target.value); }}
                              className={inputCls} placeholder="60" />
                          </div>
                          <div>
                            <label className={labelCls}>Kist Interval <span className="text-red-500">*</span></label>
                            <input type="text" inputMode="decimal" value={kistData.kistInterval} onChange={e => setKistData(p => ({ ...p, kistInterval: int(e.target.value) }))} className={inputCls} placeholder="1 = Monthly" />
                          </div>
                          <div>
                            <label className={labelCls}>First Kist Date <span className="text-red-500">*</span></label>
                            <DatePicker value={kistData.firstKistDate} onChange={val => setKistData(p => ({ ...p, firstKistDate: val }))} workingDate={sessionDate} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Kist Amount</label>
                            <input type="text" value={kistData.kistAmount.toLocaleString("en-IN")} readOnly className={`${inputCls} bg-gray-100 text-right`} />
                          </div>
                          <div>
                            <label className={labelCls}>Int Amount</label>
                            <input type="text" value={kistData.intAmount.toLocaleString("en-IN")} readOnly className={`${inputCls} bg-gray-100 text-right`} />
                          </div>
                          <div>
                            <label className={labelCls}>Kist Int Part</label>
                            <input type="text" value={kistData.kistIntPart} readOnly className={`${inputCls} bg-gray-100 text-right`} />
                          </div>
                          <div>
                            <label className={labelCls}>Kist Principal Part</label>
                            <input type="text" value={kistData.kistPrintPart} readOnly className={`${inputCls} bg-gray-100 text-right`} placeholder="0" />
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button onClick={handleGenerateSchedule}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all">
                            Inst Schedule
                          </button>
                        </div>
                      </div>

                      {schedule.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-green-800">Installment Schedule</h3>
                            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-1">{schedule.length} installments</span>
                          </div>
                          <div className="overflow-x-auto overflow-y-auto max-h-72 rounded border border-green-200">
                            <table className="w-full border-collapse text-sm">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                  {["Sr.No.", "Inst. No.", "Installment Date", "Inst. Amount", "Principal Amount", "Interest Amount", "Running Principal"].map(h => (
                                    <th key={h} className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {schedule.map((s, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                    <td className="border border-gray-300 px-3 py-1.5 text-center">{i + 1}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-center">{s.kistNumber}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-center">{s.date ? new Date(s.date).toLocaleDateString("en-IN") : ""}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-right">{s.kistAmount?.toLocaleString("en-IN")}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-right">{s.principalAmt?.toLocaleString("en-IN")}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-right">{s.interestAmt?.toLocaleString("en-IN")}</td>
                                    <td className="border border-gray-300 px-3 py-1.5 text-right">{s.runningPrincipal?.toLocaleString("en-IN")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isLimitWise && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="font-semibold text-purple-800 mb-4">Account Limit Detail</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div><label className={labelCls}>Loan No. <span className="text-red-500">*</span></label>
                          <input type="text" value={limitEntry.loanNo} onChange={e => setLimitEntry(p => ({ ...p, loanNo: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Loan Date <span className="text-red-500">*</span></label>
                          <DatePicker
                            value={limitEntry.loanDate}
                            min={formData.openingDate || sessionMinDate}
                            max={sessionMaxDate}
                            workingDate={sessionDate}
                            onChange={val => { setLimitEntry(p => ({ ...p, loanDate: val })); validateLoanDate(val); }}
                            className={inputCls}
                          /></div>
                        <div><label className={labelCls}>Loan Amount <span className="text-red-500">*</span></label>
                          <input type="text" inputMode="decimal" value={limitEntry.loanAmount}
                            onChange={e => setLimitEntry(p => ({ ...p, loanAmount: num(e.target.value) }))}
                            onBlur={e => { if (e.target.value && limitEntry.periodMonths) applySlabRatesForLimit(e.target.value, limitEntry.periodMonths); }}
                            className={inputCls} /></div>
                        <div><label className={labelCls}>Loan Period (months) <span className="text-red-500">*</span></label>
                          <input type="text" inputMode="decimal" value={limitEntry.periodMonths}
                            onChange={e => setLimitEntry(p => ({ ...p, periodMonths: int(e.target.value) }))}
                            onBlur={e => { if (limitEntry.loanAmount && e.target.value) applySlabRatesForLimit(limitEntry.loanAmount, e.target.value); }}
                            className={inputCls} /></div>
                        <div><label className={labelCls}>Loan Period (days) <span className="text-red-500">*</span></label>
                          <input type="text" inputMode="decimal" value={limitEntry.periodDays} onChange={e => setLimitEntry(p => ({ ...p, periodDays: int(e.target.value) }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Std Int Rate <span className="text-red-500">*</span></label>
                          <input type="text" inputMode="decimal" value={limitEntry.stdIntRate} onChange={e => setLimitEntry(p => ({ ...p, stdIntRate: num(e.target.value) }))} className={`${inputCls} bg-yellow-50`} placeholder="Auto from slab" /></div>
                        <div><label className={labelCls}>Over Int Rate <span className="text-red-500">*</span></label>
                          <input type="text" inputMode="decimal" value={limitEntry.overIntRate} onChange={e => setLimitEntry(p => ({ ...p, overIntRate: num(e.target.value) }))} className={`${inputCls} bg-yellow-50`} placeholder="Auto from slab" /></div>
                      </div>
                      <div className="flex justify-end mb-4">
                        <button onClick={handleAddLimitEntry} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold">Ok</button>
                      </div>
                      {limitDetails.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                {["Sr.No.", "Loan Number", "Loan Date", "Loan Amount", "Loan Periods(Months)", "Loan Periods(Days)", "Standard Interest", "Overdue Interest", "Action"].map(h => (
                                  <th key={h} className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {limitDetails.map((l, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                  <td className="border border-gray-300 px-3 py-1.5 text-center">{i + 1}</td>
                                  <td className="border border-gray-300 px-3 py-1.5">{l.loanNo}</td>
                                  <td className="border border-gray-300 px-3 py-1.5">{new Date(l.loanDate).toLocaleDateString("en-IN")}</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-right">{l.loanAmountPassed.toLocaleString("en-IN")}</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-center">{l.loanLimitPeriodInMonths}</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-center">{l.loanLimitPeriodInDays}</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-right">{l.standardInterestRate}%</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-right">{l.overdueInterestRate}%</td>
                                  <td className="border border-gray-300 px-3 py-1.5 text-center">
                                    <button onClick={() => setLimitDetails(p => p.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Nominee Detail Tab ─────────────────────────────────────────── */}
              {activeTab === "nominee" && (
                <div className="space-y-4">
                  {nominees.length === 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-2 text-sm text-red-700 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      At least one nominee must be added before saving.
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div><label className={labelCls}>Nominee Name <span className="text-red-500">*</span></label>
                      <input type="text" value={nomineeEntry.nomineeName} onChange={e => setNomineeEntry(p => ({ ...p, nomineeName: e.target.value }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                      <DatePicker value={nomineeEntry.nomineeDob} onChange={val => setNomineeEntry(p => ({ ...p, nomineeDob: val }))} max={sessionDate} workingDate={sessionDate} className={inputCls} /></div>
                    <div><label className={labelCls}>Relation <span className="text-red-500">*</span></label>
                      <Select
                        options={relationOptions}
                        value={relationOptions.find(o => o.value === nomineeEntry.relationId) || null}
                        onChange={opt => setNomineeEntry(p => ({ ...p, relationId: opt?.value ?? 0 }))}
                        placeholder="Select Relation"
                        isClearable
                        className="text-sm"
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }}
                      /></div>
                    <div><label className={labelCls}>Is Minor</label>
                      <select value={nomineeEntry.isMinor} onChange={e => setNomineeEntry(p => ({ ...p, isMinor: parseInt(e.target.value) }))} className={inputCls}>
                        <option value={0}>No</option><option value={1}>Yes</option>
                      </select></div>
                    {nomineeEntry.isMinor === 1 && (
                      <div><label className={labelCls}>Name of Guardian</label>
                        <input type="text" value={nomineeEntry.nameOfGuardian} onChange={e => setNomineeEntry(p => ({ ...p, nameOfGuardian: e.target.value }))} className={inputCls} /></div>
                    )}
                    <div className="flex items-end">
                      <button onClick={handleAddNominee} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button>
                    </div>
                  </div>
                  {nominees.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {["Sr.No.", "Name", "DOB", "Relation", "Is Minor", "Action"].map(h => <th key={h} className="border border-gray-300 px-3 py-2">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {nominees.map((n, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{i + 1}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{n.nomineeName}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{new Date(n.nomineeDob).toLocaleDateString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{relations.find(r => r.relationId === n.relationWithAccHolder)?.description ?? n.relationWithAccHolder}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{n.isMinor ? "Yes" : "No"}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-center"><button onClick={() => setNominees(p => p.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Opening Balance Tab ────────────────────────────────────────── */}
              {activeTab === "opening-balance" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div><label className={labelCls}>Date</label>
                      <DatePicker value={obEntry.date} onChange={val => setObEntry(p => ({ ...p, date: val }))} max={sessionDate} workingDate={sessionDate} className={inputCls} /></div>
                    <div><label className={labelCls}>Entry Type</label>
                      <select value={obEntry.entryType} onChange={e => setObEntry(p => ({ ...p, entryType: e.target.value }))} className={inputCls}>
                        <option value="">==Select==</option>
                        <option value="OB">Opening Balance</option>
                        <option value="TR">Transfer</option>
                        <option value="OD">Overdue</option>
                      </select></div>
                    <div><label className={labelCls}>Amount Dr</label>
                      <input type="text" inputMode="decimal" value={obEntry.amountDr} onChange={e => setObEntry(p => ({ ...p, amountDr: num(e.target.value) }))} className={inputCls} placeholder="0" /></div>
                    <div><label className={labelCls}>Amount Cr</label>
                      <input type="text" inputMode="decimal" value={obEntry.amountCr} onChange={e => setObEntry(p => ({ ...p, amountCr: num(e.target.value) }))} className={inputCls} placeholder="0" /></div>
                    <div><label className={labelCls}>Int Dr</label>
                      <input type="text" inputMode="decimal" value={obEntry.intDr} onChange={e => setObEntry(p => ({ ...p, intDr: num(e.target.value) }))} className={inputCls} placeholder="0" /></div>
                    <div><label className={labelCls}>Int Cr</label>
                      <input type="text" inputMode="decimal" value={obEntry.intCr} onChange={e => setObEntry(p => ({ ...p, intCr: num(e.target.value) }))} className={inputCls} placeholder="0" /></div>
                    <div className="flex items-end gap-2">
                      <button onClick={handleAddObEntry} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold">Ok</button>
                    </div>
                  </div>
                  {openingBalDetails.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {["Date", "Entry Type", "Amount Dr", "Amount Cr", "Int Dr", "Int Cr", "Action"].map(h => <th key={h} className="border border-gray-300 px-3 py-2">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {openingBalDetails.map((b, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-orange-50" : "bg-white"}>
                              <td className="border border-gray-300 px-3 py-1.5">{new Date(b.date).toLocaleDateString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{b.status}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{b.amountDr.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{b.amountCr.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{b.intDr.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{b.intCr.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-center"><button onClick={() => setOpeningBalDetails(p => p.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Guarantors Tab ─────────────────────────────────────────────── */}
              {activeTab === "guarantors" && (
                <div className="space-y-6">
                  {isUnsecure && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-2 text-sm text-red-700 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Guarantor 1 and Guarantor 2 are mandatory for unsecured loans.
                    </div>
                  )}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800 mb-4">Guarantors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Guarantor 1 <span className="text-red-500">*</span></label>
                        <Select
                          options={memberOptions}
                          value={memberOptions.find(o => o.value === guarantorData.guar1MemId) || null}
                          onChange={opt => setGuarantorData(p => ({ ...p, guar1MemId: opt?.value ?? 0, guar1MemBrId: opt?.brId ?? 0 }))}
                          formatOptionLabel={o => (
                            <div>
                              <div className="font-medium text-sm">{o.label}</div>
                              <div className="text-xs text-gray-400">{o.subLabel}</div>
                            </div>
                          )}
                          placeholder="Search member..."
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: b => ({ ...b, zIndex: 9999 }),
                            control: (b) => ({ ...b, borderColor: isUnsecure && !guarantorData.guar1MemId ? '#f87171' : b.borderColor, backgroundColor: isUnsecure && !guarantorData.guar1MemId ? '#fef2f2' : b.backgroundColor }),
                          }}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Guarantor 2 <span className="text-red-500">*</span></label>
                        <Select
                          options={memberOptions}
                          value={memberOptions.find(o => o.value === guarantorData.guar2MemId) || null}
                          onChange={opt => setGuarantorData(p => ({ ...p, guar2MemId: opt?.value ?? 0, guar2MemBrId: opt?.brId ?? 0 }))}
                          formatOptionLabel={o => (
                            <div>
                              <div className="font-medium text-sm">{o.label}</div>
                              <div className="text-xs text-gray-400">{o.subLabel}</div>
                            </div>
                          )}
                          placeholder="Search member..."
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: b => ({ ...b, zIndex: 9999 }),
                            control: (b) => ({ ...b, borderColor: isUnsecure && !guarantorData.guar2MemId ? '#f87171' : b.borderColor, backgroundColor: isUnsecure && !guarantorData.guar2MemId ? '#fef2f2' : b.backgroundColor }),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800 mb-4">Witness</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Witness 1</label>
                        <Select
                          options={memberOptions}
                          value={memberOptions.find(o => o.value === guarantorData.witness1MemId) || null}
                          onChange={opt => setGuarantorData(p => ({ ...p, witness1MemId: opt?.value ?? 0, wit1MemBrId: opt?.brId ?? 0 }))}
                          formatOptionLabel={o => (
                            <div>
                              <div className="font-medium text-sm">{o.label}</div>
                              <div className="text-xs text-gray-400">{o.subLabel}</div>
                            </div>
                          )}
                          placeholder="Search member..."
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: b => ({ ...b, zIndex: 9999 }),
                            control: (b) => ({ ...b }),
                          }}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Witness 2</label>
                        <Select
                          options={memberOptions}
                          value={memberOptions.find(o => o.value === guarantorData.witness2MemId) || null}
                          onChange={opt => setGuarantorData(p => ({ ...p, witness2MemId: opt?.value ?? 0, wit2MemBrId: opt?.brId ?? 0 }))}
                          formatOptionLabel={o => (
                            <div>
                              <div className="font-medium text-sm">{o.label}</div>
                              <div className="text-xs text-gray-400">{o.subLabel}</div>
                            </div>
                          )}
                          placeholder="Search member..."
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: b => ({ ...b, zIndex: 9999 }),
                            control: (b) => ({ ...b }),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FD Pledge Tab ──────────────────────────────────────────────── */}
              {activeTab === "fd-pledge" && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-4">Fd Pledge Detail</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div><label className={labelCls}>FD Account <span className="text-red-500">*</span></label>
                        <Select options={fdOptions} value={fdOptions.find(o => o.value === fdPledgeEntry.accId) || null}
                          onChange={opt => setFdPledgeEntry(p => ({ ...p, accId: opt?.value ?? 0, accNumber: fdAccounts.find(a => a.accId === opt?.value)?.accountNumber ?? "" }))}
                          menuPortalTarget={document.body} styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }} /></div>
                      <div><label className={labelCls}>FD Amount <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="decimal" value={fdPledgeEntry.fdAmount} onChange={e => setFdPledgeEntry(p => ({ ...p, fdAmount: num(e.target.value) }))} className={inputCls} /></div>
                      <div><label className={labelCls}>Interest <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="decimal" value={fdPledgeEntry.interest} onChange={e => setFdPledgeEntry(p => ({ ...p, interest: num(e.target.value) }))} className={inputCls} /></div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleAddFDPledge} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Ok</button>
                    </div>
                  </div>
                  {fdPledges.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {["Sr.No", "FD Account", "FD Amount", "Interest", "Action"].map(h => <th key={h} className="border border-gray-300 px-3 py-2">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {fdPledges.map((f, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-green-50" : "bg-white"}>
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{i + 1}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{f.fDAccNumber}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{f.fDAmount?.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{f.interest?.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-center"><button onClick={() => setFDPledges(p => p.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── RD Pledge Tab ──────────────────────────────────────────────── */}
              {activeTab === "rd-pledge" && (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-4">Rd Pledge Detail</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div><label className={labelCls}>RD Account <span className="text-red-500">*</span></label>
                        <Select options={rdOptions} value={rdOptions.find(o => o.value === rdPledgeEntry.accId) || null}
                          onChange={opt => setRdPledgeEntry(p => ({ ...p, accId: opt?.value ?? 0, accNumber: rdAccounts.find(a => a.accId === opt?.value)?.accountNumber ?? "" }))}
                          menuPortalTarget={document.body} styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }} /></div>
                      <div><label className={labelCls}>RD Amount <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="decimal" value={rdPledgeEntry.rdAmount} onChange={e => setRdPledgeEntry(p => ({ ...p, rdAmount: num(e.target.value) }))} className={inputCls} /></div>
                      <div><label className={labelCls}>Interest <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="decimal" value={rdPledgeEntry.interest} onChange={e => setRdPledgeEntry(p => ({ ...p, interest: num(e.target.value) }))} className={inputCls} /></div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleAddRDPledge} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold">Ok</button>
                    </div>
                  </div>
                  {rdPledges.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {["Sr.No", "RD Account", "RD Amount", "Interest", "Action"].map(h => <th key={h} className="border border-gray-300 px-3 py-2">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {rdPledges.map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-purple-50" : "bg-white"}>
                              <td className="border border-gray-300 px-3 py-1.5 text-center">{i + 1}</td>
                              <td className="border border-gray-300 px-3 py-1.5">{r.rDAccNumber}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{r.rDAmount?.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-right">{r.interest?.toLocaleString("en-IN")}</td>
                              <td className="border border-gray-300 px-3 py-1.5 text-center"><button onClick={() => setRDPledges(p => p.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Action buttons */}
            <div className="border-t border-gray-200 p-5 bg-gray-50 flex justify-end gap-3">
              <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow-md">
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Loan Account</>}
              </button>
            </div>
          </div>}
        </div>
      </div>
    } />
  );
};

export default LoanAccountMaster;
