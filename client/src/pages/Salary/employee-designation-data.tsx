import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import salaryApi, { EmployeeDesignation } from "../../services/salary/salaryApi";
import DashboardLayout from "../../Common/Layout";

const PAGE_SIZE = 15;

export default function EmployeeDesignationData() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [items, setItems] = useState<EmployeeDesignation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await salaryApi.getDesignations(branchId, { searchTerm: s, pageNumber: p, pageSize: PAGE_SIZE });
      setItems(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch { Swal.fire("Error", "Failed to load designations.", "error"); }
    finally { setLoading(false); }
  }, [branchId, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); load(1, v); };

  const openForm = async (edit?: EmployeeDesignation) => {
    const { value } = await Swal.fire({
      title: edit ? "Edit Designation" : "Add Designation",
      html: `
        <div class="space-y-4 text-left p-1">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Alias <span class="text-red-500">*</span></label>
            <input id="sw-alias" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="20" placeholder="Short code e.g. MGR" value="${edit?.alias ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Description <span class="text-red-500">*</span></label>
            <input id="sw-desc" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="150" placeholder="Full designation name" value="${edit?.description ?? ''}" autocomplete="off"/>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      preConfirm: () => {
        const alias = (document.getElementById("sw-alias") as HTMLInputElement).value.trim();
        const desc = (document.getElementById("sw-desc") as HTMLInputElement).value.trim();
        if (!alias || !desc) { Swal.showValidationMessage("Both Alias and Description are required."); return false; }
        return { alias, description: desc };
      },
    });
    if (!value) return;

    try {
      const payload = { ...value, branchId, id: edit?.id ?? 0, empGradeId: edit?.empGradeId ?? 0 };
      const res = edit
        ? await salaryApi.updateDesignation(payload)
        : await salaryApi.createDesignation(payload);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Success", res.message, "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Operation failed.", "error");
    }
  };

  const handleDelete = async (item: EmployeeDesignation) => {
    const confirm = await Swal.fire({
      title: "Delete Designation?",
      text: `Delete "${item.description}"? This cannot be undone.`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Delete", confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await salaryApi.deleteDesignation(item.id, branchId);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Deleted", "Designation removed.", "success");
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
      <div className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate("/dashboard")}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6a4 4 0 11-8 0 4 4 0 018 0zM12 20a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Designation Master</h1>
          <p className="text-sm text-white/70">Manage employee designations / job titles</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => openForm()}
            className="px-4 py-2 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-all shadow-md text-sm">
            + Add Designation
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        <div className="mb-4 flex gap-3">
          <input
            type="text" placeholder="Search by alias or description..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Alias</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Grade ID</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No designations found.</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold">{item.alias}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
                  <td className="px-4 py-3 text-slate-500">{item.empGradeId || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openForm(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-indigo-50">← Prev</button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-indigo-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    } />
  );
}
