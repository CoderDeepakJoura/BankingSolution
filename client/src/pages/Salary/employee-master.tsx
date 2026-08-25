import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { EmployeeMaster, EmployeeDesignation } from "../../services/salary/salaryApi";

const PAGE_SIZE = 15;
const GENDER_OPTIONS = [{ id: 1, label: "Male" }, { id: 2, label: "Female" }, { id: 3, label: "Other" }];
const EMP_TYPE_OPTIONS = [{ id: 1, label: "Permanent" }, { id: 2, label: "Contract" }, { id: 3, label: "Part-Time" }];

export default function EmployeeMasterPage() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [items, setItems] = useState<EmployeeMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [designations, setDesignations] = useState<EmployeeDesignation[]>([]);

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await salaryApi.getEmployees(branchId, { searchTerm: s, pageNumber: p, pageSize: PAGE_SIZE });
      setItems(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch { Swal.fire("Error", "Failed to load employees.", "error"); }
    finally { setLoading(false); }
  }, [branchId, page, search]);

  useEffect(() => {
    load();
    salaryApi.getDesignationDropdown(branchId).then(r => setDesignations(r.items ?? []));
  }, []);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); load(1, v); };

  const openForm = async (edit?: EmployeeMaster) => {
    const today = new Date().toISOString().slice(0, 10);
    const desigOpts = designations.map(d =>
      `<option value="${d.id}" ${edit?.designationId === d.id ? 'selected' : ''}>${d.description}</option>`
    ).join('');
    const genderOpts = GENDER_OPTIONS.map(g =>
      `<option value="${g.id}" ${(edit?.genderId ?? 1) === g.id ? 'selected' : ''}>${g.label}</option>`
    ).join('');
    const empTypeOpts = EMP_TYPE_OPTIONS.map(e =>
      `<option value="${e.id}" ${(edit?.empType ?? 1) === e.id ? 'selected' : ''}>${e.label}</option>`
    ).join('');

    const { value } = await Swal.fire({
      title: edit ? "Edit Employee" : "Add Employee",
      width: 600,
      html: `
        <div class="grid grid-cols-2 gap-3 text-left p-1 text-sm">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Code <span class="text-red-500">*</span></label>
            <input id="sw-code" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="50" placeholder="EMP001" value="${edit?.code ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Designation</label>
            <select id="sw-desig" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="0">-- Select --</option>${desigOpts}
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">First Name <span class="text-red-500">*</span></label>
            <input id="sw-fname" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="80" placeholder="First Name" value="${edit?.firstName ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Last Name</label>
            <input id="sw-lname" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="80" placeholder="Last Name" value="${edit?.lastName ?? ''}" autocomplete="off"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Gender</label>
            <select id="sw-gender" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">${genderOpts}</select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Emp Type</label>
            <select id="sw-emptype" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500">${empTypeOpts}</select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input id="sw-dob" type="date" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              min="1900-01-01" max="${today}" value="${edit?.dob ?? ''}"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Joining Date <span class="text-red-500">*</span></label>
            <input id="sw-join" type="date" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              min="1900-01-01" max="${today}" value="${edit?.joiningDate ?? ''}"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Phone</label>
            <input id="sw-phone" type="tel" inputmode="numeric"
              class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="15" pattern="[0-9]*" placeholder="10-digit mobile number" value="${edit?.phone ?? ''}" autocomplete="off"
              oninput="this.value=this.value.replace(/[^0-9]/g,'')"/>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Email</label>
            <input id="sw-email" type="text" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="100" placeholder="email@example.com" value="${edit?.emailId ?? ''}" autocomplete="off"/>
          </div>
          <div class="col-span-2">
            <label class="block font-semibold text-slate-700 mb-1">Address</label>
            <input id="sw-addr" class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500"
              maxlength="200" placeholder="Address" value="${edit?.address ?? ''}" autocomplete="off"/>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: edit ? "Update" : "Add",
      confirmButtonColor: "#4f46e5",
      preConfirm: () => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
        const code    = g("sw-code");
        const fname   = g("sw-fname");
        const lname   = g("sw-lname");
        const join    = g("sw-join");
        const dob     = g("sw-dob");
        const phone   = g("sw-phone");
        const email   = g("sw-email");
        const address = g("sw-addr");
        const todayVal = new Date().toISOString().slice(0, 10);

        // Required fields
        if (!code)  { Swal.showValidationMessage("Employee Code is required."); return false; }
        if (!/^[A-Za-z0-9\-_/]+$/.test(code)) { Swal.showValidationMessage("Code must be alphanumeric (letters, digits, -, _, / only)."); return false; }
        if (!fname) { Swal.showValidationMessage("First Name is required."); return false; }
        if (!/^[A-Za-z\s.'-]+$/.test(fname)) { Swal.showValidationMessage("First Name must contain letters only."); return false; }
        if (lname && !/^[A-Za-z\s.'-]+$/.test(lname)) { Swal.showValidationMessage("Last Name must contain letters only."); return false; }
        if (!join)  { Swal.showValidationMessage("Joining Date is required."); return false; }
        if (join > todayVal) { Swal.showValidationMessage("Joining Date cannot be in the future."); return false; }
        if (dob) {
          if (dob > todayVal) { Swal.showValidationMessage("Date of Birth cannot be in the future."); return false; }
          if (dob < "1900-01-01") { Swal.showValidationMessage("Date of Birth must be after 1900."); return false; }
          if (join && dob >= join) { Swal.showValidationMessage("Date of Birth must be before Joining Date."); return false; }
        }
        if (phone && !/^[0-9]{7,15}$/.test(phone)) { Swal.showValidationMessage("Phone must be 7–15 digits only."); return false; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage("Please enter a valid email address."); return false; }
        if (address && address.length > 200) { Swal.showValidationMessage("Address cannot exceed 200 characters."); return false; }

        return {
          code, firstName: fname, lastName: lname || undefined,
          designationId: parseInt((document.getElementById("sw-desig") as HTMLSelectElement).value),
          genderId: parseInt((document.getElementById("sw-gender") as HTMLSelectElement).value),
          empType: parseInt((document.getElementById("sw-emptype") as HTMLSelectElement).value),
          dob: dob || undefined, joiningDate: join,
          phone: phone || undefined, emailId: email || undefined,
          address: address || undefined, status: 1
        };
      },
    });
    if (!value) return;

    try {
      const payload = { ...value, branchId, id: edit?.id ?? 0 };
      const res = edit
        ? await salaryApi.updateEmployee(payload)
        : await salaryApi.createEmployee(payload);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Success", res.message, "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Operation failed.", "error");
    }
  };

  const handleDelete = async (item: EmployeeMaster) => {
    const confirm = await Swal.fire({
      title: "Delete Employee?",
      text: `Delete "${item.firstName} ${item.lastName ?? ''}"?`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Delete", confirmButtonColor: "#ef4444",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await salaryApi.deleteEmployee(item.id, branchId);
      if (!res.success) throw new Error(res.message);
      Swal.fire("Deleted", "Employee removed.", "success");
      load();
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not delete.", "error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-purple-50 to-indigo-100">
      <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Master</h1>
          <p className="text-sm text-white/70">Manage employee records</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => openForm()} className="px-4 py-2 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all shadow-md text-sm">
            + Add Employee
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <input type="text" placeholder="Search by name or code..."
            value={search} onChange={e => handleSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-400 bg-white text-sm"/>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Designation</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Joining</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No employees found.</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-purple-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">{item.code}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.firstName} {item.lastName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.designationName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{item.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{item.joiningDate}</td>
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
                <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-purple-50">← Prev</button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 bg-white border border-slate-200 hover:bg-purple-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    } />
  );
}
