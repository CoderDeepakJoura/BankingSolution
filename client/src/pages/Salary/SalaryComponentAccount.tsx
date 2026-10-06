import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";
import { Link2 } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { SalaryComponent } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";

interface AccOpt { value: number; label: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "36px", fontSize: "0.8125rem", cursor: "pointer" }) };

export default function SalaryComponentAccount() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [accOptions, setAccOptions]  = useState<AccOpt[]>([]);
  const [accMap, setAccMap]          = useState<Record<number, AccOpt | null>>({});
  const [saving, setSaving]          = useState<number | null>(null);
  const [loading, setLoading]        = useState(false);

  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salaryApi.getSalaryComponents(branchId, { searchTerm: "", pageNumber: 1, pageSize: 200 });
      const items: SalaryComponent[] = (res as any).items ?? [];
      setComponents(items.sort((a, b) => a.seqNo - b.seqNo));
      const map: Record<number, AccOpt | null> = {};
      items.forEach(c => { map[c.id] = c.accId ? { value: c.accId, label: `[${c.accId}]` } : null; });
      setAccMap(map);
    } catch { Swal.fire("Error", "Failed to load components.", "error"); }
    finally { setLoading(false); }
  }, [branchId]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await commonservice.general_accmasters_info(branchId);
      const data = res?.data ?? [];
      const opts: AccOpt[] = data.map((a: any) => ({
        value: a.accId ?? a.id,
        label: `${a.accountNumber ?? a.accNo ?? ""} — ${a.accountName ?? a.name ?? ""}`,
      }));
      setAccOptions(opts);

      // fill labels for pre-assigned accIds
      setAccMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const cur = next[+k];
          if (cur) {
            const found = opts.find(o => o.value === cur.value);
            if (found) next[+k] = found;
          }
        });
        return next;
      });
    } catch {}
  }, [branchId]);

  useEffect(() => {
    loadComponents();
    loadAccounts();
  }, [loadComponents, loadAccounts]);

  const handleSave = async (comp: SalaryComponent) => {
    const selAcc = accMap[comp.id];
    setSaving(comp.id);
    try {
      const payload: Partial<SalaryComponent> = { ...comp, accId: selAcc?.value ?? undefined };
      const res = await salaryApi.updateSalaryComponent(payload);
      if (!res.success) throw new Error(res.message);
      Swal.fire({ toast: true, icon: "success", title: `${comp.alias} saved`, position: "top-end", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to save.", "error");
    } finally { setSaving(null); }
  };

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <Link2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Salary Component Account</h1>
          <p className="text-sm text-white/70">Map each salary component to its GL account</p>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-slate-500">Assign a GL account to each salary component so that salary posting creates the correct journal entries.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Seq</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Alias</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 min-w-64">GL Account</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Save</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : components.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">No salary components found.</td></tr>
              ) : components.map(comp => (
                <tr key={comp.id} className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{comp.seqNo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${comp.isDeduction ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {comp.alias}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{comp.description}</td>
                  <td className="px-4 py-2.5">
                    {comp.isDeduction
                      ? <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Deduction</span>
                      : <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">Earning</span>}
                  </td>
                  <td className="px-4 py-2.5 min-w-64">
                    <Select
                      options={accOptions}
                      value={accMap[comp.id] ?? null}
                      onChange={opt => setAccMap(prev => ({ ...prev, [comp.id]: opt as AccOpt | null }))}
                      placeholder="Select GL account..."
                      styles={ctrlStyle}
                      isClearable
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => handleSave(comp)} disabled={saving === comp.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50">
                      {saving === comp.id ? "..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    } />
  );
}
