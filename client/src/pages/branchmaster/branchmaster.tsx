import React, { useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import BranchApiService, { BranchDTO } from "../../services/branch/branchapi";
import Swal from "sweetalert2";
import TehsilApiService from "../../services/location/tehsil/tehsilapi";
import { TehsilInfo, OptionType } from "../location/village/village-master";
import Select from "react-select";
import {
  FaPlus,
  FaTimes,
  FaBuilding,
  FaCode,
  FaGlobe,
  FaSave,
  FaArrowLeft,
  FaInfoCircle,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaCalendar,
  FaCity,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import { Village } from "../../services/location/village/villageapi";
import commonservice from "../../services/common/commonservice";
import { State } from "../../services/location/state/stateapi";

const BranchMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  // Form state
  const [societyId, setSocietyId] = React.useState(1 || 0);
  const [villages, setVillages] = React.useState<Village[]>([]);
  const [branchCode, setBranchCode] = React.useState("");
  const [branchName, setBranchName] = React.useState("");
  const [branchNameSL, setBranchNameSL] = React.useState("");
  const [addressLine, setAddressLine] = React.useState("");
  const [addressLineSL, setAddressLineSL] = React.useState("");
  const [addressType, setAddressType] = React.useState<number | null>(null);
  const [villageId, setStationId] = React.useState(0);
  const [phonePrefix1, setPhonePrefix1] = React.useState("+91");
  const [phoneNo1, setPhoneNo1] = React.useState("");
  const [phoneType1, setPhoneType1] = React.useState(0);
  const [phonePrefix2, setPhonePrefix2] = React.useState("+91");
  const [phoneNo2, setPhoneNo2] = React.useState("");
  const [phoneType2, setPhoneType2] = React.useState<number | null>(null);
  const [isMainBranch, setIsMainBranch] = React.useState(false);
  const [sequenceNo, setSequenceNo] = React.useState<number | null>(null);
  const [emailId, setEmailId] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [tehsilId, setTehsilId] = React.useState(0);
  const [gstinNo, setGstinNo] = React.useState("");
  const [gstNoIssueDate, setGstNoIssueDate] = React.useState("");
  const [stateId, setStateId] = React.useState(0);
  const [tehsils, setTehsils] = React.useState<TehsilInfo[]>([]);
  const [states, setStates] = React.useState<State[]>([]);

  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showValidation, setShowValidation] = React.useState(false);

  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const gstinRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const pincodeRegex = /^[0-9]{6}$/;
  const phoneRegex = /^[0-9]{10}$/;

  const handleBranchNameSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setBranchNameSL(inputText);
    }
  };

  useEffect(() => {
    const fetchAutoCompleteData = async () => {
      try {
        const villages = await commonservice.village_info(user.branchid);
        const villageData: Village[] = villages.data || [];
        setVillages(villageData);
        const tehsilsRes = await TehsilApiService.getAllTehsils(user.branchid);
        let tehsilInfo: TehsilInfo[] = tehsilsRes.data || [];
        setTehsils(tehsilInfo);
         const stateRes = await commonservice.get_states();
         setStates(stateRes.data || []);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", err.message || "Could not load types", "error");
      }
    };
    fetchAutoCompleteData();
  }, [user.branchid]);

  const handleAddressLineSLChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setAddressLineSL(inputText);
    }
  };

  const villageOptions = villages.map((type) => ({
    value: type.villageId,
    label: type.villageName,
  }));
  const tehsilData: OptionType[] = tehsils.map((tehsil) => ({
    value: tehsil.tehsilId,
    label: tehsil.tehsilName,
  }));
   const stateOptions: OptionType[] = states.map((tehsil) => ({
    value: tehsil.stateId,
    label: tehsil.stateName,
  }));

  // For phone numbers (10 digits max)
  const handlePhoneChange = (value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 10);
    setter(numericValue);
  };

  // For pincode (6 digits max)
  const handlePincodeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setPincode(numericValue);
  };

  // For branch code (alphanumeric but you can restrict to numbers if needed)
  const handleBranchCodeChange = (value: string) => {
    // If you want ONLY numbers:
    const numericValue = value.replace(/[^0-9]/g, "");
    setBranchCode(numericValue);

    // If you want alphanumeric (letters and numbers):
    // const alphanumericValue = value.replace(/[^A-Z0-9]/g, "");
    // setBranchCode(alphanumericValue);
  };
  const handleReset = () => {
    setBranchCode("");
    setBranchName("");
    setBranchNameSL("");
    setAddressLine("");
    setAddressLineSL("");
    setAddressType(null);
    setStationId(0);
    setPhonePrefix1("+91");
    setPhoneNo1("");
    setPhoneType1(0);
    setPhonePrefix2("+91");
    setPhoneNo2("");
    setPhoneType2(null);
    setIsMainBranch(false);
    setSequenceNo(null);
    setEmailId("");
    setPincode("");
    setTehsilId(0);
    setGstinNo("");
    setGstNoIssueDate("");
    setStateId(0);
    setError("");
    setLoading(false);
    setShowValidation(false);
    const branchNameInput = document.getElementById(
      "branchName"
    ) as HTMLInputElement;
    branchNameInput?.focus();
  };

  const validateForm = (): boolean => {
    if (!branchCode.trim()) return false;
    if (!branchName.trim()) return false;
    if (!addressLine.trim()) return false;
    if (!pincode.trim() || !pincodeRegex.test(pincode)) return false;
    if (stateId === 0) return false;
    if (villageId === 0) return false;
    if (tehsilId === 0) return false;
    if (!emailId.trim() || !emailRegex.test(emailId)) return false;
    if (!phonePrefix1.trim()) return false;
    if (!phoneNo1.trim() || !phoneRegex.test(phoneNo1)) return false;
    if (phoneType1 === 0) return false;
    if (!gstinNo.trim() || !gstinRegex.test(gstinNo)) return false;
    if (!gstNoIssueDate.trim()) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowValidation(true);

    if (!validateForm()) {
      setError("Please fill in all required fields correctly.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const branchDto: BranchDTO = {
        id: 0,
        societyId: societyId,
        code: branchCode,
        name: branchName,
        nameSL: branchNameSL || undefined,
        addressLine: addressLine,
        addressLineSL: addressLineSL || undefined,
        addressType: addressType || undefined,
        stationId: villageId,
        phonePrefix1: phonePrefix1,
        phoneNo1: phoneNo1,
        phoneType1: phoneType1,
        phonePrefix2: phonePrefix2 || undefined,
        phoneNo2: phoneNo2 || undefined,
        phoneType2: phoneType2 || undefined,
        isMainBranch: isMainBranch,
        sequenceNo: sequenceNo || undefined,
        emailId: emailId,
        pincode: pincode,
        tehsilId: tehsilId,
        gstinNo: gstinNo,
        gstNoIssueDate: gstNoIssueDate,
        stateId: stateId,
      };

      const response = await BranchApiService.add_new_branch(branchDto);

      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: response.message,
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          handleReset();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: response.message || "Failed to save branch.",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "An unexpected error occurred!",
        text: err.message || "Please check your network connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      enableScroll={true}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FaBuilding className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Branch Master
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                      Create and manage branch configurations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/branchmaster-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  <FaArrowLeft className="text-sm" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Form Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white text-sm" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Create New Branch
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fill in the branch details below
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaInfoCircle className="text-blue-500" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Branch Name */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="branchName"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                        Branch Name
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <FaBuilding className="text-sm" />
                        </div>
                        <input
                          type="text"
                          id="branchName"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          autoFocus={true}
                          maxLength={200}
                          className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                            showValidation && !branchName.trim()
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                          }`}
                          placeholder="Enter branch name"
                        />
                      </div>
                      {showValidation && !branchName.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Branch name is required
                        </span>
                      )}
                    </div>

                    {/* Branch Name SL */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="branchNameSL"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                        Branch Name (In SL)
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                          <FaGlobe className="text-sm" />
                        </div>
                        <input
                          type="text"
                          id="branchNameSL"
                          value={branchNameSL}
                          onChange={handleBranchNameSLChange}
                          maxLength={250}
                          className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                          placeholder="Enter branch name in Hindi/Devanagari"
                          lang="hi"
                        />
                      </div>
                    </div>

                    {/* Branch Code */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="branchCode"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                        Branch Code
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                          <FaCode className="text-sm" />
                        </div>
                        <input
                          type="text"
                          id="branchCode"
                          value={branchCode}
                          onChange={(e) =>
                            handleBranchCodeChange(e.target.value)
                          }
                          maxLength={20}
                          className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 font-mono ${
                            showValidation && !branchCode.trim()
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-gray-200 focus:border-purple-500 focus:ring-purple-100"
                          }`}
                          placeholder="Enter branch code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                      {showValidation && !branchCode.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Branch code is required
                        </span>
                      )}
                    </div>

                    {/* Email ID */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="emailId"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-red-500 rounded-full"></div>
                        Email ID
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors">
                          <FaEnvelope className="text-sm" />
                        </div>
                        <input
                          type="email"
                          id="emailId"
                          value={emailId}
                          onChange={(e) => setEmailId(e.target.value)}
                          maxLength={50}
                          className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                            showValidation &&
                            (!emailId.trim() || !emailRegex.test(emailId))
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-gray-200 focus:border-rose-500 focus:ring-rose-100"
                          }`}
                          placeholder="branch@example.com"
                        />
                      </div>
                      {showValidation && !emailId.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Email is required
                        </span>
                      )}
                      {showValidation &&
                        emailId.trim() &&
                        !emailRegex.test(emailId) && (
                          <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                            <FaTimes className="text-xs" />
                            Invalid email format
                          </span>
                        )}
                    </div>

                    {/* Is Main Branch */}
                    <div className="flex flex-col">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                        Main Branch
                      </label>
                      <div className="flex items-center h-full">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isMainBranch}
                            onChange={(e) => setIsMainBranch(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            {isMainBranch ? "Yes" : "No"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Sequence No */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="sequenceNo"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></div>
                        Sequence No
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="sequenceNo"
                        value={sequenceNo || ""}
                        onChange={(e) =>
                          setSequenceNo(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="Enter sequence number"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-blue-500" />
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Address Line */}
                    <div className="flex flex-col sm:col-span-2">
                      <label
                        htmlFor="addressLine"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                        Address Line
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        id="addressLine"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        maxLength={200}
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          showValidation && !addressLine.trim()
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-teal-500 focus:ring-teal-100"
                        }`}
                        placeholder="Enter complete address"
                      />
                      {showValidation && !addressLine.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Address is required
                        </span>
                      )}
                    </div>

                    {/* Address Line SL */}
                    <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                      <label
                        htmlFor="addressLineSL"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                        Address (In SL)
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="addressLineSL"
                        value={addressLineSL}
                        onChange={handleAddressLineSLChange}
                        maxLength={250}
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="Enter address in Hindi/Devanagari"
                        lang="hi"
                      />
                    </div>

                    {/* Pincode */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="pincode"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"></div>
                        Pincode
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        id="pincode"
                        value={pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        maxLength={6}
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          showValidation &&
                          (!pincode.trim() || !pincodeRegex.test(pincode))
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-violet-500 focus:ring-violet-100"
                        }`}
                        placeholder="Enter pincode"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      {showValidation && !pincode.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Pincode is required
                        </span>
                      )}
                      {showValidation &&
                        pincode.trim() &&
                        !pincodeRegex.test(pincode) && (
                          <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                            <FaTimes className="text-xs" />
                            Pincode must be 6 digits
                          </span>
                        )}
                    </div>

                    {/* State ID */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="stateId"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                        State
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <Select
                        id="stateId"
                        options={stateOptions}
                        value={
                          stateOptions.find(
                            (option) => option.value === stateId
                          ) || null
                        }
                        onChange={(selected) => {
                          setStateId(selected ? Number(selected.value) : 0);
                        }}
                        placeholder="Select State"
                        isClearable
                        className={`text-sm ${
                          showValidation && villageId === 0
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-lime-500 focus:ring-lime-100"
                        }`}
                      />
                      {showValidation && stateId === 0 && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          State is required
                        </span>
                      )}
                    </div>

                    {/* Station ID */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="villageId"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"></div>
                        Village
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <Select
                        id="villageId"
                        options={villageOptions}
                        value={
                          villageOptions.find(
                            (option) => option.value === villageId
                          ) || null
                        }
                        onChange={(selected) => {
                          setStationId(selected ? Number(selected.value) : 0);
                        }}
                        placeholder="Select Village"
                        isClearable
                        className={`text-sm ${
                          showValidation && villageId === 0
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-lime-500 focus:ring-lime-100"
                        }`}
                      />
                      {showValidation && villageId === 0 && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Village is required
                        </span>
                      )}
                    </div>

                    {/* Tehsil ID */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="tehsilId"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></div>
                        Tehsil
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <Select
                        id="tehsilId"
                        options={tehsilData}
                        value={
                          tehsilData.find(
                            (option) => option.value === tehsilId
                          ) || null
                        }
                        onChange={(e) => setTehsilId(Number(e?.value || 0))}
                        placeholder="Select Tehsil"
                        isClearable
                        className="text-sm"
                      ></Select>
                      {showValidation && tehsilId === 0 && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Tehsil is required
                        </span>
                      )}
                    </div>

                    {/* Address Type */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="addressType"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
                        Address Type
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <select
                        id="addressType"
                        value={addressType || ""}
                        onChange={(e) =>
                          setAddressType(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-300 text-gray-700 bg-gradient-to-r from-white to-gray-50"
                      >
                        <option value="">Select Address Type</option>
                        <option value="1">Permanent Address</option>
                        <option value="2">Current Address</option>
                        <option value="3">Correspondence Address</option>
                        <option value="4">Office Address</option>
                        <option value="5">Temporary Address</option>
                        <option value="6">Billing Address</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaPhone className="text-blue-500" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Phone 1 Prefix */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phonePrefix1"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                        Phone 1 Prefix
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        id="phonePrefix1"
                        value={phonePrefix1}
                        onChange={(e) => setPhonePrefix1(e.target.value)}
                        maxLength={5}
                        readOnly
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          showValidation && !phonePrefix1.trim()
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-green-500 focus:ring-green-100"
                        }`}
                        placeholder="+91"
                      />
                      {showValidation && !phonePrefix1.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Phone prefix is required
                        </span>
                      )}
                    </div>

                    {/* Phone Number 1 */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phoneNo1"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                        Phone Number 1
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        id="phoneNo1"
                        value={phoneNo1}
                        onChange={(e) =>
                          handlePhoneChange(e.target.value, setPhoneNo1)
                        }
                        maxLength={10}
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          showValidation &&
                          (!phoneNo1.trim() || !phoneRegex.test(phoneNo1))
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-green-500 focus:ring-green-100"
                        }`}
                        placeholder="Enter phone number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      {showValidation && !phoneNo1.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Phone number is required
                        </span>
                      )}
                      {showValidation &&
                        phoneNo1.trim() &&
                        !phoneRegex.test(phoneNo1) && (
                          <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                            <FaTimes className="text-xs" />
                            Phone number must be 10 digits
                          </span>
                        )}
                    </div>

                    {/* Phone Type 1 */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phoneType1"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                        Phone Type 1
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <select
                        id="phoneType1"
                        value={phoneType1}
                        onChange={(e) =>
                          setPhoneType1(parseInt(e.target.value))
                        }
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 bg-gradient-to-r from-white to-gray-50 ${
                          showValidation && phoneType1 === 0
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-green-500 focus:ring-green-100"
                        }`}
                      >
                        <option value="">Select Phone Type</option>
                        <option value="1">Mobile</option>
                        <option value="2">Home</option>
                        <option value="3">Office</option>
                        <option value="4">Landline</option>
                      </select>
                      {showValidation && phoneType1 === 0 && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          Phone type is required
                        </span>
                      )}
                    </div>

                    {/* Phone 2 Prefix */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phonePrefix2"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                        Phone 2 Prefix
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="phonePrefix2"
                        value={phonePrefix2}
                        onChange={(e) => setPhonePrefix2(e.target.value)}
                        maxLength={5}
                        readOnly
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="+91"
                      />
                    </div>

                    {/* Phone Number 2 */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phoneNo2"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                        Phone Number 2
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="phoneNo2"
                        value={phoneNo2}
                        onChange={(e) =>
                          handlePhoneChange(e.target.value, setPhoneNo2)
                        }
                        maxLength={10}
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="Enter phone number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>

                    {/* Phone Type 2 */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="phoneType2"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"></div>
                        Phone Type 2
                        <span className="text-gray-500 text-xs">
                          (Optional)
                        </span>
                      </label>
                      <select
                        id="phoneType2"
                        value={phoneType2 || ""}
                        onChange={(e) =>
                          setPhoneType2(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all duration-300 text-gray-700 bg-gradient-to-r from-white to-gray-50"
                      >
                        <option value="">Select Phone Type</option>
                        <option value="1">Mobile</option>
                        <option value="2">Home</option>
                        <option value="3">Office</option>
                        <option value="4">Landline</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* GST Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaFileInvoiceDollar className="text-blue-500" />
                    GST Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* GSTIN Number */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="gstinNo"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                        GSTIN Number
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <input
                        type="text"
                        id="gstinNo"
                        value={gstinNo}
                        onChange={(e) =>
                          setGstinNo(e.target.value.toUpperCase())
                        }
                        maxLength={25}
                        className={`w-full px-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 font-mono uppercase ${
                          showValidation &&
                          (!gstinNo.trim() || !gstinRegex.test(gstinNo))
                            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-orange-500 focus:ring-orange-100"
                        }`}
                        placeholder="Enter GSTIN"
                      />
                      {showValidation && !gstinNo.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          GSTIN is required
                        </span>
                      )}
                      {showValidation &&
                        gstinNo.trim() &&
                        !gstinRegex.test(gstinNo) && (
                          <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                            <FaTimes className="text-xs" />
                            Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)
                          </span>
                        )}
                    </div>

                    {/* GST Issue Date */}
                    <div className="flex flex-col">
                      <label
                        htmlFor="gstNoIssueDate"
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                        GST Issue Date
                        <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                          <FaCalendar className="text-sm" />
                        </div>
                        <input
                          type="date"
                          id="gstNoIssueDate"
                          value={gstNoIssueDate}
                          max={commonservice.getTodaysDate()}
                          onChange={(e) => setGstNoIssueDate(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 bg-gradient-to-r from-white to-gray-50 ${
                            showValidation && !gstNoIssueDate.trim()
                              ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                              : "border-gray-200 focus:border-orange-500 focus:ring-orange-100"
                          }`}
                        />
                      </div>
                      {showValidation && !gstNoIssueDate.trim() && (
                        <span className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                          <FaTimes className="text-xs" />
                          GST issue date is required
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <p className="text-red-600 text-sm flex items-center gap-2">
                      <FaTimes className="text-xs" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                  >
                    <FaTimes className="text-sm" />
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        Save Branch
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default BranchMaster;
