import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import salaryApi, { EmpGrade } from "../../services/salary/salaryApi";
import DashboardLayout from "../../Common/Layout";

const PAGE_SIZE = 15;

export default function EmployeeGradeData() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [items, setItems]   = useState<EmpGrade[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await salaryApi.getEmpGrades(branchId, { searchTerm: s, pageNumber: p, pageSize: PAGE_SIZE });
      setItems((res as any).items ?? []);
      setTotal((res as any).totalCount ?? 0);
    } catch { Swal.fire("Error", "Failed to load employee grades.", "error"); }
    finally { setLoading(false); }
  }, [branchId, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); load(1, v); };

  const openForm = async (edit?: EmpGrade) => {
    const { value } = await Swal.fire({
      title: edit ? "Edit Employee Grade" : "Add Employee Grade",
      html: `
        <div class="space-y-4 text-left p-1">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Code <span class="text-red-500">*</span></label>
            <input id="sw-code" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="20" placeholder="e.g. GR1" value="${edit?.code ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Description <span class="text-red-500">*</span></label>
            <input id="sw-desc" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="150" placeholder="Full grade name" value="${edit?.description ?? ''}" autocomplete="off"/>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      preConfirm: () => {
        const code = (document.getElementById("sw-code") as HTMLInputElement).value.trim();
        const desc = (document.getElementById("sw-desc") as HTMLInputElement).value.trim();
        if (!code) { Swal.showValidationMessage("Code is required."); return false; }
        if (!desc) { Swal.showValidationMessage("Description is required."); return false; }
        return { code, description: desc };
      },
    });
    if (!value) return;

    try {
      const payload = { ...value, branchId, id: edit?.id ?? 0 };
      const res = edit
        ? await salaryApi.updateEmpGrade(payload)
        : await salaryApi.createEmpGrade(payload);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Success", res.message, "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Operation failed.", "error");
    }
  };

  const handleDelete = async (item: EmpGrade) => {
    const confirm = await Swal.fire({
      title: "Delete Grade?",
      text: `Delete "${item.description}"? This cannot be undone.`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Delete", confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await salaryApi.deleteEmpGrade(item.id, branchId);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Deleted", "Grade removed.", "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not delete.", "error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Grade Master</h1>
          <p className="text-sm text-white/70">Manage employee pay grades</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => openForm()}
            className="px-4 py-2 bg-white text-violet-700 font-semibold rounded-xl hover:bg-violet-50 transition-all shadow-md text-sm">
            + Add Grade
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <input
            type="text" placeholder="Search by code or description..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-violet-400 bg-white text-sm"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No grades found.</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-violet-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold">{item.code}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openForm(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all cursor-pointer">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all cursor-pointer">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-violet-50 cursor-pointer">← Prev</button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-violet-50 cursor-pointer">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    } />
  );
}
