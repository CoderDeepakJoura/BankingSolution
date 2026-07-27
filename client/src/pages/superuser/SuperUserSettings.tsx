import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft, Save, IndianRupee, RefreshCw } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import superUserSettingsApi, { SuperUserSettingsDTO } from "../../services/superuser/superUserSettingsApi";

const DEFAULT_SETTINGS: SuperUserSettingsDTO = {
  branchId: 0,
  allowSavingInterestChange: false,
  allowFDInterestChange: false,
  allowRDInterestChange: false,
  allowLoanInterestChange: false,
  enableIBTransactions: true,
  allowGSTDeduction: true,
};

const SuperUserSettings = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SuperUserSettingsDTO>(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await superUserSettingsApi.getSettings(user.branchid);
        if (res.success && res.data) {
          setSettings({ ...res.data, branchId: user.branchid });
        } else {
          setSettings({ ...DEFAULT_SETTINGS, branchId: user.branchid });
        }
      } catch {
        setSettings({ ...DEFAULT_SETTINGS, branchId: user.branchid });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user.branchid]);

  const toggle = (key: keyof SuperUserSettingsDTO) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await superUserSettingsApi.saveSettings({
        ...settings,
        branchId: user.branchid,
      });
      if (res.success) {
        Swal.fire({ icon: "success", title: "Saved", text: "Super User settings updated.", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ icon: "error", title: "Error", text: res.message || "Failed to save settings." });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const interestItems = [
    { key: "allowSavingInterestChange" as const, label: "Saving Interest Posting", desc: "Allow editing the calculated interest amount before posting saving interest" },
    { key: "allowFDInterestChange"     as const, label: "FD Interest Posting",     desc: "Allow editing the calculated interest amount before posting FD interest" },
    { key: "allowRDInterestChange"     as const, label: "RD Interest Posting",     desc: "Allow editing the calculated interest amount before posting RD interest" },
    { key: "allowLoanInterestChange"   as const, label: "Loan Interest Posting",   desc: "Allow editing the calculated interest amount before posting loan interest" },
  ];

  const featureItems = [
    { key: "enableIBTransactions" as const, label: "Inter-Branch (IB) Transactions", desc: "Enable inter-branch saving deposit and withdrawal screens and data. Disable to hide IB module for this branch." },
    { key: "allowGSTDeduction"    as const, label: "GST Deduction",                  desc: "Enable GST deduction functionality in journal vouchers. Disable to hide GST-related screens and entries." },
  ];

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 print:min-h-0 print:bg-white print:p-0">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-8 py-6 shadow-lg">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-white/5 rounded-full" />
            </div>
            <div className="relative flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Super User Settings</h2>
                <p className="text-purple-200 text-sm">Configure privileged settings for this branch</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Interest Posting Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Interest Posting — Editable Amount</h3>
                      <p className="text-xs text-gray-500 mt-0.5">When enabled, the calculated interest can be manually changed before posting. Default is locked (not changeable).</p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {interestItems.map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </div>
                        <button
                          onClick={() => toggle(key)}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                            settings[key] ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                          aria-label={`Toggle ${label}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                              settings[key] ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature Flags Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Feature Flags</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Enable or disable major modules for this branch. Disabled modules are hidden from all users.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {featureItems.map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </div>
                        <button
                          onClick={() => toggle(key)}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                            settings[key] ? "bg-purple-600" : "bg-gray-200"
                          }`}
                          aria-label={`Toggle ${label}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                              settings[key] ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Saving…" : "Save Settings"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      }
    />
  );
};

export default SuperUserSettings;
