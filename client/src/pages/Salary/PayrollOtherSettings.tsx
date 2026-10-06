import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Settings2 } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import { API_CONFIG } from "../../constants/config";

interface OtherSettings {
  branchId: number;
  overtimeRatePerHour: number;
  advanceSalaryMonths: number;
  workingHoursPerDay: number;
  weeklyOffDays: number;
  salaryRoundingRule: number; // 0=None, 1=Round, 2=Floor, 3=Ceil
  allowAdvanceSalary: boolean;
  deductTdsOnSalary: boolean;
  tdsAccId: number;
}

const EMPTY: OtherSettings = {
  branchId: 0,
  overtimeRatePerHour: 0,
  advanceSalaryMonths: 1,
  workingHoursPerDay: 8,
  weeklyOffDays: 1,
  salaryRoundingRule: 0,
  allowAdvanceSalary: false,
  deductTdsOnSalary: false,
  tdsAccId: 0,
};

const ROUNDING_OPTS = [
  { value: 0, label: "No Rounding" },
  { value: 1, label: "Round to Nearest" },
  { value: 2, label: "Floor (Round Down)" },
  { value: 3, label: "Ceiling (Round Up)" },
];

export default function PayrollOtherSettings() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [form, setForm]     = useState<OtherSettings>({ ...EMPTY, branchId });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_CONFIG.BASE_URL}/PayrollOtherSettings/${branchId}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.data) setForm({ ...data.data, branchId });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/PayrollOtherSettings`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message ?? "Failed to save.");
      Swal.fire("Saved", data.message ?? "Settings saved.", "success");
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  const set = (key: keyof OtherSettings, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Salary Other Settings</h1>
          <p className="text-sm text-white/70">Overtime, advance, rounding, and TDS configuration</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading settings...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-sky-50 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span className="font-semibold text-slate-700 text-sm">Additional Payroll Configuration</span>
            </div>
            <div className="p-6 space-y-6">
              {/* Work settings */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Working Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Working Hours / Day</label>
                    <input type="number" min={1} max={24} value={form.workingHoursPerDay}
                      onChange={e => set("workingHoursPerDay", +e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-sky-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Weekly Off Days</label>
                    <select value={form.weeklyOffDays} onChange={e => set("weeklyOffDays", +e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-sky-400 text-sm cursor-pointer">
                      {[0, 1, 2].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Overtime */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Overtime</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Overtime Rate (₹/hour)</label>
                  <input type="number" min={0} step={0.01} value={form.overtimeRatePerHour}
                    onChange={e => set("overtimeRatePerHour", +e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-sky-400 text-sm" />
                </div>
              </div>

              {/* Advance Salary */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Advance Salary</h3>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" id="allowAdvance" checked={form.allowAdvanceSalary}
                    onChange={e => set("allowAdvanceSalary", e.target.checked)}
                    className="w-4 h-4 rounded accent-sky-600 cursor-pointer" />
                  <label htmlFor="allowAdvance" className="text-sm font-medium text-slate-700 cursor-pointer">Allow Advance Salary</label>
                </div>
                {form.allowAdvanceSalary && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max. Months of Advance</label>
                    <input type="number" min={1} max={6} value={form.advanceSalaryMonths}
                      onChange={e => set("advanceSalaryMonths", +e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-sky-400 text-sm" />
                  </div>
                )}
              </div>

              {/* Rounding */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Salary Rounding</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rounding Rule</label>
                  <select value={form.salaryRoundingRule} onChange={e => set("salaryRoundingRule", +e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-sky-400 text-sm cursor-pointer">
                    {ROUNDING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* TDS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">TDS on Salary</h3>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="deductTds" checked={form.deductTdsOnSalary}
                    onChange={e => set("deductTdsOnSalary", e.target.checked)}
                    className="w-4 h-4 rounded accent-sky-600 cursor-pointer" />
                  <label htmlFor="deductTds" className="text-sm font-medium text-slate-700 cursor-pointer">Deduct TDS on Salary</label>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Settings2 size={16} />}
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    } />
  );
}
