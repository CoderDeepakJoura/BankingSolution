import React from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import ZoneApiService from "../../../services/zone/zoneapi";
import Swal from "sweetalert2";
import { FaPlus, FaTimes, FaMapMarkerAlt, FaCode, FaGlobe, FaSave, FaArrowLeft, FaInfoCircle } from "react-icons/fa";

const ZoneMaster: React.FC = () => {
  const navigate = useNavigate();

  const [zoneCode, setZoneCode] = React.useState("");
  const [zoneName, setZoneName] = React.useState("");
  const [zoneNameSL, setZoneNameSL] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

  const handleZoneNameSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setZoneNameSL(inputText);
      setError("");
    } else {
      setError("Please enter only Hindi characters (Devanagari script).");
    }
  };

  const handleReset = () => {
    setZoneCode("");
    setZoneName("");
    setZoneNameSL("");
    setError("");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await ZoneApiService.add_new_zone(zoneName, zoneCode, zoneNameSL || "");

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
          text: response.message || "Failed to save zone.",
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
    enableScroll = {false}
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
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
                      Zone Master
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">Create and manage zone configurations</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/zone-operations")}
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
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Create New Zone</h2>
                    <p className="text-sm text-gray-600">Fill in the zone details below</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Zone Code Field */}
                  <div className="flex flex-col">
                    <label htmlFor="zoneCode" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      Zone Code
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                        <FaCode className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="zoneCode"
                        value={zoneCode}
                        autoFocus={true}
                        onChange={(e) => setZoneCode(e.target.value.toUpperCase())}
                        required
                        pattern="[a-zA-Z0-9]{2,10}"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 font-mono uppercase"
                        placeholder="Enter zone code"
                      />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <FaInfoCircle />
                      2-10 alphanumeric characters, auto uppercase
                    </p>
                  </div>

                  {/* Zone Name Field */}
                  <div className="flex flex-col">
                    <label htmlFor="zoneName" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                      Zone Name
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <FaMapMarkerAlt className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="zoneName"
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                        required
                        maxLength={50}
                        className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50"
                        placeholder="Enter zone name"
                      />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <FaInfoCircle />
                      Descriptive name for the zone (max 50 characters)
                    </p>
                  </div>

                  {/* Zone Name SL Field */}
                  <div className="flex flex-col">
                    <label htmlFor="zoneNameSL" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                      Zone Name (In SL)
                      <span className="text-emerald-600 text-xs font-medium">(Hindi/Devanagari)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                        <FaGlobe className="text-sm" />
                      </div>
                      <input
                        type="text"
                        id="zoneNameSL"
                        value={zoneNameSL}
                        onChange={handleZoneNameSLChange}
                        maxLength={50}
                        className={`w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-r from-white to-gray-50 ${
                          error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                        placeholder="Enter zone name in Hindi/Devanagari"
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
                        Save Zone
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

export default ZoneMaster;