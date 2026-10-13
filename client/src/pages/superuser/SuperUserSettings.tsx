import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft, Save, IndianRupee, RefreshCw, Lock, Send, Zap } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux";
import { setUser } from "../../redux/userSlice";
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
  showBankFDModule: false,
  showPayrollModule: false,
  showAgentModule: false,
  enforceSingleSession: false,
  telegramChatId: "",
  enableAutoDebit: false,
  autoDebitRunHour: 2,
  autoDebitRunMinute: 0,
  autoDebitProcessRdKist: true,
  autoDebitProcessLoanRecovery: true,
};

const SuperUserSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
        dispatch(setUser({
          showBankFDModule: settings.showBankFDModule,
          showPayrollModule: settings.showPayrollModule,
          showAgentModule: settings.showAgentModule,
          enableIBTransactions: settings.enableIBTransactions,
          allowGSTDeduction: settings.allowGSTDeduction,
        }));
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
    { key: "showBankFDModule"     as const, label: "Bank FD Module",                 desc: "Show Bank FD screens (TDS settings, slabs, accounts, interest posting, maturity). Disable to hide the entire Bank FD module." },
    { key: "showPayrollModule"    as const, label: "Payroll / Salary Module",         desc: "Show Payroll screens (employee master, salary creation, attendance, reports). Disable to hide the entire Payroll module." },
    { key: "showAgentModule"      as const, label: "Agent Module",                    desc: "Show Agent screens (agent level master, agent master, update agent of accounts). Disable to hide the entire Agent module." },
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
                onClick={() => navigate("/dashboard")}
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

                {/* Security Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100">
                    <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Security</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Access and session controls for all users in this branch.</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Single Session Login</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          When enabled, logging in from a new device or browser immediately invalidates all other active sessions for that user.
                          Only one active session per user is allowed at a time.
                        </p>
                      </div>
                      <button
                        onClick={() => toggle("enforceSingleSession")}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0 ml-6 ${
                          settings.enforceSingleSession ? "bg-red-600" : "bg-gray-200"
                        }`}
                        aria-label="Toggle Single Session Login"
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            settings.enforceSingleSession ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auto-Debit Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-800">Auto-Debit</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically process RD kist and loan recovery for enrolled accounts daily at the configured time.
                      </p>
                    </div>
                    <button
                      onClick={() => setSettings((prev) => ({ ...prev, enableAutoDebit: !prev.enableAutoDebit }))}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0 ${
                        settings.enableAutoDebit ? "bg-emerald-600" : "bg-gray-200"
                      }`}
                      aria-label="Toggle Auto-Debit"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.enableAutoDebit ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {settings.enableAutoDebit && (
                    <div className="px-6 py-5 space-y-5">
                      {/* Run time */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Daily Run Time (24-hour)</p>
                        <div className="flex items-center gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Hour (0–23)</label>
                            <input
                              type="number" min={0} max={23}
                              value={settings.autoDebitRunHour ?? 2}
                              onChange={(e) => setSettings((prev) => ({ ...prev, autoDebitRunHour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) }))}
                              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                          <span className="text-gray-400 text-lg mt-4">:</span>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Minute (0–59)</label>
                            <input
                              type="number" min={0} max={59}
                              value={settings.autoDebitRunMinute ?? 0}
                              onChange={(e) => setSettings((prev) => ({ ...prev, autoDebitRunMinute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-4 ml-2">
                            Runs at {String(settings.autoDebitRunHour ?? 2).padStart(2, "0")}:{String(settings.autoDebitRunMinute ?? 0).padStart(2, "0")} server time daily
                          </p>
                        </div>
                      </div>

                      {/* Process types */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Process Types</p>
                        <div className="space-y-3">
                          {[
                            { key: "autoDebitProcessRdKist" as const, label: "RD Kist", desc: "Auto-post monthly/daily RD instalment for enrolled accounts" },
                            { key: "autoDebitProcessLoanRecovery" as const, label: "Loan Recovery", desc: "Auto-post EMI recovery for enrolled loan accounts" },
                          ].map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{label}</p>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                              <button
                                onClick={() => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                                className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0 ml-4 ${
                                  settings[key] ? "bg-emerald-500" : "bg-gray-200"
                                }`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${settings[key] ? "translate-x-5" : "translate-x-0"}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠ Auto-debit creates vouchers silently using the server date. Enroll accounts in the
                        Auto-Debit Mandates screen before enabling. Telegram notifications are sent if a Chat ID is configured.
                      </p>
                    </div>
                  )}
                </div>

                {/* Telegram Notifications Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-gray-100">
                    <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
                      <Send className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Telegram Notifications</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Receive auto-debit results, alerts, and system notifications via Telegram.
                        Enter your Telegram Chat ID to enable. Leave blank to disable.
                      </p>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Telegram Chat ID
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      Open Telegram → message <span className="font-mono bg-gray-100 px-1 rounded">@BotFather</span> → create a bot → send a message to your bot → use <span className="font-mono bg-gray-100 px-1 rounded">getUpdates</span> to find your numeric chat ID.
                    </p>
                    <input
                      type="text"
                      value={settings.telegramChatId ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, telegramChatId: e.target.value }))}
                      placeholder="e.g. 1228438041"
                      className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
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
