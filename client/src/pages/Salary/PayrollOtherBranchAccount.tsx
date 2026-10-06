import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";
import { Building2 } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import { API_CONFIG } from "../../constants/config";
import commonservice from "../../services/common/commonservice";

interface Branch { id: number; branchCode: string; name: string }
interface AccOpt { value: number; label: string }
interface BranchAccMapping { branchId: number; branchName: string; branchCode: string; accId: number; accName: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "36px", fontSize: "0.8125rem", cursor: "pointer" }) };

export default function PayrollOtherBranchAccount() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [branches, setBranches]     = useState<Branch[]>([]);
  const [accOptions, setAccOptions] = useState<AccOpt[]>([]);
  const [mappings, setMappings]     = useState<BranchAccMapping[]>([]);
  const [accMap, setAccMap]         = useState<Record<number, AccOpt | null>>({});
  const [saving, setSaving]         = useState<number | null>(null);
  const [loading, setLoading]       = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [brRes, accRes, mapRes] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/fetchdata/get_all_branches`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ SocietyId: 0 }),
        }).then(r => r.json()).catch(() => ({ branches: [] })),
        commonservice.general_accmasters_info(branchId),
        fetch(`${API_CONFIG.BASE_URL}/PayrollOtherBranchAccount/${branchId}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }).then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const brs: Branch[] = (brRes?.branches ?? [])
        .filter((b: any) => (b.id ?? b.Id) !== branchId)
        .map((b: any) => ({
          id: b.id ?? b.Id,
          branchCode: b.branchCode ?? b.BranchCode ?? "",
          name: b.branchmaster_name ?? b.Name ?? b.name ?? "",
        }));
      setBranches(brs);

      const accs: any[] = accRes?.data ?? [];
      const opts: AccOpt[] = accs.map((a: any) => ({
        value: a.accId ?? a.id,
        label: `${a.accountNumber ?? a.accNo ?? ""} — ${a.accountName ?? a.name ?? ""}`,
      }));
      setAccOptions(opts);

      const existingMaps: BranchAccMapping[] = mapRes?.data ?? [];
      setMappings(existingMaps);

      const map: Record<number, AccOpt | null> = {};
      brs.forEach(b => {
        const existing = existingMaps.find(m => m.branchId === b.id);
        if (existing?.accId) {
          const found = opts.find(o => o.value === existing.accId);
          map[b.id] = found ?? { value: existing.accId, label: existing.accName ?? `Acc#${existing.accId}` };
        } else {
          map[b.id] = null;
        }
      });
      setAccMap(map);
    } catch { Swal.fire("Error", "Failed to load data.", "error"); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (branch: Branch) => {
    const selAcc = accMap[branch.id];
    setSaving(branch.id);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/PayrollOtherBranchAccount`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, otherBranchId: branch.id, accId: selAcc?.value ?? 0 }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message ?? "Failed to save.");
      Swal.fire({ toast: true, icon: "success", title: `${branch.name} saved`, position: "top-end", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to save.", "error");
    } finally { setSaving(null); }
  };

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-violet-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Payroll Other Branch Account</h1>
          <p className="text-sm text-white/70">Map GL accounts for inter-branch salary transfers</p>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-purple-50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-slate-500">Assign the GL account used to represent each branch in inter-branch salary transactions.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Branch Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Branch Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 min-w-64">GL Account</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Save</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No other branches found.</td></tr>
              ) : branches.map((branch, i) => (
                <tr key={branch.id} className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">{branch.branchCode}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{branch.name}</td>
                  <td className="px-4 py-2.5 min-w-64">
                    <Select
                      options={accOptions}
                      value={accMap[branch.id] ?? null}
                      onChange={opt => setAccMap(prev => ({ ...prev, [branch.id]: opt as AccOpt | null }))}
                      placeholder="Select GL account..."
                      styles={ctrlStyle}
                      isClearable
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => handleSave(branch)} disabled={saving === branch.id}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50">
                      {saving === branch.id ? "..." : "Save"}
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
