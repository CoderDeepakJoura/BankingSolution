import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { Settings, Save } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { PayrollSettingsDTO } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import { API_CONFIG } from "../../constants/config";

interface AccOption { value: number; label: string }
interface ProdOption { value: number; label: string }

const lbl = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";
const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 shadow-sm";

const numericOnly = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!/[0-9]/.test(e.key) && !["ArrowLeft","ArrowRight","Delete","Backspace","Tab"].includes(e.key) && !e.ctrlKey && !e.metaKey)
    e.preventDefault();
};
const numericWithDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!/[0-9.]/.test(e.key) && !["ArrowLeft","ArrowRight","Delete","Backspace","Tab"].includes(e.key) && !e.ctrlKey && !e.metaKey)
    e.preventDefault();
};
const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };

const EMPTY: PayrollSettingsDTO = {
  id: 0, branchId: 0,
  salaryAccId: 0, salaryAccName: "",
  startDayOfMonth: 1, daysInMonth: 0,
  cpfHeadCode: "", rdHeadCode: "",
  maxSalaryForPf: 15000, extraEmployeePf: false, extraEmployerPf: false,
  maxFpf: 0, employeresicPerc: 3.25, esicLimit: 21000,
  loanProductIds: [],
};

export default function PayrollSettings() {
  const navigate   = useNavigate();
  const user       = useSelector((s: RootState) => s.user);
  const branchId   = user.branchid;

  const [form, setForm]           = useState<PayrollSettingsDTO>({ ...EMPTY, branchId });
  const [accOptions, setAccOptions] = useState<AccOption[]>([]);
  const [prodOptions, setProdOptions] = useState<ProdOption[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [settingsRes, accsRes, prodRes] = await Promise.all([
          salaryApi.getPayrollSettings(branchId),
          commonservice.general_accmasters_info(branchId),
          fetch(`${API_CONFIG.BASE_URL}/LoanProduct/dropdown/${branchId}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }).then(r => r.json()).catch(() => ({ items: [] })),
        ]);

        const accs = accsRes?.data ?? [];
        setAccOptions(accs.map((a: any) => ({ value: a.accId ?? a.id, label: `${a.accountNumber ?? a.accNo ?? ""} – ${a.accountName ?? a.name ?? ""}` })));

        const prods = prodRes?.items ?? [];
        setProdOptions(prods.map((p: any) => ({ value: p.id, label: `${p.code ?? ""} – ${p.name ?? p.description ?? ""}` })));

        if (settingsRes.data) {
          setForm({ ...settingsRes.data, branchId });
        } else {
          setForm({ ...EMPTY, branchId });
        }
      } catch {
        Swal.fire("Error", "Failed to load settings.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [branchId]);

  const f = (field: keyof PayrollSettingsDTO, val: any) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    if (!form.salaryAccId) { Swal.fire("Validation", "Salary Account is required.", "warning"); return; }
    if (form.startDayOfMonth < 1 || form.startDayOfMonth > 28) { Swal.fire("Validation", "Start Day must be between 1 and 28.", "warning"); return; }
    setSaving(true);
    try {
      const res = await salaryApi.savePayrollSettings(form);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Saved", res.message, "success");
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardLayout enableScroll mainContent={
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
    } />
  );

  return (
    <DashboardLayout enableScroll mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-violet-50 to-purple-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Payroll Settings</h1>
          <p className="text-sm text-white/70">Branch-level payroll configuration</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl">
        {/* Main Settings */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">General Settings</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Salary Account */}
            <div className="sm:col-span-2">
              <label className={lbl}>Salary Account <span className="text-red-500">*</span></label>
              <Select
                options={accOptions}
                value={accOptions.find(o => o.value === form.salaryAccId) ?? null}
                onChange={opt => f("salaryAccId", opt?.value ?? 0)}
                placeholder="Select salary GL account..."
                styles={ctrlStyle}
                isClearable
              />
            </div>

            <div>
              <label className={lbl}>Start Day of Month <span className="text-red-500">*</span></label>
              <input type="text" inputMode="numeric" maxLength={2} value={form.startDayOfMonth}
                onKeyDown={numericOnly}
                onChange={e => f("startDayOfMonth", Number(e.target.value) || 0)} className={inp} />
            </div>

            <div>
              <label className={lbl}>Days in Month <span className="text-xs text-slate-400 ml-1">(0 = actual)</span></label>
              <input type="text" inputMode="numeric" maxLength={2} value={form.daysInMonth}
                onKeyDown={numericOnly}
                onChange={e => f("daysInMonth", Number(e.target.value) || 0)} className={inp} />
              <p className="text-xs text-slate-400 mt-1">Set 0 to use actual calendar days; set 30 for fixed month</p>
            </div>

            <div>
              <label className={lbl}>CPF Head Code</label>
              <input type="text" maxLength={100} value={form.cpfHeadCode}
                onChange={e => f("cpfHeadCode", e.target.value)} placeholder="Employee Prov. Fund account code"
                className={inp} />
            </div>

            <div>
              <label className={lbl}>RD Head Code</label>
              <input type="text" maxLength={100} value={form.rdHeadCode}
                onChange={e => f("rdHeadCode", e.target.value)} placeholder="RD deduction account code"
                className={inp} />
            </div>
          </div>
        </div>

        {/* PF Settings */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Provident Fund (PF) Settings</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Max Salary for PF (₹)</label>
              <input type="text" inputMode="numeric" maxLength={8} value={form.maxSalaryForPf}
                onKeyDown={numericOnly}
                onChange={e => f("maxSalaryForPf", Number(e.target.value) || 0)} className={inp} />
              <p className="text-xs text-slate-400 mt-1">PF calculated on salary up to this limit</p>
            </div>
            <div>
              <label className={lbl}>Max FPF (₹)</label>
              <input type="text" inputMode="numeric" maxLength={8} value={form.maxFpf}
                onKeyDown={numericOnly}
                onChange={e => f("maxFpf", Number(e.target.value) || 0)} className={inp} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="extraEmpPf" checked={form.extraEmployeePf}
                onChange={e => f("extraEmployeePf", e.target.checked)}
                className="w-4 h-4 accent-violet-600 cursor-pointer" />
              <label htmlFor="extraEmpPf" className="text-sm font-medium text-slate-700 cursor-pointer">Extra Employee PF</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="extraEmplPf" checked={form.extraEmployerPf}
                onChange={e => f("extraEmployerPf", e.target.checked)}
                className="w-4 h-4 accent-violet-600 cursor-pointer" />
              <label htmlFor="extraEmplPf" className="text-sm font-medium text-slate-700 cursor-pointer">Extra Employer PF</label>
            </div>
          </div>
        </div>

        {/* ESIC Settings */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">ESIC Settings</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Employer ESIC % <span className="text-red-500">*</span></label>
              <input type="text" inputMode="decimal" maxLength={6} value={form.employeresicPerc}
                onKeyDown={numericWithDecimal}
                onChange={e => f("employeresicPerc", Number(e.target.value) || 0)} className={inp} />
              <p className="text-xs text-slate-400 mt-1">Employee share is fixed at 0.75%</p>
            </div>
            <div>
              <label className={lbl}>ESIC Salary Limit (₹)</label>
              <input type="text" inputMode="numeric" maxLength={8} value={form.esicLimit}
                onKeyDown={numericOnly}
                onChange={e => f("esicLimit", Number(e.target.value) || 0)} className={inp} />
              <p className="text-xs text-slate-400 mt-1">Employees above this gross are ESIC-exempt</p>
            </div>
          </div>
        </div>

        {/* Loan Deductions */}
        {prodOptions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
            <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Loan Deduction Components</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select loan products whose EMI is deducted from salary</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prodOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-amber-50 cursor-pointer transition-colors">
                    <input type="checkbox"
                      checked={form.loanProductIds.includes(opt.value)}
                      onChange={e => {
                        const ids = e.target.checked
                          ? [...form.loanProductIds, opt.value]
                          : form.loanProductIds.filter(id => id !== opt.value);
                        f("loanProductIds", ids);
                      }}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
    } />
  );
}
