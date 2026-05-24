import React, { useState } from "react";
import { Play, ArrowLeft, Bot } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AutomationService from "../../services/seleniumAutomation/automation";

const SeleniumAutomation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const VNC_CONFIG = {
  url: 'http://app.sicswave.com:6080/vnc.html',
  password: 'VNC@123#', // Your VNC password
  autoConnect: true,
  resize: 'scale'
};

const runSeleniumScript = async () => {
    setLoading(true);
    setStatus("Starting automation...");

    try {
      const response = AutomationService.run_automation_script();
      const result = await response;
      window.location.href = "loanadvancement://start";
      if (result.success) {
        setStatus("✓ Automation started successfully!");
        
        // Build VNC URL with password
        const protocolUrl = "loanadvancement://start";
        
        await Swal.fire({
          icon: "success",
          title: "🚀 Automation Started!",
          html: `
            <div style="text-align: center; padding: 20px 0;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
                Your automation is now running in the background.
              </p>
              
              <div style="
                background: #F3F4F6;
                border-radius: 12px;
                padding: 24px;
                margin: 24px 0;
              ">
                <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px;">
                  Watch the automation live:
                </p>
                <a 
                  href="${protocolUrl}" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 32px;
                    background: #3B82F6;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
                  "
                >
                  <span style="font-size: 20px;">🖥️</span>
                  <span>View Progress</span>
                </a>
              </div>
              
              <p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">
                The viewer will open in a new tab
              </p>
            </div>
          `,
          confirmButtonColor: "#3B82F6",
          confirmButtonText: "Close",
          width: 550,
          showCloseButton: true,
          allowOutsideClick: true
        });
      } else {
        setStatus("✗ Automation failed");
        await Swal.fire({
          icon: "error",
          title: "Error!",
          text: result.message || "Failed to execute script",
          confirmButtonColor: "#EF4444",
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      setStatus("✗ Failed to start automation");
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to connect to API",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bot className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Loan Advancement Automation
                    </h1>
                    <p className="text-gray-600 text-sm">
                      Run automated loan advancement script
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

            {/* Main Content Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-8 sm:p-12">
                <div className="w-full text-center space-y-8">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bot className="text-white text-5xl" />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      Automated Loan Processing
                    </h2>
                    <p className="text-gray-600 text-base">
                      Click the button below to start the automated loan advancement process. 
                      The script will open a browser window and process loan applications automatically.
                    </p>
                  </div>

                  {/* Status Message */}
                  {status && (
                    <div className={`p-4 rounded-lg ${
                      status.includes("✓") 
                        ? "bg-green-50 border border-green-200 text-green-800" 
                        : status.includes("✗")
                        ? "bg-red-50 border border-red-200 text-red-800"
                        : "bg-blue-50 border border-blue-200 text-blue-800"
                    }`}>
                      <p className="font-medium">{status}</p>
                    </div>
                  )}

                  {/* Run Button */}
                  <div>
                    <button
                      onClick={runSeleniumScript}
                      disabled={loading}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Running Script...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Run Automation
                        </>
                      )}
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      What happens when you click?
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-2 ml-7 list-disc">
                      <li>A Chrome browser window will open automatically</li>
                      <li>The script will log into the portal and process loans</li>
                      <li>You can watch the automation in real-time</li>
                      <li>Results will be saved to checkpoint files</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default SeleniumAutomation;
