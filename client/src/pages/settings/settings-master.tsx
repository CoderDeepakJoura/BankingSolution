import React, { useState, useEffect } from "react";
import { useFormValidation } from "../../services/Validations/settings/settingsValidations";
import { ValidationSummary } from "../../components/Validations/ValidationSummary";
import { FormField } from "../../components/Validations/FormField";
import Swal from "sweetalert2";
import { ValidationError } from "../../services/Validations/validation";
import Select from "react-select";
import SettingsApiService, {
  SettingsDTO,
  GeneralSettingsDTO,
  VoucherSettingsDTO,
  AccountSettingsDTO,
  TDSSettingsDTO,
  PrintingSettingsDTO,
} from "../../services/settings/settingsapi";
import {
  Settings,
  Receipt,
  Save,
  ArrowLeft,
  CheckSquare,
  DollarSign,
  User,
  Verified,
  CreditCard,
  Printer,
  FileText,
  Calculator,
  Users,
  Landmark,
  Calendar,
} from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import commonservice, {
  AccountMaster,
} from "../../services/common/commonservice";

const SettingsMaster = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } = useFormValidation();
  const [generalAccounts, setGeneralAccounts] = useState<AccountMaster[]>([]);
  
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);

  // ✅ Complete Settings form data
  const [settingsData, setSettingsData] = useState({
    // General Settings
    admissionFeeAccount: 0,
    admissionFeeAmount: "",
    defaultCashAccount: 0,
    minimumMemberAge: "",
    shareMoneyPercentageForLoan: "",
    bankFDMaturityReminder: false,
    bankFDMaturityReminderDays: "",
    
    // Account Settings
    accountVerification: false,
    memberKYC: false,
    savingAccountLength: "",
    loanAccountLength: "",
    fdAccountLength: "",
    rdAccountLength: "",
    shareAccountLength: "",
    
    // Voucher Settings
    voucherPrinting: false,
    singleVoucherEntry: false,
    voucherNumberSetting: 0,
    autoVerification: false,
    receiptNoSetting: false,
    
    // TDS Settings
    bankFDTDSApplicability: false,
    bankFDTDSRate: "",
    bankFDTDSDeductionFrequency: 0,
    bankFDTDSLedgerAccount: 0,
    
    // Printing Settings
    fdReceiptSetting: false,
    rdCertificateSetting: false,
  });

  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const response = await commonservice.general_accmasters_info(user.branchid);
        if (response.success && response.data) {
          const accounts: AccountMaster[] = response.data;
          setGeneralAccounts(accounts);
        } else {
          throw new Error(response.message || "Failed to fetch general accounts info.");
        }

        const settingsResponse = await SettingsApiService.fetch_settings(user.branchid);
        if (settingsResponse.success && settingsResponse.data) {
          const data = settingsResponse.data;
          
          if (data.generalSettings) {
            const general = data.generalSettings;
            setSettingsData((prev) => ({
              ...prev,
              admissionFeeAccount: general.admissionFeeAccountId,
              admissionFeeAmount: general.admissionFeeAmount > 0 ? String(general.admissionFeeAmount) : "",
              defaultCashAccount: general.defaultCashAccountId || 0,
              minimumMemberAge: general.minimumMemberAge > 0 ? String(general.minimumMemberAge) : "",
              shareMoneyPercentageForLoan: general.shareMoneyPercentageForLoan > 0 ? String(general.shareMoneyPercentageForLoan) : "",
              bankFDMaturityReminder: general.bankFDMaturityReminder,
              bankFDMaturityReminderDays: general.bankFDMaturityReminderDays > 0 ? String(general.bankFDMaturityReminderDays) : "",
            }));
          }
          
          if (data.accountSettings) {
            const account = data.accountSettings;
            setSettingsData((prev) => ({
              ...prev,
              accountVerification: account.accountVerification,
              memberKYC: account.memberKYC,
              savingAccountLength: account.savingAccountLength > 0 ? String(account.savingAccountLength) : "",
              loanAccountLength: account.loanAccountLength > 0 ? String(account.loanAccountLength) : "",
              fdAccountLength: account.fdAccountLength > 0 ? String(account.fdAccountLength) : "",
              rdAccountLength: account.rdAccountLength > 0 ? String(account.rdAccountLength) : "",
              shareAccountLength: account.shareAccountLength > 0 ? String(account.shareAccountLength) : "",
            }));
          }
          
          if (data.voucherSettings) {
            const voucher = data.voucherSettings;
            setSettingsData((prev) => ({
              ...prev,
              voucherPrinting: voucher.voucherPrinting,
              singleVoucherEntry: voucher.singleVoucherEntry,
              voucherNumberSetting: voucher.voucherNumberSetting,
              autoVerification: voucher.autoVerification,
              receiptNoSetting: voucher.receiptNoSetting,
            }));
          }
          
          if (data.tdsSettings) {
            const tds = data.tdsSettings;
            setSettingsData((prev) => ({
              ...prev,
              bankFDTDSApplicability: tds.bankFDTDSApplicability,
              bankFDTDSRate: tds.bankFDTDSRate > 0 ? String(tds.bankFDTDSRate) : "",
              bankFDTDSDeductionFrequency: tds.bankFDTDSDeductionFrequency,
              bankFDTDSLedgerAccount: tds.bankFDTDSLedgerAccountId || 0,
            }));
          }
          
          if (data.printingSettings) {
            const printing = data.printingSettings;
            setSettingsData((prev) => ({
              ...prev,
              fdReceiptSetting: printing.fdReceiptSetting,
              rdCertificateSetting: printing.rdCertificateSetting,
            }));
          }
        }
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", "Failed to load required data", "error");
      }
    };

    fetchRequiredData();
  }, [user.branchid]);

  const handleInputChange = (field: string, value: any) => {
    setSettingsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    allowDecimal: boolean = false,
    maxLength: number = 10
  ) => {
    let value = e.target.value;
    
    if (allowDecimal) {
      value = value.replace(/[^0-9.]/g, "");
      const decimalIndex = value.indexOf(".");
      if (decimalIndex !== -1) {
        value = value.substring(0, decimalIndex + 3);
      }
    } else {
      value = value.replace(/[^0-9]/g, "");
    }
    
    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    
    handleInputChange(field, value);
  };

  const handleSubmit = async () => {
    const validation = validateForm(settingsData);

    if (!validation.isValid) {
      setShowValidationSummary(true);

      await Swal.fire({
        icon: "error",
        title: "Validation Errors",
        html: `
        <div class="text-left">
          <p class="mb-3">Please fix the following ${validation.errors.length} error(s):</p>
          <div class="max-h-48 overflow-y-auto text-sm">
            ${Object.entries(validation.errorsByTab)
              .map(
                ([tab, tabErrors]) => `
              <div class="mb-2">
                <strong class="text-blue-600">${tab.charAt(0).toUpperCase() + tab.slice(1)} Settings:</strong>
                <ul class="ml-4 list-disc">
                  ${(tabErrors as ValidationError[])
                    .slice(0, 3)
                    .map((error) => `<li class="text-red-600">${error.message}</li>`)
                    .join("")}
                  ${(tabErrors as ValidationError[]).length > 3
                    ? `<li class="text-gray-500">...and ${(tabErrors as ValidationError[]).length - 3} more</li>`
                    : ""}
                </ul>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `,
        confirmButtonText: "Fix Errors",
        customClass: {
          popup: "text-left",
        },
      });

      const firstError = validation.errors[0];
      if (firstError) {
        setActiveTab(firstError.tab);
      }
      return;
    }

    setLoading(true);
    try {
      const generalSettingsDTO: GeneralSettingsDTO = {
        BranchId: user.branchid,
        AdmissionFeeAccountId: Number(settingsData.admissionFeeAccount) || 0,
        AdmissionFeeAmount: Number(settingsData.admissionFeeAmount) || 0,
        DefaultCashAccountId: Number(settingsData.defaultCashAccount) || 0,
        MinimumMemberAge: Number(settingsData.minimumMemberAge) || 0,
        ShareMoneyPercentageForLoan: Number(settingsData.shareMoneyPercentageForLoan) || 0,
        BankFDMaturityReminder: settingsData.bankFDMaturityReminder,
        BankFDMaturityReminderDays: Number(settingsData.bankFDMaturityReminderDays) || 0,
      };

      const accountSettingsDTO: AccountSettingsDTO = {
        BranchId: user.branchid,
        AccountVerification: settingsData.accountVerification,
        MemberKYC: settingsData.memberKYC,
        SavingAccountLength: Number(settingsData.savingAccountLength) || 0,
        LoanAccountLength: Number(settingsData.loanAccountLength) || 0,
        FDAccountLength: Number(settingsData.fdAccountLength) || 0,
        RDAccountLength: Number(settingsData.rdAccountLength) || 0,
        ShareAccountLength: Number(settingsData.shareAccountLength) || 0,
      };

      const voucherSettingsDTO: VoucherSettingsDTO = {
        BranchId: user.branchid,
        VoucherPrinting: settingsData.voucherPrinting,
        SingleVoucherEntry: settingsData.singleVoucherEntry,
        VoucherNumberSetting: settingsData.voucherNumberSetting,
        AutoVerification: settingsData.autoVerification,
        ReceiptNoSetting: settingsData.receiptNoSetting,
      };

      const tdsSettingsDTO: TDSSettingsDTO = {
        BranchId: user.branchid,
        BankFDTDSApplicability: settingsData.bankFDTDSApplicability,
        BankFDTDSRate: Number(settingsData.bankFDTDSRate) || 0,
        BankFDTDSDeductionFrequency: settingsData.bankFDTDSDeductionFrequency,
        BankFDTDSLedgerAccountId: Number(settingsData.bankFDTDSLedgerAccount) || 0,
      };

      const printingSettingsDTO: PrintingSettingsDTO = {
        BranchId: user.branchid,
        FDReceiptSetting: settingsData.fdReceiptSetting,
        RDCertificateSetting: settingsData.rdCertificateSetting,
      };

      const dto: SettingsDTO = {
        generalSettings: generalSettingsDTO,
        accountSettings: accountSettingsDTO,
        voucherSettings: voucherSettingsDTO,
        tdsSettings: tdsSettingsDTO,
        printingSettings: printingSettingsDTO,
      };

      const res = await SettingsApiService.insert_settings(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.message || "Settings saved successfully!",
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setShowValidationSummary(false);
      } else {
        throw new Error(res.message || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to save settings. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    markFieldTouched(fieldName);
  };

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

  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const baseClassName = `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;

    if (activeTab === tabId) {
      return `${baseClassName} border-blue-500 text-blue-600 bg-blue-50`;
    } else if (hasTabErrors) {
      return `${baseClassName} border-red-300 text-red-600 hover:bg-red-50`;
    } else {
      return `${baseClassName} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "account", label: "Account", icon: CreditCard },
    { id: "voucher", label: "Voucher", icon: Receipt },
    { id: "tds", label: "TDS", icon: Calculator },
    { id: "printing", label: "Printing", icon: Printer },
  ];

  const accountOptions = generalAccounts.map((accounts) => ({
    value: accounts.accId,
    label: accounts.accountName,
  }));

  const voucherNumberOptions = [
    { value: 1, label: "Day Wise" },
    { value: 2, label: "Financial Year Wise" },
  ];

  const tdsDeductionFrequencyOptions = [
    { value: 1, label: "On FD Maturity" },
    { value: 2, label: "Monthly" },
    { value: 3, label: "Quarterly" },
    { value: 4, label: "Yearly" },
    { value: 5, label: "At Interest Posting" },
  ];

  // ✅ General Settings Tab
  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Fee & Financial Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="admissionFeeAccount"
            label="Admission Fee Account"
            required
            errors={errorsByField.admissionFeeAccount || []}
            icon={<Landmark className="w-4 h-4 text-green-500" />}
          >
            <Select
              id="admissionFeeAccount"
              instanceId="admission-fee-account-select"
              options={accountOptions}
              value={accountOptions.find((opt) => opt.value === Number(settingsData.admissionFeeAccount)) || null}
              onChange={(selected) => handleInputChange("admissionFeeAccount", selected ? selected.value : 0)}
              placeholder="Select Admission Fee Account"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>

          <FormField
            name="admissionFeeAmount"
            label="Admission Fee Amount"
            required
            errors={errorsByField.admissionFeeAmount || []}
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={settingsData.admissionFeeAmount}
              onChange={(e) => handleNumericInput(e, "admissionFeeAmount", true, 10)}
              onBlur={() => handleFieldBlur("admissionFeeAmount")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="0.00"
              inputMode="decimal"
              maxLength={10}
            />
          </FormField>

          <FormField
            name="defaultCashAccount"
            label="Default Cash Account"
            required
            errors={errorsByField.defaultCashAccount || []}
            icon={<DollarSign className="w-4 h-4 text-purple-500" />}
          >
            <Select
              id="defaultCashAccount"
              instanceId="default-cash-account-select"
              options={accountOptions}
              value={accountOptions.find((opt) => opt.value === Number(settingsData.defaultCashAccount)) || null}
              onChange={(selected) => handleInputChange("defaultCashAccount", selected ? selected.value : 0)}
              placeholder="Select Default Cash Account"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>
        </div>
      </div>

      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Member & Loan Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="minimumMemberAge"
            label="Minimum Member Age"
            required
            errors={errorsByField.minimumMemberAge || []}
            icon={<User className="w-4 h-4 text-blue-500" />}
          >
            <input
              type="text"
              value={settingsData.minimumMemberAge}
              onChange={(e) => handleNumericInput(e, "minimumMemberAge", false, 3)}
              onBlur={() => handleFieldBlur("minimumMemberAge")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 18"
              inputMode="numeric"
              maxLength={3}
            />
          </FormField>

          <FormField
            name="shareMoneyPercentageForLoan"
            label="Share Money % for Loan"
            required
            errors={errorsByField.shareMoneyPercentageForLoan || []}
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
          >
            <input
              type="text"
              value={settingsData.shareMoneyPercentageForLoan}
              onChange={(e) => handleNumericInput(e, "shareMoneyPercentageForLoan", true, 6)}
              onBlur={() => handleFieldBlur("shareMoneyPercentageForLoan")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10.00"
              inputMode="decimal"
              maxLength={6}
            />
          </FormField>

         <FormField
          name="bankFDMaturityReminder"
          label="Bank FD Maturity Reminder"
          errors={errorsByField.bankFDMaturityReminder || []}
          icon={<CheckSquare className="w-4 h-4 text-orange-500" />}
        >
          <div className="flex items-center space-x-3 mt-2">
            <input
              type="checkbox"
              id="bankFDMaturityReminder"
              checked={settingsData.bankFDMaturityReminder}
              onChange={(e) => {
                handleInputChange("bankFDMaturityReminder", e.target.checked);
                // Clear days field when unchecking
                if (!e.target.checked) {
                  handleInputChange("bankFDMaturityReminderDays", "");
                }
              }}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="bankFDMaturityReminder" className="text-sm font-medium text-gray-700 cursor-pointer">
              Enable Bank FD maturity reminders
            </label>
          </div>
        </FormField>

        {/* ✅ NEW: Conditionally show Bank FD Maturity Reminder Days field */}
        {settingsData.bankFDMaturityReminder && (
          <FormField
            name="bankFDMaturityReminderDays"
            label="Bank FD Maturity Reminder Days"
            required
            errors={errorsByField.bankFDMaturityReminderDays || []}
            icon={<Calendar className="w-4 h-4 text-blue-500" />}
          >
            <input
              type="text"
              value={settingsData.bankFDMaturityReminderDays}
              onChange={(e) => handleNumericInput(e, "bankFDMaturityReminderDays", false, 3)}
              onBlur={() => handleFieldBlur("bankFDMaturityReminderDays")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 30"
              inputMode="numeric"
              maxLength={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of days before FD maturity to send reminder
            </p>
          </FormField>
        )}
        </div>
      </div>
    </div>
  );

  // ✅ Account Settings Tab
  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Verification Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="accountVerification"
            label="Account Verification"
            errors={errorsByField.accountVerification || []}
            icon={<Verified className="w-4 h-4 text-blue-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="accountVerification"
                checked={settingsData.accountVerification}
                onChange={(e) => handleInputChange("accountVerification", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="accountVerification" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enable account verification before activation
              </label>
            </div>
          </FormField>

          <FormField
            name="memberKYC"
            label="Member KYC"
            errors={errorsByField.memberKYC || []}
            icon={<User className="w-4 h-4 text-purple-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="memberKYC"
                checked={settingsData.memberKYC}
                onChange={(e) => handleInputChange("memberKYC", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="memberKYC" className="text-sm font-medium text-gray-700 cursor-pointer">
                Require KYC verification for members
              </label>
            </div>
          </FormField>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Account Number Length Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="savingAccountLength"
            label="Saving Account Length"
            required
            errors={errorsByField.savingAccountLength || []}
          >
            <input
              type="text"
              value={settingsData.savingAccountLength}
              onChange={(e) => handleNumericInput(e, "savingAccountLength", false, 2)}
              onBlur={() => handleFieldBlur("savingAccountLength")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10"
              inputMode="numeric"
              maxLength={2}
            />
          </FormField>

          <FormField
            name="loanAccountLength"
            label="Loan Account Length"
            required
            errors={errorsByField.loanAccountLength || []}
          >
            <input
              type="text"
              value={settingsData.loanAccountLength}
              onChange={(e) => handleNumericInput(e, "loanAccountLength", false, 2)}
              onBlur={() => handleFieldBlur("loanAccountLength")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10"
              inputMode="numeric"
              maxLength={2}
            />
          </FormField>

          <FormField
            name="fdAccountLength"
            label="FD Account Length"
            required
            errors={errorsByField.fdAccountLength || []}
          >
            <input
              type="text"
              value={settingsData.fdAccountLength}
              onChange={(e) => handleNumericInput(e, "fdAccountLength", false, 2)}
              onBlur={() => handleFieldBlur("fdAccountLength")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10"
              inputMode="numeric"
              maxLength={2}
            />
          </FormField>

          <FormField
            name="rdAccountLength"
            label="RD Account Length"
            required
            errors={errorsByField.rdAccountLength || []}
          >
            <input
              type="text"
              value={settingsData.rdAccountLength}
              onChange={(e) => handleNumericInput(e, "rdAccountLength", false, 2)}
              onBlur={() => handleFieldBlur("rdAccountLength")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10"
              inputMode="numeric"
              maxLength={2}
            />
          </FormField>

          <FormField
            name="shareAccountLength"
            label="Share Account Length"
            required
            errors={errorsByField.shareAccountLength || []}
          >
            <input
              type="text"
              value={settingsData.shareAccountLength}
              onChange={(e) => handleNumericInput(e, "shareAccountLength", false, 2)}
              onBlur={() => handleFieldBlur("shareAccountLength")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g., 10"
              inputMode="numeric"
              maxLength={2}
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // ✅ Voucher Settings Tab (WITH AUTO VERIFICATION)
  const renderVoucherSettings = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Voucher Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="voucherPrinting"
            label="Voucher Printing"
            errors={errorsByField.voucherPrinting || []}
            icon={<Printer className="w-4 h-4 text-green-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="voucherPrinting"
                checked={settingsData.voucherPrinting}
                onChange={(e) => handleInputChange("voucherPrinting", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="voucherPrinting" className="text-sm font-medium text-gray-700 cursor-pointer">
                Print all vouchers (VR) automatically
              </label>
            </div>
          </FormField>

          <FormField
            name="singleVoucherEntry"
            label="Single Voucher Entry"
            errors={errorsByField.singleVoucherEntry || []}
            icon={<FileText className="w-4 h-4 text-purple-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="singleVoucherEntry"
                checked={settingsData.singleVoucherEntry}
                onChange={(e) => handleInputChange("singleVoucherEntry", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="singleVoucherEntry" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enable single voucher entry mode
              </label>
            </div>
          </FormField>

          <FormField
            name="voucherNumberSetting"
            label="Voucher Number Setting"
            required
            errors={errorsByField.voucherNumberSetting || []}
            icon={<Receipt className="w-4 h-4 text-blue-500" />}
          >
            <Select
              id="voucherNumberSetting"
              instanceId="voucher-number-setting-select"
              options={voucherNumberOptions}
              value={voucherNumberOptions.find((opt) => opt.value === settingsData.voucherNumberSetting) || null}
              onChange={(selected) => handleInputChange("voucherNumberSetting", selected ? selected.value : 0)}
              placeholder="Select Voucher Number Setting"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </FormField>

          {/* ✅ AUTO VERIFICATION - ADDED */}
          <FormField
            name="autoVerification"
            label="Auto Verification"
            errors={errorsByField.autoVerification || []}
            icon={<Verified className="w-4 h-4 text-green-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="autoVerification"
                checked={settingsData.autoVerification}
                onChange={(e) => handleInputChange("autoVerification", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="autoVerification" className="text-sm font-medium text-gray-700 cursor-pointer">
                Automatically verify vouchers when created
              </label>
            </div>
          </FormField>
          <FormField
            name="receiptNoSetting"
            label="Receipt No Setting"
            errors={errorsByField.receiptNoSetting || []}
            icon={<Receipt className="w-4 h-4 text-orange-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="receiptNoSetting"
                checked={settingsData.receiptNoSetting}
                onChange={(e) => handleInputChange("receiptNoSetting", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="receiptNoSetting" className="text-sm font-medium text-gray-700 cursor-pointer">
                Print receipt numbers
              </label>
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );

  // ✅ TDS Settings Tab
  const renderTDSSettings = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Bank FD TDS Configuration
        </h3>
        
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-orange-100">
            <FormField
              name="bankFDTDSApplicability"
              label="Enable TDS on Bank FD"
              errors={errorsByField.bankFDTDSApplicability || []}
              icon={<CheckSquare className="w-4 h-4 text-orange-500" />}
            >
              <div className="flex items-center space-x-3 mt-2">
                <input
                  type="checkbox"
                  id="bankFDTDSApplicability"
                  checked={settingsData.bankFDTDSApplicability}
                  onChange={(e) => {
                    handleInputChange("bankFDTDSApplicability", e.target.checked);
                    if (!e.target.checked) {
                      handleInputChange("bankFDTDSRate", "");
                      handleInputChange("bankFDTDSDeductionFrequency", 0);
                      handleInputChange("bankFDTDSLedgerAccount", 0);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label
                  htmlFor="bankFDTDSApplicability"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Enable TDS deduction on Bank Fixed Deposits
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-7">
                When enabled, TDS will be deducted based on the configured rate and frequency
              </p>
            </FormField>
          </div>

          {settingsData.bankFDTDSApplicability && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="bankFDTDSRate"
                  label="TDS Rate (%)"
                  required
                  errors={errorsByField.bankFDTDSRate || []}
                  icon={<DollarSign className="w-4 h-4 text-green-500" />}
                >
                  <input
                    type="text"
                    value={settingsData.bankFDTDSRate}
                    onChange={(e) => handleNumericInput(e, "bankFDTDSRate", true, 5)}
                    onBlur={() => handleFieldBlur("bankFDTDSRate")}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="e.g., 10.00"
                    inputMode="decimal"
                    maxLength={5}
                    disabled={!settingsData.bankFDTDSApplicability}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the TDS percentage (e.g., 10% or 20%)
                  </p>
                </FormField>

                <FormField
                  name="bankFDTDSDeductionFrequency"
                  label="TDS Deduction Frequency"
                  required
                  errors={errorsByField.bankFDTDSDeductionFrequency || []}
                  icon={<Calendar className="w-4 h-4 text-purple-500" />}
                >
                  <Select
                    id="bankFDTDSDeductionFrequency"
                    instanceId="bank-fd-tds-frequency-select"
                    options={tdsDeductionFrequencyOptions}
                    value={
                      tdsDeductionFrequencyOptions.find(
                        (opt) => opt.value === settingsData.bankFDTDSDeductionFrequency
                      ) || null
                    }
                    onChange={(selected) =>
                      handleInputChange("bankFDTDSDeductionFrequency", selected ? selected.value : 0)
                    }
                    placeholder="Select Deduction Frequency"
                    isClearable
                    isDisabled={!settingsData.bankFDTDSApplicability}
                    className="text-sm"
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When should TDS be deducted from FD interest
                  </p>
                </FormField>
              </div>

              <FormField
                name="bankFDTDSLedgerAccount"
                label="TDS Ledger Account"
                required
                errors={errorsByField.bankFDTDSLedgerAccount || []}
                icon={<Landmark className="w-4 h-4 text-blue-500" />}
              >
                <Select
                  id="bankFDTDSLedgerAccount"
                  instanceId="bank-fd-tds-ledger-select"
                  options={accountOptions}
                  value={
                    accountOptions.find(
                      (opt) => opt.value === Number(settingsData.bankFDTDSLedgerAccount)
                    ) || null
                  }
                  onChange={(selected) =>
                    handleInputChange("bankFDTDSLedgerAccount", selected ? selected.value : 0)
                  }
                  placeholder="Select TDS Ledger Account"
                  isClearable
                  isDisabled={!settingsData.bankFDTDSApplicability}
                  className="text-sm"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the ledger account where deducted TDS will be posted
                </p>
              </FormField>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ✅ Printing Settings Tab
  const renderPrintingSettings = () => (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Document Printing Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            name="fdReceiptSetting"
            label="FD Receipt Setting"
            errors={errorsByField.fdReceiptSetting || []}
            icon={<FileText className="w-4 h-4 text-blue-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="fdReceiptSetting"
                checked={settingsData.fdReceiptSetting}
                onChange={(e) => handleInputChange("fdReceiptSetting", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="fdReceiptSetting" className="text-sm font-medium text-gray-700 cursor-pointer">
                Print FD receipts when created
              </label>
            </div>
          </FormField>

          <FormField
            name="rdCertificateSetting"
            label="RD Certificate Setting"
            errors={errorsByField.rdCertificateSetting || []}
            icon={<FileText className="w-4 h-4 text-purple-500" />}
          >
            <div className="flex items-center space-x-3 mt-2">
              <input
                type="checkbox"
                id="rdCertificateSetting"
                checked={settingsData.rdCertificateSetting}
                onChange={(e) => handleInputChange("rdCertificateSetting", e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="rdCertificateSetting" className="text-sm font-medium text-gray-700 cursor-pointer">
                Print RD certificates when created
              </label>
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return renderAccountSettings();
      case "voucher":
        return renderVoucherSettings();
      case "tds":
        return renderTDSSettings();
      case "printing":
        return renderPrintingSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Settings className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      System Settings
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure all system settings and preferences
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(fieldName, tab) => {
                setActiveTab(tab);
              }}
              onClose={() => setShowValidationSummary(false)}
            />

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex space-x-0">
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
                        <span className="hidden sm:inline">{tab.label}</span>
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

              <div className="p-6 sm:p-8">{renderTabContent()}</div>

              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save All Settings
                      </>
                    )}
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

export default SettingsMaster;
