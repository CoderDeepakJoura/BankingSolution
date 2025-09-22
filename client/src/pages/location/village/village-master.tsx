import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaPlus, FaTimes, FaMapMarkerAlt, FaGlobe, FaSave, FaArrowLeft, FaInfoCircle, FaBuilding, FaCode, FaEnvelope, FaChevronDown, FaSearch } from "react-icons/fa";

// Assume these imports exist and their services fetch data from an API
// For demonstration, these will be mocked in the useEffect hook.
import DashboardLayout from "../../../Common/Layout";
import VillageApiService from "../../../services/location/village/villageapi";
import ZoneApiService from "../../../services/location/zone/zoneapi";
import ThanaApiService from "../../../services/location/thana/thanaapi";
import PostOfficeApiService from "../../../services/location/PostOffice/postOfficeapi";
import TehsilApiService from "../../../services/location/tehsil/tehsilapi";
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

interface TehsilInfo {
  tehsilId: number;
  tehsilName: string;
}

// Option type for react-select
interface OptionType {
  value: number;
  label: string;
}

const VillageMaster = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State for form inputs - Fixed type initialization
  const [villageName, setVillageName] = useState<string>("");
  const [villageNameSL, setVillageNameSL] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<number>(0);
  const [selectedThana, setSelectedThana] = useState<number>(0);
  const [selectedPostOffice, setSelectedPostOffice] = useState<number>(0);
  const [selectedTehsil, setSelectedTehsil] = useState<number>(0);

  // State for dropdown data, fetched from an API - Fixed array initialization
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [thanas, setThanas] = useState<ThanaInfo[]>([]);
  const [postOffices, setPostOffices] = useState<PostOfficeInfo[]>([]);
  const [tehsils, setTehsils] = useState<TehsilInfo[]>([]);

  // State for UI/form management
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Regex for Hindi/Devanagari script validation
  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

  // Handles input change for Hindi script field with validation - Fixed event type
  const handleVillageNameSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setVillageNameSL(inputText);
      setError("");
    } else {
      setError("Please enter only Hindi characters (Devanagari script).");
    }
  };

  // Resets the form to its initial state - Fixed reset values
  const handleReset = () => {
    setVillageName("");
    setVillageNameSL("");
    setSelectedZone(0);
    setSelectedThana(0);
    setSelectedPostOffice(0);
    setSelectedTehsil(0);
    setError("");
    inputRef.current?.focus();
    setLoading(false);
  };

  // Fetch dropdown data on component mount (initial fetch)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const zonesRes = await ZoneApiService.getAllZones(user.branchid);
        const thanasRes = await ThanaApiService.getAllThanas(user.branchid);
        const postOfficesRes = await PostOfficeApiService.getAllPostOffices(user.branchid);
        const tehsilsRes = await TehsilApiService.getAllTehsils(user.branchid);
        
        setZones(zonesRes.data || []); // Added fallback for undefined data
        setThanas(thanasRes.data || []); // Added fallback for undefined data
        setPostOffices(postOfficesRes.data || []);
        setTehsils(tehsilsRes.data || []); // Added fallback for undefined data
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
  }, [user.branchid]); // Added dependency

  // Handles form submission - Fixed event type and validation
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Form validation
    if (!villageName.trim()) {
      setError("Village name is required.");
      return;
    }
    
    if (selectedZone === 0 || selectedThana === 0 || selectedPostOffice === 0 || selectedTehsil === 0) {
      setError("Please select all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await VillageApiService.add_new_village(
        villageName,
        villageNameSL,
        selectedZone,
        selectedThana,
        selectedPostOffice,
        selectedTehsil,
        Number(user.branchid)
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

  // Fixed react-select onChange handlers with proper TypeScript typing
  const handleZoneChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedZone(selectedOption ? selectedOption.value : 0);
  };

  const handleThanaChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedThana(selectedOption ? selectedOption.value : 0);
  };

  const handlePostOfficeChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedPostOffice(selectedOption ? selectedOption.value : 0);
  };

  const handleTehsilChange = (selectedOption: SingleValue<OptionType>) => {
    setSelectedTehsil(selectedOption ? selectedOption.value : 0);
  };

  // Memoized options for better performance
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

  return (
    <DashboardLayout
      enableScroll={false}
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
                    <p className="text-sm text-gray-600">Fill in the Village details below </p>
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
                        onChange={(e) => setVillageName(e.target.value)}
                        required
                        pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
                        autoFocus={true}
                        maxLength={50}
                        className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="Enter Village name"
                      />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <FaInfoCircle />
                      Descriptive name for the Village (max 50 characters)
                    </p>
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
                          error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                        placeholder="Enter Village name in Hindi/Devanagari"
                        lang="hi"
                      />
                    </div>
                    {error ? (
                      <p className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 mt-1">
                        <FaTimes className="text-xs" />
                        {error}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaInfoCircle />
                        Optional field for Hindi/Devanagari script (max 50 characters)
                      </p>
                    )}
                  </div>

                  {/* Zone Field (Autocomplete) */}
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
                    />
                  </div>

                  {/* Thana Field (Autocomplete) */}
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
                    />
                  </div>

                  {/* Post Office Field (Autocomplete) */}
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
                    />
                  </div>

                  {/* Tehsil Field (Autocomplete) */}
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
                    />
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
