import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaPlus, FaTimes, FaMapMarkerAlt, FaGlobe, FaSave, FaArrowLeft, FaInfoCircle, FaBuilding, FaCode, FaEnvelope, FaChevronDown, FaSearch } from "react-icons/fa";

import DashboardLayout from "../../../Common/Layout";
import VillageApiService from "../../../services/location/village/villageapi";
import ZoneApiService from "../../../services/location/zone/zoneapi";
import ThanaApiService from "../../../services/location/thana/thanaapi";
import PostOfficeApiService from "../../../services/location/PostOffice/postOfficeapi";
import TehsilApiService from "../../../services/location/tehsil/tehsilapi";
import PatwarApiService from "../../../services/location/Patwar/Patwarapi";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Select, { SingleValue } from "react-select";

interface ZoneInfo {
  zoneId: number;
  zoneName: string;
}

interface ThanaInfo {
  thanaId: number;
  thanaName: string;
}

interface PostOfficeInfo {
  postOfficeId: number;
  postOfficeName: string;
}

export interface TehsilInfo {
  tehsilId: number;
  tehsilName: string;
}

interface PatwarInfo {
  patwarId: number;
  description: string;
}

export interface OptionType {
  value: number;
  label: string;
}

// Validation error state interface
interface ValidationErrors {
  villageName?: string;
  villageNameSL?: string;
  zone?: string;
  thana?: string;
  postOffice?: string;
  tehsil?: string;
  pincode?: string;
  general?: string;
  patwar?: string;
}

const VillageMaster = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State for form inputs
  const [villageName, setVillageName] = useState<string>("");
  const [villageNameSL, setVillageNameSL] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<number>(0);
  const [selectedThana, setSelectedThana] = useState<number>(0);
  const [selectedPostOffice, setSelectedPostOffice] = useState<number>(0);
  const [selectedPatwar, setSelectedPatwar] = useState<number>(0);
  const [selectedTehsil, setSelectedTehsil] = useState<number>(0);
  const [pincode, setPincode] = useState<string>("");

  // State for dropdown data
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [thanas, setThanas] = useState<ThanaInfo[]>([]);
  const [postOffices, setPostOffices] = useState<PostOfficeInfo[]>([]);
  const [tehsils, setTehsils] = useState<TehsilInfo[]>([]);
  const [patwars, setPatwar] = useState<PatwarInfo[]>([]);

  // State for UI/form management - CHANGED TO OBJECT
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Regex for Hindi/Devanagari script validation
  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

  // Handles pincode input - only allows 6 digits
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow digits and max 6 characters
    if (/^\d{0,6}$/.test(value)) {
      setPincode(value);
      // Clear pincode error when user types valid input
      setErrors(prev => ({ ...prev, pincode: undefined }));
    }
  };

  // Handles input change for Hindi script field with validation
  const handleVillageNameSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setVillageNameSL(inputText);
      setErrors(prev => ({ ...prev, villageNameSL: undefined }));
    } else {
      setErrors(prev => ({ 
        ...prev, 
        villageNameSL: "Please enter only Hindi characters (Devanagari script)." 
      }));
    }
  };

  // Handles village name change
  const handleVillageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVillageName(e.target.value);
    setErrors(prev => ({ ...prev, villageName: undefined }));
  };

  // Resets the form to its initial state
  const handleReset = () => {
    setVillageName("");
    setVillageNameSL("");
    setSelectedZone(0);
    setSelectedThana(0);
    setSelectedPostOffice(0);
    setSelectedTehsil(0);
    setSelectedPatwar(0);
    setPincode("");
    setErrors({});
    inputRef.current?.focus();
    setLoading(false);
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate village name
    if (!villageName.trim()) {
      newErrors.villageName = "Village name is required.";
    } else if (villageName.trim().length < 2) {
      newErrors.villageName = "Village name must be at least 2 characters.";
    }

    // Validate zone
    if (selectedZone === 0) {
      newErrors.zone = "Please select a Zone.";
    }

    // Validate thana
    if (selectedThana === 0) {
      newErrors.thana = "Please select a Thana.";
    }

    // Validate post office
    if (selectedPostOffice === 0) {
      newErrors.postOffice = "Please select a Post Office.";
    }

    // Validate tehsil
    if (selectedTehsil === 0) {
      newErrors.tehsil = "Please select a Tehsil.";
    }

    if (selectedPatwar === 0) {
      newErrors.patwar = "Please select a Patwar.";
    }

    // Validate pincode
    if (!pincode) {
      newErrors.pincode = "Pincode is required.";
    } else if (pincode.length !== 6) {
      newErrors.pincode = "Pincode must be exactly 6 digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch dropdown data on component mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const zonesRes = await ZoneApiService.getAllZones(user.branchid);
        const thanasRes = await ThanaApiService.getAllThanas(user.branchid);
        const postOfficesRes = await PostOfficeApiService.getAllPostOffices(user.branchid);
        const tehsilsRes = await TehsilApiService.getAllTehsils(user.branchid);
        const patwarInfo = await PatwarApiService.getAllPatwars(user.branchid);
        
        setZones(zonesRes.data || []);
        setThanas(thanasRes.data || []);
        setPostOffices(postOfficesRes.data || []);
        setTehsils(tehsilsRes.data || []);
        setPatwar(patwarInfo.data || [])
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
        Swal.fire({
          icon: "error",
          title: "Data Fetch Error",
          text: "Failed to load location data. Please try again.",
        });
      }
    };

    fetchDropdownData();
  }, [user.branchid]);

  // Handles form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      // Show error toast
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please fill in all required fields correctly.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await VillageApiService.add_new_village(
        villageName,
        villageNameSL,
        selectedZone,
        selectedThana,
        selectedPostOffice,
        selectedTehsil,
        Number(user.branchid),
        Number(pincode),
        selectedPatwar
      );

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
          text: response.message || "Failed to save Village.",
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

  // react-select onChange handlers
  const handleZoneChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedZone(selectedOption ? selectedOption.value : 0);
    setErrors(prev => ({ ...prev, zone: undefined }));
  };

  const handleThanaChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedThana(selectedOption ? selectedOption.value : 0);
    setErrors(prev => ({ ...prev, thana: undefined }));
  };

  const handlePostOfficeChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedPostOffice(selectedOption ? selectedOption.value : 0);
    setErrors(prev => ({ ...prev, postOffice: undefined }));
  };

  const handleTehsilChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedTehsil(selectedOption ? selectedOption.value : 0);
    setErrors(prev => ({ ...prev, tehsil: undefined }));
  };

   const handlePatwarChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedPatwar(selectedOption ? selectedOption.value : 0);
    setErrors(prev => ({ ...prev, patwar: undefined }));
  };

  // Memoized options
  const zoneData: OptionType[] = zones.map((zone) => ({
    value: zone.zoneId,
    label: zone.zoneName,
  }));

  const thanaData: OptionType[] = thanas.map((thana) => ({
    value: thana.thanaId,
    label: thana.thanaName,
  }));

  const postOfficeData: OptionType[] = postOffices.map((postOffice) => ({
    value: postOffice.postOfficeId,
    label: postOffice.postOfficeName,
  }));

  const tehsilData: OptionType[] = tehsils.map((tehsil) => ({
    value: tehsil.tehsilId,
    label: tehsil.tehsilName,
  }));

   const patwarData: OptionType[] = patwars.map((patwar) => ({
    value: patwar.patwarId,
    label: patwar.description,
  }));

  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Village Master
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/Village-operations")}
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
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Create New Village</h2>
                    <p className="text-sm text-gray-600">Fill in the Village details below</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  {/* Village Name Field */}
                  <div className="flex flex-col">
                    <label htmlFor="villageName" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                      Village Name
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <FaMapMarkerAlt className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="villageName"
                        ref={inputRef}
                        value={villageName}
                        onChange={handleVillageNameChange}
                        autoFocus={true}
                        maxLength={50}
                        className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          errors.villageName
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                        placeholder="Enter Village name"
                      />
                    </div>
                    {errors.villageName ? (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.villageName}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaInfoCircle />
                        Descriptive name for the Village (max 50 characters)
                      </p>
                    )}
                  </div>

                  {/* Village Name SL Field */}
                  <div className="flex flex-col">
                    <label htmlFor="villageNameSL" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                      Village Name (In SL)
                      <span className="text-emerald-600 text-xs font-medium">(Hindi/Devanagari)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                        <FaGlobe className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="villageNameSL"
                        value={villageNameSL}
                        onChange={handleVillageNameSLChange}
                        maxLength={50}
                        className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          errors.villageNameSL
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                        placeholder="Enter Village name in Hindi/Devanagari"
                        lang="hi"
                      />
                    </div>
                    {errors.villageNameSL ? (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.villageNameSL}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaInfoCircle />
                        Optional field for Hindi/Devanagari script (max 50 characters)
                      </p>
                    )}
                  </div>

                  {/* Zone Field */}
                  <div className="flex flex-col">
                    <label htmlFor="zone" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                      Zone
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      id="ZoneInfo"
                      options={zoneData}
                      value={zoneData.find((option) => option.value === selectedZone) || null}
                      onChange={handleZoneChange}
                      placeholder="Select Zone"
                      isClearable
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.zone ? '#fca5a5' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.zone ? '#fca5a5' : base.borderColor,
                          },
                        }),
                      }}
                    />
                    {errors.zone && (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.zone}
                      </p>
                    )}
                  </div>

                  {/* Thana Field */}
                  <div className="flex flex-col">
                    <label htmlFor="thana" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                      Thana
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      id="ThanaInfo"
                      options={thanaData}
                      value={thanaData.find((option) => option.value === selectedThana) || null}
                      onChange={handleThanaChange}
                      placeholder="Select Thana"
                      isClearable
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.thana ? '#fca5a5' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.thana ? '#fca5a5' : base.borderColor,
                          },
                        }),
                      }}
                    />
                    {errors.thana && (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.thana}
                      </p>
                    )}
                  </div>

                  {/* Post Office Field */}
                  <div className="flex flex-col">
                    <label htmlFor="postOffice" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-lime-500 rounded-full"></div>
                      Post Office
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      id="PostOfficeInfo"
                      options={postOfficeData}
                      value={postOfficeData.find((option) => option.value === selectedPostOffice) || null}
                      onChange={handlePostOfficeChange}
                      placeholder="Select Post Office"
                      isClearable
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.postOffice ? '#fca5a5' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.postOffice ? '#fca5a5' : base.borderColor,
                          },
                        }),
                      }}
                    />
                    {errors.postOffice && (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.postOffice}
                      </p>
                    )}
                  </div>

                  {/* Tehsil Field */}
                  <div className="flex flex-col">
                    <label htmlFor="tehsil" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                      Tehsil
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      id="TehsilInfo"
                      options={tehsilData}
                      value={tehsilData.find((option) => option.value === selectedTehsil) || null}
                      onChange={handleTehsilChange}
                      placeholder="Select Tehsil"
                      isClearable
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.tehsil ? '#fca5a5' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.tehsil ? '#fca5a5' : base.borderColor,
                          },
                        }),
                      }}
                    />
                    {errors.tehsil && (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.tehsil}
                      </p>
                    )}
                  </div>

                   <div className="flex flex-col">
                    <label htmlFor="patwar" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                      Patwar
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <Select
                      id="PatwarInfo"
                      options={patwarData}
                      value={patwarData.find((option) => option.value === selectedPatwar) || null}
                      onChange={handlePatwarChange}
                      placeholder="Select Patwar"
                      isClearable
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: errors.tehsil ? '#fca5a5' : base.borderColor,
                          '&:hover': {
                            borderColor: errors.tehsil ? '#fca5a5' : base.borderColor,
                          },
                        }),
                      }}
                    />
                    {errors.patwar && (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.patwar}
                      </p>
                    )}
                  </div>

                  {/* Pincode Field - NOW INSIDE THE GRID */}
                  <div className="flex flex-col">
                    <label htmlFor="pincode" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                      Pincode
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                        <FaCode className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="pincode"
                        value={pincode}
                        onChange={handlePincodeChange}
                        inputMode="numeric"
                        maxLength={6}
                        className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          errors.pincode
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-red-500 focus:ring-red-100'
                        }`}
                        placeholder="Enter 6-digit Pincode"
                      />
                    </div>
                    {errors.pincode ? (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {errors.pincode}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaInfoCircle />
                        6-digit postal code (numbers only)
                      </p>
                    )}
                  </div>
                </div>

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
                        Save Village
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

export default VillageMaster;
