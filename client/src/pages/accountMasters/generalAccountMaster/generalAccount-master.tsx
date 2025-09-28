import React, { useState, useRef, useEffect } from "react";
import { useFormValidation } from "../../../services/Validations/accountMasters/generalaccmastervalidation";
import { ValidationSummary } from "../../../components/Validations/ValidationSummary";
import { FormField } from "../../../components/Validations/FormField";
import Swal from "sweetalert2";
import { ValidationError } from "../../../services/Validations/validation";
import Select from "react-select";
import GeneralAccountApiService, {
  CommonAccMasterDTO,
  AccountMasterDTO,
  GSTInfoDTO,
} from "../../../services/accountMasters/generalAccountMaster/generalAccServiceapi";
import {
  User,
  CreditCard,
  Save,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  Globe,
  PenSquare,
  Heading,
} from "lucide-react";
import { AccountHead } from "../../accounthead/accounthead/accounthead-master";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import { State } from "../../../services/common/commonservice";

const GeneralAccountMaster = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();
  useEffect(() => {
    const fetchAccountHeadsAndStates = async () => {
      try {
        const res = await AccountHeadApiService.fetchaccountheads(
          user.branchid
        );
        if (!res.success) throw new Error("Failed to load Account Heads");
        const parentData: AccountHead[] = res.data || [];
        setaccountHeads(parentData);
        const statedata = await commonservice.get_states();
        if (!res.success) throw new Error("Failed to load States.");
        const stateinfo: State[] = statedata.data || [];
        setstates(stateinfo);
      } catch (err: any) {
        console.error(err);
        Swal.fire(
          "Error",
          err.message || "Could not load accountHeads",
          "error"
        );
      }
    };
    fetchAccountHeadsAndStates();
  }, [user.branchid]);

  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [accountHeads, setaccountHeads] = useState<AccountHead[]>([]);
  const [states, setstates] = useState<State[]>([]);
  const [accountHeadId, setaccountHeadId] = useState("");
  // Basic Information State
  const [accMasterData, setAccMasterData] = useState({
    firstName: "",
    lastName: "",
    firstNameSL: "",
    lastNameSL: "",
    stateId: 0,
    gstiNo: "",
    accounthead: "",
    accountNumber: "",
  });

  const handleInputChange = (field: any, value: any) => {
    setAccMasterData((prev) => ({ ...prev, [field]: value }));
  };

  // Enhanced handleSubmit with validation
  const handleSubmit = async () => {
    console.log(accMasterData);
    const validation = validateForm(accMasterData);

    if (!validation.isValid) {
      setShowValidationSummary(true);

      // SweetAlert with grouped errors
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
                }:</strong>
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

    // ✅ Proceed with API call
    setLoading(true);
    try {
      const selectedAccountHead = accountHeads.find(
        (head) => String(head.accountHeadId) === accMasterData.accounthead
      );
      const selectedState = states.find(
        (state) => state.stateId === accMasterData.stateId
      );

      // Create AccountMasterDTO
      const accountMasterDTO: AccountMasterDTO = {
        branchId: user.branchid,
        headId: Number(accMasterData.accounthead),
        headCode:
          selectedAccountHead?.accountHeadName.split("-")[0] ||
          accMasterData.accounthead.split("-")[0],
        accTypeId: 3,
        accountNumber: accMasterData.accountNumber,
        accountName:
          `${accMasterData.firstName.trim()} ${accMasterData.lastName.trim()}`.trim(),
        accountNameSL:
          accMasterData.firstNameSL && accMasterData.lastNameSL
            ? `${accMasterData.firstNameSL.trim()} ${accMasterData.lastNameSL.trim()}`.trim()
            : undefined,
        memberId: 0,
        memberBranchId: 0,
        accOpeningDate: new Date().toISOString(),
        isAccClosed: false,
      };

      // Create GSTInfoDTO only if GST details are provided
      let gstInfoDTO: GSTInfoDTO | undefined;
      if (accMasterData.gstiNo || selectedState) {
        gstInfoDTO = {
          branchId: user.branchid,
          accId: 0, // Will be set by backend after account creation
          stateId: selectedState != null ? Number(selectedState?.stateId) : 0,
          gstInNo: accMasterData.gstiNo,
        };
      }

      // Create final DTO
      const dto: CommonAccMasterDTO = {
        accountMasterDTO,
        gstInfoDTO,
      };

      // Call API
      const res = await GeneralAccountApiService.createGeneralAccount(dto);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.data?.message || "General Account saved successfully!",
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setShowValidationSummary(false);
        handleReset(); // reset form after save
      } else {
        throw new Error(res.message || "Failed to save General Account");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          error.message || "Failed to add General Account. Please try again.",
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
    setAccMasterData({
      firstName: "",
      lastName: "",
      firstNameSL: "",
      lastNameSL: "",
      gstiNo: "",
      stateId: 0,
      accounthead: "",
      accountNumber: "",
    });
    setActiveTab("basic");
    setaccountHeadId("");
    clearErrors();
    setShowValidationSummary(false);
  };

  // Add error indicators to tabs
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
    { id: "GSTInfo", label: "GST Info", icon: CreditCard },
  ];
  const accountHeadOptions = accountHeads.map((parent) => ({
    value: String(parent.accountHeadId),
    label: parent.accountHeadName,
  }));

   const stateOptions = states.map((data) => ({
    value: data.stateId,
    label: data.stateName,
  }));
  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FormField
        name="accounthead"
        label="Account Head"
        required
        errors={errorsByField.accounthead || []}
        icon={<Heading className="w-4 h-4 text-green-500" />}
      >
        <Select
          id="accounthead"
          options={accountHeadOptions}
          value={
            accountHeadOptions.find(
              (option) => option.value === accMasterData.accounthead
            ) || null
          }
          onChange={(selected) =>
            handleInputChange("accounthead", selected ? selected.value : "")
          }
          placeholder="Select Account Head"
          isClearable
          autoFocus={true}
          required
          className="text-sm"
        />
      </FormField>
      <FormField
        name="accountNumber"
        label="Account Number"
        required
        errors={errorsByField.accountNumber || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={accMasterData.accountNumber}
          onChange={(e) => handleInputChange("accountNumber", e.target.value)}
          onBlur={() => handleFieldBlur("accountNumber")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Account Number"
          required
          maxLength={20}
        />
      </FormField>
      <FormField
        name="firstName"
        label="First Name"
        required
        errors={errorsByField.firstName || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={accMasterData.firstName}
          onChange={(e) => handleInputChange("firstName", e.target.value)}
          onBlur={() => handleFieldBlur("firstName")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter First Name"
          required
          maxLength={100}
        />
      </FormField>

      <FormField
        name="lastName"
        label="Last Name"
        errors={errorsByField.lastName || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={accMasterData.lastName}
          onChange={(e) => handleInputChange("lastName", e.target.value)}
          onBlur={() => handleFieldBlur("lastName")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Last Name"
          maxLength={100}
        />
      </FormField>

      <FormField
        name="firstNameSL"
        label="First Name (Hindi)"
        errors={errorsByField.firstNameSL || []}
        icon={<Globe className="w-4 h-4 text-purple-500" />}
      >
        <input
          type="text"
          value={accMasterData.firstNameSL}
          onChange={(e) => handleInputChange("firstNameSL", e.target.value)}
          onBlur={() => handleFieldBlur("firstNameSL")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="हिंदी में प्रथम नाम"
          maxLength={100}
          lang="hi"
        />
      </FormField>

      <FormField
        name="lastNameSL"
        label="Last Name (Hindi)"
        errors={errorsByField.lastNameSL || []}
        icon={<Globe className="w-4 h-4 text-purple-500" />}
      >
        <input
          type="text"
          value={accMasterData.lastNameSL}
          onChange={(e) => handleInputChange("lastNameSL", e.target.value)}
          onBlur={() => handleFieldBlur("lastNameSL")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="हिंदी में अंतिम नाम"
          maxLength={100}
          lang="hi"
        />
      </FormField>
    </div>
  );

  const renderGSTInfo = () => (
    <div className="space-y-8">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <PenSquare className="w-5 h-5" />
          GST Info
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            name="stateId"
            label="State"
            required
            errors={errorsByField.stateid || []}
            icon={<Heading className="w-4 h-4 text-green-500" />}
          >
            <Select
              id="stateId"
              options={stateOptions}
              value={
                stateOptions.find(
                  (option) => option.value === accMasterData.stateId
                ) || null
              }
              onChange={(selected) =>
                handleInputChange("stateId", selected ? selected.value : "")
              }
              placeholder="Select State"
              isClearable
              autoFocus={true}
              required
              className="text-sm"
            />
          </FormField>

          <div className="lg:col-span-2">
            <FormField
              name="gstiNo"
              label="GSTIN No"
              errors={errorsByField.gstiNo || []}
            >
              <input
                type="text"
                value={accMasterData.gstiNo}
                onChange={(e) => handleInputChange("gstiNo", e.target.value)}
                onBlur={() => handleFieldBlur("gstiNo")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter GSTIN No (e.g. 29ABCDE1234F1Z5)"
                maxLength={16}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "GSTInfo":
        return renderGSTInfo();
      default:
        return renderBasicInfo();
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
                    <UserCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      General Account Master
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/account-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Add Validation Summary */}
            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(fieldName, tab) => {
                setActiveTab(tab);
              }}
              onClose={() => setShowValidationSummary(false)}
            />

            {/* Tab Navigation with Error Indicators */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Form
                  </button>
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
                        Save General Account
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

export default GeneralAccountMaster;
