// pages/AccountMasters/SavingAccount/SavingAccountMaster.tsx
import React, { useState, useEffect, useRef } from "react";
import { encryptId, decryptId } from "../../../utils/encryption";
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
  Upload,
  X,
  Image as ImageIcon,
  IndianRupee,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import savingAccountService, {
  CompleteSavingAccountDTO,
} from "../../../services/accountMasters/savingaccount/savingaccountapi";
import { useFormValidation } from "../../../services/Validations/accountMasters/savingaccmastervalidations";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";

interface SavingProduct {
  id: number;
  productName: string;
  productCode: string;
}

interface Relation {
  relationId: number;
  description: string;
}

interface DebitAccount {
  accId: number;
  accountNumber: string;
  accountName: string;
}

const SavingAccountMaster = () => {
  const navigate = useNavigate();
  const { accountId: encryptedId } = useParams<{ accountId?: string }>();
  const accountId = encryptedId ? decryptId(encryptedId) : null;
  const isEditMode = !!accountId;
  const user = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Validation hook
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();
  // Add this near your other state declarations
  const [memberDetailsData, setMemberDetailsData] = useState({
    memberName: "",
    gender: 0,
    dateOfBirth: "",
    mobileNo: "",
    emailId: "",
    addressLine1: "",
    relativeName: "",
  });

  // Handle member details field changes
  const handleMemberDetailsChange = (field: string, value: any) => {
    setMemberDetailsData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Group errors by field
  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, any[]>);

  // Dropdown data
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);

  // Input mode toggler
  const [inputMode, setInputMode] = useState<"account" | "membership">(
    "account"
  );

  // Form data matching CommonAccMasterDTO
  const [formData, setFormData] = useState({
    accountMasterDTO: {
      branchId: user.branchid,
      savingProductId: 0,
      accountOpeningDate: commonservice.getTodaysDate(),
      memberType: 2,
      memberAccountNo: "",
      membershipNo: "",
      savingPrefix: "",
      suffix: "",
      openingBalance: "",
      balanceType: "Cr",
      operationType: "Single",
      addedUsing: "A",
    },
    memberDetails: null as any,
  });

  const [jointHolders, setJointHolders] = useState<any[]>([]);
  const [nominees, setNominees] = useState<any[]>([]);
  const [isJointAccount, setIsJointAccount] = useState(false);
  const [isNomineeRequired, setIsNomineeRequired] = useState(false);

  // Voucher data
  const [voucherData, setVoucherData] = useState({
    voucherDate: commonservice.getTodaysDate(),
    depositAmount: "",
    byCash: "",
    transferDetails: "",
    debitAccountId: 0,
    narration: "",
  });

  // Joint withdrawal config
  const [jointWithdrawalConfig, setJointWithdrawalConfig] = useState({
    minRequiredPersons: 1,
    isJointHolderCompulsory: false,
  });

  // Picture and signature states
  const [pictureFile, setPictureFile] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);

  // Refs
  const memberAccountNoRef = useRef<HTMLInputElement>(null);
  const debitAccountRef = useRef<any>(null);

  // Load dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, relationsRes, debitAccountsRes] = await Promise.all(
          [
            commonservice.fetch_saving_products(user.branchid),
            commonservice.relation_info(),
            commonservice.general_accmasters_info(user.branchid),
          ]
        );

        setSavingProducts(productsRes.data || []);
        setRelations(relationsRes.data || []);
        setDebitAccounts(debitAccountsRes.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchData();
  }, [user.branchid]);

  const handleSuffixChange = async (value: number) => {
    const response = await commonservice.saving_suffix_exists(
      user.branchid,
      formData.accountMasterDTO.savingProductId,
      value,
      accountId ?? 0
    );
    if (response.success) {
      Swal.fire(
        "Warning",
        "Suffix already exists for this product. Please choose a different suffix.",
        "warning"
      );
      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: { ...prev.accountMasterDTO, suffix: "" },
      }));
      return false;
    }
  };

  // Handle numeric input with 2 decimal places
  const handleNumericChange = (
    field: string,
    value: string,
    isVoucher = false
  ) => {
    // Allow only numbers and decimal point
    let numericValue = value.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = numericValue.split(".");
    if (parts.length > 2) {
      numericValue = parts[0] + "." + parts.slice(1).join("");
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      numericValue = parts[0] + "." + parts[1].substring(0, 2);
    }

    if (isVoucher) {
      setVoucherData((prev) => ({
        ...prev,
        [field]: numericValue,
      }));
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
    memberType: number = 0
  ) => {
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
      setPictureFile(null);
      setSignatureFile(null);
    }
  };
  const urlToFile = async (url: string, fileName: string, mimeType: string = 'image/jpeg'): Promise<File> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error('Error converting URL to File:', error);
    return null as any;
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
          ? await savingAccountService.getMemberByAccountNo(
              user.branchid,
              searchValue
            )
          : await savingAccountService.getMemberByMembershipNo(
              user.branchid,
              searchValue,
              formData.accountMasterDTO.memberType
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
          dateOfBirth: response.data.dateOfBirth
            ? response.data.dateOfBirth.split("T")[0]
            : "",
          mobileNo: response.data.phoneNo || "",
          emailId: response.data.emailId || "",
          addressLine1: response.data.addressLine1 || "",
          relativeName: response.data.relativeName || "",
        });

        const pic_and_sign_info =
          await commonservice.fetch_pic_and_sign_extension(
            response.data.memberBranchId,
            response.data.memberId
          );
          console.log(pic_and_sign_info);
        // Load picture and signature
        if (pic_and_sign_info.data.memberPicExt) {
          const fileName = `member_${response.data.memberId}_picture${pic_and_sign_info.data.memberPicExt}`;
          const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
          const photoUrl =
            commonservice.getImageUrl(fileName, "Pictures") + cacheBuster;
            const picFile = await urlToFile(photoUrl, fileName, 'image/'+ pic_and_sign_info.data.memberPicExt.replace('.',''));
          setPictureFile({
            id: Date.now(),
            name: "picture",
            preview: photoUrl,
            file: picFile,
          });
        }
        if (pic_and_sign_info.data.memberSignExt) {
          const fileName = `member_${response.data.memberId}_signature${pic_and_sign_info.data.memberSignExt}`;
          const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
          const signUrl =
            commonservice.getImageUrl(fileName, "Signatures") + cacheBuster;
            const signFile = await urlToFile(signUrl, fileName, 'image/'+ pic_and_sign_info.data.memberSignExt.replace('.',''));
          setSignatureFile({
            id: Date.now(),
            name: "signature",
            preview: signUrl,
            file: signFile,
          });
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
        "error"
      );
    }
  };

  // Handle product change
  const handleProductChange = async (selectedOption: any) => {
    if (selectedOption) {
      const response = await commonservice.getSavingPrefixAndSuffix(
        user.branchid,
        selectedOption.value
      );
      let prefix = response.data.split("-")[0];
      let suffix = response.data.split("-")[1];

      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          savingProductId: selectedOption.value,
          savingPrefix: prefix || "",
          suffix: suffix || "",
        },
      }));
    }
  };

  // Handle basic field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      accountMasterDTO: {
        ...prev.accountMasterDTO,
        [field]: value,
      },
    }));
  };

  // Handle joint account toggle
  const handleJointAccountToggle = (checked: boolean) => {
    setIsJointAccount(checked);
    if (!checked) {
      setJointHolders([]);
      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          operationType: "Single",
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        accountMasterDTO: {
          ...prev.accountMasterDTO,
          operationType: "Joint",
        },
      }));
    }
  };

  // Add joint holder
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
        aadhaarCardNo: "",
        panCardNo: "",
        emailId: "",
        jointAccHolderAccountNumber: "",
      },
    ]);
  };

  // Remove joint holder
  const handleRemoveJointHolder = (index: number) => {
    setJointHolders(jointHolders.filter((_, i) => i !== index));
  };

  // Update joint holder field
  const handleJointHolderChange = (
    index: number,
    field: string,
    value: any
  ) => {
    setJointHolders(
      jointHolders.map((holder, i) =>
        i === index ? { ...holder, [field]: value } : holder
      )
    );
  };

  // Search joint holder
  const handleJointHolderSearch = async (index: number) => {
    const accountNo = jointHolders[index].jointHolderAccountNo;

    if (!accountNo) {
      Swal.fire(
        "Warning",
        "Please enter Joint Holder Account Number",
        "warning"
      );
      return;
    }

    try {
      Swal.fire({
        title: "Searching Joint Holder...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await savingAccountService.getMemberByAccountNo(
        user.branchid,
        accountNo
      );

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
      Swal.fire(
        "Error",
        error.message || "Failed to fetch joint holder",
        "error"
      );
    }
  };

  // Add nominee
  const handleAddNominee = () => {
    setNominees([
      ...nominees,
      {
        branchId: user.branchid,
        nomineeName: "",
        dateOfBirth: commonservice.getTodaysDate(),
        relationWithAccountHolder: 0,
        address: "",
        nomineeDate: commonservice.getTodaysDate(),
        guardianName: "",
        isMinor: false,
      },
    ]);
  };

  // Remove nominee
  const handleRemoveNominee = (index: number) => {
    setNominees(nominees.filter((_, i) => i !== index));
  };

  // Update nominee field
  const handleNomineeChange = (index: number, field: string, value: any) => {
    setNominees(
      nominees.map((nominee, i) => {
        if (i === index) {
          const updated = { ...nominee, [field]: value };

          // Auto-detect minor status based on age
          if (field === "isMinor" && !value) {
            updated.guardianName = "";
          }
          return updated;
        }
        return nominee;
      })
    );
  };
  useEffect(() => {
    const loadExistingAccount = async () => {
      if (isEditMode && accountId) {
        try {
          Swal.fire({
            title: "Loading Account Data...",
            text: "Please wait",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const response = await savingAccountService.getSavingAccountById(
            Number(accountId),
            user.branchid
          );

          if (response.success && response.data) {
            const data = response.data;
            const addedUsing = data.accountMasterDTO.addedUsing;
            setInputMode(addedUsing === "A" ? "account" : "membership");
            setFormData({
              accountMasterDTO: {
                branchId: data.accountMasterDTO.branchId,
                savingProductId: data.accountMasterDTO.generalProductId || 0,
                accountOpeningDate:
                  data.accountMasterDTO.accOpeningDate?.split("T")[0] ||
                  commonservice.getTodaysDate(),
                memberType: addedUsing == "NM" ? 1 : 2,
                memberAccountNo: data.accountMasterDTO.accountNumber || "",
                membershipNo: data.accountMasterDTO.membershipNo || "",
                savingPrefix: data.accountMasterDTO.accPrefix || "",
                suffix: data.accountMasterDTO.accSuffix?.toString() || "",
                openingBalance: data.openingBalance?.toString() || "",
                balanceType: data.openingBalanceType?.toString() || "Cr",
                operationType:
                  data.accountMasterDTO.isJointAccount === 1
                    ? "Joint"
                    : "Single",
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
                gender: data.accountMasterDTO.gender || 1,
                dateOfBirth: data.accountMasterDTO.dob?.split("T")[0] || "",
                mobileNo: data.accountMasterDTO.phoneNo1 || "",
                emailId: data.accountMasterDTO.email || "",
                addressLine1: data.accountMasterDTO.addressLine || "",
                relativeName: data.accountMasterDTO.relativeName || "",
              });
            }

            // Set joint account holders
            if (
              data.jointAccountInfoDTO &&
              data.jointAccountInfoDTO.length > 0
            ) {
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
                  aadhaarCardNo: "",
                  panCardNo: "",
                  emailId: "",
                  jointAccHolderAccountNumber:
                    joint.jointAccHolderAccountNumber,
                }))
              );

              // Set withdrawal config if exists
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

            // Set nominees
            if (data.accNomineeDTO && data.accNomineeDTO.length > 0) {
              setIsNomineeRequired(true);
              setNominees(
                data.accNomineeDTO.map((nominee: any) => ({
                  branchId: nominee.branchId,
                  nomineeName: nominee.nomineeName,
                  dateOfBirth:
                    nominee.nomineeDob?.split("T")[0] ||
                    commonservice.getTodaysDate(),
                  relationWithAccountHolder: nominee.relationWithAccHolder,
                  address: nominee.addressLine || "",
                  nomineeDate:
                    nominee.nomineeDate?.split("T")[0] ||
                    commonservice.getTodaysDate(),
                  guardianName: nominee.nameOfGuardian || "",
                  isMinor: nominee.isMinor === 1,
                }))
              );
            }

            // Load images
            if (data.accountDocDetailsDTO) {
              const fileName = `account_${accountId}_picture${data.accountDocDetailsDTO.picExt}`;
              const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
              const photoUrl =
                commonservice.getAccountImageUrl(fileName, "Pictures") +
                cacheBuster;
              if (data.accountDocDetailsDTO.pictureUrl) {
                setPictureFile({
                  id: Date.now(),
                  name: "picture",
                  preview: photoUrl,
                  file: null,
                });
              }
              if (data.accountDocDetailsDTO.signatureUrl) {
                const fileName = `account_${accountId}_signature${data.accountDocDetailsDTO.signExt}`;
                const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
                const signUrl =
                  commonservice.getAccountImageUrl(fileName, "Signatures") +
                  cacheBuster;
                setSignatureFile({
                  id: Date.now() + 1,
                  name: "signature",
                  preview: signUrl,
                  file: null,
                });
              }
            }
            Swal.close();
          } else {
            throw new Error("Account not found");
          }
        } catch (error: any) {
          console.error("Error fetching account:", error);
          Swal.fire(
            "Error",
            error.message || "Failed to load account data",
            "error"
          );
          navigate("/saving-acc-info");
        }
      }
    };

    if (isEditMode && accountId && user.branchid) {
      loadExistingAccount();
    }
  }, [accountId, isEditMode, user.branchid, navigate]);

  // Handle picture upload
  const handlePictureSelect = (file: any) => {
    setPictureFile(file);
  };

  // Handle signature upload
  const handleSignatureSelect = (file: any) => {
    setSignatureFile(file);
  };

  // Remove picture
  const handleRemovePicture = () => {
    setPictureFile(null);
  };

  // Remove signature
  const handleRemoveSignature = () => {
    setSignatureFile(null);
  };

  // Handle submit with validation
  const handleSubmit = async () => {
    const validation = validateForm(
      formData.accountMasterDTO,
      inputMode,
      memberDetailsData,
      formData.memberDetails,
      isJointAccount,
      jointHolders,
      isNomineeRequired,
      nominees,
      voucherData,
      pictureFile?.preview || "",
      pictureFile?.file || null,
      signatureFile?.preview || "",
      signatureFile?.file || null
    );

    if (!validation.isValid) {
      setShowValidationSummary(true);
      const tabPriority = ["basic", "joint", "voucher", "nominee", "images"];
      for (const tab of tabPriority) {
        if (
          validation.errorsByTab[tab] &&
          validation.errorsByTab[tab].length > 0
        ) {
          setActiveTab(tab);
          break;
        }
      }
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        html: `Please fix <strong>${validation.errors.length}</strong> validation errors before submitting.`,
      });
      return;
    }

    setLoading(true);
    try {
      const getFileExtension = (file: File | null) => {
        if (!file) return "";
        return file.name.split(".").pop() || "";
      };
      
      const dto: CompleteSavingAccountDTO = {
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
          generalProductId: formData.accountMasterDTO.savingProductId,
          accPrefix: formData.accountMasterDTO.savingPrefix,
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
          addedUsing:
            formData.accountMasterDTO.memberAccountNo != ""
              ? "A"
              : formData.accountMasterDTO.membershipNo != "" &&
                formData.accountMasterDTO.memberType === 2
              ? "PM"
              : "NM",
        },

        voucher: {
          id: 0,
          brID: user.branchid,
          voucherDate: voucherData.voucherDate,
          debitAccountId: voucherData.debitAccountId,
          openingAmount:
            parseFloat(formData.accountMasterDTO.openingBalance) || 0,
          totalDebit: parseFloat(voucherData.depositAmount) || 0,
          voucherNarration: voucherData.narration,
          openingBalanceType: formData.accountMasterDTO.balanceType,
        },

        accountDocDetailsDTO: {
          branchId: user.branchid,
          accountId: 0,
          picExt: getFileExtension(pictureFile?.file || null),
          signExt: getFileExtension(signatureFile?.file || null),
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

        jointAccountInfoDTO: jointHolders.map((holder) => ({
          branchId: user.branchid,
          accountName: holder.jointHolderName || "",
          relationWithAccHolder: holder.relationWithMainHolder,
          dob: holder.dateOfBirth || "",
          addressLine: holder.address || "",
          gender: parseInt(holder.gender) || 0,
          memberId: 0,
          memberBrId: user.branchid,
          jointWithAccountId: 0,
          jointAccHolderAccountNumber: holder.jointHolderAccountNo || "",
        })),

        jointAccountWithdrawalInfoDTO: isJointAccount
          ? {
              branchId: user.branchid,
              accountId: isEditMode ? Number(accountId!) : 0,
              minimumPersonsRequiredForWithdrawal:
                jointWithdrawalConfig.minRequiredPersons,
              jointAccountHolderCompulsoryForWithdrawal:
                jointWithdrawalConfig.isJointHolderCompulsory ? 1 : 0,
            }
          : undefined,
      };
      const response = isEditMode
        ? await savingAccountService.updateSavingAccount(
            dto,
            pictureFile?.file,
            signatureFile?.file
          )
        : await savingAccountService.createSavingAccount(
            dto,
            pictureFile?.file,
            signatureFile?.file
          );

      if (response.success) {
        clearErrors();
        setShowValidationSummary(false);
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Saving Account ${
            isEditMode ? "updated" : "created"
          } successfully!`,
          timer: 1500,
          showConfirmButton: false,
        });
        if (isEditMode) {
          navigate("/saving-acc-info");
          return;
        }
        handleReset();
      } else {
        throw new Error(
          response.message ||
            `Failed to ${isEditMode ? "update" : "save"} account`
        );
      }
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.message || `Failed to ${isEditMode ? "update" : "save"} account`,
        "error"
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
        savingProductId: 0,
        accountOpeningDate: commonservice.getTodaysDate(),
        memberType: 2,
        memberAccountNo: "",
        membershipNo: "",
        savingPrefix: "",
        suffix: "",
        openingBalance: "",
        balanceType: "Cr",
        operationType: "Single",
        addedUsing: "A",
      },
      memberDetails: null,
    });

    setVoucherData({
      voucherDate: commonservice.getTodaysDate(),
      depositAmount: "",
      byCash: "",
      transferDetails: "",
      debitAccountId: 0,
      narration: "",
    });

    setJointHolders([]);
    setNominees([]);
    setPictureFile(null);
    setSignatureFile(null);
    setIsJointAccount(false);
    setIsNomineeRequired(false);
    setInputMode("account");
    setActiveTab("basic");
    clearErrors();
    setShowValidationSummary(false);
  };

  // Prepare options for dropdowns
  const savingProductOptions = savingProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));

  const relationOptions = relations.map((r) => ({
    value: r.relationId,
    label: r.description,
  }));

  const debitAccountOptions = debitAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  // Group errors by tab
  const errorsByTab = errors.reduce((acc, error) => {
    if (!acc[error.tab]) acc[error.tab] = [];
    acc[error.tab].push(error);
    return acc;
  }, {} as Record<string, any[]>);

  // Get tab class name with error indicators
  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const baseClassName = `flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;

    if (activeTab === tabId) {
      return `${baseClassName} border-blue-500 text-blue-600 bg-blue-50`;
    } else if (hasTabErrors) {
      return `${baseClassName} border-red-300 text-red-600 hover:bg-red-50`;
    } else {
      return `${baseClassName} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
    }
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "joint", label: "Joint Holders", icon: Users },
    { id: "voucher", label: "Voucher", icon: FileText },
    { id: "nominee", label: "Nominee", icon: UserPlus },
    { id: "images", label: "Images", icon: ImageIcon },
  ];

  // Render Basic Info Tab
  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Core Product & Membership Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Saving Product */}
          <FormField
            name="savingProductId"
            label="Saving Product"
            required
            errors={errorsByField.savingProductId || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
          >
            <Select
              options={savingProductOptions}
              value={savingProductOptions.find(
                (opt) => opt.value === formData.accountMasterDTO.savingProductId
              )}
              onChange={handleProductChange}
              autoFocus
              isDisabled={isEditMode}
              placeholder="Select Saving Product"
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
            <input
              type="date"
              value={formData.accountMasterDTO.accountOpeningDate}
              onChange={(e) =>
                commonservice.handleDateChange(
                  e.target.value,
                  (val) => handleFieldChange("accountOpeningDate", val),
                  "accountOpeningDate"
                )
              }
              // onChange={(e) =>
              //   handleFieldChange("accountOpeningDate", e.target.value)
              // }
              readOnly={isEditMode}
              max={commonservice.getTodaysDate()}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
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
                    formData.accountMasterDTO.memberType
                  )
                }
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "account"
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Account Number
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInputModeChange(
                    "membership",
                    formData.accountMasterDTO.memberType
                  )
                }
                disabled={
                  isEditMode && formData.accountMasterDTO.membershipNo === ""
                }
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === "membership"
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Membership Number
              </button>
            </div>
          </div>

          {/* Member Type - Show only when Membership mode */}
          {inputMode === "membership" && (
            <div className="space-y-2 md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-500" />
                  Member Type
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="memberType"
                    disabled={isEditMode}
                    onClick={() =>
                      handleInputModeChange(
                        "membership",
                        formData.accountMasterDTO.memberType
                      )
                    }
                    value={2}
                    checked={formData.accountMasterDTO.memberType === 2}
                    onChange={(e) =>
                      handleFieldChange("memberType", parseInt(e.target.value))
                    }
                    className="w-4 h-4 text-blue-600"
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
                    onClick={() =>
                      handleInputModeChange(
                        "membership",
                        formData.accountMasterDTO.memberType
                      )
                    }
                    checked={formData.accountMasterDTO.memberType === 1}
                    onChange={(e) =>
                      handleFieldChange("memberType", parseInt(e.target.value))
                    }
                    className="w-4 h-4 text-blue-600"
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
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMemberSearch}
                  disabled={isEditMode}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                >
                  Search Member
                </button>
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
              value={formData.accountMasterDTO.savingPrefix}
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
                onChange={(e) => {
                  handleNumericChange("suffix", e.target.value),
                    handleSuffixChange(Number(e.target.value));
                }}
                placeholder="Enter Suffix"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </FormField>
          </div>

          {/* Opening Balance */}
          <FormField
            name="openingBalance"
            label="Opening Balance"
            errors={errorsByField.openingBalance || []}
            icon={<IndianRupee className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={formData.accountMasterDTO.openingBalance}
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
        </div>
      </div>

      {formData.memberDetails && (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Member Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Member Name */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Name
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={memberDetailsData.memberName}
                onChange={(e) =>
                  handleMemberDetailsChange("memberName", e.target.value)
                }
                onBlur={() => markFieldTouched("memberName")}
                placeholder="Enter Name"
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.memberName
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.memberName && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.memberName[0]?.message}
                </p>
              )}
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
                onBlur={() => markFieldTouched("relativeName")}
                placeholder="Enter Relative Name"
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.relativeName
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.relativeName && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.relativeName[0]?.message}
                </p>
              )}
            </div>

            {/* Gender - DROPDOWN */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Gender
                <span className="text-red-500">*</span>
              </label>
              <select
                value={memberDetailsData.gender}
                onChange={(e) =>
                  handleMemberDetailsChange("gender", e.target.value)
                }
                onBlur={() => markFieldTouched("gender")}
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.gender
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              >
                <option value="">Select Gender</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
                <option value="3">Other</option>
              </select>
              {errorsByField.gender && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.gender[0]?.message}
                </p>
              )}
            </div>

            {/* Date of Birth - DATE FIELD */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={memberDetailsData.dateOfBirth}
                onChange={(e) =>
                  handleMemberDetailsChange("dateOfBirth", e.target.value)
                }
                onBlur={() => markFieldTouched("dateOfBirth")}
                max={commonservice.getTodaysDate()}
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.dateOfBirth
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.dateOfBirth && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.dateOfBirth[0]?.message}
                </p>
              )}
            </div>

            {/* Mobile No */}
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
                onBlur={() => markFieldTouched("mobileNo")}
                placeholder="Enter Mobile Number"
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.mobileNo
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.mobileNo && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.mobileNo[0]?.message}
                </p>
              )}
            </div>

            {/* Email */}
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
                onBlur={() => markFieldTouched("emailId")}
                placeholder="Enter Email Address"
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errorsByField.emailId
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.emailId && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.emailId[0]?.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                value={memberDetailsData.addressLine1}
                onChange={(e) =>
                  handleMemberDetailsChange("addressLine1", e.target.value)
                }
                onBlur={() => markFieldTouched("addressLine1")}
                rows={3}
                placeholder="Enter Address"
                className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none ${
                  errorsByField.addressLine1
                    ? "border-red-500 focus:border-red-500 bg-red-50"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {errorsByField.addressLine1 && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorsByField.addressLine1[0]?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Joint Holders Tab
  // Render Joint Holders Tab - WITH VALIDATION DISPLAY
  const renderJointHolders = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isJointAccount}
            onChange={(e) => handleJointAccountToggle(e.target.checked)}
            className="w-5 h-5 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            This is a Joint Account
          </span>
        </label>
      </div>

      {isJointAccount && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Joint Account Holders
            </h3>
            <button
              type="button"
              onClick={handleAddJointHolder}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Joint Holder
            </button>
          </div>

          {jointHolders.map((holder, index) => {
            // Get errors for this joint holder
            const holderErrors = errors.filter((err) =>
              err.field.includes(`jointHolders[${index}]`)
            );

            return (
              <div
                key={index}
                className={`bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 transition-all ${
                  holderErrors.length > 0
                    ? "border-red-300"
                    : "border-purple-200"
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-purple-800">
                    Joint Holder #{index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveJointHolder(index)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Joint Holder Account Number */}
                  <div className="space-y-1 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Joint Holder Member A/C No.
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={holder.jointHolderAccountNo}
                          onChange={(e) =>
                            handleJointHolderChange(
                              index,
                              "jointHolderAccountNo",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            markFieldTouched(
                              `jointHolders[${index}].jointHolderAccountNo`
                            )
                          }
                          placeholder="Enter Member Account Number"
                          className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                            errorsByField[
                              `jointHolders[${index}].jointHolderAccountNo`
                            ]
                              ? "border-red-500 focus:border-red-500 bg-red-50"
                              : "border-gray-200 focus:border-blue-500"
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJointHolderSearch(index)}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                      >
                        Search
                      </button>
                    </div>
                    {errorsByField[
                      `jointHolders[${index}].jointHolderAccountNo`
                    ] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[
                            `jointHolders[${index}].jointHolderAccountNo`
                          ][0]?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Joint Holder Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Joint Holder Name
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={holder.jointHolderName || ""}
                      onChange={(e) =>
                        handleJointHolderChange(
                          index,
                          "jointHolderName",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        markFieldTouched(
                          `jointHolders[${index}].jointHolderName`
                        )
                      }
                      placeholder="Enter Joint Holder Name"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                        errorsByField[`jointHolders[${index}].jointHolderName`]
                          ? "border-red-500 focus:border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[
                      `jointHolders[${index}].jointHolderName`
                    ] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[
                            `jointHolders[${index}].jointHolderName`
                          ][0]?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Relation */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Relation
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={relationOptions}
                      value={relationOptions.find(
                        (opt) => opt.value === holder.relationWithMainHolder
                      )}
                      onChange={(option) =>
                        handleJointHolderChange(
                          index,
                          "relationWithMainHolder",
                          option?.value || 0
                        )
                      }
                      onBlur={() =>
                        markFieldTouched(
                          `jointHolders[${index}].relationWithMainHolder`
                        )
                      }
                      placeholder="Select Relation"
                      className="text-sm"
                    />
                    {errorsByField[
                      `jointHolders[${index}].relationWithMainHolder`
                    ] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[
                            `jointHolders[${index}].relationWithMainHolder`
                          ][0]?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={holder.dateOfBirth || ""}
                      onChange={(e) =>
                        handleJointHolderChange(
                          index,
                          "dateOfBirth",
                          e.target.value || 0
                        )
                      }
                      onBlur={() => markFieldTouched("dateOfBirth")}
                      max={commonservice.getTodaysDate()}
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                        errorsByField.dateOfBirth
                          ? "border-red-500 focus:border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {/* <input
                      type="text"
                      value={holder.dateOfBirth || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 outline-none"
                      placeholder="Auto-filled"
                      max={commonservice.getTodaysDate()}
                    /> */}
                  </div>

                  {/* Mobile No */}

                  {/* Address */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      value={holder.address || ""}
                      rows={2}
                      onChange={(e) =>
                        handleJointHolderChange(
                          index,
                          "address",
                          e.target.value || 0
                        )
                      }
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 outline-none resize-none"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Joint Withdrawal Configuration */}
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
                  min="1"
                  value={jointWithdrawalConfig.minRequiredPersons}
                  onChange={(e) =>
                    setJointWithdrawalConfig({
                      ...jointWithdrawalConfig,
                      minRequiredPersons: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jointWithdrawalConfig.isJointHolderCompulsory}
                    onChange={(e) =>
                      setJointWithdrawalConfig({
                        ...jointWithdrawalConfig,
                        isJointHolderCompulsory: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Joint Holder Compulsory
                  </span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render Voucher Tab
  const renderVoucher = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Voucher Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Voucher Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Voucher Date
              </span>
            </label>
            <input
              type="date"
              value={voucherData.voucherDate}
              readOnly
              onChange={(e) =>
                commonservice.handleDateChange(
                  e.target.value,
                  (val) => setVoucherData({ ...voucherData, voucherDate: val }),
                  "accountOpeningDate"
                )
              }
              // onChange={(e) =>
              //   setVoucherData({ ...voucherData, voucherDate: e.target.value })
              // }
              max={commonservice.getTodaysDate()}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          {/* Debit Account */}
          <FormField
            name="debitAccountId"
            label="Debit Account"
            errors={errorsByField.debitAccountId || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
          >
            <Select
              ref={debitAccountRef}
              options={debitAccountOptions}
              value={debitAccountOptions.find(
                (opt) => opt.value === voucherData.debitAccountId
              )}
              onChange={(option) =>
                setVoucherData({
                  ...voucherData,
                  debitAccountId: option?.value || 0,
                })
              }
              placeholder="Select Debit Account"
              className="text-sm"
            />
          </FormField>

          {/* Deposit Amount */}
          <FormField
            name="depositAmount"
            label="Deposit Amount"
            errors={errorsByField.depositAmount || []}
            icon={<IndianRupee className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={voucherData.depositAmount}
              onChange={(e) =>
                handleNumericChange("depositAmount", e.target.value, true)
              }
              placeholder="Enter Deposit Amount"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Voucher Narration
            </label>
            <textarea
              value={voucherData.narration || ""}
              onChange={(e) =>
                setVoucherData({
                  ...voucherData,
                  narration: e.target.value,
                })
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Voucher Narration"
            />
          </div>

          {/* By Cash
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-blue-500" />
                By Cash
              </span>
            </label>
            <input
              type="text"
              value={voucherData.byCash}
              onChange={(e) =>
                handleNumericChange("byCash", e.target.value, true)
              }
              placeholder="Cash Amount"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div> */}

          {/* Transfer Details */}
        </div>
      </div>
    </div>
  );

  // Render Nominee Tab
  // Render Nominee Tab - WITH VALIDATION MESSAGES
  // FIXED: Render Nominee Tab with proper validation messages
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
            className="w-5 h-5 text-blue-600"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Nominee
            </button>
          </div>

          {nominees.map((nominee, index) => {
            // Get errors for this nominee
            const nomineeErrors = errors.filter((err) =>
              err.field.includes(`nominees[${index}]`)
            );

            return (
              <div
                key={index}
                className={`bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 transition-all ${
                  nomineeErrors.length > 0
                    ? "border-red-300"
                    : "border-green-200"
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-green-800">
                    Nominee #{index + 1}
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
                  {/* Nominee Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nominee Name
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nominee.nomineeName}
                      onChange={(e) =>
                        handleNomineeChange(
                          index,
                          "nomineeName",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        markFieldTouched(`nominees[${index}].nomineeName`)
                      }
                      placeholder="Enter Nominee Name"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                        errorsByField[`nominees[${index}].nomineeName`]
                          ? "border-red-500 focus:border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`nominees[${index}].nomineeName`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[`nominees[${index}].nomineeName`][0]
                            ?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={nominee.dateOfBirth}
                      onChange={(e) =>
                        handleNomineeChange(
                          index,
                          "dateOfBirth",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        markFieldTouched(`nominees[${index}].dateOfBirth`)
                      }
                      max={commonservice.getTodaysDate()}
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                        errorsByField[`nominees[${index}].dateOfBirth`]
                          ? "border-red-500 focus:border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`nominees[${index}].dateOfBirth`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[`nominees[${index}].dateOfBirth`][0]
                            ?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Relation */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Relation
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={relationOptions}
                      value={relationOptions.find(
                        (opt) => opt.value === nominee.relationWithAccountHolder
                      )}
                      onChange={(option) =>
                        handleNomineeChange(
                          index,
                          "relationWithAccountHolder",
                          option?.value || 0
                        )
                      }
                      onBlur={() =>
                        markFieldTouched(
                          `nominees[${index}].relationWithAccountHolder`
                        )
                      }
                      placeholder="Select Relation"
                      className="text-sm"
                    />
                    {errorsByField[
                      `nominees[${index}].relationWithAccountHolder`
                    ] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[
                            `nominees[${index}].relationWithAccountHolder`
                          ][0]?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nominee.address}
                      onChange={(e) =>
                        handleNomineeChange(index, "address", e.target.value)
                      }
                      onBlur={() =>
                        markFieldTouched(`nominees[${index}].address`)
                      }
                      placeholder="Enter Address"
                      className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                        errorsByField[`nominees[${index}].address`]
                          ? "border-red-500 focus:border-red-500 bg-red-50"
                          : "border-gray-200 focus:border-blue-500"
                      }`}
                    />
                    {errorsByField[`nominees[${index}].address`] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {
                          errorsByField[`nominees[${index}].address`][0]
                            ?.message
                        }
                      </p>
                    )}
                  </div>

                  {/* Nominee Date */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nominee Date
                    </label>
                    <input
                      type="date"
                      value={nominee.nomineeDate}
                      onChange={(e) =>
                        handleNomineeChange(
                          index,
                          "nomineeDate",
                          e.target.value
                        )
                      }
                      max={commonservice.getTodaysDate()}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  {/* Is Minor Checkbox - NEW */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nominee.isMinor}
                        onChange={(e) =>
                          handleNomineeChange(
                            index,
                            "isMinor",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Is Minor (Below 18 years)
                      </span>
                    </label>
                  </div>

                  {/* Guardian Name - Only show if minor - NEW */}
                  {nominee.isMinor && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Guardian Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nominee.guardianName}
                        onChange={(e) =>
                          handleNomineeChange(
                            index,
                            "guardianName",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          markFieldTouched(`nominees[${index}].guardianName`)
                        }
                        placeholder="Enter Guardian Name"
                        className={`w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                          errorsByField[`nominees[${index}].guardianName`]
                            ? "border-red-500 focus:border-red-500 bg-red-50"
                            : "border-gray-200 focus:border-blue-500"
                        }`}
                      />
                      {errorsByField[`nominees[${index}].guardianName`] && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {
                            errorsByField[`nominees[${index}].guardianName`][0]
                              ?.message
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  // Render Images Tab - OLD DESIGN PRESERVED
  const renderImages = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Member Picture */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
          <h4 className="text-md font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Picture
            <span className="text-red-500">*</span>
          </h4>
          {pictureFile?.preview ? (
            <div>
              <div className="relative">
                <img
                  src={pictureFile.preview}
                  alt="Member"
                  className="w-full h-64 object-cover rounded-lg border-2 border-blue-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 text-xs text-center text-blue-700 font-medium">
                {pictureFile.file
                  ? "New picture uploaded"
                  : "Account Picture Loaded"}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No picture available</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">
                <Upload className="w-4 h-4" />
                Upload Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        handlePictureSelect({
                          id: Date.now(),
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          preview: event.target?.result as string,
                          file: file,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}
          {errorsByField.picture && errorsByField.picture.length > 0 && (
            <p className="text-red-500 text-xs mt-2">
              {errorsByField.picture[0].message}
            </p>
          )}
        </div>

        {/* Member Signature */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <h4 className="text-md font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Signature
            <span className="text-red-500">*</span>
          </h4>
          {signatureFile?.preview ? (
            <div>
              <div className="relative">
                <img
                  src={signatureFile.preview}
                  alt="Signature"
                  className="w-full h-64 object-contain bg-white rounded-lg border-2 border-purple-300"
                />
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 text-xs text-center text-purple-700 font-medium">
                {signatureFile.file
                  ? "New signature uploaded"
                  : "Account Signature Loaded"}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No signature available</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all">
                <Upload className="w-4 h-4" />
                Upload Signature
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        handleSignatureSelect({
                          id: Date.now(),
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          preview: event.target?.result as string,
                          file: file,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}
          {errorsByField.signature && errorsByField.signature.length > 0 && (
            <p className="text-red-500 text-xs mt-2">
              {errorsByField.signature[0].message}
            </p>
          )}
        </div>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Images will auto-fill from Member Master if
          available. You can upload new images if needed. Both Picture and
          Signature are mandatory.
        </p>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Building className="w-8 h-8 text-blue-600" />
                    {isEditMode ? "Edit" : "Create"} Saving Account
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Fill in the details to {isEditMode ? "update" : "create"} a
                    new saving account
                  </p>
                </div>
                <button
                  onClick={() =>
                    isEditMode
                      ? navigate("/saving-acc-info")
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
                {activeTab === "basic" && renderBasicInfo()}
                {activeTab === "joint" && renderJointHolders()}
                {activeTab === "voucher" && !isEditMode && renderVoucher()}
                {activeTab === "nominee" && renderNominee()}
                {activeTab === "images" && renderImages()}
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
                        {isEditMode ? "Update" : "Save"} Account
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

export default SavingAccountMaster;
