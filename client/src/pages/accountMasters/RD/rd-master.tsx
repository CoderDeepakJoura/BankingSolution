// pages/AccountMasters/RDAccount/RDAccountMaster.tsx
import React, { useState, useEffect, useRef } from "react";
import { decryptId } from "../../../utils/encryption";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  User,
  Users,
  CreditCard,
  Calendar,
  Building,
  Save,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  FileText,
  X,
  IndianRupee,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import savingAccountService from "../../../services/accountMasters/savingaccount/savingaccountapi";
import rdAccountService, {
  CommonAccMasterDTO,
} from "../../../services/accountMasters/rdaccount/rdaccountapi";
import { FormField } from "../../../components/Validations/FormField";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { canEnterOpeningBalance } from "../../../utils/session";
import DatePicker from "../../../components/DatePicker";

export interface RDProduct {
  id: number;
  productName: string;
  productCode: string;
}

interface Relation {
  relationId: number;
  description: string;
}

export interface DebitAccount {
  accId: number;
  accountNumber: string;
  accountName: string;
}

interface SavingAccountItem {
  accId: number;
  accountNumber: string;
  accountName: string;
  balance: number;
}

interface ValidationError {
  field: string;
  message: string;
  tab: string;
}

// ─── Field Max Lengths ───────────────────────────────────────────────────────
const MAX = {
  memberAccountNo: 20,
  membershipNo: 20,
  suffix: 10,
  rdNo: 5,
  memberName: 100,
  relativeName: 100,
  emailId: 100,
  addressLine1: 250,
  kistAmount: 15,
  periodMonths: 4,
  amount: 15,
  penaltyAmount: 15,
  depositAmount: 15,
  openingNoOfKist: 4,
  narration: 250,
  nomineeName: 100,
  nomineeAddress: 250,
  guardianName: 100,
  jointHolderName: 100,
  jointAddress: 250,
  jointEmail: 100,
  jointAccountNo: 20,
};

const RDAccountMaster = () => {
  const KIST_INTERVAL_MAP: Record<string, number> = {
    Monthly: 1,
    Quarterly: 3,
    "Half-Yearly": 6,
    Yearly: 12,
  };
  const COMPOUNDING_INTERVAL_MAP: Record<string, string> = {
    Monthly: "3",
    Quarterly: "4",
    "Half-Yearly": "5",
    Half_Yearly: "5",
    Yearly: "6",
  };

  const navigate = useNavigate();
  const { accountId: encryptedId } = useParams<{ accountId?: string }>();
  const accountId = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!accountId;
  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate
    ? commonservice.splitDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [activeTab, setActiveTab] = useState("rdDetail");
  const [loading, setLoading] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // ─── Member Details State ────────────────────────────────────────────────────
  const [memberDetailsData, setMemberDetailsData] = useState({
    memberName: "",
    gender: 0,
    dateOfBirth: "",
    mobileNo: "",
    emailId: "",
    addressLine1: "",
    relativeName: "",
    memberId: 0,
    memberBranchId: 0,
  });

  // ─── Form Data ───────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    accountMasterDTO: {
      branchId: user.branchid,
      rdProductId: 0,
      accountOpeningDate: sessionDate,
      memberType: 2,
      memberAccountNo: "",
      membershipNo: "",
      rdPrefix: "",
      suffix: "",
      openingNoOfKist: "",
      openingBalance: "",
      balanceType: "Cr",
      operationType: "Single",
      addedUsing: "A",
    },
    memberDetails: null as any,
  });

  const isOpeningEntry = canEnterOpeningBalance(
    user,
    formData.accountMasterDTO.accountOpeningDate,
  );

  const sessionMaxDate = sessionDate;
  const isFirstSession = user.isFirstSession === "True" || user.isFirstSession === true;
  const sessionMinDate = isFirstSession
    ? undefined
    : user.sessionInfo ? `${user.sessionInfo.split('-')[0]}-04-01` : undefined;

  // ─── RD Specific Fields ──────────────────────────────────────────────────────
  const [rdDetailForm, setRdDetailForm] = useState({
    rdDate: sessionDate,
    rdNo: "",
    kistAmount: "",
    kistInterval: "",
    periodMonths: "",
    amount: "",
    interestRate: "",
    firstKistDate: sessionDate,
    matDate: "",
    paymentDate: sessionDate,
    matAmount: "",
    penaltyAmount: "",
    slabName: "",
    compoundingInterval: "3",
    slabId: "",
  });

  // ─── Voucher Data ────────────────────────────────────────────────────────────
  const [voucherData, setVoucherData] = useState({
    voucherDate: sessionDate,
    depositAmount: "",
    narration: "",
  });
  const [voucherPaymentMode, setVoucherPaymentMode] = useState<
    "byCash" | "bySaving" | "both"
  >("byCash");
  const [voucherCash, setVoucherCash] = useState({
    debitAccountId: 0,
    amount: "",
  });
  const [voucherSaving, setVoucherSaving] = useState({
    savingAccountId: 0,
    amount: "",
  });

  // ─── Joint Account ───────────────────────────────────────────────────────────
  const [jointHolders, setJointHolders] = useState<any[]>([]);
  const [isJointAccount, setIsJointAccount] = useState(false);
  const [jointWithdrawalConfig, setJointWithdrawalConfig] = useState({
    minRequiredPersons: 1,
    isJointHolderCompulsory: false,
  });

  // ─── Nominee State ───────────────────────────────────────────────────────────
  const [nominees, setNominees] = useState<any[]>([]);
  const [isNomineeRequired, setIsNomineeRequired] = useState(false);

  // ─── Dropdown Data ───────────────────────────────────────────────────────────
  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccountItem[]>([]);
  const [defaultCashAccountId, setDefaultCashAccountId] = useState(0);
  const [inputMode, setInputMode] = useState<"account" | "membership">("account");

  const memberAccountNoRef = useRef<HTMLInputElement>(null);

  const kistIntervalOptions = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "Half-Yearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Yearly" },
  ];

  const clearRdCalculatedFields = () => {
    setRdDetailForm((prev) => ({
      ...prev,
      interestRate: "",
      matDate: "",
      matAmount: "",
      slabName: "",
      compoundingInterval: "3",
      slabId: "",
    }));
  };

  const calculateFirstKistDate = (rdDate: string, kistInterval: string) => {
    if (!rdDate || !kistInterval) return "";

    const monthsToAdd = KIST_INTERVAL_MAP[kistInterval];
    if (!monthsToAdd) return "";

    const [year, month, day] = rdDate.split("-").map(Number);
    if (!year || !month || !day) return "";

    const baseDate = new Date(year, month - 1, day);
    if (Number.isNaN(baseDate.getTime())) return "";

    const calculatedDate = new Date(year, month - 1, day);
    calculatedDate.setMonth(calculatedDate.getMonth() + monthsToAdd);

    const resultYear = calculatedDate.getFullYear();
    const resultMonth = String(calculatedDate.getMonth() + 1).padStart(2, "0");
    const resultDay = String(calculatedDate.getDate()).padStart(2, "0");

    return `${resultYear}-${resultMonth}-${resultDay}`;
  };

  // ─── Group Errors ────────────────────────────────────────────────────────────
  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const errorsByTab = errors.reduce((acc, error) => {
    if (!acc[error.tab]) acc[error.tab] = [];
    acc[error.tab].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  // ─── Load Dropdown Data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [relationsRes, debitAccountsRes, rdProductsRes, savingAccountsRes, defaultCashRes] = await Promise.all([
          commonservice.relation_info(),
          commonservice.general_accmasters_info(user.branchid),
          commonservice.fetch_rd_products(user.branchid),
          commonservice.fetch_Saving_Accounts(user.branchid, sessionDate),
          commonservice.default_cash_in_hand_account(user.branchid),
        ]);
        setRelations(relationsRes.data || []);
        setRdProducts(rdProductsRes.data || []);
        setDebitAccounts(debitAccountsRes.data || []);
        setSavingAccounts(savingAccountsRes.data || []);
        const defCashId = Number(defaultCashRes.data) || 0;
        if (defCashId > 0) {
          setDefaultCashAccountId(defCashId);
          setVoucherCash((prev) => ({ ...prev, debitAccountId: defCashId }));
        }
      } catch (error) {
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };
    fetchData();
  }, [user.branchid]);

  // ─── Load Existing Account (Edit Mode) ──────────────────────────────────────
useEffect(() => {
  const loadExistingAccount = async () => {
    try {
      Swal.fire({ title: "Loading RD Account Data...", text: "Please wait", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      const modifyCheck = await commonservice.can_modify_account(Number(accountId), user.branchid);
      if (!modifyCheck.success) {
        Swal.close();
        await Swal.fire({ icon: "error", title: "Not Allowed", text: modifyCheck.message || "This account can only be modified in the session it was opened in." });
        navigate("/rd-acc-info");
        return;
      }

      const response = await rdAccountService.getRDAccountById(
        Number(accountId),
        user.branchid
      );

      if (response.success && response.data) {
        const data = response.data;
        const acc = data.accountMasterDTO;
        const rd = data.rdAccountDetailDTO;
        const addedUsing = acc?.addedUsing || "A";

        // ── Input mode
        setInputMode(addedUsing === "A" ? "account" : "membership");

        // ── formData
        setFormData({
          accountMasterDTO: {
            branchId: acc?.branchId || user.branchid,
            rdProductId: acc?.generalProductId || 0,
            accountOpeningDate: acc?.accOpeningDate?.split("T")[0] || sessionDate,
            memberType: addedUsing === "NM" ? 1 : 2,
            memberAccountNo: acc?.accountNumber || "",
            membershipNo: acc?.membershipNo || "",
            rdPrefix: acc?.accPrefix || "",
            suffix: acc?.accSuffix?.toString() || "",
            openingNoOfKist: data.openingNoOfKist?.toString() || "",
            openingBalance: data.openingBalance?.toString() || "",
            balanceType: data.openingBalanceType?.toString() || "Cr",
            operationType: acc?.isJointAccount === 1 ? "Joint" : "Single",
            addedUsing: addedUsing,
          },
          memberDetails: acc?.memberId
            ? {
                memberId: acc.memberId,
                memberBranchId: acc.memberBranchId,
                memberName: acc.accountName,
                relativeName: acc.relativeName || "",
                gender: acc.gender || "",
                dateOfBirth: acc.dob || "",
                phoneNo: acc.phoneNo1 || "",
                emailId: acc.email || "",
                addressLine1: acc.addressLine || "",
              }
            : null,
        });

        // ── memberDetailsData
        if (acc?.memberId) {
          setMemberDetailsData({
            memberName: acc.accountName || "",
            gender: acc.gender || 0,
            dateOfBirth: acc.dob?.split("T")[0] || "",
            mobileNo: acc.phoneNo1 || "",
            emailId: acc.email || "",
            addressLine1: acc.addressLine || "",
            relativeName: acc.relativeName || "",
            memberId: acc.memberId || 0,
            memberBranchId: acc.memberBranchId || 0,
          });
        }

        // ── RD Detail Form
        if (rd) {
          // Reverse-map kistinterval number → string key
          const reverseKistMap: Record<number, string> = {
            1: "Monthly",
            3: "Quarterly",
            6: "Half-Yearly",
            12: "Yearly",
          };
          setRdDetailForm({
            rdDate: rd.rdDate?.split("T")[0] || sessionDate,
            rdNo: rd.rdNumber?.toString() || "",
            kistAmount: rd.kistAmt?.toString() || "",
            kistInterval: reverseKistMap[rd.kistInterval] || "",
            periodMonths: rd.noOfMonths?.toString() || "",
            amount: rd.rdAmount?.toString() || "",
            interestRate: rd.interestRate?.toString() || "",
            firstKistDate: rd.firstKistDate?.split("T")[0] || sessionDate,
            matDate: rd.maturityDate?.split("T")[0] || "",
            paymentDate: rd.maturityDate?.split("T")[0] || sessionDate,
            matAmount: rd.maturityAmt?.toString() || "",
            penaltyAmount: rd.penaltyAmt?.toString() || "",
            slabName: rd.slabName?.toString() || "",
            compoundingInterval: rd.compoundingInterval?.toString() || "3",
            slabId: rd.rdSlabId?.toString() || "",
          });
        }

        // ── Joint holders
        if (data.jointAccountInfoDTO && data.jointAccountInfoDTO.length > 0) {
          setIsJointAccount(true);
          setJointHolders(
            data.jointAccountInfoDTO.map((joint: any) => ({
              branchId: joint.branchId,
              jointHolderAccountNo: joint.jointAccHolderAccountNumber,
              jointHolderName: joint.accountName,
              relationWithMainHolder: joint.relationWithAccHolder,
              dateOfBirth: joint.dob?.split("T")[0] || "",
              gender: joint.gender?.toString() || "",
              address: joint.addressLine || "",
              mobileNo: "",
              emailId: "",
              memberId: joint.memberId || 0,
              memberBranchId: joint.memberBrId || user.branchid,
              jointAccHolderAccountNumber: joint.jointAccHolderAccountNumber,
            }))
          );

          if (data.jointAccountWithdrawalInfoDTO) {
            setJointWithdrawalConfig({
              minRequiredPersons:
                data.jointAccountWithdrawalInfoDTO
                  .minimumPersonsRequiredForWithdrawal || 1,
              isJointHolderCompulsory:
                data.jointAccountWithdrawalInfoDTO
                  .jointAccountHolderCompulsoryForWithdrawal === 1,
            });
          }
        }

        // ── Nominees
        if (data.accNomineeDTO && data.accNomineeDTO.length > 0) {
          setIsNomineeRequired(true);
          setNominees(
            data.accNomineeDTO.map((nominee: any) => ({
              branchId: nominee.branchId,
              nomineeName: nominee.nomineeName,
              dateOfBirth:
                nominee.nomineeDob?.split("T")[0] ||
                sessionDate,
              relationWithAccountHolder: nominee.relationWithAccHolder,
              address: nominee.addressLine || "",
              nomineeDate:
                nominee.nomineeDate?.split("T")[0] ||
                sessionDate,
              guardianName: nominee.nameOfGuardian || "",
              isMinor: nominee.isMinor === 1,
            }))
          );
        }

        Swal.close();
      } else {
        throw new Error("RD Account not found");
      }
    } catch (error: any) {
      console.error("Error fetching RD account:", error);
      Swal.fire(
        "Error",
        error.message || "Failed to load RD account data",
        "error"
      );
      navigate("/rd-acc-info"); // adjust to your actual list route
    }
  };

  if (isEditMode && accountId && user.branchid) {
    loadExistingAccount();
  }
}, [accountId, isEditMode, user.branchid, navigate]);

  // ─── Clear Member Helper ─────────────────────────────────────────────────────
  const clearMemberDetails = () => {
    setFormData((prev) => ({ ...prev, memberDetails: null }));
    setMemberDetailsData({
      memberName: "",
      gender: 0,
      dateOfBirth: "",
      mobileNo: "",
      emailId: "",
      addressLine1: "",
      relativeName: "",
      memberId: 0,
      memberBranchId: 0,
    });
  };

  // ─── Field Changes ───────────────────────────────────────────────────────────
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      accountMasterDTO: { ...prev.accountMasterDTO, [field]: value },
    }));
    if ((field === "memberAccountNo" || field === "membershipNo") && !isEditMode) {
      if (formData.memberDetails !== null) clearMemberDetails();
    }
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const handleMemberDetailsChange = (field: string, value: any) => {
    setMemberDetailsData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  const handleRdDetailChange = async (field: string, value: any) => {
    const updated = { ...rdDetailForm, [field]: value };

    const kistAmount =
      field === "kistAmount" ? parseFloat(value) || 0 : parseFloat(updated.kistAmount) || 0;
    const periodMonths =
      field === "periodMonths" ? parseInt(value) || 0 : parseInt(updated.periodMonths) || 0;

    if (field === "kistAmount" || field === "periodMonths") {
      updated.amount =
        kistAmount > 0 && periodMonths > 0
          ? (kistAmount * periodMonths).toFixed(2)
          : "";
    }

    if (field === "rdDate" || field === "kistInterval") {
      updated.firstKistDate = calculateFirstKistDate(
        field === "rdDate" ? value : updated.rdDate,
        field === "kistInterval" ? value : updated.kistInterval
      );
    }

    setRdDetailForm(updated);
    setErrors((prev) => prev.filter((e) => e.field !== field));

    if (
      field === "rdDate" ||
      field === "kistInterval" ||
      field === "kistAmount" ||
      field === "periodMonths" ||
      field === "compoundingInterval"
    ) {
      const productId = Number(formData.accountMasterDTO.rdProductId);
      const amount = parseFloat(updated.amount) || 0;

      if (updated.rdDate && productId && periodMonths > 0 && amount > 0 && kistAmount > 0 && updated.kistInterval) {
        
        await fetchRdCalculatedDetails(
          productId,
          periodMonths,
          amount,
          kistAmount,
          updated.kistInterval,
          updated.rdDate,
          updated.compoundingInterval
        );
      } else {
        clearRdCalculatedFields();
      }
    }
  };

  const fetchRdCalculatedDetails = async (
    productId: number,
    months: number,
    amount: number,
    kistAmount: number,
    kistInterval: string,
    rdDate: string,
    compoundingInterval: string
  ) => {
    if (!rdDate || !productId || months <= 0 || amount <= 0 || kistAmount <= 0 || !kistInterval) {
      clearRdCalculatedFields();
      return;
    }

    try {
      const response = await commonservice.fetch_rd_related_info(
        rdDate,
        months,
        productId,
        amount,
        user.branchid,
        compoundingInterval
      );

      if (!response.success || !response.data) {
        clearRdCalculatedFields();
        return;
      }

      const interestRate = Number(response.data.interestRate) || 0;
      const slabLabel = response.data.slabId
        ? `${response.data.slabName}`
        : "";
      const maturityDate = response.data?.maturityDate
        ? commonservice.splitDate(response.data.maturityDate)
        : "";

      setRdDetailForm((prev) => ({
        ...prev,
        interestRate: interestRate ? interestRate.toString() : "",
        matDate: maturityDate,
        matAmount:
          response.data?.maturityAmount !== undefined
            ? Number(response.data.maturityAmount).toString()
            : "",
        slabName: slabLabel,
        paymentDate: maturityDate || prev.paymentDate,
        compoundingInterval:
          COMPOUNDING_INTERVAL_MAP[response.data.compoundingInterval] ||
          response.data.compoundingInterval?.toString() ||
          prev.compoundingInterval,
        slabId: response.data.slabId ? response.data.slabId.toString() : "",
      }));
    } catch (error) {
      console.error("Error fetching RD slab/maturity details:", error);
      clearRdCalculatedFields();
    }
  };

  // ─── Input Mode Toggle ───────────────────────────────────────────────────────
  const handleInputModeChange = (mode: "account" | "membership", memberType: number = 0) => {
    const hadMemberDetails = formData.memberDetails !== null;
    setInputMode(mode);
    setFormData((prev) => ({
      ...prev,
      accountMasterDTO: {
        ...prev.accountMasterDTO,
        memberAccountNo: isEditMode ? prev.accountMasterDTO.memberAccountNo : "",
        membershipNo: isEditMode ? prev.accountMasterDTO.membershipNo : "",
        memberType:
          mode === "membership"
            ? memberType > 0 ? memberType : 2
            : prev.accountMasterDTO.memberType,
      },
      memberDetails: isEditMode ? prev.memberDetails : null,
    }));
    if (!isEditMode) {
      clearMemberDetails();
      if (hadMemberDetails) {
        Swal.fire({
          icon: "info",
          title: "Search Mode Changed",
          text: "Member details have been cleared. Please search again.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  // ─── Member Search ───────────────────────────────────────────────────────────
  const handleMemberSearch = async () => {
    const searchValue =
      inputMode === "account"
        ? formData.accountMasterDTO.memberAccountNo
        : formData.accountMasterDTO.membershipNo;

    if (!searchValue?.trim()) {
      Swal.fire(
        "Warning",
        `Please enter ${inputMode === "account" ? "Member Account Number" : "Membership Number"}`,
        "warning"
      );
      return;
    }

    try {
      Swal.fire({
        title: "Searching Member...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response =
        inputMode === "account"
          ? await savingAccountService.getMemberByAccountNo(user.branchid, searchValue)
          : await savingAccountService.getMemberByMembershipNo(
              user.branchid,
              searchValue,
              formData.accountMasterDTO.memberType
            );

      Swal.close();

      if (response.success && response.data) {
        setFormData((prev) => ({ ...prev, memberDetails: response.data }));
        setMemberDetailsData({
          memberName: response.data.memberName || "",
          gender: Number(response.data.gender) || 0,
          dateOfBirth: response.data.dateOfBirth ? response.data.dateOfBirth.split("T")[0] : "",
          mobileNo: response.data.phoneNo || "",
          emailId: response.data.emailId || "",
          addressLine1: response.data.addressLine1 || "",
          relativeName: response.data.relativeName || "",
          memberId: response.data.memberId || 0,
          memberBranchId: response.data.memberBranchId || 0,
        });
        Swal.fire({
          icon: "success",
          title: "Member Found!",
          text: `Member: ${response.data.memberName}`,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Error", "Member not found", "error");
      }
    } catch (error: any) {
      Swal.close();
      Swal.fire("Error", error.message || "Failed to fetch member details", "error");
    }
  };

  // ─── Product Change ──────────────────────────────────────────────────────────
  const handleProductChange = async (selectedOption: any) => {
    if (!selectedOption) return;
    const hadMemberDetails = formData.memberDetails !== null;
    try {
      let prefix = "";
      let suffix = "";

      try {
        const response = await commonservice.get_RD_Prefix_And_Suffix(
          user.branchid,
          selectedOption.value
        );
        prefix = response.data?.split?.("-")[0] || "";
        suffix = response.data?.split?.("-")[1] || "";
      } catch {
        prefix = "";
        suffix = "";
      }

      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          rdProductId: selectedOption.value,
          rdPrefix: prefix,
          suffix: suffix,
        },
        memberDetails: null,
      }));
      clearMemberDetails();
      clearRdCalculatedFields();
      if (hadMemberDetails) {
        Swal.fire({
          icon: "info",
          title: "Product Changed",
          text: "Member details have been cleared. Please search again.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch {
      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          rdProductId: selectedOption.value,
          rdPrefix: "",
          suffix: "",
        },
        memberDetails: null,
      }));
      clearMemberDetails();
      clearRdCalculatedFields();
    }
    setErrors((prev) => prev.filter((e) => e.field !== "rdProductId"));
  };

  // ─── Numeric Input ───────────────────────────────────────────────────────────
  const handleNumericChange = async (
    field: string,
    value: string,
    isVoucher = false,
    isRdDetail = false
  ) => {
    let numericValue = value.replace(/[^0-9.]/g, "");
    const parts = numericValue.split(".");
    if (parts.length > 2) numericValue = parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 2)
      numericValue = parts[0] + "." + parts[1].substring(0, 2);

    if (isRdDetail) {
      await handleRdDetailChange(field, numericValue);
    } else if (isVoucher) {
      setVoucherData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      handleFieldChange(field, numericValue);
    }
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  // ─── Joint Account Handlers ──────────────────────────────────────────────────
  const handleJointAccountToggle = (checked: boolean) => {
    setIsJointAccount(checked);
    if (!checked) {
      setJointHolders([]);
      handleFieldChange("operationType", "Single");
    } else {
      handleFieldChange("operationType", "Joint");
    }
  };

  const handleAddJointHolder = () => {
    setJointHolders([
      ...jointHolders,
      {
        branchId: user.branchid,
        jointHolderAccountNo: "",
        jointHolderName: "",
        relationWithMainHolder: 0,
        dateOfBirth: "",
        gender: "",
        address: "",
        mobileNo: "",
        emailId: "",
        jointAccHolderAccountNumber: "",
      },
    ]);
  };

  const handleRemoveJointHolder = (index: number) => {
    setJointHolders(jointHolders.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((e) => !e.field.startsWith(`jointHolders[${index}]`)));
  };

  const handleJointHolderChange = (index: number, field: string, value: any) => {
    setJointHolders(
      jointHolders.map((holder, i) => (i === index ? { ...holder, [field]: value } : holder))
    );
    setErrors((prev) => prev.filter((e) => e.field !== `jointHolders[${index}].${field}`));
  };

  const handleJointHolderSearch = async (index: number) => {
    const accountNo = jointHolders[index].jointHolderAccountNo;
    if (!accountNo) {
      Swal.fire("Warning", "Please enter Joint Holder Account Number", "warning");
      return;
    }
    try {
      Swal.fire({
        title: "Searching Joint Holder...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const response = await savingAccountService.getMemberByAccountNo(user.branchid, accountNo);
      Swal.close();
      if (response.success && response.data) {
        setJointHolders(
          jointHolders.map((holder, i) =>
            i === index
              ? {
                  ...holder,
                  jointHolderName: response.data?.memberName,
                  dateOfBirth: response.data?.dateOfBirth?.split("T")[0] || "",
                  gender: response.data?.gender,
                  address: response.data?.addressLine1 || "",
                  mobileNo: response.data?.phoneNo || "",
                  emailId: response.data?.emailId || "",
                  memberId: response.data?.memberId || 0,
                  memberBranchId: response.data?.memberBranchId || user.branchid,
                  jointAccHolderAccountNumber: accountNo,
                }
              : holder
          )
        );
        Swal.fire("Success", "Joint Holder details loaded", "success");
      } else {
        Swal.fire("Error", "Joint Holder not found", "error");
      }
    } catch (error: any) {
      Swal.close();
      Swal.fire("Error", error.message || "Failed to fetch joint holder", "error");
    }
  };

  // ─── Nominee Handlers ────────────────────────────────────────────────────────
  const handleAddNominee = () => {
    setNominees([
      ...nominees,
      {
        branchId: user.branchid,
        nomineeName: "",
        dateOfBirth: sessionDate,
        relationWithAccountHolder: 0,
        address: "",
        nomineeDate: sessionDate,
        guardianName: "",
        isMinor: false,
      },
    ]);
  };

  const handleRemoveNominee = (index: number) => {
    setNominees(nominees.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((e) => !e.field.startsWith(`nominees[${index}]`)));
  };

  const handleNomineeChange = (index: number, field: string, value: any) => {
    setNominees(
      nominees.map((nominee, i) => {
        if (i === index) {
          const updated = { ...nominee, [field]: value };
          if (field === "isMinor" && !value) updated.guardianName = "";
          return updated;
        }
        return nominee;
      })
    );
    setErrors((prev) => prev.filter((e) => e.field !== `nominees[${index}].${field}`));
  };

  // ─── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (isEditMode) {
      Swal.fire("Not Allowed", "Reset is not allowed in edit mode", "error");
      return;
    }
    setFormData({
      accountMasterDTO: {
      branchId: user.branchid,
      rdProductId: 0,
      accountOpeningDate: sessionDate,
        memberType: 2,
        memberAccountNo: "",
        membershipNo: "",
        rdPrefix: "",
        suffix: "",
        openingNoOfKist: "",
        openingBalance: "",
        balanceType: "Cr",
        operationType: "Single",
        addedUsing: "A",
      },
      memberDetails: null,
    });
    setMemberDetailsData({
      memberName: "",
      gender: 0,
      dateOfBirth: "",
      mobileNo: "",
      emailId: "",
      addressLine1: "",
      relativeName: "",
      memberId: 0,
      memberBranchId: 0,
    });
    setRdDetailForm({
      rdDate: sessionDate,
      rdNo: "",
      kistAmount: "",
      kistInterval: "",
      periodMonths: "",
      amount: "",
      interestRate: "",
      firstKistDate: sessionDate,
      matDate: "",
      paymentDate: sessionDate,
      matAmount: "",
      penaltyAmount: "",
      slabName: "",
      compoundingInterval: "3",
      slabId: "",
    });
    setVoucherData({
      voucherDate: sessionDate,
      depositAmount: "",
      narration: "",
    });
    setVoucherPaymentMode("byCash");
    setVoucherCash({
      debitAccountId: defaultCashAccountId,
      amount: "",
    });
    setVoucherSaving({
      savingAccountId: 0,
      amount: "",
    });
    setJointHolders([]);
    setIsJointAccount(false);
    setNominees([]);
    setIsNomineeRequired(false);
    setInputMode("account");
    setActiveTab("rdDetail");
    setErrors([]);
    setShowValidationSummary(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── VALIDATION ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const validateForm = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    const add = (field: string, message: string, tab: string) =>
      errs.push({ field, message, tab });

    if (!formData.accountMasterDTO.rdProductId || formData.accountMasterDTO.rdProductId === 0)
      add("rdProductId", "RD Product is required", "rdDetail");

    if (!formData.accountMasterDTO.accountOpeningDate)
      add("accountOpeningDate", "RD Date is required", "rdDetail");

    if (!formData.memberDetails) {
      const memberField = inputMode === "account" ? "memberAccountNo" : "membershipNo";
      const memberLabel = inputMode === "account" ? "Member Account No." : "Membership No.";
      if (!formData.accountMasterDTO[memberField as keyof typeof formData.accountMasterDTO])
        add(memberField, `${memberLabel} is required`, "rdDetail");
      else
        add(memberField, "Please search and confirm the member before saving", "rdDetail");
    }

    if (!formData.accountMasterDTO.suffix?.trim())
      add("suffix", "Suffix is required", "rdDetail");

    if (formData.memberDetails) {
      if (!memberDetailsData.memberName?.trim())
        add("memberName", "Member Name is required", "rdDetail");
      if (!memberDetailsData.gender || memberDetailsData.gender === 0)
        add("gender", "Gender is required", "rdDetail");
      if (!memberDetailsData.dateOfBirth)
        add("dateOfBirth", "Date of Birth is required", "rdDetail");
      if (memberDetailsData.mobileNo && !/^\d{10}$/.test(memberDetailsData.mobileNo))
        add("mobileNo", "Mobile number must be exactly 10 digits", "rdDetail");
      if (memberDetailsData.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberDetailsData.emailId))
        add("emailId", "Please enter a valid email address", "rdDetail");
      if (!rdDetailForm.kistAmount || parseFloat(rdDetailForm.kistAmount) <= 0)
        add("kistAmount", "Kist Amount is required and must be greater than 0", "rdDetail");
      if (!rdDetailForm.kistInterval)
        add("kistInterval", "Kist Interval is required", "rdDetail");
      if (!rdDetailForm.periodMonths || parseInt(rdDetailForm.periodMonths) <= 0)
        add("periodMonths", "Period (Months) is required and must be greater than 0", "rdDetail");
      if (!rdDetailForm.amount || parseFloat(rdDetailForm.amount) <= 0)
        add("amount", "Amount is required and must be greater than 0", "rdDetail");
      if (!rdDetailForm.slabName?.trim())
        add("slabName", "Slab is required", "rdDetail");
      if (!rdDetailForm.matAmount || parseFloat(rdDetailForm.matAmount) <= 0)
        add("matAmount", "Maturity Amount is required and must be greater than 0", "rdDetail");
      if (!rdDetailForm.firstKistDate)
        add("firstKistDate", "First Kist Date is required", "rdDetail");
      if (!rdDetailForm.paymentDate)
        add("paymentDate", "Payment Date is required", "rdDetail");
      if (
        rdDetailForm.paymentDate &&
        rdDetailForm.matDate &&
        rdDetailForm.paymentDate < rdDetailForm.matDate
      ) {
        add("paymentDate", "Payment Date must be greater than or equal to Maturity Date", "rdDetail");
      }
    }

    if (isNomineeRequired) {
      if (nominees.length === 0)
        add("nominees", "At least one nominee is required when nominee detail is enabled", "nominee");
      nominees.forEach((nominee, index) => {
        if (!nominee.nomineeName?.trim())
          add(`nominees[${index}].nomineeName`, `Nominee #${index + 1}: Name is required`, "nominee");
        if (!nominee.dateOfBirth)
          add(`nominees[${index}].dateOfBirth`, `Nominee #${index + 1}: Date of Birth is required`, "nominee");
        if (!nominee.relationWithAccountHolder || nominee.relationWithAccountHolder === 0)
          add(`nominees[${index}].relationWithAccountHolder`, `Nominee #${index + 1}: Relation is required`, "nominee");
        if (nominee.isMinor && !nominee.guardianName?.trim())
          add(`nominees[${index}].guardianName`, `Nominee #${index + 1}: Guardian Name is required for minor`, "nominee");
      });
    }


    if (isOpeningEntry) {
      if (
        formData.accountMasterDTO.openingNoOfKist?.trim() &&
        !/^\d+$/.test(formData.accountMasterDTO.openingNoOfKist)
      ) {
        add("openingNoOfKist", "Opening No. of Kists must be a whole number", "rdDetail");
      }
      if (
        formData.accountMasterDTO.openingBalance?.trim() &&
        parseFloat(formData.accountMasterDTO.openingBalance) < 0
      ) {
        add("openingBalance", "Opening Balance cannot be negative", "rdDetail");
      }
      if (!formData.accountMasterDTO.balanceType?.trim())
        add("balanceType", "Balance Type is required", "rdDetail");
    } else if(!isEditMode)
       {
      if (!voucherData.voucherDate)
        add("voucherDate", "Voucher Date is required", "voucher");
      if (!voucherData.depositAmount || parseFloat(voucherData.depositAmount) <= 0)
        add("depositAmount", "Deposit Amount is required and must be greater than 0", "voucher");

      const totalDeposit = parseFloat(voucherData.depositAmount || "0");
      const cashAmount = parseFloat(voucherCash.amount || "0");
      const savingAmount = parseFloat(voucherSaving.amount || "0");

      if (voucherPaymentMode === "byCash") {
        if (!voucherCash.amount || cashAmount <= 0)
          add("cashAmount", "Cash Amount is required and must be greater than 0", "voucher");
        if (cashAmount > 0 && (!voucherCash.debitAccountId || voucherCash.debitAccountId === 0))
          add("debitAccountId", "Debit Account is required when Cash Amount is entered", "voucher");
      }

      if (voucherPaymentMode === "bySaving") {
        if (!voucherSaving.amount || savingAmount <= 0)
          add("savingAmount", "Saving Amount is required and must be greater than 0", "voucher");
        if (savingAmount > 0 && (!voucherSaving.savingAccountId || voucherSaving.savingAccountId === 0))
          add("savingAccountId", "Saving Account is required when Saving Amount is entered", "voucher");
      }

      if (voucherPaymentMode === "byCash" && cashAmount !== totalDeposit)
        add("cashAmount", "Cash Amount must match Deposit Amount", "voucher");
      if (voucherPaymentMode === "bySaving" && savingAmount !== totalDeposit)
        add("savingAmount", "Saving Amount must match Deposit Amount", "voucher");
      if (voucherPaymentMode === "both") {
        if (cashAmount <= 0 && savingAmount <= 0)
          add("depositAmount", "Enter at least one amount in Cash or Saving", "voucher");
        if (cashAmount > 0 && (!voucherCash.debitAccountId || voucherCash.debitAccountId === 0))
          add("debitAccountId", "Debit Account is required when Cash Amount is entered", "voucher");
        if (savingAmount > 0 && (!voucherSaving.savingAccountId || voucherSaving.savingAccountId === 0))
          add("savingAccountId", "Saving Account is required when Saving Amount is entered", "voucher");
        if (cashAmount + savingAmount !== totalDeposit)
          add("depositAmount", "Cash Amount + Saving Amount must equal Deposit Amount", "voucher");
      }
    }

    if (isJointAccount) {
      if (jointHolders.length === 0)
        add("jointHolders", "At least one joint holder is required when Joint Account is enabled", "joint");
      jointHolders.forEach((holder, index) => {
        if (!holder.jointHolderAccountNo?.trim())
          add(`jointHolders[${index}].jointHolderAccountNo`, `Joint Holder #${index + 1}: Account Number is required`, "joint");
        if (!holder.jointHolderName?.trim())
          add(`jointHolders[${index}].jointHolderName`, `Joint Holder #${index + 1}: Name is required`, "joint");
        if (!holder.relationWithMainHolder || holder.relationWithMainHolder === 0)
          add(`jointHolders[${index}].relationWithMainHolder`, `Joint Holder #${index + 1}: Relation is required`, "joint");
        if (holder.mobileNo && !/^\d{10}$/.test(holder.mobileNo))
          add(`jointHolders[${index}].mobileNo`, `Joint Holder #${index + 1}: Mobile must be 10 digits`, "joint");
        if (holder.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holder.emailId))
          add(`jointHolders[${index}].emailId`, `Joint Holder #${index + 1}: Invalid email address`, "joint");
      });
    }

    return errs;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setShowValidationSummary(true);
      setActiveTab(validationErrors[0].tab);
      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `<p>Please fix <strong>${validationErrors.length}</strong> error(s) before saving.</p>`,
        confirmButtonText: "Fix Errors",
        confirmButtonColor: "#EF4444",
      });
      return;
    }
    setErrors([]);
    setShowValidationSummary(false);
    setLoading(true);
    try {
      const totalDeposit = parseFloat(voucherData.depositAmount || "0");
      const cashAmount = parseFloat(voucherCash.amount || "0");
      const savingAmount = parseFloat(voucherSaving.amount || "0");

      const dto: CommonAccMasterDTO = {
        accountMasterDTO: {
          accId: isEditMode ? Number(accountId!) : undefined,
          branchId: user.branchid,
          headId: 0,
          headCode: 0,
          accTypeId: 2,
          accountNumber: formData.accountMasterDTO.memberAccountNo || "",
          accountName: memberDetailsData.memberName,
          accOpeningDate: formData.accountMasterDTO.accountOpeningDate,
          isAccClosed: false,
          isAccAddedManually: 0,
          generalProductId: formData.accountMasterDTO.rdProductId,
          accPrefix: formData.accountMasterDTO.rdPrefix,
          accSuffix: parseInt(formData.accountMasterDTO.suffix) || 0,
          accountNameSL: memberDetailsData.relativeName,
          memberId: formData.memberDetails?.memberId,
          memberBranchId: formData.memberDetails?.memberBranchId,
          isJointAccount: isJointAccount ? 1 : 0,
          isSuspenseAccount: 0,
          addressLine: memberDetailsData.addressLine1,
          phoneNo1: memberDetailsData.mobileNo,
          email: memberDetailsData.emailId,
          gender: Number(memberDetailsData.gender),
          dob: memberDetailsData.dateOfBirth,
          relativeName: memberDetailsData.relativeName,
          rdMaturityDate: rdDetailForm.matDate,
          addedUsing:
            formData.accountMasterDTO.memberAccountNo !== ""
              ? "A"
              : formData.accountMasterDTO.membershipNo !== "" &&
                  formData.accountMasterDTO.memberType === 2
                ? "PM"
                : "NM",
        },
        rdAccountDetailDTO: {
          id: isEditMode ? Number(accountId!) : undefined,
          brId: user.branchid,
          accId: isEditMode ? Number(accountId!) : undefined,
          rdnumber: parseInt(rdDetailForm.rdNo) || 0,
          rddate: rdDetailForm.rdDate,
          rdamount: parseFloat(rdDetailForm.amount) || 0,
          noofmonths: parseInt(rdDetailForm.periodMonths) || 0,
          rdslabid: parseInt(rdDetailForm.slabId) || 0,
          interestrate: parseFloat(rdDetailForm.interestRate) || 0,
          maturitydate: rdDetailForm.matDate,
          kistamt: parseFloat(rdDetailForm.kistAmount) || 0,
          kistinterval: KIST_INTERVAL_MAP[rdDetailForm.kistInterval] || 0,
          firstkistdate: rdDetailForm.firstKistDate,
          penaltyamt: parseFloat(rdDetailForm.penaltyAmount) || 0,
          status: 1,
          maturityamt: parseFloat(rdDetailForm.matAmount) || 0,
          compoundingInterval: COMPOUNDING_INTERVAL_MAP[rdDetailForm.compoundingInterval] || "3",
        },
        voucher: isOpeningEntry
          ? {
              id: 0,
              brID: user.branchid,
              voucherDate: formData.accountMasterDTO.accountOpeningDate,
              openingAmount: parseFloat(formData.accountMasterDTO.openingBalance) || 0,
              totalDebit: parseFloat(formData.accountMasterDTO.openingBalance) || 0,
              voucherNarration: "RD Account Opening",
              openingBalanceType: formData.accountMasterDTO.balanceType,
            }
          : {
              id: 0,
              brID: user.branchid,
              voucherDate: voucherData.voucherDate,
              debitAccountId:
                voucherPaymentMode === "byCash"
                  ? voucherCash.debitAccountId
                  : voucherPaymentMode === "bySaving"
                    ? voucherSaving.savingAccountId
                    : voucherCash.debitAccountId || voucherSaving.savingAccountId,
              totalDebit: totalDeposit,
              voucherNarration: voucherData.narration,
              openingBalanceType: formData.accountMasterDTO.balanceType,
            },
        rdVoucherDetailDTO: !isOpeningEntry
          ? {
              brId: user.branchid,
              vacccrdrid:
                voucherPaymentMode === "byCash"
                  ? voucherCash.debitAccountId
                  : voucherPaymentMode === "bySaving"
                    ? voucherSaving.savingAccountId
                    : voucherCash.debitAccountId || voucherSaving.savingAccountId,
              rdaccid: isEditMode ? Number(accountId!) : 0,
              rdaccdetid: 0,
              amountcr: totalDeposit,
              amountdr: totalDeposit,
              operation: "RC",
              voucherdate: voucherData.voucherDate,
              othrefaccid:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? voucherSaving.savingAccountId
                  : undefined,
            }
          : undefined,
        accNomineeDTO: nominees.map((nominee) => ({
          branchId: user.branchid,
          accountId: isEditMode ? Number(accountId!) : 0,
          nomineeName: nominee.nomineeName,
          nomineeDob: nominee.dateOfBirth,
          relationWithAccHolder: nominee.relationWithAccountHolder,
          addressLine: nominee.address,
          nomineeDate: nominee.nomineeDate,
          isMinor: nominee.isMinor ? 1 : 0,
          nameOfGuardian: nominee.guardianName || null,
        })),
        jointAccountInfoDTO: jointHolders.map((holder) => ({
          branchId: user.branchid,
          accountName: holder.jointHolderName || "",
          relationWithAccHolder: holder.relationWithMainHolder,
          dob: holder.dateOfBirth || "",
          addressLine: holder.address || "",
          gender: parseInt(holder.gender) || 0,
          memberId: holder.memberId || 0,
          memberBrId: holder.memberBranchId || user.branchid,
          jointWithAccountId: isEditMode ? Number(accountId!) : 0,
          jointAccHolderAccountNumber: holder.jointAccHolderAccountNumber || holder.jointHolderAccountNo || "",
        })),
        jointAccountWithdrawalInfoDTO: isJointAccount
          ? {
              branchId: user.branchid,
              accountId: isEditMode ? Number(accountId!) : 0,
              minimumPersonsRequiredForWithdrawal: jointWithdrawalConfig.minRequiredPersons,
              jointAccountHolderCompulsoryForWithdrawal:
                jointWithdrawalConfig.isJointHolderCompulsory ? 1 : 0,
            }
          : undefined,
        creditAccountDetails: !isOpeningEntry
          ? {
              cashAccountId:
                voucherPaymentMode === "byCash" || voucherPaymentMode === "both"
                  ? voucherCash.debitAccountId || 0
                  : 0,
              savingAccountId:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? voucherSaving.savingAccountId || 0
                  : 0,
              cashAmount:
                voucherPaymentMode === "byCash" || voucherPaymentMode === "both"
                  ? cashAmount
                  : 0,
              savingAmount:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? savingAmount
                  : 0,
            }
          : undefined,
        openingBalance: formData.accountMasterDTO.openingBalance || "",
        openingBalanceType: formData.accountMasterDTO.balanceType,
      };

      const response = isEditMode
        ? await rdAccountService.updateRDAccount(dto)
        : await rdAccountService.createRDAccount(dto);

      if (!response.success) {
        throw new Error(response.message || "Failed to save RD account");
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: `RD Account ${isEditMode ? "updated" : "created"} successfully!`,
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/rd-acc-info");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to save RD account", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Dropdown Options ────────────────────────────────────────────────────────
  const rdProductOptions = rdProducts.map((p) => ({ value: p.id, label: p.productName }));
  const relationOptions = relations.map((r) => ({ value: r.relationId, label: r.description }));
  const debitAccountOptions = debitAccounts.map((d) => ({ value: d.accId, label: d.accountName }));
  const savingAccountOptions = savingAccounts.map((s) => ({ value: s.accId, label: s.accountName }));
  const selectedSavingAccount =
    savingAccounts.find((item) => item.accId === voucherSaving.savingAccountId) || null;

  // ─── Tab Class Helper ────────────────────────────────────────────────────────
  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const base = `flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;
    if (activeTab === tabId) return `${base} border-blue-500 text-blue-600 bg-blue-50`;
    if (hasTabErrors) return `${base} border-red-300 text-red-600 hover:bg-red-50`;
    return `${base} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
  };

 const tabs = [
  { id: "rdDetail", label: "RD Detail", icon: FileText },
  { id: "nominee", label: "Nominee Information", icon: UserPlus },
  ...(!isEditMode && !isOpeningEntry
    ? [{ id: "voucher", label: "Voucher Details", icon: CreditCard }]
    : []),
  { id: "joint", label: "Joint Account", icon: Users },
];

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1: RD DETAIL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRdDetail = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Product &amp; Member Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* RD Product */}
          <FormField
            name="rdProductId"
            label="RD Product"
            required
            errors={errorsByField.rdProductId || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
          >
            <Select
              options={rdProductOptions}
              value={rdProductOptions.find((opt) => opt.value === formData.accountMasterDTO.rdProductId) || null}
              onChange={handleProductChange}
              autoFocus
              isDisabled={isEditMode}
              placeholder="Select RD Product"
              className="text-sm"
              styles={{ 
                control: (base) => ({
                  ...base,
                  borderColor: errorsByField.rdProductId ? "#ef4444" : base.borderColor,
                  cursor: isEditMode ? "not-allowed" : "pointer",
                }),
              }}
            />
          </FormField>

          {/* RD Date */}
          <FormField
            name="accountOpeningDate"
            label="RD Date"
            required
            errors={errorsByField.accountOpeningDate || []}
            icon={<Calendar className="w-4 h-4 text-orange-500" />}
          >
            <DatePicker
              value={formData.accountMasterDTO.accountOpeningDate}
              onChange={(val) => handleFieldChange("accountOpeningDate", val)}
              disabled={isEditMode}
              min={sessionMinDate}
              max={sessionMaxDate}
              workingDate={sessionDate}
              className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none ${
                errorsByField.accountOpeningDate
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200"
              }`}
            />
          </FormField>

          {/* Search By Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search By:</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleInputModeChange("account", formData.accountMasterDTO.memberType)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "account" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Account Number
              </button>
              <button
                type="button"
                onClick={() => handleInputModeChange("membership", formData.accountMasterDTO.memberType)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "membership" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Membership Number
              </button>
            </div>
          </div>

          {inputMode === "membership" && (
            <div className="space-y-2 md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                Member Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {[{ value: 2, label: "Permanent" }, { value: 1, label: "Nominal" }].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="memberType"
                      disabled={isEditMode}
                      value={opt.value}
                      checked={formData.accountMasterDTO.memberType === opt.value}
                      onChange={(e) => handleFieldChange("memberType", parseInt(e.target.value))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Member Account / Membership Number */}
          <div className="space-y-2 md:col-span-3">
            <FormField
              name={inputMode === "account" ? "memberAccountNo" : "membershipNo"}
              label={inputMode === "account" ? "Member A/C No." : "Membership No."}
              required
              errors={errorsByField[inputMode === "account" ? "memberAccountNo" : "membershipNo"] || []}
              icon={<CreditCard className="w-4 h-4 text-purple-500" />}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  ref={memberAccountNoRef}
                  value={
                    inputMode === "account"
                      ? formData.accountMasterDTO.memberAccountNo
                      : formData.accountMasterDTO.membershipNo
                  }
                  onChange={(e) => {
                    const field = inputMode === "account" ? "memberAccountNo" : "membershipNo";
                    handleFieldChange(field, e.target.value);
                  }}
                  readOnly={isEditMode}
                  maxLength={inputMode === "account" ? MAX.memberAccountNo : MAX.membershipNo}
                  placeholder={`Enter ${inputMode === "account" ? "Member Account Number" : "Membership Number"}`}
                  className={`flex-1 px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                    errorsByField[inputMode === "account" ? "memberAccountNo" : "membershipNo"]
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleMemberSearch}
                  disabled={isEditMode}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search Member
                </button>
                {formData.memberDetails && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        accountMasterDTO: { ...prev.accountMasterDTO, memberAccountNo: "", membershipNo: "" },
                      }));
                      clearMemberDetails();
                      Swal.fire({ icon: "info", title: "Cleared", text: "Member details cleared.", timer: 1500, showConfirmButton: false });
                    }}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                    title="Clear Member Details"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </FormField>
          </div>

          {/* RD Prefix */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">RD Prefix</label>
            <input
              type="text"
              value={formData.accountMasterDTO.rdPrefix}
              readOnly
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none"
              placeholder="Auto-generated"
            />
          </div>

          {/* Suffix */}
          <FormField
            name="suffix"
            label="Suffix"
            required
            errors={errorsByField.suffix || []}
            icon={<CreditCard className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={formData.accountMasterDTO.suffix}
              onChange={(e) => handleNumericChange("suffix", e.target.value)}
              maxLength={MAX.suffix}
              readOnly={isEditMode}
              placeholder="Enter Suffix"
              className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                errorsByField.suffix ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
              }`}
            />
          </FormField>

          {isOpeningEntry && (
            <>
              <FormField
                name="openingNoOfKist"
                label="Opening No. of Kists"
                errors={errorsByField.openingNoOfKist || []}
                icon={<FileText className="w-4 h-4 text-green-500" />}
              >
                <input
                  type="text"
                  value={formData.accountMasterDTO.openingNoOfKist || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "openingNoOfKist",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={MAX.openingNoOfKist}
                  placeholder="Enter No. of Kists"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </FormField>

              <FormField
                name="openingBalance"
                label="Opening Balance"
                errors={errorsByField.openingBalance || []}
                icon={<IndianRupee className="w-4 h-4 text-green-500" />}
              >
                <input
                  type="text"
                  value={formData.accountMasterDTO.openingBalance || ""}
                  onChange={(e) => handleNumericChange("openingBalance", e.target.value)}
                  maxLength={MAX.depositAmount}
                  placeholder="Enter Opening Balance"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </FormField>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Balance Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="balanceType"
                      value="Cr"
                      checked={formData.accountMasterDTO.balanceType === "Cr"}
                      onChange={(e) => handleFieldChange("balanceType", e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Credit (Cr)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="balanceType"
                      value="Dr"
                      checked={formData.accountMasterDTO.balanceType === "Dr"}
                      onChange={(e) => handleFieldChange("balanceType", e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Debit (Dr)</span>
                  </label>
                </div>
                {errorsByField.balanceType && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errorsByField.balanceType[0]?.message}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {formData.memberDetails && (
        <>
          {/* Member Details */}
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Member Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Member Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberDetailsData.memberName}
                  onChange={(e) => handleMemberDetailsChange("memberName", e.target.value)}
                  maxLength={MAX.memberName}
                  placeholder="Enter Name"
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                    errorsByField.memberName ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                  }`}
                />
                {errorsByField.memberName && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errorsByField.memberName[0]?.message}
                  </p>
                )}
              </div>

              {/* Relative Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Relative Name</label>
                <input
                  type="text"
                  value={memberDetailsData.relativeName}
                  onChange={(e) => handleMemberDetailsChange("relativeName", e.target.value)}
                  maxLength={MAX.relativeName}
                  placeholder="Enter Relative Name"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={memberDetailsData.gender}
                  onChange={(e) => handleMemberDetailsChange("gender", parseInt(e.target.value))}
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                    errorsByField.gender ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                  }`}
                >
                  <option value={0}>Select Gender</option>
                  <option value={1}>Male</option>
                  <option value={2}>Female</option>
                  <option value={3}>Other</option>
                </select>
                {errorsByField.gender && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errorsByField.gender[0]?.message}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={memberDetailsData.dateOfBirth}
                  onChange={(val) => handleMemberDetailsChange("dateOfBirth", val)}
                  max={sessionDate}
                  workingDate={sessionDate}
                  className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none ${
                    errorsByField.dateOfBirth ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errorsByField.dateOfBirth && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errorsByField.dateOfBirth[0]?.message}
                  </p>
                )}
              </div>

              {/* Mobile No */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Mobile No</label>
                <input
                  type="text"
                  value={memberDetailsData.mobileNo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    handleMemberDetailsChange("mobileNo", val);
                  }}
                  placeholder="Enter Mobile Number"
                  maxLength={10}
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer ${
                    errorsByField.mobileNo ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                  }`}
                />
                {errorsByField.mobileNo && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errorsByField.mobileNo[0]?.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={memberDetailsData.emailId}
                  onChange={(e) => handleMemberDetailsChange("emailId", e.target.value)}
                  maxLength={MAX.emailId}
                  placeholder="Enter Email Address"
                  className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer ${
                    errorsByField.emailId ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                  }`}
                />
                {errorsByField.emailId && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errorsByField.emailId[0]?.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1 md:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={memberDetailsData.addressLine1}
                  onChange={(e) => handleMemberDetailsChange("addressLine1", e.target.value)}
                  rows={2}
                  maxLength={MAX.addressLine1}
                  placeholder="Enter Address"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* RD Account Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                RD Account Details
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">RD No.</label>
                  <input
                    type="text"
                    value={rdDetailForm.rdNo}
                    onChange={(e) =>
                      handleRdDetailChange("rdNo", e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={MAX.rdNo}
                    placeholder="Enter RD No."
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none cursor-pointer"
                  />
                </div>

                {/* Kist Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Kist Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rdDetailForm.kistAmount}
                    onChange={(e) => handleNumericChange("kistAmount", e.target.value, false, true)}
                    maxLength={MAX.kistAmount}
                    placeholder="Enter Kist Amount"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer ${
                      errorsByField.kistAmount ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-blue-500"
                    }`}
                  />
                  {errorsByField.kistAmount && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.kistAmount[0]?.message}
                    </p>
                  )}
                </div>

                {/* Kist Interval */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Kist Interval <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={kistIntervalOptions}
                    value={kistIntervalOptions.find((opt) => opt.value === rdDetailForm.kistInterval) || null}
                    onChange={(opt) => handleRdDetailChange("kistInterval", opt?.value || "")}
                    placeholder="==Select=="
                    className="text-sm cursor-pointer"
                    styles={{ 
                      control: (base) => ({
                        ...base,
                        borderColor: errorsByField.kistInterval ? "#ef4444" : base.borderColor,
                      }),
                    }}
                  />
                  {errorsByField.kistInterval && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.kistInterval[0]?.message}
                    </p>
                  )}
                </div>

                {/* Period (Months) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Period (Months) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rdDetailForm.periodMonths}
                    onChange={(e) => handleRdDetailChange("periodMonths", e.target.value.replace(/[^0-9]/g, ""))}
                    maxLength={MAX.periodMonths}
                    placeholder="Enter Period"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-all cursor-pointer ${
                      errorsByField.periodMonths ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-blue-500"
                    }`}
                  />
                  {errorsByField.periodMonths && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.periodMonths[0]?.message}
                    </p>
                  )}
                </div>

                {/* Compounding Interval */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Compounding Interval
                  </label>
                  <select
                    value={rdDetailForm.compoundingInterval}
                    onChange={(e) => handleRdDetailChange("compoundingInterval", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="3">Monthly</option>
                    <option value="4">Quarterly</option>
                    <option value="5">Half-Yearly</option>
                    <option value="6">Yearly</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rdDetailForm.amount}
                    readOnly
                    placeholder="Auto calculated"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-all bg-gray-50 text-gray-600 cursor-not-allowed ${
                      errorsByField.amount ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errorsByField.amount && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.amount[0]?.message}
                    </p>
                  )}
                </div>

                {/* Interest Rate (read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Interest Rate</label>
                  <input
                    type="text"
                    value={rdDetailForm.interestRate}
                    readOnly
                    placeholder="Auto from slab"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Slab (read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Slab</label>
                  <input
                    type="text"
                    value={rdDetailForm.slabName}
                    readOnly
                    placeholder="Auto from slab"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                {/* First Kist Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    First Kist Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={rdDetailForm.firstKistDate}
                    disabled
                    workingDate={sessionDate}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none ${
                      errorsByField.firstKistDate ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    onChange={() => {}}
                  />
                  {errorsByField.firstKistDate && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.firstKistDate[0]?.message}
                    </p>
                  )}
                </div>

                {/* Mat Date (read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Mat Date</label>
                  <DatePicker
                    value={rdDetailForm.matDate}
                    disabled
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                    onChange={() => {}}
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={rdDetailForm.paymentDate}
                    onChange={(val) => handleRdDetailChange("paymentDate", val)}
                    max={sessionDate}
                    workingDate={sessionDate}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none ${
                      errorsByField.paymentDate ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errorsByField.paymentDate && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.paymentDate[0]?.message}
                    </p>
                  )}
                </div>

                {/* Mat Amount (read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Mat Amount</label>
                  <input
                    type="text"
                    value={rdDetailForm.matAmount}
                    readOnly
                    placeholder="Auto calculated"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Penalty Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Penalty Amount</label>
                  <input
                    type="text"
                    value={rdDetailForm.penaltyAmount}
                    onChange={(e) => handleNumericChange("penaltyAmount", e.target.value, false, true)}
                    maxLength={MAX.penaltyAmount}
                    placeholder="Enter Penalty Amount"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 2: NOMINEE INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  const renderNominee = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isNomineeRequired}
            onChange={(e) => {
              setIsNomineeRequired(e.target.checked);
              if (!e.target.checked) {
                setNominees([]);
                setErrors((prev) => prev.filter((e) => e.tab !== "nominee"));
              }
            }}
            className="w-5 h-5 text-purple-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Nominee Detail Required</span>
        </label>
      </div>

      {isNomineeRequired && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Nominees</h3>
            <button
              type="button"
              onClick={handleAddNominee}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Nominee
            </button>
          </div>

          {errorsByField.nominees && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errorsByField.nominees[0]?.message}
            </p>
          )}

          {nominees.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No nominees added yet. Click Add Nominee to add one.</p>
            </div>
          ) : (
            nominees.map((nominee, index) => (
              <div
                key={index}
                className={`bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 transition-all ${
                  errors.some((e) => e.field.startsWith(`nominees[${index}]`))
                    ? "border-red-300"
                    : "border-green-200"
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-green-800">Nominee {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveNominee(index)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {/* Nominee Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nominee Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nominee.nomineeName}
                      onChange={(e) => handleNomineeChange(index, "nomineeName", e.target.value)}
                      maxLength={MAX.nomineeName}
                      placeholder="Enter Nominee Name"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-green-100 outline-none transition-all ${
                        errorsByField[`nominees[${index}].nomineeName`]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-green-500"
                      }`}
                    />
                    {errorsByField[`nominees[${index}].nomineeName`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`nominees[${index}].nomineeName`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={nominee.dateOfBirth}
                      onChange={(val) => handleNomineeChange(index, "dateOfBirth", val)}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none ${
                        errorsByField[`nominees[${index}].dateOfBirth`]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200"
                      }`}
                    />
                    {errorsByField[`nominees[${index}].dateOfBirth`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`nominees[${index}].dateOfBirth`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Relation */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Relation <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={relationOptions}
                      value={relationOptions.find((opt) => opt.value === nominee.relationWithAccountHolder) || null}
                      onChange={(option) =>
                        handleNomineeChange(index, "relationWithAccountHolder", option?.value || 0)
                      }
                      placeholder="Select Relation"
                      className="text-sm"
                      styles={{ 
                        control: (base) => ({
                          ...base,
                          borderColor: errorsByField[`nominees[${index}].relationWithAccountHolder`]
                            ? "#ef4444"
                            : base.borderColor,
                        }),
                      }}
                    />
                    {errorsByField[`nominees[${index}].relationWithAccountHolder`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`nominees[${index}].relationWithAccountHolder`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Nominee Date */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Nominee Date</label>
                    <DatePicker
                      value={nominee.nomineeDate}
                      onChange={(val) => handleNomineeChange(index, "nomineeDate", val)}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={nominee.address}
                      onChange={(e) => handleNomineeChange(index, "address", e.target.value)}
                      rows={2}
                      maxLength={MAX.nomineeAddress}
                      placeholder="Enter Address"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none resize-none"
                    />
                  </div>

                  {/* Is Minor */}
                  <div className="space-y-1 flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nominee.isMinor}
                        onChange={(e) => handleNomineeChange(index, "isMinor", e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Minor?</span>
                    </label>
                  </div>

                  {/* Guardian Name */}
                  {nominee.isMinor && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Guardian Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nominee.guardianName}
                        onChange={(e) => handleNomineeChange(index, "guardianName", e.target.value)}
                        maxLength={MAX.guardianName}
                        placeholder="Enter Guardian Name"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-green-100 outline-none transition-all ${
                          errorsByField[`nominees[${index}].guardianName`]
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 focus:border-green-500"
                        }`}
                      />
                      {errorsByField[`nominees[${index}].guardianName`] && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errorsByField[`nominees[${index}].guardianName`][0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 3: VOUCHER
  // ═══════════════════════════════════════════════════════════════════════════
  const renderVoucher = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            Voucher Details
          </h3>
        </div>
        <div className="p-6">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Type</h4>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="voucherPaymentMode"
                      checked={voucherPaymentMode === "byCash"}
                      onChange={() => {
                        setVoucherPaymentMode("byCash");
                        setVoucherSaving({ savingAccountId: 0, amount: "" });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">By Cash</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="voucherPaymentMode"
                      checked={voucherPaymentMode === "bySaving"}
                      onChange={() => {
                        setVoucherPaymentMode("bySaving");
                        setVoucherCash({ debitAccountId: 0, amount: "" });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">From Saving</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="voucherPaymentMode"
                      checked={voucherPaymentMode === "both"}
                      onChange={() => setVoucherPaymentMode("both")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Both</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Voucher Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={voucherData.voucherDate}
                    disabled
                    max={sessionMaxDate}
                    workingDate={sessionDate}
                    className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none ${
                      errorsByField.voucherDate ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                    onChange={() => {}}
                  />
                  {errorsByField.voucherDate && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.voucherDate[0]?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Deposit Amount (Total) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={voucherData.depositAmount}
                    onChange={(e) => {
                      handleNumericChange("depositAmount", e.target.value, true);
                      setErrors((prev) => prev.filter((er) => er.field !== "depositAmount"));
                    }}
                    maxLength={MAX.depositAmount}
                    placeholder="Enter Deposit Amount"
                    className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer ${
                      errorsByField.depositAmount ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                    }`}
                  />
                  {errorsByField.depositAmount && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errorsByField.depositAmount[0]?.message}
                    </p>
                  )}
                </div>
              </div>

              {(voucherPaymentMode === "byCash" || voucherPaymentMode === "both") && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="text-md font-semibold text-blue-800 mb-4">By Cash</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Debit Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={debitAccountOptions}
                        value={debitAccountOptions.find((opt) => opt.value === voucherCash.debitAccountId) || null}
                        onChange={(opt) => {
                          setVoucherCash({ ...voucherCash, debitAccountId: opt?.value || 0 });
                          setErrors((prev) => prev.filter((er) => er.field !== "debitAccountId"));
                        }}
                        placeholder="-- Select Account --"
                        className="text-sm cursor-pointer"
                        styles={{ 
                          control: (base) => ({
                            ...base,
                            borderColor: errorsByField.debitAccountId ? "#ef4444" : base.borderColor,
                          }),
                        }}
                      />
                      {errorsByField.debitAccountId && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errorsByField.debitAccountId[0]?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Cash Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={voucherCash.amount}
                        onChange={(e) => {
                          setVoucherCash({
                            ...voucherCash,
                            amount: e.target.value.replace(/[^0-9.]/g, ""),
                          });
                          setErrors((prev) => prev.filter((er) => er.field !== "cashAmount"));
                        }}
                        placeholder="Enter Cash Amount"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer ${
                          errorsByField.cashAmount ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-500"
                        }`}
                      />
                      {errorsByField.cashAmount && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errorsByField.cashAmount[0]?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(voucherPaymentMode === "bySaving" || voucherPaymentMode === "both") && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h4 className="text-md font-semibold text-green-800 mb-4">From Saving</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Saving Account <span className="text-red-500">*</span>
                      </label>
                      <Select
                        options={savingAccountOptions}
                        value={savingAccountOptions.find((opt) => opt.value === voucherSaving.savingAccountId) || null}
                        onChange={(opt) => {
                          setVoucherSaving({ ...voucherSaving, savingAccountId: opt?.value || 0 });
                          setErrors((prev) => prev.filter((er) => er.field !== "savingAccountId"));
                        }}
                        placeholder="-- Select Saving Account --"
                        className="text-sm cursor-pointer"
                        styles={{ 
                          control: (base) => ({
                            ...base,
                            borderColor: errorsByField.savingAccountId ? "#ef4444" : base.borderColor,
                          }),
                        }}
                      />
                      {errorsByField.savingAccountId && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errorsByField.savingAccountId[0]?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Saving Bal</label>
                      <input
                        type="text"
                        value={selectedSavingAccount ? `₹${Number(selectedSavingAccount.balance || 0).toFixed(2)}` : ""}
                        readOnly
                        placeholder="Auto from account"
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Saving Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={voucherSaving.amount}
                        onChange={(e) => {
                          setVoucherSaving({
                            ...voucherSaving,
                            amount: e.target.value.replace(/[^0-9.]/g, ""),
                          });
                          setErrors((prev) => prev.filter((er) => er.field !== "savingAmount"));
                        }}
                        placeholder="Enter Saving Amount"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-green-100 outline-none transition-all cursor-pointer ${
                          errorsByField.savingAmount ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-green-500"
                        }`}
                      />
                      {errorsByField.savingAmount && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errorsByField.savingAmount[0]?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {voucherPaymentMode === "both" && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-purple-800">Split Total</span>
                    <span className="text-lg font-semibold text-purple-900">
                      ₹{(
                        parseFloat(voucherCash.amount || "0") +
                        parseFloat(voucherSaving.amount || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Voucher Narration</label>
                <textarea
                  value={voucherData.narration}
                  onChange={(e) => setVoucherData({ ...voucherData, narration: e.target.value })}
                  rows={2}
                  maxLength={MAX.narration}
                  placeholder="Enter Voucher Narration"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none cursor-pointer"
                />
              </div>
            </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 4: JOINT ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderJointAccount = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isJointAccount}
            onChange={(e) => handleJointAccountToggle(e.target.checked)}
            className="w-5 h-5 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">This is a Joint Account</span>
        </label>
      </div>

      {isJointAccount && (
        <>
          {/* Withdrawal Config */}
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              Joint Withdrawal Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Min Required Persons for Withdrawal
                </label>
                <input
                  type="number"
                  min={1}
                  value={jointWithdrawalConfig.minRequiredPersons}
                  onChange={(e) =>
                    setJointWithdrawalConfig((prev) => ({
                      ...prev,
                      minRequiredPersons: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jointWithdrawalConfig.isJointHolderCompulsory}
                    onChange={(e) =>
                      setJointWithdrawalConfig((prev) => ({
                        ...prev,
                        isJointHolderCompulsory: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Joint Holder Compulsory for Withdrawal
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Joint Account Holders</h3>
            <button
              type="button"
              onClick={handleAddJointHolder}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Joint Holder
            </button>
          </div>

          {errorsByField.jointHolders && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errorsByField.jointHolders[0]?.message}
            </p>
          )}

          {jointHolders.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No joint holders added yet. Click "Add Joint Holder" to add one.</p>
            </div>
          ) : (
            jointHolders.map((holder, index) => (
              <div
                key={index}
                className={`bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 transition-all ${
                  errors.some((e) => e.field.startsWith(`jointHolders[${index}]`))
                    ? "border-red-300"
                    : "border-purple-200"
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-purple-800">Joint Holder #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveJointHolder(index)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {/* Account No + Search */}
                  <div className="space-y-1 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={holder.jointHolderAccountNo}
                        onChange={(e) => handleJointHolderChange(index, "jointHolderAccountNo", e.target.value)}
                        maxLength={MAX.jointAccountNo}
                        placeholder="Enter Account Number"
                        className={`flex-1 px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                          errorsByField[`jointHolders[${index}].jointHolderAccountNo`]
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 focus:border-blue-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleJointHolderSearch(index)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                      >
                        Search
                      </button>
                    </div>
                    {errorsByField[`jointHolders[${index}].jointHolderAccountNo`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`jointHolders[${index}].jointHolderAccountNo`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Joint Holder Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={holder.jointHolderName}
                      onChange={(e) => handleJointHolderChange(index, "jointHolderName", e.target.value)}
                      maxLength={MAX.jointHolderName}
                      placeholder="Auto-filled on search"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none transition-all ${
                        errorsByField[`jointHolders[${index}].jointHolderName`]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`jointHolders[${index}].jointHolderName`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`jointHolders[${index}].jointHolderName`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Relation */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Relation <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={relationOptions}
                      value={relationOptions.find((opt) => opt.value === holder.relationWithMainHolder) || null}
                      onChange={(option) =>
                        handleJointHolderChange(index, "relationWithMainHolder", option?.value || 0)
                      }
                      placeholder="Select Relation"
                      className="text-sm"
                      styles={{ 
                        control: (base) => ({
                          ...base,
                          borderColor: errorsByField[`jointHolders[${index}].relationWithMainHolder`]
                            ? "#ef4444"
                            : base.borderColor,
                        }),
                      }}
                    />
                    {errorsByField[`jointHolders[${index}].relationWithMainHolder`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`jointHolders[${index}].relationWithMainHolder`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* DOB */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <DatePicker
                      value={holder.dateOfBirth}
                      onChange={(val) => handleJointHolderChange(index, "dateOfBirth", val)}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Mobile No</label>
                    <input
                      type="text"
                      value={holder.mobileNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        handleJointHolderChange(index, "mobileNo", val);
                      }}
                      placeholder="Enter Mobile"
                      maxLength={10}
                      className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none transition-all ${
                        errorsByField[`jointHolders[${index}].mobileNo`]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`jointHolders[${index}].mobileNo`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`jointHolders[${index}].mobileNo`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={holder.emailId}
                      onChange={(e) => handleJointHolderChange(index, "emailId", e.target.value)}
                      maxLength={MAX.jointEmail}
                      placeholder="Enter Email"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg outline-none transition-all ${
                        errorsByField[`jointHolders[${index}].emailId`]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`jointHolders[${index}].emailId`] && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorsByField[`jointHolders[${index}].emailId`][0]?.message}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={holder.address}
                      onChange={(e) => handleJointHolderChange(index, "address", e.target.value)}
                      rows={2}
                      maxLength={MAX.jointAddress}
                      placeholder="Enter Address"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
          <div className="w-full">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Building className="w-8 h-8 text-blue-600" />
                    {isEditMode ? "Edit" : "Create"} RD Account
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Fill in the details to {isEditMode ? "update" : "create"} a Recurring Deposit account
                  </p>
                </div>
                <button
                  onClick={() => navigate(!isEditMode ? "/account-operations" : "/rd-acc-info")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Validation Summary */}
            {showValidationSummary && errors.length > 0 && (
              <ValidationSummary
                errors={errors}
                errorsByTab={errorsByTab}
                isVisible={showValidationSummary}
                onErrorClick={(_fieldName, tab) => setActiveTab(tab)}
                onClose={() => setShowValidationSummary(false)}
              />
            )}

            {/* Main Form Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">

              {/* Tabs */}
              <div className="border-b border-gray-200 bg-white rounded-t-xl">
                <nav className="flex space-x-0 overflow-x-auto px-2">
                  {tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const tabErrorCount = errorsByTab[tab.id]?.length || 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={getTabClassName(tab.id)}
                      >
                        <TabIcon className="w-4 h-4" />
                        {tab.label}
                        {tabErrorCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {tabErrorCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "rdDetail" && renderRdDetail()}
                {activeTab === "nominee" && renderNominee()}
                {activeTab === "voucher" && renderVoucher()}
                {activeTab === "joint" && renderJointAccount()}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {loading ? "Processing..." : isEditMode ? "Update RD Account" : "Save RD Account"}
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

export default RDAccountMaster;
