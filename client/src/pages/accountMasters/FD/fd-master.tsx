// pages/AccountMasters/FDAccount/FDAccountMaster.tsx
import React, { useState, useEffect, useRef } from "react";
import { encryptId, decryptId } from "../../../utils/encryption";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  User,
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
import commonservice, {
  AccountMaster,
} from "../../../services/common/commonservice";
import fdAccountService, {
  CommonAccMasterDTO,
} from "../../../services/accountMasters/fdaccount/fdaccountapi";
import { useFormValidation } from "../../../services/Validations/accountMasters/fdaccmastervalidations";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import { SavingAccounts } from "../Saving/close-saving-account";
import { json } from "stream/consumers";
import { canEnterOpeningBalance } from "../../../utils/session";
import DatePicker from "../../../components/DatePicker";

export interface FDProduct {
  id: number;
  productName: string;
  productCode: string;
}

export interface SavingProduct {
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

interface FDDetailItem {
  id: number;
  fdDate: string;
  receiptNo: string;
  fdAmount: number;
  months: number;
  days: number;
  intRate: number;
  compoundingInterval: string;
  maturityDate: string;
  maturityAmount: number;
  slabId: number;
  linkedAccountId?: number;
  ltdNo?: string;
}

const FDAccountMaster = () => {
  const navigate = useNavigate();
  const { accountId: encryptedId } = useParams<{ accountId?: string }>();
  const accountId = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!accountId;

  const user = useSelector((state: RootState) => state.user);
  const sessionDate = user.workingdate ? commonservice.splitDate(user.workingdate) : commonservice.getTodaysDate();
  const [activeTab, setActiveTab] = useState("fdDetail"); // Changed to generic "detail"
  const [loading, setLoading] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // ✅ Add showMIS state
  const [showMIS, setShowMIS] = useState(false);

  // MIS Detail Form State
  const [misDetailForm, setMisDetailForm] = useState({
    misAccountNo: "",
    misDate: sessionDate,
    receiptNo: "",
    misAmount: "",
    months: "",
    days: "",
    intRate: "",
    compoundingInterval: "Monthly",
    maturityDate: "",
    maturityAmount: "",
    interestPostInterval: "Monthly",
    interestAmount: "",
    openingBalance: "",
    balanceType: "Dr",
    accountType: "SB",
    linkedAccountId: 0,
    slabId: 0,
  });

  useEffect(() => {
    const loadExistingFDAccount = async () => {
      if (isEditMode && accountId) {
        try {
          Swal.fire({ title: "Loading FD Account Data...", text: "Please wait", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

          const modifyCheck = await commonservice.can_modify_account(Number(accountId), user.branchid);
          if (!modifyCheck.success) {
            Swal.close();
            await Swal.fire({ icon: "error", title: "Not Allowed", text: modifyCheck.message || "This account can only be modified in the session it was opened in." });
            navigate("/fd-acc-info");
            return;
          }

          const response = await fdAccountService.getFDAccountById(
            Number(accountId),
            user.branchid,
            null
          );

          if (response.success && response.data) {
            const data = response.data;
            const addedUsing = data.accountMasterDTO.addedUsing;

            // Determine if it's MIS based on product
            const fdAccountTypeResponse =
              await commonservice.fd_account_type_from_fd_product(
                Number(data.accountMasterDTO.generalProductId),
                user.branchid,
              );
            const isMIS =
              fdAccountTypeResponse.success &&
              fdAccountTypeResponse.data !== "Same Account";
            setShowMIS(isMIS);

            // Set input mode
            setInputMode(addedUsing === "A" ? "account" : "membership");

            // Set form data
            setFormData({
              accountMasterDTO: {
                branchId: data.accountMasterDTO.branchId,
                fdProductId: data.accountMasterDTO.generalProductId || 0,
                accountOpeningDate:
                  data.accountMasterDTO.accOpeningDate?.split("T")[0] ||
                  sessionDate,
                memberType: addedUsing === "NM" ? 1 : 2,
                memberAccountNo: data.accountMasterDTO.accountNumber || "",
                membershipNo: data.accountMasterDTO.membershipNo || "",
                fdPrefix: data.accountMasterDTO.accPrefix || "",
                suffix: data.accountMasterDTO.accSuffix?.toString() || "",
                openingBalance: data.openingBalance?.toString() || "",
                balanceType: data.openingBalanceType?.toString() || "Cr",
                addedUsing: addedUsing || "A",
              },
              memberDetails: data.accountMasterDTO.memberId
                ? {
                    memberId: data.accountMasterDTO.memberId,
                    memberBranchId: data.accountMasterDTO.memberBranchId,
                    memberName: data.accountMasterDTO.accountName,
                    relativeName: data.accountMasterDTO.relativeName || "",
                    gender: data.accountMasterDTO.gender || "",
                    dateOfBirth: data.accountMasterDTO.dob || "",
                    phoneNo: data.accountMasterDTO.phoneNo1 || "",
                    emailId: data.accountMasterDTO.email || "",
                    addressLine1: data.accountMasterDTO.addressLine || "",
                  }
                : null,
            });

            // Set member details data
            if (data.accountMasterDTO.memberId) {
              setMemberDetailsData({
                memberName: data.accountMasterDTO.accountName || "",
                gender: Number(data.accountMasterDTO.gender) || 0,
                memberId: data.accountMasterDTO.memberId || 0,
                memberBranchId: data.accountMasterDTO.memberBranchId || 0,
                dateOfBirth: data.accountMasterDTO.dob?.split("T")[0] || "",
                mobileNo: data.accountMasterDTO.phoneNo1 || "",
                emailId: data.accountMasterDTO.email || "",
                addressLine1: data.accountMasterDTO.addressLine || "",
                relativeName: data.accountMasterDTO.relativeName || "",
              });
            }
            // Set FD Details or MIS Details based on account type
            if (data.fdAccountDetailDTO && data.fdAccountDetailDTO.length > 0) {
              if (isMIS) {
                // Load MIS Details
                setMisDetailsList(
                  data.fdAccountDetailDTO.map((mis: any) => ({
                    misAccountNo: mis.fdAccountNo,
                    misDate:
                      mis.fdDate?.split("T")[0] ||
                      sessionDate,
                    receiptNo: mis.ltdNo || "",
                    misAmount: mis.fdAmount,
                    months: mis.fdPeriodMonths,
                    days: mis.fdPeriodDays,
                    intRate: mis.intRate,
                    compoundingInterval: mis.compoundingInterval || "Monthly",
                    maturityDate: mis.fdMaturityDate?.split("T")[0] || "",
                    maturityAmount: mis.maturityAmount,
                    interestPostInterval: mis.interestPaidInterval || "Monthly",
                    interestAmount: mis.interestPaidAmount || 0,
                    openingBalance: mis.openingBalance || 0,
                    balanceType: mis.balanceType || "Dr",
                    accountType: "SB",
                    linkedAccountId: mis.misAccId || 0,
                    slabId: mis.slabId || 0,
                  })),
                );
              } else {
                // Load FD Details
                setFdDetailsList(
                  data.fdAccountDetailDTO.map((fd: any) => ({
                    id: fd.id || Date.now(),
                    fdDate:
                      fd.fdDate?.split("T")[0] || sessionDate,
                    receiptNo: fd.ltdNo || "",
                    fdAmount: fd.fdAmount,
                    months: fd.fdPeriodMonths,
                    days: fd.fdPeriodDays,
                    intRate: fd.intRate,
                    compoundingInterval: fd.compoundingInterval || "Yearly",
                    maturityDate: fd.fdMaturityDate?.split("T")[0] || "",
                    maturityAmount: fd.maturityAmount,
                    slabId: fd.slabId || 0,
                  })),
                );
              }
            }

            // Set nominees
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
                })),
              );
            }

            // Load voucher details if available
            if (data.fdVoucherDetailDTO) {
              const voucherDetail = data.fdVoucherDetailDTO;

              // Determine payment mode
              if (
                voucherDetail.cashGLAccountId &&
                voucherDetail.savingAccountId
              ) {
                setVoucherPaymentMode("both");
              } else if (voucherDetail.savingAccountId) {
                setVoucherPaymentMode("bySaving");
              } else {
                setVoucherPaymentMode("byCashGL");
              }

              // Set Cash/GL voucher data
              if (voucherDetail.cashGLAccountId) {
                setVoucherCashGL({
                  cashGLAccountId: voucherDetail.cashGLAccountId,
                  amount: voucherDetail.cashGLAmount?.toString() || "",
                });
              }

              // Set Saving voucher data
              if (voucherDetail.savingAccountId) {
                // Fetch saving accounts for the product
                if (voucherDetail.savingProductId) {
                  await fetchSavingAccounts(voucherDetail.savingProductId);
                }

                setVoucherSaving({
                  savingProductId: voucherDetail.savingProductId || 0,
                  savingAccountId: voucherDetail.savingAccountId,
                  amount: voucherDetail.savingAmount?.toString() || "",
                });
              }
            }

            if (isMIS) {
              const misAccountInfo = await commonservice.fetch_MIS_Accounts(
                data.accountMasterDTO.memberId || 0,
                data.accountMasterDTO.memberBranchId || 0,
              );
              setMISAccounts(misAccountInfo.data || []);
            }

            Swal.close();
          } else {
            throw new Error("FD Account not found");
          }
        } catch (error: any) {
          console.error("Error fetching FD account:", error);
          Swal.fire(
            "Error",
            error.message || "Failed to load FD account data",
            "error",
          );
          navigate("/fd-acc-info");
        }
      }
    };

    loadExistingFDAccount();
  }, [accountId, isEditMode, user.branchid, navigate]);

  // MIS Details List
  const [misDetailsList, setMisDetailsList] = useState<any[]>([]);
  const [editingMisIndex, setEditingMisIndex] = useState<number | null>(null);
  const [misAccounts, setMISAccounts] = useState<AccountMaster[]>([]);

  // Validation hook
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();

  // Member details data
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

  const fetchMaturityDate = async (
    fddate: string,
    periodInMonths: number,
    periodInDays: number,
    isMIS: boolean = false,
  ) => {
    if (!fddate || (!periodInMonths && !periodInDays)) {
      setMisDetailForm((prev) => ({
        ...prev,
        maturityDate: "",
      }));
      setFdDetailForm((prev) => ({
        ...prev,
        maturityDate: "",
      }));

      return;
    }

    try {
      const response = await commonservice.fetch_fd_related_info(
        fddate,
        periodInMonths,
        periodInDays,
        memberDetailsData.dateOfBirth,
        formData.accountMasterDTO.fdProductId,
        isMIS
          ? parseFloat(misDetailForm.misAmount) || 0
          : parseFloat(fdDetailForm.fdAmount) || 0,
        user.branchid,
      );
      if (response.success && response.data) {
        if (isMIS) {
          setMisDetailForm((prev) => ({
            ...prev,
            maturityDate: commonservice.splitDate(response.data.maturityDate),
            intRate: response.data.interestRate?.toString() || "",
            compoundingInterval: response.data.compoundingInterval || "Monthly",
            maturityAmount: misDetailForm.misAmount.toString() || "",
            slabId: response.data.slabId || 0,
          }));
        } else {
          setFdDetailForm((prev) => ({
            ...prev,
            maturityDate: commonservice.splitDate(response.data.maturityDate),
            intRate: response.data.interestRate?.toString() || "",
            compoundingInterval: response.data.compoundingInterval || "Monthly",
            maturityAmount: response.data.maturityAmount?.toString() || "",
            slabId: response.data.slabId || 0,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching maturity date:", error);
    }
  };

  const handleMemberDetailsChange = (field: string, value: any) => {
    setMemberDetailsData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Group errors by field
  const errorsByField = errors.reduce(
    (acc, error) => {
      if (!acc[error.field]) acc[error.field] = [];
      acc[error.field].push(error);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  // Dropdown data
  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccounts[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);

  // Input mode toggler
  const [inputMode, setInputMode] = useState<"account" | "membership">(
    "account",
  );

  // Form data
  const [formData, setFormData] = useState({
    accountMasterDTO: {
      branchId: user.branchid,
      fdProductId: 0,
      accountOpeningDate: sessionDate,
      memberType: 2,
      memberAccountNo: "",
      membershipNo: "",
      fdPrefix: "",
      suffix: "",
      addedUsing: "A",
      openingBalance: "",
      balanceType: "Cr",
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

  // FD Detail Form State
  const [fdDetailForm, setFdDetailForm] = useState({
    fdDate: sessionDate,
    receiptNo: "",
    fdAmount: "",
    months: "",
    days: "",
    intRate: "",
    compoundingInterval: "Yearly",
    maturityDate: "",
    maturityAmount: "",
    slabId: 0,
  });

  // FD Details List
  const [fdDetailsList, setFdDetailsList] = useState<FDDetailItem[]>([]);
  const [editingFdIndex, setEditingFdIndex] = useState<number | null>(null);

  // Voucher payment mode
  const [voucherPaymentMode, setVoucherPaymentMode] = useState<
    "byCashGL" | "bySaving" | "both"
  >("byCashGL");

  // Voucher Data - Cash/GL
  const [voucherCashGL, setVoucherCashGL] = useState({
    cashGLAccountId: 0,
    amount: "",
  });

  // Voucher Data - By Saving
  const [voucherSaving, setVoucherSaving] = useState({
    savingProductId: 0,
    savingAccountId: 0,
    amount: "",
  });

  // Nominees
  const [nominees, setNominees] = useState<any[]>([]);
  const [isNomineeRequired, setIsNomineeRequired] = useState(false);

  // Refs
  const memberAccountNoRef = useRef<HTMLInputElement>(null);

  // Compounding options
  const compoundingOptions = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly" },
    { value: "Half-Yearly", label: "Half-Yearly" },
    { value: "Yearly", label: "Yearly" },
    { value: "Two-Yearly", label: "Two-Yearly" },
    { value: "No-Compounding", label: "No Compounding" },
  ];

  // Helper function to clear member and FD details
  const clearMemberAndFdDetails = () => {
    setFormData((prev) => ({
      ...prev,
      memberDetails: null,
    }));

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

    setFdDetailsList([]);
    setEditingFdIndex(null);

    setFdDetailForm({
      fdDate: sessionDate,
      receiptNo: "",
      fdAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Yearly",
      maturityDate: "",
      maturityAmount: "",
      slabId: 0,
    });

    // Clear MIS details too
    setMisDetailsList([]);
    setMISAccounts([]);
    setEditingMisIndex(null);
    setMisDetailForm({
      misAccountNo: "",
      misDate: sessionDate,
      receiptNo: "",
      misAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Monthly",
      maturityDate: "",
      maturityAmount: "",
      interestPostInterval: "Monthly",
      interestAmount: "",
      openingBalance: "",
      balanceType: "Dr",
      accountType: "SB",
      linkedAccountId: 0,
      slabId: 0,
    });
  };

  // Load dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          fdProductsRes,
          savingProductsRes,
          relationsRes,
          debitAccountsRes,
        ] = await Promise.all([
          commonservice.fetch_fd_products(user.branchid),
          commonservice.fetch_saving_products(user.branchid),
          commonservice.relation_info(),
          commonservice.general_accmasters_info(user.branchid),
        ]);

        setFdProducts(fdProductsRes.data || []);
        setSavingProducts(savingProductsRes.data || []);
        setRelations(relationsRes.data || []);
        setDebitAccounts(debitAccountsRes.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchData();
  }, [user.branchid]);

  const fetchSavingAccounts = async (productId: number) => {
    try {
      if (productId === 0) return;
      const response = await commonservice.fetch_deposit_accounts(
        user.branchid,
        productId,
        2,
        false,
      );
      if (response.success && response.data) {
        setSavingAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching saving accounts:", error);
    }
  };

  // Handle numeric input
  const handleNumericChange = (
    field: string,
    value: string,
    isVoucher = false,
    isFdDetail = false,
  ) => {
    let numericValue = value.replace(/[^0-9.]/g, "");
    const parts = numericValue.split(".");
    if (parts.length > 2) {
      numericValue = parts[0] + "." + parts.slice(1).join("");
    }
    if (parts[1] && parts[1].length > 2) {
      numericValue = parts[0] + "." + parts[1].substring(0, 2);
    }

    if (isFdDetail) {
      setFdDetailForm((prev) => ({
        ...prev,
        [field]: numericValue,
      }));
    } else if (isVoucher) {
      // Handle voucher fields
    } else {
      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          [field]: numericValue,
        },
      }));
    }
  };

  // Handle input mode toggle
  const handleInputModeChange = (
    mode: "account" | "membership",
    memberType: number = 0,
  ) => {
    const hadMemberDetails = formData.memberDetails !== null;
    const hadFdDetails = fdDetailsList.length > 0;
    const hadMisDetails = misDetailsList.length > 0;

    setInputMode(mode);
    setFormData((prev) => ({
      ...prev,
      accountMasterDTO: {
        ...prev.accountMasterDTO,
        memberAccountNo: isEditMode
          ? prev.accountMasterDTO.memberAccountNo
          : "",
        membershipNo: isEditMode ? prev.accountMasterDTO.membershipNo : "",
        memberType:
          mode === "membership"
            ? memberType > 0
              ? memberType
              : 2
            : prev.accountMasterDTO.memberType,
      },
      memberDetails: isEditMode ? prev.memberDetails : null,
    }));

    if (!isEditMode) {
      clearMemberAndFdDetails();

      // Show notification if data was cleared
      if (hadMemberDetails || hadFdDetails || hadMisDetails) {
        Swal.fire({
          icon: "info",
          title: "Search Mode Changed",
          text: "Member details and account details have been cleared. Please search again.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  };

  // Handle member search
  const handleMemberSearch = async () => {
    const searchValue =
      inputMode === "account"
        ? formData.accountMasterDTO.memberAccountNo
        : formData.accountMasterDTO.membershipNo;

    if (!searchValue || searchValue.trim() === "") {
      Swal.fire(
        "Warning",
        `Please enter ${
          inputMode === "account"
            ? "Member Account Number"
            : "Membership Number"
        }`,
        "warning",
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
          ? await fdAccountService.getMemberByAccountNo(
              user.branchid,
              searchValue,
            )
          : await fdAccountService.getMemberByMembershipNo(
              user.branchid,
              searchValue,
              formData.accountMasterDTO.memberType,
            );

      Swal.close();

      if (response.success && response.data) {
        setFormData((prev) => ({
          ...prev,
          memberDetails: response.data,
        }));
        setMemberDetailsData({
          memberName: response.data.memberName || "",
          gender: Number(response.data.gender) || 0,
          memberId: response.data.memberId || 0,

          dateOfBirth: response.data.dateOfBirth
            ? response.data.dateOfBirth.split("T")[0]
            : "",
          mobileNo: response.data.phoneNo || "",
          emailId: response.data.emailId || "",
          addressLine1: response.data.addressLine1 || "",
          relativeName: response.data.relativeName || "",
          memberBranchId: response.data.memberBranchId || 0,
        });

        setMISAccounts([]);

        if (showMIS) {
          const misAccountInfo = await commonservice.fetch_MIS_Accounts(
            response.data.memberId || 0,
            response.data.memberBranchId || 0,
          );
          setMISAccounts(misAccountInfo.data || []);
        }

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
      Swal.fire(
        "Error",
        error.message || "Failed to fetch member details",
        "error",
      );
    }
  };

  // Handle product change
  const handleProductChange = async (selectedOption: any) => {
    if (selectedOption) {
      const hadMemberDetails = formData.memberDetails !== null;
      const hadFdDetails = fdDetailsList.length > 0;
      const hadMisDetails = misDetailsList.length > 0;

      try {
        const fdAccountTypeResponse =
          await commonservice.fd_account_type_from_fd_product(
            selectedOption.value,
            user.branchid,
          );
        if (fdAccountTypeResponse.success)
          setShowMIS(
            fdAccountTypeResponse.data == "Same Account" ? false : true,
          );
        const response = await commonservice.get_FD_Prefix_And_Suffix(
          user.branchid,
          selectedOption.value,
        );
        let prefix = response.data?.split?.("-")[0] || "";
        let suffix = response.data?.split?.("-")[1] || "";

        setFormData((prev) => ({
          ...prev,
          accountMasterDTO: {
            ...prev.accountMasterDTO,
            fdProductId: selectedOption.value,
            fdPrefix: prefix,
            suffix: suffix,
          },
          memberDetails: null,
        }));

        clearMemberAndFdDetails();

        if (hadMemberDetails || hadFdDetails || hadMisDetails) {
          Swal.fire({
            icon: "info",
            title: "Product Changed",
            text: "Member details and account details have been cleared. Please search for member again.",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        setFormData((prev) => ({
          ...prev,
          accountMasterDTO: {
            ...prev.accountMasterDTO,
            fdProductId: selectedOption.value,
          },
          memberDetails: null,
        }));

        clearMemberAndFdDetails();

        if (hadMemberDetails || hadFdDetails || hadMisDetails) {
          Swal.fire({
            icon: "info",
            title: "Product Changed",
            text: "Member details and account details have been cleared. Please search for member again.",
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    }
  };

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      accountMasterDTO: {
        ...prev.accountMasterDTO,
        [field]: value,
      },
    }));

    if (
      (field === "memberAccountNo" || field === "membershipNo") &&
      !isEditMode
    ) {
      if (formData.memberDetails !== null) {
        clearMemberAndFdDetails();
      }
    }
  };

  // FD Detail handlers
  const handleFdDetailChange = async (field: string, value: any) => {
    // Update the field first
    setFdDetailForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Fetch maturity date when relevant fields change
    if (field === "fdDate" || field === "months" || field === "days" || field === "fdAmount") {
      const fdDate = field === "fdDate" ? value : fdDetailForm.fdDate;
      const months =
        field === "months" ? Number(value) : Number(fdDetailForm.months);
      const days = field === "days" ? Number(value) : Number(fdDetailForm.days);
      const fdAmount =
        field === "fdAmount"
          ? parseFloat(value) || 0
          : parseFloat(fdDetailForm.fdAmount) || 0;
      if (fdDate && (months || days) && fdAmount > 0) {
        await fetchMaturityDate(fdDate, months, days, false);
      } else {
        setFdDetailForm((prev) => ({
          ...prev,
          maturityDate: "",
        }));
        setMisDetailForm((prev) => ({
          ...prev,
          maturityDate: "",
        }));
      }
    }
  };

  // MIS Detail handlers
  const handleMisDetailChange = async (field: string, value: any) => {
    setMisDetailForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Fetch maturity date when relevant fields change
    if (field === "fdDate" || field === "months" || field === "days"|| field === "fdAmount") {
      const fdDate = field === "fdDate" ? value : misDetailForm.misDate;
      const months =
        field === "months" ? Number(value) : Number(misDetailForm.months);
      const days = field === "days" ? Number(value) : Number(misDetailForm.days);
      const fdAmount =
        field === "fdAmount"
          ? parseFloat(value) || 0
          : parseFloat(misDetailForm.misAmount) || 0;
          alert(months);

      if (fdDate && (months || days) && fdAmount > 0) {
        await fetchMaturityDate(fdDate, months, days, true);
      } else {
        setFdDetailForm((prev) => ({
          ...prev,
          maturityDate: "",
        }));
        setMisDetailForm((prev) => ({
          ...prev,
          maturityDate: "",
        }));
      }
    }
  };

  // Add FD Detail to list
  const handleAddFdDetail = () => {
    const errors = [];

    if (!fdDetailForm.fdDate) {
      errors.push("• FD Date is required");
    }

    if (
      !fdDetailForm.fdAmount?.trim() ||
      parseFloat(fdDetailForm.fdAmount) <= 0
    ) {
      errors.push("• FD Amount must be greater than 0");
    }

    // Period validation
    const months = parseInt(fdDetailForm.months) || 0;
    const days = parseInt(fdDetailForm.days) || 0;

    if (months === 0 && days === 0) {
      errors.push("• Period (Months or Days) is required");
    }

    // Interest rate validation
    // if (!fdDetailForm.intRate || parseFloat(fdDetailForm.intRate) <= 0) {
    //   errors.push("• Interest rate not available - check period and product configuration");
    // }

    // Maturity date validation
    if (!fdDetailForm.maturityDate) {
      errors.push("• Maturity date is not calculated");
    }

    // Maturity amount validation
    // if (!fdDetailForm.maturityAmount || parseFloat(fdDetailForm.maturityAmount) <= 0) {
    //   errors.push("• Maturity amount is not calculated");
    // }

    // Show all errors if any
    if (errors.length > 0) {
      Swal.fire({
        title: "Validation Errors",
        html: `<div style="text-align: left; font-size: 14px; line-height: 1.8;">${errors.join(
          "<br>",
        )}</div>`,
        icon: "warning",
        confirmButtonColor: "#9333ea",
        confirmButtonText: "OK",
        width: "500px",
      });
      return;
    }
    // All validations passed - proceed with add/update
    if (editingFdIndex !== null) {
      setFdDetailsList((prev) =>
        prev.map((item, idx) =>
          idx === editingFdIndex
            ? {
                ...item,
                fdDate: fdDetailForm.fdDate,
                receiptNo: fdDetailForm.receiptNo?.trim() || "",
                fdAmount: parseFloat(fdDetailForm.fdAmount),
                months: months,
                days: days,
                intRate: parseFloat(fdDetailForm.intRate),
                compoundingInterval: fdDetailForm.compoundingInterval,
                maturityDate: fdDetailForm.maturityDate,
                maturityAmount: parseFloat(fdDetailForm.maturityAmount),
                slabId: fdDetailForm.slabId,
              }
            : item,
        ),
      );
      setEditingFdIndex(null);
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "FD detail updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      const newItem: FDDetailItem = {
        id: Date.now(),
        fdDate: fdDetailForm.fdDate,
        receiptNo: fdDetailForm.receiptNo?.trim() || "",
        fdAmount: parseFloat(fdDetailForm.fdAmount),
        months: months,
        days: days,
        intRate: parseFloat(fdDetailForm.intRate),
        compoundingInterval: fdDetailForm.compoundingInterval,
        maturityDate: fdDetailForm.maturityDate,
        maturityAmount: parseFloat(fdDetailForm.maturityAmount),
        slabId: fdDetailForm.slabId,
      };
      setFdDetailsList((prev) => [...prev, newItem]);
      Swal.fire({
        icon: "success",
        title: "Added!",
        text: "FD detail added successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    }

    setFdDetailForm({
      fdDate: sessionDate,
      receiptNo: "",
      fdAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Yearly",
      maturityDate: "",
      maturityAmount: "",
      slabId: 0,
    });
  };

  const handleEditFdDetail = (index: number) => {
    const item = fdDetailsList[index];
    setFdDetailForm({
      fdDate: item.fdDate,
      receiptNo: item.receiptNo,
      fdAmount: item.fdAmount.toString(),
      months: item.months.toString(),
      days: item.days.toString(),
      intRate: item.intRate.toString(),
      compoundingInterval: item.compoundingInterval,
      maturityDate: item.maturityDate,
      maturityAmount: item.maturityAmount.toString(),
      slabId: item.slabId,
    });
    setEditingFdIndex(index);
  };

  const handleDeleteFdDetail = (index: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this FD detail?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setFdDetailsList((prev) => prev.filter((_, idx) => idx !== index));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "FD detail has been deleted",
          timer: 1000,
          showConfirmButton: false,
        });
      }
    });
  };

  // MIS Detail handlers
  const handleAddMisDetail = () => {
    const errors = [];

    // Required field validations
    // if (!misDetailForm.misAccountNo?.trim()) {
    //   errors.push("• MIS Account Number is required");
    // }

    if (!misDetailForm.misDate) {
      errors.push("• MIS Date is required");
    }

    if (
      !misDetailForm.misAmount?.trim() ||
      parseFloat(misDetailForm.misAmount) <= 0
    ) {
      errors.push("• MIS Amount must be greater than 0");
    }

    // Period validation
    const months = parseInt(misDetailForm.months) || 0;
    const days = parseInt(misDetailForm.days) || 0;

    if (months === 0 && days === 0) {
      errors.push("• Period (Months or Days) is required");
    }

    // Interest rate validation
    // if (!misDetailForm.intRate || parseFloat(misDetailForm.intRate) <= 0) {
    //   errors.push(
    //     "• Interest rate not available - check period and product configuration",
    //   );
    // }

    // Maturity date validation
    if (!misDetailForm.maturityDate) {
      errors.push("• Maturity date is not calculated");
    }

    // Opening entry specific validations
    if (isOpeningEntry) {
      if (
        misDetailForm.openingBalance?.trim() &&
        parseFloat(misDetailForm.openingBalance) < 0
      ) {
        errors.push("• Opening Balance cannot be negative");
      }

      if (!misDetailForm.balanceType) {
        errors.push("• Balance Type (Dr/Cr) is required");
      }

      if (!misDetailForm.accountType) {
        errors.push("• Account Type is required");
      }
    }

    // Linked account validation
    if (
      misDetailForm.interestPostInterval &&
      misDetailForm.interestPostInterval !== "On Maturity"
    ) {
      if (misDetailForm.linkedAccountId === 0) {
        errors.push("• Linked Account Number is required for interest posting");
      }
    }

    // Duplicate check
    const isDuplicate = misDetailsList.some(
      (item, index) =>
        item.misAccountNo?.toLowerCase() ===
          misDetailForm.misAccountNo?.toLowerCase().trim() &&
        index !== editingMisIndex,
    );

    if (isDuplicate) {
      errors.push(
        `• MIS Account Number "${misDetailForm.misAccountNo}" already exists`,
      );
    }

    // Show all errors if any
    if (errors.length > 0) {
      Swal.fire({
        title: "Validation Errors",
        html: `<div style="text-align: left; font-size: 14px; line-height: 1.8;">${errors.join(
          "<br>",
        )}</div>`,
        icon: "warning",
        confirmButtonColor: "#ea580c",
        confirmButtonText: "OK",
        width: "500px",
      });
      return;
    }

    // All validations passed - proceed with add/update
    // ✅ Prepare the data ONCE to avoid inconsistencies
    const preparedData = {
      misAccountNo: misDetailForm.misAccountNo?.trim() || "",
      misDate: misDetailForm.misDate,
      receiptNo: misDetailForm.receiptNo || "",
      misAmount: parseFloat(misDetailForm.misAmount) || 0,
      months: months,
      days: days,
      intRate: parseFloat(misDetailForm.intRate) || 0,
      compoundingInterval: misDetailForm.compoundingInterval,
      maturityDate: misDetailForm.maturityDate,
      maturityAmount: parseFloat(misDetailForm.maturityAmount) || 0,
      interestPostInterval: misDetailForm.interestPostInterval,
      interestAmount: parseFloat(misDetailForm.interestAmount) || 0,
      openingBalance: parseFloat(misDetailForm.openingBalance) || 0,
      balanceType: misDetailForm.balanceType,
      accountType: misDetailForm.accountType,
      linkedAccountId: misDetailForm.linkedAccountId || 0,
      linkedAccountNo: misDetailForm.linkedAccountId || 0,
      slabId: misDetailForm.slabId || 0, // ✅ Add if missing
    };

    if (editingMisIndex !== null) {
      // ✅ Update existing item
      setMisDetailsList((prev) =>
        prev.map((item, idx) =>
          idx === editingMisIndex ? preparedData : item,
        ),
      );
      setEditingMisIndex(null);

      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "MIS detail updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // ✅ Add new item
      setMisDetailsList((prev) => [...prev, preparedData]);

      Swal.fire({
        icon: "success",
        title: "Added!",
        text: "MIS detail added successfully",
        timer: 1500,
        showConfirmButton: false,
      });
    }

    // ✅ Reset form AFTER state update
    setMisDetailForm({
      misAccountNo: "",
      misDate: sessionDate,
      receiptNo: "",
      misAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Monthly",
      maturityDate: "",
      maturityAmount: "",
      interestPostInterval: "Monthly",
      interestAmount: "",
      openingBalance: "",
      balanceType: "Dr",
      accountType: "SB",
      linkedAccountId: 0,
      slabId: 0, // ✅ Add if missing
    });
  };

  const handleEditMisDetail = (index: number) => {
    const item = misDetailsList[index];
    setMisDetailForm({
      misAccountNo: item.misAccountNo || "",
      misDate: item.misDate || sessionDate,
      receiptNo: item.receiptNo || "",
      misAmount: (item.misAmount || 0).toString(),
      months: (item.months || 0).toString(),
      days: (item.days || 0).toString(),
      intRate: (item.intRate || 0).toString(),
      compoundingInterval: item.compoundingInterval || "Monthly",
      maturityDate: item.maturityDate || "",
      maturityAmount: (item.maturityAmount || 0).toString(),
      interestPostInterval: item.interestPostInterval || "Monthly",
      interestAmount: (item.interestAmount || 0).toString(),
      openingBalance: (item.openingBalance || 0).toString(),
      balanceType: item.balanceType || "Dr",
      accountType: item.accountType || "SB",
      linkedAccountId: item.linkedAccountId || 0,
      slabId: item.slabId || 0,
    });
    setEditingMisIndex(index);
  };

  const handleDeleteMisDetail = (index: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this MIS detail?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setMisDetailsList((prev) => prev.filter((_, idx) => idx !== index));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "MIS detail has been deleted",
          timer: 1000,
          showConfirmButton: false,
        });
      }
    });
  };

  // Nominee handlers
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
  };

  const handleNomineeChange = (index: number, field: string, value: any) => {
    setNominees(
      nominees.map((nominee, i) => {
        if (i === index) {
          const updated = { ...nominee, [field]: value };
          if (field === "isMinor" && !value) {
            updated.guardianName = "";
          }
          return updated;
        }
        return nominee;
      }),
    );
  };

  // Handle submit
  const handleSubmit = async () => {
    const validationResult = validateForm(
      formData.accountMasterDTO,
      inputMode,
      memberDetailsData,
      formData.memberDetails,
      showMIS ? misDetailsList : fdDetailsList,
      Boolean(isOpeningEntry),
      voucherPaymentMode,
      voucherCashGL,
      voucherSaving,
      false,
      [],
      isNomineeRequired,
      nominees,
      showMIS,
      showMIS ? misDetailsList : fdDetailsList,
      isEditMode
    );

    if (!validationResult.isValid) {
      setShowValidationSummary(true);

      const firstErrorTab = Object.keys(validationResult.errorsByTab)[0];
      if (firstErrorTab) {
        setActiveTab(firstErrorTab);
      }

      Swal.fire({
        icon: "error",
        title: "Validation Failed",
        text: `Please fix ${validationResult.errors.length} error(s) before submitting.`,
      });

      return;
    }

    setLoading(true);
    try {
      const dto: CommonAccMasterDTO = {
        accountMasterDTO: {
          accId: isEditMode ? Number(accountId!) : undefined,
          branchId: user.branchid,
          headId: 0,
          headCode: 0,
          accTypeId: 3,
          accountNumber: "123",
          accountName: memberDetailsData.memberName,
          accOpeningDate: formData.accountMasterDTO.accountOpeningDate,
          isAccClosed: false,
          isAccAddedManually: 0,
          generalProductId: formData.accountMasterDTO.fdProductId,
          accPrefix: formData.accountMasterDTO.fdPrefix,
          accSuffix: parseInt(formData.accountMasterDTO.suffix) || 0,
          memberId: formData.memberDetails?.memberId,
          memberBranchId: formData.memberDetails?.memberBranchId,
          addressLine: memberDetailsData.addressLine1,
          phoneNo1: memberDetailsData.mobileNo,
          email: memberDetailsData.emailId,
          gender: Number(memberDetailsData.gender),
          dob: memberDetailsData.dateOfBirth,
          relativeName: memberDetailsData.relativeName,
          addedUsing:
            formData.accountMasterDTO.memberAccountNo !== ""
              ? "A"
              : formData.accountMasterDTO.membershipNo !== "" &&
                  formData.accountMasterDTO.memberType === 2
                ? "PM"
                : "NM",
        },

        fdAccountDetailDTO: showMIS
          ? misDetailsList.map((mis) => ({
              branchId: user.branchid,
              fdAccountNo: mis.misAccountNo,
              fdDate: mis.misDate,
              receiptNo: mis.receiptNo,
              fdAmount: mis.misAmount,
              fdPeriodMonths: mis.months,
              fdPeriodDays: mis.days,
              intRate: mis.intRate,
              fdstatus: 1,
              compoundingInterval: mis.compoundingInterval,
              fdmaturityDate: mis.maturityDate,
              maturityAmount: mis.maturityAmount,
              slabId: mis.slabId,
              misaccid: mis.linkedAccountId,
              LTDNo: String(mis.receiptNo)
            }))
          : fdDetailsList.map((fd) => ({
              branchId: user.branchid,
              fdDate: fd.fdDate,
              receiptNo: fd.receiptNo,
              fdAmount: fd.fdAmount,
              fdPeriodMonths: fd.months,
              fdPeriodDays: fd.days,
              fdstatus: 1,
              intRate: fd.intRate,
              compoundingInterval: fd.compoundingInterval,
              fdmaturityDate: fd.maturityDate,
              maturityAmount: fd.maturityAmount,
              slabId: fd.slabId,
              LTDNo: fd.receiptNo.toString()
            })),

        voucher: isOpeningEntry
          ? {
              id: 0,
              brID: user.branchid,
              voucherDate: formData.accountMasterDTO.accountOpeningDate,
              debitAccountId: 0,
              totalDebit: Number(formData.accountMasterDTO.openingBalance) || 0,
              voucherNarration: showMIS ? "MIS Account Opening" : "FD Account Opening",
              openingBalanceType: formData.accountMasterDTO.balanceType,
              openingAmount: Number(formData.accountMasterDTO.openingBalance) || 0,
            }
          : {
              id: 0,
              brID: user.branchid,
              voucherDate: formData.accountMasterDTO.accountOpeningDate,
              debitAccountId:
                voucherCashGL.cashGLAccountId || voucherSaving.savingAccountId,
              totalDebit:
                parseFloat(voucherCashGL.amount || "0") +
                parseFloat(voucherSaving.amount || "0"),
              voucherNarration: showMIS ? "MIS Account Opening" : "FD Account Opening",
              openingBalanceType: "Cr",
              openingAmount: 0,
            },

        fdVoucherDetailDTO: isOpeningEntry
          ? undefined
          : {
              branchId: user.branchid,
              paymentMode: voucherPaymentMode,
              cashGLAccountId:
                voucherPaymentMode === "byCashGL" || voucherPaymentMode === "both"
                  ? voucherCashGL.cashGLAccountId
                  : undefined,
              cashGLAmount:
                voucherPaymentMode === "byCashGL" || voucherPaymentMode === "both"
                  ? parseFloat(voucherCashGL.amount) || 0
                  : undefined,
              savingProductId:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? voucherSaving.savingProductId
                  : undefined,
              savingAccountId:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? voucherSaving.savingAccountId
                  : undefined,
              savingAmount:
                voucherPaymentMode === "bySaving" || voucherPaymentMode === "both"
                  ? parseFloat(voucherSaving.amount) || 0
                  : undefined,
            },

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
      };
      const response = isEditMode
        ? await fdAccountService.updateFDAccount(dto)
        : await fdAccountService.createFDAccount(dto);

      if (response.success) {
        clearErrors();
        setShowValidationSummary(false);
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: `${showMIS ? "MIS" : "FD"} Account ${
            isEditMode ? "updated" : "created"
          } successfully!`,
          timer: 1500,
          showConfirmButton: false,
        });
        if (isEditMode) {
          navigate("/fd-acc-info");
          return;
        }
        handleReset();
      } else {
        throw new Error(
          response.message ||
            `Failed to ${isEditMode ? "update" : "save"} account`,
        );
      }
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.message || `Failed to ${isEditMode ? "update" : "save"} account`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (isEditMode) {
      Swal.fire("Not Allowed", "Reset is not allowed in edit mode", "error");
      return;
    }

    setFormData({
      accountMasterDTO: {
        branchId: user.branchid,
        fdProductId: 0,
        accountOpeningDate: sessionDate,
        memberType: 2,
        memberAccountNo: "",
        membershipNo: "",
        fdPrefix: "",
        suffix: "",
        addedUsing: "A",
        openingBalance: "",
        balanceType: "Cr",
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

    setFdDetailForm({
      fdDate: sessionDate,
      receiptNo: "",
      fdAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Yearly",
      maturityDate: "",
      maturityAmount: "",
      slabId: 0,
    });

    setMisDetailForm({
      misAccountNo: "",
      misDate: sessionDate,
      receiptNo: "",
      misAmount: "",
      months: "",
      days: "",
      intRate: "",
      compoundingInterval: "Monthly",
      maturityDate: "",
      maturityAmount: "",
      interestPostInterval: "Monthly",
      interestAmount: "",
      openingBalance: "",
      balanceType: "Dr",
      accountType: "SB",
      linkedAccountId: 0,
      slabId: 0,
    });

    setFdDetailsList([]);
    setEditingFdIndex(null);
    setMisDetailsList([]);
    setEditingMisIndex(null);
    setVoucherPaymentMode("byCashGL");
    setVoucherCashGL({ cashGLAccountId: 0, amount: "" });
    setVoucherSaving({ savingProductId: 0, savingAccountId: 0, amount: "" });
    setNominees([]);
    setIsNomineeRequired(false);
    setInputMode("account");
    setActiveTab("fdDetail");
    clearErrors();
    setShowValidationSummary(false);
  };

  // Prepare options for dropdowns
  const fdProductOptions = fdProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));

  const savingProductOptions = savingProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));

  const savingAccountOptions = savingAccounts.map((s) => ({
    value: s.accId,
    label: s.accountName,
  }));
  const relationOptions = relations.map((r) => ({
    value: r.relationId,
    label: r.description,
  }));

  const debitAccountOptions = debitAccounts.map((d) => ({
    value: d.accId,
    label: d.accountName,
  }));

  const misAccountOptions = misAccounts.map((d) => ({
    value: d.accId,
    label: d.accountName,
  }));

  // Group errors by tab
  const errorsByTab = errors.reduce(
    (acc, error) => {
      if (!acc[error.tab]) acc[error.tab] = [];
      acc[error.tab].push(error);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  // Get tab class name
  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const baseClassName = `flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;

    if (activeTab === tabId) {
      return `${baseClassName} border-purple-500 text-purple-600 bg-purple-50`;
    } else if (hasTabErrors) {
      return `${baseClassName} border-red-300 text-red-600 hover:bg-red-50`;
    } else {
      return `${baseClassName} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
    }
  };

  // ✅ Conditional tabs based on showMIS
  // ✅ Update tabs to match validation tab IDs
  const tabs = showMIS
    ? [
        { id: "misDetail", label: "MIS Detail", icon: FileText },
        { id: "nominee", label: "Nominee Information", icon: UserPlus },
        { id: "voucher", label: "Voucher Detail", icon: CreditCard },
      ].filter((tab) => (isEditMode || isOpeningEntry ? tab.id !== "voucher" : true))
    : [
        { id: "fdDetail", label: "FD Detail", icon: FileText },
        { id: "nominee", label: "Nominee Information", icon: UserPlus },
        { id: "voucher", label: "Voucher Detail", icon: CreditCard },
      ].filter((tab) => (isEditMode || isOpeningEntry ? tab.id !== "voucher" : true));

  // ===== RENDER FUNCTIONS =====

  // Render Member Search Section (common for both FD and MIS)
  const renderMemberSearchSection = () => (
    <>
      {/* Member Info Section */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Product & Member Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* FD Product */}
          <FormField
            name="fdProductId"
            label={showMIS ? "MIS Product" : "FD Product"}
            required
            errors={errorsByField.fdProductId || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
          >
            <Select
              options={fdProductOptions}
              value={fdProductOptions.find(
                (opt) => opt.value === formData.accountMasterDTO.fdProductId,
              )}
              onChange={handleProductChange}
              autoFocus
              isDisabled={isEditMode}
              placeholder={`Select ${showMIS ? "MIS" : "FD"} Product`}
              className="text-sm"
            />
          </FormField>

          {/* Account Opening Date */}
          <FormField
            name="accountOpeningDate"
            label="A/C Opening Date"
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
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
            />
          </FormField>

          {/* Search By Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By:
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() =>
                  handleInputModeChange(
                    "account",
                    formData.accountMasterDTO.memberType,
                  )
                }
                disabled={isEditMode}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "account"
                    ? "bg-purple-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Account Number
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInputModeChange(
                    "membership",
                    formData.accountMasterDTO.memberType,
                  )
                }
                disabled={isEditMode}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "membership"
                    ? "bg-purple-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Membership Number
              </button>
            </div>
          </div>

          {/* Member Type - Only show when membership mode */}
          {inputMode === "membership" && (
            <div className="space-y-2 md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-500" />
                  Member Type<span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="memberType"
                    disabled={isEditMode}
                    value={2}
                    checked={formData.accountMasterDTO.memberType === 2}
                    onChange={(e) =>
                      handleFieldChange("memberType", parseInt(e.target.value))
                    }
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Permanent
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="memberType"
                    disabled={isEditMode}
                    value={1}
                    checked={formData.accountMasterDTO.memberType === 1}
                    onChange={(e) =>
                      handleFieldChange("memberType", parseInt(e.target.value))
                    }
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Nominal
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Member Account/Membership Number */}
          <div className="space-y-2 md:col-span-3">
            <FormField
              name={
                inputMode === "account" ? "memberAccountNo" : "membershipNo"
              }
              label={
                inputMode === "account" ? "Member A/C No." : "Membership No."
              }
              required
              errors={
                errorsByField[
                  inputMode === "account" ? "memberAccountNo" : "membershipNo"
                ] || []
              }
              icon={<CreditCard className="w-4 h-4 text-purple-500" />}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    ref={memberAccountNoRef}
                    value={
                      inputMode === "account"
                        ? formData.accountMasterDTO.memberAccountNo
                        : formData.accountMasterDTO.membershipNo
                    }
                    onChange={(e) => {
                      const field =
                        inputMode === "account"
                          ? "memberAccountNo"
                          : "membershipNo";
                      handleFieldChange(field, e.target.value);
                    }}
                    readOnly={isEditMode}
                    placeholder={`Enter ${
                      inputMode === "account"
                        ? "Member Account Number"
                        : "Membership Number"
                    }`}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMemberSearch}
                  disabled={isEditMode}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search Member
                </button>
                {formData.memberDetails && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        accountMasterDTO: {
                          ...prev.accountMasterDTO,
                          memberAccountNo: "",
                          membershipNo: "",
                        },
                      }));
                      clearMemberAndFdDetails();
                      Swal.fire({
                        icon: "info",
                        title: "Cleared",
                        text: "Member details and account details have been cleared",
                        timer: 1500,
                        showConfirmButton: false,
                      });
                    }}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                    title="Clear Member Details"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </FormField>
          </div>
          {/* Saving Prefix */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Saving Prefix
            </label>
            <input
              type="text"
              value={formData.accountMasterDTO.fdPrefix}
              readOnly
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none"
              placeholder="Auto-generated"
            />
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <FormField
              name="suffix"
              label="Suffix"
              errors={errorsByField.suffix || []}
              required
              icon={<CreditCard className="w-4 h-4 text-green-500" />}
            >
              <input
                type="text"
                value={formData.accountMasterDTO.suffix}
                placeholder="Enter Suffix"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </FormField>
          </div>

          {/* Opening Balance */}
          {isOpeningEntry && (
            <>
              <FormField
                name="openingBalance"
                label="Opening Balance"
                errors={errorsByField.openingBalance || []}
                icon={<IndianRupee className="w-4 h-4 text-green-500" />}
              >
                <input
                  type="text"
                  value={formData.accountMasterDTO.openingBalance || ""}
                  onChange={(e) =>
                    handleNumericChange("openingBalance", e.target.value)
                  }
                  placeholder="Enter Opening Balance"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </FormField>

              {/* Balance Type */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Balance Type
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="balanceType"
                      value="Cr"
                      checked={formData.accountMasterDTO.balanceType === "Cr"}
                      onChange={(e) =>
                        handleFieldChange("balanceType", e.target.value)
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Credit (Cr)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="balanceType"
                      value="Dr"
                      checked={formData.accountMasterDTO.balanceType === "Dr"}
                      onChange={(e) =>
                        handleFieldChange("balanceType", e.target.value)
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Debit (Dr)
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Member Details - Only show when member is fetched */}
      {formData.memberDetails && (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Member Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={memberDetailsData.memberName}
                onChange={(e) =>
                  handleMemberDetailsChange("memberName", e.target.value)
                }
                placeholder="Enter Name"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Relative Name
              </label>
              <input
                type="text"
                value={memberDetailsData.relativeName}
                onChange={(e) =>
                  handleMemberDetailsChange("relativeName", e.target.value)
                }
                placeholder="Enter Relative Name"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Gender<span className="text-red-500">*</span>
              </label>
              <select
                value={memberDetailsData.gender}
                onChange={(e) =>
                  handleMemberDetailsChange("gender", e.target.value)
                }
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value={0}>Select Gender</option>
                <option value={1}>Male</option>
                <option value={2}>Female</option>
                <option value={3}>Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth<span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={memberDetailsData.dateOfBirth}
                onChange={(val) => handleMemberDetailsChange("dateOfBirth", val)}
                max={sessionDate}
                workingDate={sessionDate}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Mobile No
              </label>
              <input
                type="text"
                value={memberDetailsData.mobileNo}
                onChange={(e) =>
                  handleMemberDetailsChange("mobileNo", e.target.value)
                }
                placeholder="Enter Mobile Number"
                maxLength={10}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={memberDetailsData.emailId}
                onChange={(e) =>
                  handleMemberDetailsChange("emailId", e.target.value)
                }
                placeholder="Enter Email Address"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                value={memberDetailsData.addressLine1}
                onChange={(e) =>
                  handleMemberDetailsChange("addressLine1", e.target.value)
                }
                rows={2}
                placeholder="Enter Address"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render FD Detail Tab
  const renderFdDetail = () => (
    <div className="space-y-6">
      {renderMemberSearchSection()}

      {/* FD Detail Form - Only show when member is fetched */}
      {formData.memberDetails && !showMIS && (
        <>
          {/* Form Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  FD Details
                </h3>
                {editingFdIndex !== null && (
                  <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                    Editing Row {editingFdIndex + 1}
                  </span>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
              {/* Primary Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    FD Date<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <DatePicker
                    value={fdDetailForm.fdDate}
                    onChange={(val) => handleFdDetailChange("fdDate", val)}
                    min={sessionMinDate}
                    max={sessionMaxDate}
                    workingDate={sessionDate}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Receipt No/LTD No
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.receiptNo}
                    onChange={(e) =>
                      handleFdDetailChange("receiptNo", e.target.value)
                    }
                    maxLength={10}
                    placeholder="Receipt/LTD No"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    FD Amount<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.fdAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers with up to 2 decimal places
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        handleFdDetailChange("fdAmount", value);
                      }
                    }}
                    maxLength={14}
                    placeholder="Amount"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Months
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.months}
                    onChange={(e) =>
                      handleFdDetailChange(
                        "months",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    maxLength={3}
                    placeholder="Months"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Secondary Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Days
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.days}
                    onChange={(e) =>
                      handleFdDetailChange(
                        "days",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    maxLength={3}
                    placeholder="Days"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interest Rate %
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.intRate}
                    readOnly
                    placeholder="Auto from slab"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Compounding
                  </label>
                  <Select
                    options={compoundingOptions}
                    value={compoundingOptions.find(
                      (opt) => opt.value === fdDetailForm.compoundingInterval,
                    )}
                    onChange={(option) =>
                      handleFdDetailChange("compoundingInterval", option?.value)
                    }
                    isDisabled
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Maturity Date
                  </label>
                  <DatePicker
                    value={fdDetailForm.maturityDate}
                    disabled
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                    onChange={() => {}}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Maturity Amount
                  </label>
                  <input
                    type="text"
                    value={fdDetailForm.maturityAmount}
                    readOnly
                    placeholder="Auto calculated"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddFdDetail}
                  className={`px-6 py-2.5 ${
                    editingFdIndex !== null
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  } text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md`}
                >
                  {editingFdIndex !== null ? "Update FD" : "Add FD"}
                </button>

                {editingFdIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFdIndex(null);
                      setFdDetailForm({
                        fdDate: sessionDate,
                        receiptNo: "",
                        fdAmount: "",
                        months: "",
                        days: "",
                        intRate: "",
                        compoundingInterval: "Yearly",
                        maturityDate: "",
                        maturityAmount: "",
                        slabId: 0,
                      });
                    }}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FD Details Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Added FD Details
                <span className="ml-2 px-2.5 py-0.5 bg-white/20 rounded-full text-sm">
                  {fdDetailsList.length}
                </span>
              </h4>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                      Sr.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      FD Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      FD Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      Int Rate %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      Period
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      Maturity Amt
                    </th>
                    {isOpeningEntry && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                        Opening Bal
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fdDetailsList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isOpeningEntry ? 9 : 8}
                        className="px-4 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              No FD details added yet
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Fill the form above and click "Add FD" to add
                              details
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    fdDetailsList.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          editingFdIndex === index
                            ? "bg-orange-50 hover:bg-orange-50"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {item.fdDate}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-900 font-semibold text-right">
                          ₹{item.fdAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 text-center">
                          {item.intRate}%
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 text-center whitespace-nowrap">
                          {item.months}M {item.days}D
                        </td>
                        <td className="px-4 py-3.5 text-sm text-green-600 font-semibold text-right">
                          ₹{item.maturityAmount.toLocaleString("en-IN")}
                        </td>
                        {isOpeningEntry && (
                          <td className="px-4 py-3.5 text-sm text-gray-700 text-right">
                            ₹{item.openingBalance.toLocaleString("en-IN")}{" "}
                            <span
                              className={`ml-1 text-xs ${
                                item.balanceType === "Credit"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.balanceType}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditFdDetail(index)}
                              disabled={editingFdIndex !== null}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFdDetail(index)}
                              disabled={editingFdIndex !== null}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MIS Detail Form - Only show when member is fetched and showMIS is true */}
      {formData.memberDetails && showMIS && (
        <>
          {/* Form Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  MIS Details
                </h3>
                {editingMisIndex !== null && (
                  <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                    Editing Row {editingMisIndex + 1}
                  </span>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
              {/* Primary Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    MIS Date<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <DatePicker
                    value={misDetailForm.misDate}
                    onChange={(val) => {
                      setMisDetailForm((prev) => ({ ...prev, misDate: val }));
                      handleMisDetailChange("fddate", val);
                    }}
                    min={sessionMinDate}
                    max={sessionMaxDate}
                    workingDate={sessionDate}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Rec. No/Ltd. No.
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.receiptNo}
                    onChange={(e) =>
                      setMisDetailForm((prev) => ({
                        ...prev,
                        receiptNo: e.target.value,
                      }))
                    }
                    maxLength={10}
                    placeholder="Receipt/Ledger No"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    MIS Amount<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.misAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers with up to 2 decimal places
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        handleMisDetailChange("fdAmount", value);
                        setMisDetailForm((prev) => ({
                          ...prev,
                          misAmount: value,
                        }));
                      }
                    }}
                    maxLength={14}
                    placeholder="Amount"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Period (Months)
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.months}
                    onChange={(e) =>
                      handleMisDetailChange(
                        "months",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    maxLength={3}
                    placeholder="e.g., 60"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Period (Days)
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.days}
                    onChange={(e) =>
                      handleMisDetailChange(
                        "days",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    maxLength={3}
                    placeholder="e.g., 0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Secondary Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interest Rate %
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.intRate}
                    onChange={(e) =>
                      handleMisDetailChange(
                        "intRate",
                        e.target.value.replace(/[^0-9.]/g, ""),
                      )
                    }
                    placeholder="Auto from slab"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Compounding Interval
                  </label>
                  <Select
                    options={compoundingOptions}
                    value={compoundingOptions.find(
                      (opt) => opt.value === misDetailForm.compoundingInterval,
                    )}
                    onChange={(option) =>
                      setMisDetailForm((prev) => ({
                        ...prev,
                        compoundingInterval: option?.value || "Monthly",
                      }))
                    }
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Maturity Date
                  </label>
                  <DatePicker
                    value={misDetailForm.maturityDate}
                    disabled
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                    onChange={() => {}}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Maturity Amount
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.maturityAmount}
                    readOnly
                    placeholder="Auto calculated"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interest Post Interval
                  </label>
                  <Select
                    options={compoundingOptions}
                    value={compoundingOptions.find(
                      (opt) => opt.value === misDetailForm.interestPostInterval,
                    )}
                    onChange={(option) =>
                      setMisDetailForm((prev) => ({
                        ...prev,
                        interestPostInterval: option?.value || "Monthly",
                      }))
                    }
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interest Amount
                  </label>
                  <input
                    type="text"
                    value={misDetailForm.interestAmount}
                    readOnly
                    placeholder="Auto calculated"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Linked Account for Interest Post
                  </label>
                  <Select
                    options={misAccountOptions}
                    value={misAccountOptions.find(
                      (opt) => opt.value === misDetailForm.linkedAccountId,
                    )}
                    onChange={(option) =>
                      setMisDetailForm((prev) => ({
                        ...prev,
                        linkedAccountId: option?.value || 0,
                      }))
                    }
                    placeholder="-- Select RD or Saving Account --"
                    className="text-sm"
                  />
                  {/* <input
                  type="text"
                  value={misDetailForm.linkedAccountNo}
                  onChange={(e) =>
                    setMisDetailForm((prev) => ({
                      ...prev,
                      linkedAccountNo: e.target.value,
                    }))
                  }
                  placeholder="Search or Enter Account Number"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                /> */}
                </div>
              </div>

              {/* Opening Entry Fields */}
              {isOpeningEntry && (
                <>
                  <div className="border-t border-gray-200"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Opening Balance
                      </label>
                      <input
                        type="text"
                        value={misDetailForm.openingBalance}
                        onChange={(e) =>
                          setMisDetailForm((prev) => ({
                            ...prev,
                            openingBalance: e.target.value.replace(
                              /[^0-9.]/g,
                              "",
                            ),
                          }))
                        }
                        placeholder="Amount"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Balance Type
                      </label>
                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="misBalanceType"
                            value="Dr"
                            checked={misDetailForm.balanceType === "Dr"}
                            onChange={(e) =>
                              setMisDetailForm((prev) => ({
                                ...prev,
                                balanceType: e.target.value,
                              }))
                            }
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Dr
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="misBalanceType"
                            value="Cr"
                            checked={misDetailForm.balanceType === "Cr"}
                            onChange={(e) =>
                              setMisDetailForm((prev) => ({
                                ...prev,
                                balanceType: e.target.value,
                              }))
                            }
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Cr
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Account Type
                      </label>
                      <select
                        value={misDetailForm.accountType}
                        onChange={(e) =>
                          setMisDetailForm((prev) => ({
                            ...prev,
                            accountType: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                      >
                        <option value="SB">SB</option>
                        <option value="RD">RD</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddMisDetail}
                  className={`px-6 py-2.5 ${
                    editingMisIndex !== null
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  } text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md`}
                >
                  {editingMisIndex !== null ? "Update MIS" : "Add MIS"}
                </button>

                {editingMisIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMisIndex(null);
                      setMisDetailForm({
                        misAccountNo: "",
                        misDate: sessionDate,
                        receiptNo: "",
                        misAmount: "",
                        months: "",
                        days: "",
                        intRate: "",
                        compoundingInterval: "Monthly",
                        maturityDate: "",
                        maturityAmount: "",
                        interestPostInterval: "Monthly",
                        interestAmount: "",
                        openingBalance: "",
                        balanceType: "Dr",
                        accountType: "SB",
                        linkedAccountId: 0,
                        slabId: 0,
                      });
                    }}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MIS Details Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 px-6 py-4">
              <h4 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Added MIS Details
                <span className="ml-2 px-2.5 py-0.5 bg-white/20 rounded-full text-sm">
                  {misDetailsList.length}
                </span>
              </h4>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                      Sr.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      MIS Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      MIS Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      Int Rate %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      Period
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      Maturity Amt
                    </th>
                    {isOpeningEntry && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                        Opening Bal
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {misDetailsList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isOpeningEntry ? 9 : 8}
                        className="px-4 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              No MIS details added yet
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Fill the form above and click "Add MIS" to add
                              details
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    misDetailsList.map((item, index) => (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 transition-colors ${
                          editingMisIndex === index
                            ? "bg-orange-50 hover:bg-orange-50"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {item.misDate}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-900 font-semibold text-right">
                          ₹{item.misAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 text-center">
                          {item.intRate}%
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 text-center whitespace-nowrap">
                          {item.months}M {item.days}D
                        </td>
                        <td className="px-4 py-3.5 text-sm text-green-600 font-semibold text-right">
                          ₹{item.maturityAmount.toLocaleString("en-IN")}
                        </td>
                        {isOpeningEntry && (
                          <td className="px-4 py-3.5 text-sm text-gray-700 text-right">
                            ₹{item.openingBalance.toLocaleString("en-IN")}{" "}
                            <span
                              className={`ml-1 text-xs ${
                                item.balanceType === "Cr"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.balanceType}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditMisDetail(index)}
                              disabled={editingMisIndex !== null}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMisDetail(index)}
                              disabled={editingMisIndex !== null}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render Voucher Detail Tab
  const renderVoucher = () => (
    <div className="space-y-6">
      {/* Payment Mode Selection */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Mode</h4>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              checked={voucherPaymentMode === "byCashGL"}
              onChange={() => setVoucherPaymentMode("byCashGL")}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">
              By Cash/GL Account
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              checked={voucherPaymentMode === "bySaving"}
              onChange={() => setVoucherPaymentMode("bySaving")}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">By Saving</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              checked={voucherPaymentMode === "both"}
              onChange={() => setVoucherPaymentMode("both")}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">Both</span>
          </label>
        </div>
      </div>

      {/* By Cash/GL Account Section */}
      {(voucherPaymentMode === "byCashGL" || voucherPaymentMode === "both") && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h4 className="text-md font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            By Cash/GL Account
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Select Cash/GL Account<span className="text-red-500">*</span>
              </label>
              <Select
                options={debitAccountOptions}
                value={debitAccountOptions.find(
                  (opt) => opt.value === voucherCashGL.cashGLAccountId,
                )}
                onChange={(option) =>
                  setVoucherCashGL({
                    ...voucherCashGL,
                    cashGLAccountId: option?.value || 0,
                  })
                }
                placeholder="-- Select Account --"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {voucherPaymentMode === "both" ? "Cash/GL Amount" : "Amount"}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={voucherCashGL.amount}
                onChange={(e) =>
                  setVoucherCashGL({
                    ...voucherCashGL,
                    amount: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                placeholder="Enter Amount"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* By Saving Section */}
      {(voucherPaymentMode === "bySaving" || voucherPaymentMode === "both") && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <h4 className="text-md font-semibold text-green-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            By Saving
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Saving Product<span className="text-red-500">*</span>
              </label>
              <Select
                options={savingProductOptions}
                value={
                  savingProductOptions.find(
                    (opt) => opt.value === voucherSaving.savingProductId,
                  ) || null
                }
                onChange={async (option) => {
                  const newProductId = option?.value || 0;

                  setSavingAccounts([]); // CLEAR OPTIONS FIRST

                  setVoucherSaving((prev) => ({
                    ...prev,
                    savingProductId: newProductId,
                    savingAccountId: 0, // CLEAR ACCOUNT
                  }));

                  await fetchSavingAccounts(newProductId);
                }}
                placeholder="-- Select Product --"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Account No<span className="text-red-500">*</span>
              </label>
              {/* <input
                type="text"
                value={voucherSaving.savingAccountId}
                onChange={(e) =>
                  setVoucherSaving({
                    ...voucherSaving,
                    savingAccountId: e.target.value,
                  })
                }
                placeholder="Enter Account No"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
              /> */}
              <Select
                options={savingAccountOptions}
                value={
                  savingAccountOptions.find(
                    (opt) => opt.value === voucherSaving.savingAccountId,
                  ) || null
                }
                onChange={(option) => {
                  setVoucherSaving((prev) => ({
                    ...prev,
                    savingAccountId: option?.value || 0,
                  }));
                }}
                placeholder="-- Select Account --"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {voucherPaymentMode === "both" ? "Saving Amount" : "Amount"}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={voucherSaving.amount}
                onChange={(e) =>
                  setVoucherSaving({
                    ...voucherSaving,
                    amount: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                placeholder="Enter Amount"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Total Amount Summary for Both mode */}
      {voucherPaymentMode === "both" && (
        <div className="bg-purple-100 p-4 rounded-lg border border-purple-300">
          <div className="flex justify-between items-center">
            <span className="text-purple-800 font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-purple-900">
              ₹{" "}
              {(
                parseFloat(voucherCashGL.amount || "0") +
                parseFloat(voucherSaving.amount || "0")
              ).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // Render Nominee Tab
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
              }
            }}
            className="w-5 h-5 text-purple-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Nominee Detail Required
          </span>
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

          {nominees.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No nominees added yet. Click Add Nominee to add one.
              </p>
            </div>
          ) : (
            nominees.map((nominee, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-green-800">
                    Nominee {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveNominee(index)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nominee Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nominee.nomineeName}
                      onChange={(e) =>
                        handleNomineeChange(
                          index,
                          "nomineeName",
                          e.target.value,
                        )
                      }
                      placeholder="Enter Nominee Name"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth<span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={nominee.dateOfBirth}
                      onChange={(val) => handleNomineeChange(index, "dateOfBirth", val)}
                      max={sessionDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Relation<span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={relationOptions}
                      value={relationOptions.find(
                        (opt) =>
                          opt.value === nominee.relationWithAccountHolder,
                      )}
                      onChange={(option) =>
                        handleNomineeChange(
                          index,
                          "relationWithAccountHolder",
                          option?.value || 0,
                        )
                      }
                      placeholder="Select Relation"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      value={nominee.address}
                      onChange={(e) =>
                        handleNomineeChange(index, "address", e.target.value)
                      }
                      rows={2}
                      placeholder="Enter Address"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nominee Date
                    </label>
                    <DatePicker
                      value={nominee.nomineeDate}
                      onChange={(val) => handleNomineeChange(index, "nomineeDate", val)}
                      min={sessionMinDate}
                      max={sessionMaxDate}
                      workingDate={sessionDate}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer pt-8">
                      <input
                        type="checkbox"
                        checked={nominee.isMinor}
                        onChange={(e) =>
                          handleNomineeChange(
                            index,
                            "isMinor",
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Is Minor?
                      </span>
                    </label>
                  </div>

                  {nominee.isMinor && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Guardian Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nominee.guardianName}
                        onChange={(e) =>
                          handleNomineeChange(
                            index,
                            "guardianName",
                            e.target.value,
                          )
                        }
                        placeholder="Enter Guardian Name"
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                      />
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
                    {isEditMode ? "Edit" : "Create"} {showMIS ? "MIS" : "FD"}{" "}
                    Account
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Fill in the details to {isEditMode ? "update" : "create"} a
                    new {showMIS ? "MIS" : "FD"} account
                  </p>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/fd-acc-info")
                      : navigate("/account-operations")
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
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
                onErrorClick={(fieldName, tab) => {
                  setActiveTab(tab);
                }}
                onClose={() => setShowValidationSummary(false)}
              />
            )}

            {/* Main Form */}
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
                {(activeTab === "fdDetail" || activeTab === "misDetail") &&
                  renderFdDetail()}
                {activeTab === "nominee" && renderNominee()}
                {activeTab === "voucher" && renderVoucher()}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditMode ? "Update" : "Save"}{" "}
                        {showMIS ? "MIS" : "FD"} Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    ></DashboardLayout>
  );
};

export default FDAccountMaster;
