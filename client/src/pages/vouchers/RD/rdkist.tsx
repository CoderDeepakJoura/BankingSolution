import React, { useState, useEffect } from "react";
import { useFormValidation } from "../../../services/Validations/voucher/rd/rdkist";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import rdKistVoucherApi, {
  RDKistVoucherDTO,
} from "../../../services/vouchers/rd/rdKistVoucherApi";
import commonservice, {
  AccountInformation,
} from "../../../services/common/commonservice";
import {
  RDProduct,
  DebitAccount,
} from "../../accountMasters/RD/rd-master";

interface SavingProduct {
  id: number;
  productName: string;
}

interface SavingAccount {
  accId: number;
  accountName: string;
}
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Users,
  PenTool,
  ArrowLeft,
  FileText,
  Building,
  UserCheck,
  Save,
  RotateCcw,
  ImageIcon,
  X,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";

// Joint Account Holder Interface
export interface JointAccountHolder {
  accountName: string;
  addressLine: string;
  jointAccHolderAccountNumber: string;
}

export interface RDAccounts {
  accId: number;
  accountName: string;
}

const urlToFile = async (
  url: string,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<File> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error("Error converting URL to File:", error);
    return null as any;
  }
};

const RDKistVoucher: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, validateField, clearErrors, markFieldTouched } =
    useFormValidation();

  const [activeTab, setActiveTab] = useState("account-info");
  const [loading, setLoading] = useState(false);
  const [accountData, setAccountData] = useState<AccountInformation | null>(
    null
  );
  const [jointHolders, setJointHolders] = useState<JointAccountHolder[]>([]);
  const [rdProducts, setRDProducts] = useState<RDProduct[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);
  const [rdProductAccounts, setRDProductAccounts] = useState<RDAccounts[]>([]);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [savingAccounts, setSavingAccounts] = useState<SavingAccount[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const [pictureFile, setPictureFile] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);
  const [rdDetails, setRDDetails] = useState<any>(null);

  // RD Kist Voucher Data State
  const [voucherData, setVoucherData] = useState({
    voucherDate: "",
    rdProduct: "",
    accountId: 0,
    kistAmount: "",
    penaltyAmount: "",
    totalAmount: "",
    debitAccount: "",
    agent: "",
    fromSavingAmount: "",
    savingProduct: "",
    savingAccount: "",
    narration: "",
    rdNumber: "",
    interestRate: "",
    balanceAmount: "",
    firstKistDate: "",
    matureityDate: "",
    station: "",
    savingAccountNo: "",
    savingBalance: "",
    loanAccountNo: "",
    loanProduct: "",
  });

  async function loadFileDataFromAccount(
    picExt: string,
    signExt: string,
    accountId: number
  ) {
    if (picExt) {
      const fileName = `account_${accountId}_picture${picExt}`;
      const cacheBuster = `?t=${Date.now()}`;
      const photoUrl =
        commonservice.getAccountImageUrl(fileName, "Pictures") + cacheBuster;

      setPictureFile({
        id: Date.now(),
        name: "picture",
        preview: photoUrl,
        file: null,
      });
    }
    if (signExt) {
      const fileName = `account_${accountId}_signature${signExt}`;
      const cacheBuster = `?t=${Date.now()}`;
      const signUrl =
        commonservice.getAccountImageUrl(fileName, "Signatures") + cacheBuster;
      setSignatureFile({
        id: Date.now() + 1,
        name: "signature",
        preview: signUrl,
        file: null,
      });
    }
  }

  async function loadFileDataFromMember(
    pic_and_sign_info: any,
    memberId: number,
    accountPicExt: string = "",
    accountSignExt: string = ""
  ) {
    if (pic_and_sign_info.data.memberPicExt && accountPicExt == "") {
      const fileName = `member_${memberId}_picture${pic_and_sign_info.data.memberPicExt}`;
      const cacheBuster = `?t=${Date.now()}`;
      const photoUrl =
        commonservice.getImageUrl(fileName, "Pictures") + cacheBuster;
      const picFile = await urlToFile(
        photoUrl,
        fileName,
        "image/" + pic_and_sign_info.data.memberPicExt.replace(".", "")
      );
      setPictureFile({
        id: Date.now(),
        name: "picture",
        preview: photoUrl,
        file: picFile,
      });
    }
    if (pic_and_sign_info.data.memberSignExt && accountSignExt == "") {
      const fileName = `member_${memberId}_signature${pic_and_sign_info.data.memberSignExt}`;
      const cacheBuster = `?t=${Date.now()}`;
      const signUrl =
        commonservice.getImageUrl(fileName, "Signatures") + cacheBuster;
      const signFile = await urlToFile(
        signUrl,
        fileName,
        "image/" + pic_and_sign_info.data.memberSignExt.replace(".", "")
      );
      setSignatureFile({
        id: Date.now(),
        name: "signature",
        preview: signUrl,
        file: signFile,
      });
    }
  }

  useEffect(() => {
    setVoucherData((prev) => ({
      ...prev,
      voucherDate: commonservice.getTodaysDate(),
    }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, debitAccountsRes, savingProductsRes] = await Promise.all([
          commonservice.fetch_rd_products(user.branchid),
          commonservice.general_accmasters_info(user.branchid),
          commonservice.fetch_saving_products(user.branchid),
        ]);

        setRDProducts(productsRes.data || []);
        setDebitAccounts(debitAccountsRes.data || []);
        setSavingProducts(savingProductsRes.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [user.branchid]);

  const handleInputChange = (field: string, value: string) => {
    setVoucherData((prev) => ({ ...prev, [field]: value }));
  };

  // Separate function for RD product change
  const handleRDProductChange = async (selected: any) => {
    const productId = selected ? selected.value.toString() : "";

    // Update state first
    setVoucherData((prev) => ({
      ...prev,
      rdProduct: productId,
      accountId: 0,
      debitAccount: ""
    }));

    // Clear all related data
    setRDProductAccounts([]);
    setAccountData(null);
    setJointHolders([]);
    setRDDetails(null);
    setPictureFile(null);
    setSignatureFile(null);

    // Clear error on change
    if (selected) {
      setFieldErrors((prev) =>
        prev.filter((err) => err.field !== "rdProduct")
      );
    }

    // Fetch accounts if product is selected
    if (productId && productId.trim() !== "") {
      try {
        const response = await commonservice.fetch_RD_Open_Accounts_For_Premature(
          user.branchid,
          Number(productId),
          voucherData.voucherDate // RD account type
        );
        if (response.success) {
          setRDProductAccounts(response.data || []);
          const defCIHAccId = await commonservice.default_cash_in_hand_account(
            user.branchid
          );
          if (Number(defCIHAccId.data) > 0)
            setVoucherData((prev) => ({
              ...prev,
              debitAccount: defCIHAccId.data,
            }));
        } else {
          setRDProductAccounts([]);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setRDProductAccounts([]);
        Swal.fire("Error", "Failed to load RD accounts", "error");
      }
    }
  };

  // Handle kist amount with numeric validation (up to 2 decimal places)
  const handleKistAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value === "") {
      handleInputChange("kistAmount", value);
      return;
    }

    const decimalRegex = /^\d*\.?\d{0,2}$/;

    if (decimalRegex.test(value)) {
      handleInputChange("kistAmount", value);
    }
  };

  // Handle penalty amount with numeric validation
  const handlePenaltyAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value === "") {
      handleInputChange("penaltyAmount", value);
      return;
    }

    const decimalRegex = /^\d*\.?\d{0,2}$/;

    if (decimalRegex.test(value)) {
      handleInputChange("penaltyAmount", value);
    }
  };

  const rdProductOptions = rdProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));

  const debitAccountOptions = debitAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  const rdProductAccountsInfo = rdProductAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  // Custom validation function for single field
  const handleFieldBlur = (fieldName: string) => {
    markFieldTouched(fieldName);

    // Validate the specific field
    const fieldValidationErrors = validateField(
      fieldName,
      voucherData[fieldName as keyof typeof voucherData],
      voucherData
    );

    // Update field errors state
    setFieldErrors((prevErrors) => {
      // Remove old errors for this field
      const otherErrors = prevErrors.filter((err) => err.field !== fieldName);
      // Add new errors for this field
      return [...otherErrors, ...fieldValidationErrors];
    });
  };

  const handleSubmit = async () => {
    const validation = validateForm(voucherData);

    if (!validation.isValid) {
      // Update field errors from validation result
      setFieldErrors(validation.errors);

      // Show simple error alert
      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        text: `Please fix ${validation.errors.length} validation error(s) in the form.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
      });

      // Focus on first error field
      const firstError = validation.errors[0];
      if (firstError) {
        setActiveTab(firstError.tab);

        setTimeout(() => {
          const cleanFieldName = firstError.field.replace(/\[|\]|\./g, "_");
          const element = document.getElementById(cleanFieldName);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }

      return false;
    }

    setLoading(true);
    try {
      const totalAmount = (
        parseFloat(voucherData.kistAmount || 0) +
        parseFloat(voucherData.penaltyAmount || 0)
      ).toFixed(2);

      const fromSavingAmt = parseFloat(voucherData.fromSavingAmount || "0") || 0;
      const rdKistVoucherPayload: RDKistVoucherDTO = {
        brID: user.branchid,
        voucherDate: voucherData.voucherDate,
        voucherNarration:
          voucherData.narration ||
          "RD Kist Voucher - Kist Amount:" + voucherData.kistAmount,
        rdAccountId: voucherData.accountId,
        kistAmount: parseFloat(voucherData.kistAmount),
        penaltyAmount: parseFloat(voucherData.penaltyAmount || "0") || 0,
        totalAmount: parseFloat(totalAmount),
        savingProductId: voucherData.savingProduct ? Number(voucherData.savingProduct) : null,
        savingAccountId: voucherData.savingAccount ? Number(voucherData.savingAccount) : null,
        fromSavingAmount: fromSavingAmt,
        debitAccountId: voucherData.debitAccount ? Number(voucherData.debitAccount) : null,
        agent: voucherData.agent,
      };

      const response = await rdKistVoucherApi.addRDKistVoucher(
        rdKistVoucherPayload
      );

      if (response.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text:
            response.message || "RD Kist Voucher saved successfully.",
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setFieldErrors([]);
        handleReset();
      } else {
        throw new Error(response.message || "Failed to save transaction");
      }

      clearErrors();
      setFieldErrors([]);
      handleReset();
    } catch (error: any) {
      console.error("Save Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to save transaction. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVoucherData({
      voucherDate: commonservice.getTodaysDate(),
      rdProduct: "",
      accountId: 0,
      kistAmount: "",
      penaltyAmount: "",
      totalAmount: "",
      debitAccount: "",
      agent: "",
      fromSavingAmount: "",
      savingProduct: "",
      savingAccount: "",
      narration: "",
      rdNumber: "",
      interestRate: "",
      balanceAmount: "",
      firstKistDate: "",
      matureityDate: "",
      station: "",
      savingAccountNo: "",
      savingBalance: "",
      loanAccountNo: "",
      loanProduct: "",
    });
    setAccountData(null);
    setJointHolders([]);
    setRDProductAccounts([]);
    setSavingAccounts([]);
    setRDDetails(null);
    setActiveTab("account-info");
    clearErrors();
    setPictureFile(null);
    setSignatureFile(null);
    setFieldErrors([]);
  };

  // Use fieldErrors state instead of errors from hook
  const errorsByField = fieldErrors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const errorsByTab = fieldErrors.reduce((acc, error) => {
    if (!acc[error.tab]) acc[error.tab] = [];
    acc[error.tab].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const tabs = [
    { id: "account-info", label: "Account Information", icon: User },
    { id: "rd-details", label: "RD Details", icon: TrendingUp },
    { id: "account-ledger", label: "Account Ledger View", icon: FileText },
    { id: "joint-account", label: "Joint Account Detail", icon: Users },
  ];

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

  const renderVoucherForm = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                RD Kist Voucher
              </h2>
              <p className="text-sm text-gray-600">
                Enter RD kist transaction details below
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/voucher-operations")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Operations
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* First Row - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Voucher Date */}
          <FormField
            name="voucherDate"
            label="Voucher Date"
            required
            errors={errorsByField.voucherDate || []}
          >
            <input
              type="text"
              id="voucherDate"
              value={voucherData.voucherDate}
              onChange={(e) => handleInputChange("voucherDate", e.target.value)}
              onBlur={() => handleFieldBlur("voucherDate")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="DD/MM/YYYY"
              readOnly
            />
          </FormField>

          {/* RD Product */}
          <FormField
            name="rdProduct"
            label="RD Product"
            required
            errors={errorsByField.rdProduct || []}
          >
            <Select
              id="rdProduct"
              options={rdProductOptions}
              value={
                rdProductOptions.find(
                  (opt) => opt.value === Number(voucherData.rdProduct)
                ) || null
              }
              onChange={handleRDProductChange}
              onBlur={() => handleFieldBlur("rdProduct")}
              autoFocus
              placeholder="Select RD Product"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#059669" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(5, 150, 105, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#059669",
                  },
                }),
              }}
            />
          </FormField>

          {/* RD Account No */}
          <FormField
            name="accountId"
            label="RD Account"
            required
            errors={errorsByField.accountId || []}
          >
            <Select
              id="accountId"
              options={rdProductAccountsInfo}
              value={
                rdProductAccountsInfo.find(
                  (opt) => opt.value === Number(voucherData.accountId)
                ) || null
              }
              onChange={async (selected) => {
                const accountId = selected ? Number(selected.value) : 0;

                // Update voucher data first
                setVoucherData((prev) => ({
                  ...prev,
                  accountId: accountId,
                }));

                // Clear error on change
                if (selected) {
                  setFieldErrors((prev) =>
                    prev.filter((err) => err.field !== "accountId")
                  );
                }

                // Fetch account information if valid account selected
                if (accountId !== 0) {
                  try {
                    // Fetch account details
                    const response =
                      await commonservice.fetch_deposit_account_info_from_accountId(
                        user.branchid,
                        accountId,
                        5
                      );

                    if (response.success) {
                      setAccountData(response.data);
                      setRDDetails(response.data.rdDetails || null);
                      setPictureFile(null);
                      setSignatureFile(null);

                      // Auto-fill RD details
                      if (response.data.rdDetails) {
                        setVoucherData((prev) => ({
                          ...prev,
                          rdNumber: response.data.rdDetails.rdNumber || "",
                          interestRate: response.data.rdDetails.interestRate || "",
                          balanceAmount: response.data.rdDetails.balanceAmount || "",
                          firstKistDate: commonservice.splitDate(response.data.rdDetails.firstKistDate) || "",
                          matureityDate: commonservice.splitDate(response.data.rdDetails.maturityDate) || "",
                          kistAmount: response.data.rdDetails.kistAmt ? String(response.data.rdDetails.kistAmt) : "",
                        }));
                      }

                      // Fetch joint account holders
                      try {
                        const jointAccountResponse =
                          await commonservice.fetch_joint_acc_info(
                            user.branchid,
                            accountId
                          );

                        if (jointAccountResponse.success) {
                          setJointHolders(jointAccountResponse.data || []);
                        } else {
                          setJointHolders([]);
                        }
                      } catch (jointError) {
                        console.error(
                          "Error fetching joint account holders:",
                          jointError
                        );
                        setJointHolders([]);
                      }

                      // Fetch pictures and signatures
                      if (
                        !response.data.accountPicExt ||
                        !response.data.accountSignExt
                      ) {
                        const pic_and_sign_info =
                          await commonservice.fetch_pic_and_sign_extension(
                            response.data.memberBrId,
                            response.data.memberId
                          );
                        await loadFileDataFromMember(
                          pic_and_sign_info,
                          response.data.memberId,
                          response.data.accountPicExt,
                          response.data.accountSignExt
                        );
                      } else {
                        await loadFileDataFromAccount(
                          response.data.accountPicExt,
                          response.data.accountSignExt,
                          accountId
                        );
                      }
                    } else {
                      setAccountData(null);
                      setRDDetails(null);
                      setJointHolders([]);
                    }
                  } catch (error) {
                    console.error("Error fetching account info:", error);
                    setAccountData(null);
                    setRDDetails(null);
                    setJointHolders([]);
                    setPictureFile(null);
                    setSignatureFile(null);
                    Swal.fire(
                      "Error",
                      "Failed to load RD account information",
                      "error"
                    );
                  }
                } else {
                  // Clear all data when no account selected
                  setAccountData(null);
                  setRDDetails(null);
                  setJointHolders([]);
                  setPictureFile(null);
                  setSignatureFile(null);
                }
              }}
              onBlur={() => handleFieldBlur("accountId")}
              placeholder="Select RD Account"
              isClearable
              isDisabled={
                !voucherData.rdProduct ||
                rdProductAccountsInfo.length === 0
              }
              noOptionsMessage={() =>
                !voucherData.rdProduct
                  ? "Please select an RD product first"
                  : "No RD accounts found"
              }
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#059669" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(5, 150, 105, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#059669",
                  },
                }),
              }}
            />
          </FormField>

          {/* Kist Amount */}
          <FormField
            name="kistAmount"
            label="Kist Amount"
            required
            errors={errorsByField.kistAmount || []}
          >
            <input
              type="text"
              id="kistAmount"
              value={voucherData.kistAmount}
              onChange={handleKistAmountChange}
              onBlur={() => handleFieldBlur("kistAmount")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="Enter Kist Amount"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>
        </div>

        {/* Second Row - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Penalty Amount */}
          <FormField
            name="penaltyAmount"
            label="Penalty Amount"
            errors={errorsByField.penaltyAmount || []}
          >
            <input
              type="text"
              id="penaltyAmount"
              value={voucherData.penaltyAmount}
              onChange={handlePenaltyAmountChange}
              onBlur={() => handleFieldBlur("penaltyAmount")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="Enter Penalty (if any)"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>

          {/* Total Amount (calculated) */}
          <FormField
            name="totalAmount"
            label="Total Amount"
            errors={errorsByField.totalAmount || []}
          >
            <input
              type="text"
              id="totalAmount"
              value={
                voucherData.kistAmount || voucherData.penaltyAmount
                  ? (
                      parseFloat(voucherData.kistAmount || 0) +
                      parseFloat(voucherData.penaltyAmount || 0)
                    ).toFixed(2)
                  : ""
              }
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none"
              placeholder="Auto-calculated"
            />
          </FormField>

          {/* Debit Account */}
          <FormField
            name="debitAccount"
            label="Debit Account"
            required
            errors={errorsByField.debitAccount || []}
          >
            <Select
              id="debitAccount"
              options={debitAccountOptions}
              value={
                debitAccountOptions.find(
                  (opt) => opt.value === Number(voucherData.debitAccount)
                ) || null
              }
              onChange={(selected) => {
                handleInputChange(
                  "debitAccount",
                  selected ? selected.value.toString() : ""
                );
                // Clear error on change
                if (selected) {
                  setFieldErrors((prev) =>
                    prev.filter((err) => err.field !== "debitAccount")
                  );
                }
              }}
              onBlur={() => handleFieldBlur("debitAccount")}
              placeholder="Select Debit Account"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#059669" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(5, 150, 105, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#059669",
                  },
                }),
              }}
            />
          </FormField>

          {/* Agent */}
          <FormField
            name="agent"
            label="Agent"
            errors={errorsByField.agent || []}
          >
            <input
              type="text"
              id="agent"
              value={voucherData.agent}
              onChange={(e) => handleInputChange("agent", e.target.value)}
              onBlur={() => handleFieldBlur("agent")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="Enter Agent Name"
            />
          </FormField>
        </div>

        {/* Third Row - Saving source fields + auto-calc debit */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Saving Product */}
          <FormField
            name="savingProduct"
            label="Saving Product"
            errors={errorsByField.savingProduct || []}
          >
            <Select
              id="savingProduct"
              options={savingProducts.map((p) => ({ value: p.id, label: p.productName }))}
              value={
                savingProducts.find((p) => p.id === Number(voucherData.savingProduct))
                  ? { value: Number(voucherData.savingProduct), label: savingProducts.find((p) => p.id === Number(voucherData.savingProduct))!.productName }
                  : null
              }
              onChange={async (selected) => {
                const productId = selected ? selected.value.toString() : "";
                setVoucherData((prev) => ({ ...prev, savingProduct: productId, savingAccount: "" }));
                setSavingAccounts([]);
                if (productId) {
                  try {
                    const res = await commonservice.fetch_deposit_accounts(user.branchid, Number(productId), 2, false);
                    if (res.success) setSavingAccounts(res.data || []);
                  } catch { setSavingAccounts([]); }
                }
              }}
              placeholder="Select Saving Product"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base, minHeight: "48px", borderWidth: "2px",
                  borderColor: state.isFocused ? "#059669" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused ? "0 0 0 2px rgba(5,150,105,0.2)" : "none",
                  "&:hover": { borderColor: "#059669" },
                }),
              }}
            />
          </FormField>

          {/* Saving Account */}
          <FormField
            name="savingAccount"
            label="Saving Account"
            errors={errorsByField.savingAccount || []}
          >
            <Select
              id="savingAccount"
              options={savingAccounts.map((a) => ({ value: a.accId, label: a.accountName }))}
              value={
                savingAccounts.find((a) => a.accId === Number(voucherData.savingAccount))
                  ? { value: Number(voucherData.savingAccount), label: savingAccounts.find((a) => a.accId === Number(voucherData.savingAccount))!.accountName }
                  : null
              }
              onChange={(selected) => {
                handleInputChange("savingAccount", selected ? selected.value.toString() : "");
              }}
              placeholder="Select Saving Account"
              isClearable
              isDisabled={!voucherData.savingProduct || savingAccounts.length === 0}
              noOptionsMessage={() => !voucherData.savingProduct ? "Select saving product first" : "No accounts found"}
              styles={{
                control: (base, state) => ({
                  ...base, minHeight: "48px", borderWidth: "2px",
                  borderColor: state.isFocused ? "#059669" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused ? "0 0 0 2px rgba(5,150,105,0.2)" : "none",
                  "&:hover": { borderColor: "#059669" },
                }),
              }}
            />
          </FormField>

          {/* From Saving Amount */}
          <FormField
            name="fromSavingAmount"
            label="From Saving Amount"
            errors={errorsByField.fromSavingAmount || []}
          >
            <input
              type="text"
              id="fromSavingAmount"
              value={voucherData.fromSavingAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                  handleInputChange("fromSavingAmount", val);
                }
              }}
              onBlur={() => handleFieldBlur("fromSavingAmount")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="Amount from saving"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>

          {/* Cash / Debit Amount (auto-calculated) */}
          <FormField name="debitAmount" label="Cash / Debit Amount" errors={[]}>
            <input
              type="text"
              id="debitAmount"
              value={(() => {
                const total = (parseFloat(voucherData.kistAmount || "0") || 0) + (parseFloat(voucherData.penaltyAmount || "0") || 0);
                const fromSaving = parseFloat(voucherData.fromSavingAmount || "0") || 0;
                const remaining = Math.max(0, Math.round((total - fromSaving) * 100) / 100);
                return total > 0 || fromSaving > 0 ? remaining.toFixed(2) : "";
              })()}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none"
              placeholder="Auto-calculated"
            />
          </FormField>
        </div>

        {/* Fourth Row - Balance + Station + Narration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Balance Amount */}
          <FormField
            name="balanceAmount"
            label="Balance Amount"
            errors={errorsByField.balanceAmount || []}
          >
            <input
              type="text"
              id="balanceAmount"
              value={voucherData.balanceAmount}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none"
              placeholder="Auto-filled from RD"
            />
          </FormField>

          {/* Station */}
          <FormField
            name="station"
            label="Station"
            errors={errorsByField.station || []}
          >
            <input
              type="text"
              id="station"
              value={voucherData.station}
              onChange={(e) => handleInputChange("station", e.target.value)}
              onBlur={() => handleFieldBlur("station")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
              placeholder="Enter Station"
            />
          </FormField>

          {/* Narration - spans 2 columns */}
          <div className="lg:col-span-2">
            <FormField
              name="narration"
              label="Narration"
              errors={errorsByField.narration || []}
            >
              <input
                type="text"
                id="narration"
                value={voucherData.narration}
                onChange={(e) => handleInputChange("narration", e.target.value)}
                onBlur={() => handleFieldBlur("narration")}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all duration-200"
                placeholder="Enter Narration"
              />
            </FormField>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Transaction
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Account Information
          </h3>
        </div>
      </div>

      {accountData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Member Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.memberName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Relative Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.relativeName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Membership No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.memberShipNo}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Account Opening Date</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.accountOpeningDate}
              </p>
            </div>
          </div>

          {/* <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Minimum Balance Required
              </p>
              <p className="text-sm font-semibold text-gray-800">
                ₹{accountData.minimumBalanceRequired}
              </p>
            </div>
          </div> */}

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email ID</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.emailId || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.address || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Contact No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.contactNo || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Aadhar No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.aadhaarNo || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">PAN No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.panCardNo || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Nominee Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.nomineeDetails?.nomineeName || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Balance</p>
              <p className="text-sm font-semibold text-gray-800">
                ₹{accountData.balance || "N/A"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500">
            Please select an RD account to view information
          </p>
        </div>
      )}
    </div>
  );

  const renderRDDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          RD Account Details
        </h3>
      </div>

      {rdDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
            <p className="text-xs text-gray-600 mb-1">RD Number</p>
            <p className="text-lg font-bold text-emerald-700">
              {rdDetails.rdNumber || "N/A"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Interest Rate</p>
            <p className="text-lg font-bold text-blue-700">
              {rdDetails.interestRate || "0"}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Balance Amount</p>
            <p className="text-lg font-bold text-purple-700">
              ₹{rdDetails.balanceAmount || "0"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-600 mb-1">Kist Amount</p>
            <p className="text-lg font-bold text-yellow-700">
              ₹{rdDetails.kistAmt || "0"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-red-50 p-4 rounded-lg border border-rose-200">
            <p className="text-xs text-gray-600 mb-1">RD Amount</p>
            <p className="text-lg font-bold text-rose-700">
              ₹{rdDetails.rdAmount || "0"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
            <p className="text-xs text-gray-600 mb-1">First Kist Date</p>
            <p className="text-lg font-bold text-orange-700">
              {commonservice.splitDate(rdDetails.firstKistDate) || "N/A"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-lime-50 p-4 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Maturity Date</p>
            <p className="text-lg font-bold text-green-700">
              {commonservice.splitDate(rdDetails.maturityDate) || "N/A"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-lg border border-indigo-200">
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <p className="text-lg font-bold text-indigo-700">
              {rdDetails.status || "Active"}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500">
            Please select an RD account to view RD details
          </p>
        </div>
      )}
    </div>
  );

  const renderAccountLedger = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Account Ledger View
        </h3>
      </div>
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-sm">Ledger view content will appear here</p>
      </div>
    </div>
  );

  const renderPhotoSignature = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Member Picture */}
        <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 rounded-lg border border-emerald-200">
          <h4 className="text-md font-semibold text-emerald-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Picture
          </h4>
          {pictureFile?.preview ? (
            <div>
              <div className="relative">
                <img
                  src={pictureFile.preview}
                  alt="Member"
                  className="w-full h-64 rounded-lg border-2 border-emerald-300"
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No picture available</p>
            </div>
          )}
        </div>

        {/* Member Signature */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
          <h4 className="text-md font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Signature
          </h4>
          {signatureFile?.preview ? (
            <div>
              <div className="relative">
                <img
                  src={signatureFile.preview}
                  alt="Signature"
                  className="w-full h-64 bg-white rounded-lg border-2 border-purple-300"
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No signature available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderJointAccountDetail = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Joint Account Detail
        </h3>
      </div>

      {jointHolders.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Account Number
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jointHolders.map((holder, index) => (
                <tr
                  key={index}
                  className="hover:bg-emerald-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                    {holder.accountName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {holder.addressLine}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {holder.jointAccHolderAccountNumber}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500">
            {voucherData.accountId === 0
              ? "Please select an RD account to view joint holders"
              : "No joint account holders found for this account"}
          </p>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "rd-details":
        return renderRDDetails();
      case "account-ledger":
        return renderAccountLedger();
      case "photo-signature":
        return renderPhotoSignature();
      case "joint-account":
        return renderJointAccountDetail();
      default:
        return renderAccountInfo();
    }
  };

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* RD Kist Voucher Form Section */}
            {renderVoucherForm()}

            {/* Tab Navigation with Error Indicators */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-0 overflow-x-auto bg-gray-50">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const tabErrorCount = errorsByTab[tab.id]?.length || 0;

                    return (
                      <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={getTabClassName(tab.id)}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {tabErrorCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-sm">
                            {tabErrorCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 sm:p-8 bg-white">{renderTabContent()}</div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default RDKistVoucher;