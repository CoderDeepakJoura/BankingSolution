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
} from "../../services/settings/settingsapi";
import {
  Settings,
  Receipt,
  Save,
  RotateCcw,
  ArrowLeft,
  CheckSquare,
  DollarSign,
  Building,
  User,
  Globe,
  Verified,
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
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();
  const [generalAccounts, setGeneralAccounts] = useState<AccountMaster[]>([]);
  // State management
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);

  // ✅ Settings form data
  const [settingsData, setSettingsData] = useState({
    // General Settings
    admissionFeeAccount: 0,
    admissionFeeAmount: "",
    // Voucher Settings

    autoVerifyVouchers: false,
  });

  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const response = await commonservice.general_accmasters_info(
          user.branchid
        );
        if (response.success && response.data) {
          const accounts: AccountMaster[] = response.data;
          setGeneralAccounts(accounts);
        } else {
          throw new Error(response.message || "Failed to fetch general accounts info.");
        }

        const settingsResponse = await SettingsApiService.fetch_settings(
          user.branchid
        );
        if (settingsResponse.success && settingsResponse.data) {
          const data = settingsResponse.data; 
          if(data.generalSettings) {
            const generalSettingsDTO = data.generalSettings;
            setSettingsData((prev) => ({
              ...prev,
              admissionFeeAccount: generalSettingsDTO.admissionFeeAccountId,
              admissionFeeAmount: generalSettingsDTO.admissionFeeAmount > 0 ? String(generalSettingsDTO.admissionFeeAmount) : "",
            }));
          }
          if(data.voucherSettings) {
            const voucherSettingsDTO = data.voucherSettings;
            setSettingsData((prev) => ({
              ...prev,
              autoVerifyVouchers: voucherSettingsDTO.autoVerification,
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

  // ✅ Handle numeric input with decimal validation for admission fee amount
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");

    // Restrict to 2 decimal places
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1) {
      value = value.substring(0, decimalIndex + 3);
    }

    handleInputChange("admissionFeeAmount", value);
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
          <p class="mb-3">Please fix the following ${
            validation.errors.length
          } error(s):</p>
          <div class="max-h-48 overflow-y-auto text-sm">
            ${Object.entries(validation.errorsByTab)
              .map(
                ([tab, tabErrors]) => `
              <div class="mb-2">
                <strong class="text-blue-600">${
                  tab.charAt(0).toUpperCase() + tab.slice(1)
                } Settings:</strong>
                <ul class="ml-4 list-disc">
                  ${(tabErrors as ValidationError[])
                    .slice(0, 3)
                    .map(
                      (error) => `
                    <li class="text-red-600">${error.message}</li>
                  `
                    )
                    .join("")}
                  ${
                    (tabErrors as ValidationError[]).length > 3
                      ? `<li class="text-gray-500">...and ${
                          (tabErrors as ValidationError[]).length - 3
                        } more</li>`
                      : ""
                  }
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

      // Focus first error field
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

      return;
    }

    setLoading(true);
    try {
      // Create General Settings DTO
      const generalSettingsDTO: GeneralSettingsDTO = {
        BranchId: user.branchid,
        AdmissionFeeAccountId: Number(settingsData.admissionFeeAccount) || 0,
        AdmissionFeeAmount: Number(settingsData.admissionFeeAmount) || 0,
      };

      // Create Voucher Settings DTO
      const voucherSettingsDTO: VoucherSettingsDTO = {
        AutoVerification: settingsData.autoVerifyVouchers,
      };

      // Create final DTO
      const dto: SettingsDTO = {
        generalSettings: generalSettingsDTO,
        voucherSettings: voucherSettingsDTO,
      };
      // Call API
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

  // Group errors by field and tab
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

  const handleReset = () => {
    setSettingsData({
      admissionFeeAccount: 0,
      admissionFeeAmount: "",
      autoVerifyVouchers: false,
    });
    setActiveTab("general");
    clearErrors();
    setShowValidationSummary(false);
  };

  // Tab styling
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

  // ✅ Tab configuration
  const tabs = [
    { id: "general", label: "General Settings", icon: Settings },
    { id: "voucher", label: "Voucher Settings", icon: Receipt },
  ];

  const accountOptions = generalAccounts.map((accounts) => ({
    value: accounts.accId,
    label: accounts.accountName,
  }));

  // ✅ General Settings Tab Content
  const renderGeneralSettings = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FormField
        name="admissionFeeAccount"
        label="Admission Fee Account"
        required
        errors={errorsByField.admissionFeeAccount || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <Select
          id="admissionFeeAccount"
          options={accountOptions}
          value={
            accountOptions.find(
              (option) =>
                option.value === Number(settingsData.admissionFeeAccount)
            ) || null
          }
          onChange={(selected) => {
            handleInputChange(
              "admissionFeeAccount",
              selected ? selected.value : 0
            );
          }}
          placeholder="Select Admission Fee Account"
          isClearable
          autoFocus={activeTab === "general"}
          required
          className="text-sm"
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
          onChange={handleAmountChange}
          onBlur={() => handleFieldBlur("admissionFeeAmount")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="0.00"
          pattern="^\d*(\.\d{0,2})?$"
          inputMode="decimal"
          required
          maxLength={15}
        />
      </FormField>
    </div>
  );

  // ✅ Voucher Settings Tab Content
  const renderVoucherSettings = () => (
    <div className="space-y-8">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Voucher Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FormField
              name="autoVerifyVouchers"
              label="Auto-Verify Vouchers"
              errors={errorsByField.autoVerifyVouchers || []}
              icon={<Verified className="w-4 h-4 text-blue-500" />}
            >
              <div className="flex items-center space-x-3 mt-2">
                <input
                  type="checkbox"
                  id="autoVerifyVouchers"
                  checked={settingsData.autoVerifyVouchers}
                  onChange={(e) =>
                    handleInputChange("autoVerifyVouchers", e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label
                  htmlFor="autoVerifyVouchers"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Automatically verify vouchers when created
                </label>
              </div>
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "voucher":
        return renderVoucherSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Settings className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Settings Master
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Configure system settings and preferences
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Validation Summary */}
            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(fieldName, tab) => {
                setActiveTab(tab);
              }}
              onClose={() => setShowValidationSummary(false)}
            />

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-0 overflow-x-auto">
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
              <div className="p-6 sm:p-8">{renderTabContent()}</div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  {/* <button
                    onClick={handleReset}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Form
                  </button> */}
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
                        Save Settings
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
