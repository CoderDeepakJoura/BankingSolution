import React, { useState, useEffect } from "react";
import { useFormValidation } from "../../../services/Validations/accountMasters/closesavingaccountvalidations";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import savingAccountService, {
  CloseSavingAccDTO,
} from "../../../services/accountMasters/savingaccount/savingaccountapi";
import savingVoucherApi, {
  SavingVoucherDTO,
} from "../../../services/vouchers/saving/savingVoucherApi";
import commonservice, {
  AccountInformation,
} from "../../../services/common/commonservice";
import {
  SavingProduct,
  DebitAccount,
} from "../../accountMasters/Saving/saving-master";
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Users,
  Camera,
  PenTool,
  ArrowLeft,
  FileText,
  Building,
  UserCheck,
  Save,
  RotateCcw,
  ImageIcon,
  X,
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

export interface SavingAccounts {
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

const CloseSavingAccount: React.FC = () => {
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
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<DebitAccount[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<DebitAccount[]>([]);
  const [savingProductAccounts, setSavingProductAccounts] = useState<
    SavingAccounts[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const [pictureFile, setPictureFile] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<any>(null);

  // Voucher Data State
  const [voucherData, setVoucherData] = useState({
    voucherDate: "",
    savingProduct: "",
    accountId: 0,
    balance: "",
    interestPaid: "",
    closingCharges: "",
    incomeAccount: "",
    creditAccount: "",
    narration: "",
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
        const [productsRes, creditAccountsRes, incomeAccountsRes] = await Promise.all([
          commonservice.fetch_saving_products(user.branchid),
          commonservice.general_accmasters_info(user.branchid),
          commonservice.general_accmasters_info(user.branchid),
        ]);

        setSavingProducts(productsRes.data || []);
        setCreditAccounts(creditAccountsRes.data || []);
        setIncomeAccounts(incomeAccountsRes.data || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [user.branchid]);

  const handleInputChange = (field: string, value: string) => {
    setVoucherData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavingProductChange = async (selected: any) => {
    const productId = selected ? selected.value.toString() : "";

    setVoucherData((prev) => ({
      ...prev,
      savingProduct: productId,
      accountId: 0,
      interestPaid: "",
      closingCharges: "",
      incomeAccount: "",
    }));

    setSavingProductAccounts([]);
    setAccountData(null);
    setJointHolders([]);
    setPictureFile(null);
    setSignatureFile(null);

    if (selected) {
      setFieldErrors((prev) =>
        prev.filter((err) => err.field !== "savingProduct")
      );
    }

    if (productId && productId.trim() !== "") {
      try {
        const response = await commonservice.fetch_deposit_accounts(
          user.branchid,
          Number(productId),
          2,
        );
        if (response.success) {
          setSavingProductAccounts(response.data || []);
        } else {
          setSavingProductAccounts([]);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        setSavingProductAccounts([]);
        Swal.fire("Error", "Failed to load accounts", "error");
      }
    }
  };

  const handlebalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value === "") {
      handleInputChange("balance", value);
      return;
    }

    const decimalRegex = /^\d*\.?\d{0,2}$/;

    if (decimalRegex.test(value)) {
      handleInputChange("balance", value);
    }
  };

  const savingProductOptions = savingProducts.map((p) => ({
    value: p.id,
    label: p.productName,
  }));

  const creditAccountOptions = creditAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  const incomeAccountOptions = incomeAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  const savingProductAccountsInfo = savingProductAccounts.map((d) => ({
    value: d.accId,
    label: `${d.accountName}`,
  }));

  const handleFieldBlur = (fieldName: string) => {
    markFieldTouched(fieldName);

    const fieldValidationErrors = validateField(
      fieldName,
      voucherData[fieldName as keyof typeof voucherData],
      voucherData
    );

    setFieldErrors((prevErrors) => {
      const otherErrors = prevErrors.filter((err) => err.field !== fieldName);
      return [...otherErrors, ...fieldValidationErrors];
    });
  };

  const handleSubmit = async () => {
    const validation = validateForm(voucherData);

    if (!validation.isValid) {
      console.log(validation.errors)
      setFieldErrors(validation.errors);

      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        text: `Please fix ${validation.errors.length} validation error(s) in the form.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#3B82F6",
      });

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
      const totalAmount = parseFloat(voucherData.balance) + parseFloat(voucherData.interestPaid) > 0 ? parseFloat(voucherData.balance) + parseFloat(voucherData.interestPaid) : 0 ;
      const closeSavingAccountDTO: CloseSavingAccDTO = {
        BranchId: user.branchid,
        VoucherDate: voucherData.voucherDate,
        Narration: voucherData.narration || "Saving Account Closed with amount:" + voucherData.balance,
        TotalAmount: totalAmount,
        CreditAccountId: Number(voucherData.creditAccount),
        DebitAccountId: voucherData.accountId,
        ClosingCharges: voucherData.closingCharges ? parseFloat(voucherData.closingCharges) : 0,
        TotalInterestAmount: voucherData.interestPaid ? parseFloat(voucherData.interestPaid) : 0,
        IncomeAccountId: voucherData.incomeAccount ? Number(voucherData.incomeAccount) : 0,
        SavingProductId: Number(voucherData.savingProduct)
      };
      const response = await savingAccountService.close_Saving_Account(closeSavingAccountDTO);

      if (response.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Saving account closed successfully!",
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setFieldErrors([]);
        handleReset();
      } else {
        throw new Error(response.message || "Failed to close account");
      }
    } catch (error: any) {
      console.error("Close Account Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to close account. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVoucherData({
      voucherDate: commonservice.getTodaysDate(),
      savingProduct: "",
      accountId: 0,
      balance: "",
      interestPaid: "",
      closingCharges: "",
      incomeAccount: "",
      creditAccount: "",
      narration: "",
    });
    setAccountData(null);
    setJointHolders([]);
    setSavingProductAccounts([]);
    setActiveTab("account-info");
    clearErrors();
    setPictureFile(null);
    setSignatureFile(null);
    setFieldErrors([]);
  };

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
    { id: "account-ledger", label: "Account Ledger View", icon: FileText },
    { id: "photo-signature", label: "Photo & Signature", icon: Camera },
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
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Close Saving Account
              </h2>
              <p className="text-sm text-gray-600">
                Enter account closing details below
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/account-operations")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Operations
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* First Row - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
              placeholder="DD/MM/YYYY"
              readOnly
            />
          </FormField>

          {/* Saving Product */}
          <FormField
            name="savingProduct"
            label="Saving Product"
            required
            errors={errorsByField.savingProduct || []}
          >
            <Select
              id="savingProduct"
              options={savingProductOptions}
              value={
                savingProductOptions.find(
                  (opt) => opt.value === Number(voucherData.savingProduct)
                ) || null
              }
              onChange={handleSavingProductChange}
              onBlur={() => handleFieldBlur("savingProduct")}
              autoFocus
              placeholder="Select Saving Product"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#3b82f6",
                  },
                }),
              }}
            />
          </FormField>

          {/* Account No */}
          <FormField
            name="accountId"
            label="Account No."
            required
            errors={errorsByField.accountId || []}
          >
            <Select
              id="accountId"
              options={savingProductAccountsInfo}
              value={
                savingProductAccountsInfo.find(
                  (opt) => opt.value === Number(voucherData.accountId)
                ) || null
              }
              onChange={async (selected) => {
                const accountId = selected ? Number(selected.value) : 0;

                setVoucherData((prev) => ({
                  ...prev,
                  accountId: accountId,
                }));

                if (selected) {
                  setFieldErrors((prev) =>
                    prev.filter((err) => err.field !== "accountId")
                  );
                }

                if (accountId !== 0) {
                  try {
                    const response =
                      await commonservice.fetch_deposit_account_info_from_accountId(
                        user.branchid,
                        accountId,
                        2
                      );

                    if (response.success) {
                      setAccountData(response.data);
                      setPictureFile(null);
                      setSignatureFile(null);

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
                      setJointHolders([]);
                    }
                  } catch (error) {
                    console.error("Error fetching account info:", error);
                    setAccountData(null);
                    setJointHolders([]);
                    setPictureFile(null);
                    setSignatureFile(null);
                    Swal.fire(
                      "Error",
                      "Failed to load account information",
                      "error"
                    );
                  }
                } else {
                  setAccountData(null);
                  setJointHolders([]);
                  setPictureFile(null);
                  setSignatureFile(null);
                }
              }}
              onBlur={() => handleFieldBlur("accountId")}
              placeholder="Select Account"
              isClearable
              isDisabled={
                !voucherData.savingProduct ||
                savingProductAccountsInfo.length === 0
              }
              noOptionsMessage={() =>
                !voucherData.savingProduct
                  ? "Please select a saving product first"
                  : "No accounts found"
              }
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#3b82f6",
                  },
                }),
              }}
            />
          </FormField>
        </div>

        {/* Second Row - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Balance */}
          <FormField
            name="balance"
            label="Balance"
            errors={errorsByField.balance || []}
          >
            <input
              type="text"
              id="balance"
              value={voucherData.balance}
              onChange={handlebalanceChange}
              onBlur={() => handleFieldBlur("balance")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
              placeholder="Enter Amount (e.g., 10500.00)"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>

          {/* Interest Paid */}
          <FormField
            name="interestPaid"
            label="Interest Paid"
            errors={errorsByField.interestPaid || []}
          >
            <input
              type="text"
              id="interestPaid"
              value={voucherData.interestPaid}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                  handleInputChange("interestPaid", value);
                }
              }}
              onBlur={() => handleFieldBlur("interestPaid")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
              placeholder="Enter Interest (e.g., 500.00)"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>

          {/* Closing Charges */}
          <FormField
            name="closingCharges"
            label="Closing Charges"
            errors={errorsByField.closingCharges || []}
          >
            <input
              type="text"
              id="closingCharges"
              value={voucherData.closingCharges}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                  handleInputChange("closingCharges", value);
                }
              }}
              onBlur={() => handleFieldBlur("closingCharges")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
              placeholder="Enter Charges (e.g., 0.00)"
              inputMode="decimal"
              maxLength={18}
            />
          </FormField>

          {/* Income Account */}
          <FormField
            name="incomeAccount"
            label="Income Account"
            errors={errorsByField.incomeAccount || []}
          >
            <Select
              id="incomeAccount"
              options={incomeAccountOptions}
              value={
                incomeAccountOptions.find(
                  (opt) => opt.value === Number(voucherData.incomeAccount)
                ) || null
              }
              onChange={(selected) => {
                handleInputChange(
                  "incomeAccount",
                  selected ? selected.value.toString() : ""
                );
                if (selected) {
                  setFieldErrors((prev) =>
                    prev.filter((err) => err.field !== "incomeAccount")
                  );
                }
              }}
              onBlur={() => handleFieldBlur("incomeAccount")}
              placeholder="Select Income Account"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#3b82f6",
                  },
                }),
              }}
            />
          </FormField>
        </div>

        {/* Third Row - 1 column */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Credit Account */}
          <FormField
            name="creditAccount"
            label="Credit Account"
            required
            errors={errorsByField.creditAccount || []}
          >
            <Select
              id="creditAccount"
              options={creditAccountOptions}
              value={
                creditAccountOptions.find(
                  (opt) => opt.value === Number(voucherData.creditAccount)
                ) || null
              }
              onChange={(selected) => {
                handleInputChange(
                  "creditAccount",
                  selected ? selected.value.toString() : ""
                );
                if (selected) {
                  setFieldErrors((prev) =>
                    prev.filter((err) => err.field !== "creditAccount")
                  );
                }
              }}
              onBlur={() => handleFieldBlur("creditAccount")}
              placeholder="Select Credit Account"
              isClearable
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: "48px",
                  borderWidth: "2px",
                  borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                    : "none",
                  "&:hover": {
                    borderColor: "#3b82f6",
                  },
                }),
              }}
            />
          </FormField>
        </div>

        {/* Fourth Row - Full width */}
        <div className="mb-6">
          <FormField
            name="narration"
            label="Narration / Closing Remarks (Optional)"
            errors={errorsByField.narration || []}
          >
            <textarea
              id="narration"
              value={voucherData.narration}
              onChange={(e) => handleInputChange("narration", e.target.value)}
              onBlur={() => handleFieldBlur("narration")}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 resize-none"
              placeholder="Enter any remarks..."
            />
          </FormField>
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
            className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Close Account
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
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Account Information
          </h3>
        </div>
      </div>

      {accountData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Member Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.memberName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Relative Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.relativeName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Membership No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.memberShipNo}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Account Opening Date</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.accountOpeningDate}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
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
          </div>

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
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-teal-600" />
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
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">PAN No.</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.panCardNo || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Nominee Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {accountData.nomineeDetails?.nomineeName || "N/A"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500">
            Please select an account to view information
          </p>
        </div>
      )}
    </div>
  );

  const renderAccountLedger = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
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
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
          <h4 className="text-md font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Picture
          </h4>
          {pictureFile?.preview ? (
            <div>
              <div className="relative">
                <img
                  src={pictureFile.preview}
                  alt="Member"
                  className="w-full h-64 rounded-lg border-2 border-blue-300"
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
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Joint Account Detail
        </h3>
      </div>

      {jointHolders.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
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
                  className="hover:bg-blue-50 transition-colors duration-150"
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
              ? "Please select an account to view joint holders"
              : "No joint account holders found for this account"}
          </p>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderVoucherForm()}

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

              <div className="p-6 sm:p-8 bg-white">{renderTabContent()}</div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default CloseSavingAccount;
