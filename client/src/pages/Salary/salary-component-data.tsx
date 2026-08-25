import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import salaryApi, { SalaryComponent } from "../../services/salary/salaryApi";
import DashboardLayout from "../../Common/Layout";

const PAGE_SIZE = 15;

export default function SalaryComponentData() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [items, setItems] = useState<SalaryComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await salaryApi.getSalaryComponents(branchId, { searchTerm: s, pageNumber: p, pageSize: PAGE_SIZE });
      setItems(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch { Swal.fire("Error", "Failed to load salary components.", "error"); }
    finally { setLoading(false); }
  }, [branchId, page, search]);

  useEffect(() => { load(); }, []);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); load(1, v); };

  const openForm = async (edit?: SalaryComponent) => {
    const { value } = await Swal.fire({
      title: edit ? "Edit Salary Component" : "Add Salary Component",
      width: 560,
      html: `
        <div class="grid grid-cols-2 gap-3 text-left p-1 text-sm">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Alias <span class="text-red-500">*</span></label>
            <input id="sw-alias" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="20" placeholder="BASIC" value="${edit?.alias ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Seq No</label>
            <input id="sw-seq" type="number" min="1" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="1" value="${edit?.seqNo ?? 1}"/>
          </div>
          <div class="col-span-2">
            <label class="block font-semibold text-slate-700 mb-1">Description <span class="text-red-500">*</span></label>
            <input id="sw-desc" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="100" placeholder="Basic Salary" value="${edit?.description ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Type</label>
            <select id="sw-type" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="1" ${(edit?.type ?? 1) === 1 ? 'selected' : ''}>Earning</option>
              <option value="2" ${edit?.type === 2 ? 'selected' : ''}>Deduction</option>
              <option value="3" ${edit?.type === 3 ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Editable?</label>
            <select id="sw-editable" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="1" ${(edit?.isEditable ?? 1) === 1 ? 'selected' : ''}>Yes</option>
              <option value="0" ${edit?.isEditable === 0 ? 'selected' : ''}>No</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Define Amount?</label>
            <select id="sw-defamt" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="1" ${(edit?.defineAmount ?? 1) === 1 ? 'selected' : ''}>Yes</option>
              <option value="0" ${edit?.defineAmount === 0 ? 'selected' : ''}>No</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Is Allowance?</label>
            <select id="sw-allow" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="0" ${(edit?.isAllowance ?? 0) === 0 ? 'selected' : ''}>No</option>
              <option value="1" ${edit?.isAllowance === 1 ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Is Deduction?</label>
            <select id="sw-deduct" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="0" ${(edit?.isDeduction ?? 0) === 0 ? 'selected' : ''}>No</option>
              <option value="1" ${edit?.isDeduction === 1 ? 'selected' : ''}>Yes</option>
            </select>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
        const sel = (id: string) => parseInt((document.getElementById(id) as HTMLSelectElement).value);
        const alias = g("sw-alias"); const desc = g("sw-desc");
        if (!alias || !desc) { Swal.showValidationMessage("Alias and Description are required."); return false; }
        return {
          alias, description: desc,
          seqNo: parseInt(g("sw-seq")) || 1,
          type: sel("sw-type"), isEditable: sel("sw-editable"),
          defineAmount: sel("sw-defamt"), isAllowance: sel("sw-allow"),
          isDeduction: sel("sw-deduct"),
        };
      },
    });
    if (!value) return;

    try {
      const payload = { ...value, branchId, id: edit?.id ?? 0 };
      const res = edit
        ? await salaryApi.updateSalaryComponent(payload)
        : await salaryApi.createSalaryComponent(payload);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Success", res.message, "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Operation failed.", "error");
    }
  };

  const handleDelete = async (item: SalaryComponent) => {
    const confirm = await Swal.fire({
      title: "Delete Component?",
      text: `Delete "${item.description}"?`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Delete", confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await salaryApi.deleteSalaryComponent(item.id, branchId);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Deleted", "Component removed.", "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not delete.", "error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100">
      <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Salary Component Master</h1>
          <p className="text-sm text-white/70">Manage earnings and deduction components</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => openForm()} className="px-4 py-2 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-md text-sm">
            + Add Component
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <input type="text" placeholder="Search by alias or description..."
            value={search} onChange={e => handleSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-400 bg-white text-sm"/>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Seq</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Alias</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Allowance</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Deduction</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No components found.</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-emerald-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 text-slate-500">{item.seqNo}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">{item.alias}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {item.type === 1 ? "Earning" : item.type === 2 ? "Deduction" : "Other"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isAllowance === 1 ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isDeduction === 1 ? <span className="text-red-500 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openForm(item)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all">Edit</button>
                      <button onClick={() => handleDelete(item)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-emerald-50">← Prev</button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-emerald-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    } />
  );
}
