import React from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import ZoneApiService from "../../../services/zone/zoneapi";
import { toast, ToastContainer } from "react-toastify";


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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const response = await ZoneApiService.add_new_zone(zoneName, zoneCode, zoneNameSL || "");
    console.error("Response from API:", response);

    if (response.success) {
      toast.success(response.message, { position: "top-right" });
    } else {
      toast.error(response.message || "Failed to save zone.");
    }
  } catch (err: any) {
    toast.error(
  <div>
    {err.message?.split('\n').map((line : any, idx : any) => (
      <div key={idx}>{line}</div>
    )) || "An unexpected error occurred."}
  </div>
);
  } finally {
    setLoading(false);
  }
};


  return (
    <>
      <ToastContainer />
      <DashboardLayout
        mainContent={
          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Zone Master</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
              <div className="flex flex-col">
                <label htmlFor="zoneCode" className="mb-2 text-sm font-medium text-gray-700">
                  Zone Code
                </label>
                <input
                  type="text"
                  id="zoneCode"
                  value={zoneCode}
                  autoFocus = {true}
                  onChange={(e) => setZoneCode(e.target.value)}
                  required pattern="[a-zA-Z0-9]{2,10}"
                  maxLength={10}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="zoneName" className="mb-2 text-sm font-medium text-gray-700">
                  Zone Name
                </label>
                <input
                  type="text"
                  id="zoneName"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  required pattern="[a-zA-Z0-9]{2,10}"
                  maxLength={50}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label htmlFor="zoneNameSL" className="mb-2 text-sm font-medium text-gray-700">
                  Zone Name (In SL)
                </label>
                <input
                  type="text"
                  id="zoneNameSL"
                  value={zoneNameSL}
                  onChange={handleZoneNameSLChange}
                  maxLength={50}
                  pattern="[A-Z0-9]"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
                >
                  {loading ? "Saving..." : "Save Zone"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/zone-operations")}
                  className="bg-blue-600 ms-2 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        }
      />
    </>
  );
};

export default ZoneMaster;
