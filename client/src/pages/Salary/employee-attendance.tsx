import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Calendar, Save, X, ArrowLeft } from "lucide-react";
import { RootState } from "../../redux";
import salaryApi, { AttendanceRow } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import DashboardLayout from "../../Common/Layout";

// ── Leave type options ────────────────────────────────────────────────────────
type LeaveKey = "EL" | "CL" | "MLSL" | "LWP" | "";

const LEAVE_OPTIONS: { value: LeaveKey; label: string }[] = [
  { value: "",     label: "==Please Select==" },
  { value: "EL",   label: "EL (Earned Leave)" },
  { value: "CL",   label: "CL (Casual Leave)" },
  { value: "MLSL", label: "ML or SL (Medical or Sick Leave)" },
  { value: "LWP",  label: "LWP (Leave Without Pay)" },
];

// ── Editable row ──────────────────────────────────────────────────────────────
interface EditableRow extends AttendanceRow {
  leaveType: LeaveKey;
  leaveCount: number;
  changed: boolean;
}

// ── Derive leaveType + leaveCount from separate el/cl/mlsl/lwp ───────────────
function toEditable(r: AttendanceRow): EditableRow {
  let leaveType: LeaveKey = "";
  let leaveCount = 0;
  if (r.el > 0)   { leaveType = "EL";   leaveCount = r.el; }
  else if (r.cl > 0)   { leaveType = "CL";   leaveCount = r.cl; }
  else if (r.mlsl > 0) { leaveType = "MLSL"; leaveCount = r.mlsl; }
  else if (r.lwp > 0)  { leaveType = "LWP";  leaveCount = r.lwp; }
  return { ...r, leaveType, leaveCount, changed: false };
}

// ── Map back to el/cl/mlsl/lwp ────────────────────────────────────────────────
function toSaveRow(r: EditableRow) {
  return {
    empId: r.empId,
    el:    r.leaveType === "EL"   ? r.leaveCount : 0,
    cl:    r.leaveType === "CL"   ? r.leaveCount : 0,
    mlsl:  r.leaveType === "MLSL" ? r.leaveCount : 0,
    lwp:   r.leaveType === "LWP"  ? r.leaveCount : 0,
    remarks: r.remarks,
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = "border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors";
const sel = inp + " cursor-pointer";

// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeAttendancePage() {
  const navigate = useNavigate();
  const user     = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const workingDate   = commonservice.parseWorkingDate(user.workingdate);
  const defaultDate   = workingDate;           // YYYY-MM-DD
  const defaultMonth  = workingDate.slice(0, 7); // YYYY-MM

  const [attType, setAttType]   = useState<1 | 2>(1);   // 1=Daily, 2=Monthly
  const [date, setDate]         = useState(defaultDate);
  const [month, setMonth]       = useState(defaultMonth);
  const [rows, setRows]         = useState<EditableRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [fetched, setFetched]   = useState(false);

  // ── Show ──────────────────────────────────────────────────────────────────
  const handleShow = async () => {
    const attMonth = attType === 1
      ? date.slice(0, 7) + "-01"      // daily → use selected date's month
      : month + "-01";                 // monthly

    if (!attMonth || attMonth === "-01") {
      Swal.fire("Required", "Please select a date.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await salaryApi.getAttendance(branchId, attMonth.slice(0, 7));
      if (!res.success) throw new Error("Failed to fetch attendance data.");
      setRows((res.items ?? []).map(toEditable));
      setFetched(true);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not load attendance.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Row update ────────────────────────────────────────────────────────────
  const updateRow = (idx: number, field: "leaveType" | "leaveCount" | "remarks", value: any) =>
    setRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, [field]: value, changed: true } : r
    ));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const changed = rows.filter(r => r.changed);
    if (changed.length === 0) {
      Swal.fire("No Changes", "No attendance records have been modified.", "info");
      return;
    }

    // Validate: if leaveType selected, count must be > 0
    for (const r of changed) {
      if (r.leaveType !== "" && r.leaveCount <= 0) {
        Swal.fire("Validation", `Leave count must be greater than 0 for ${r.empName}.`, "warning");
        return;
      }
    }

    const attMonth = attType === 1 ? date.slice(0, 7) + "-01" : month + "-01";
    setSaving(true);
    try {
      const res = await salaryApi.saveAttendance({
        branchId,
        attMonth,
        attType,
        rows: changed.map(toSaveRow),
      });
      if (!res.success) throw new Error(res.message);
      await Swal.fire({ icon: "success", title: "Saved!", text: res.message || "Attendance saved successfully.", confirmButtonColor: "#7c3aed", timer: 2000, showConfirmButton: false });
      setRows(prev => prev.map(r => ({ ...r, changed: false })));
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not save attendance.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = rows.some(r => r.changed);

  return (
    <DashboardLayout enableScroll={true} mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-6 space-y-5">

        {/* ── Title card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Calendar size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Employee Attendance</h1>
              <p className="text-sm text-gray-400 mt-0.5">Fields marked with <span className="text-red-500">*</span> are mandatory</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* ── Filter card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-end gap-8">

              {/* Attendance Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Attendance Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  {([{ val: 1, label: "Daily" }, { val: 2, label: "Monthly" }] as const).map(opt => (
                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
                      <input
                        type="radio"
                        name="attType"
                        value={opt.val}
                        checked={attType === opt.val}
                        onChange={() => { setAttType(opt.val); setFetched(false); setRows([]); }}
                        className="w-4 h-4 accent-purple-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date / Month */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  {attType === 1 ? "Date" : "Month"} <span className="text-red-500">*</span>
                </label>
                {attType === 1 ? (
                  <input
                    type="date"
                    value={date}
                    max={workingDate}
                    onChange={e => { setDate(e.target.value); setFetched(false); setRows([]); }}
                    className={inp + " w-44"}
                  />
                ) : (
                  <input
                    type="month"
                    value={month}
                    max={defaultMonth}
                    onChange={e => { setMonth(e.target.value); setFetched(false); setRows([]); }}
                    className={inp + " w-44"}
                  />
                )}
              </div>

              {/* Branch Code (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Branch Code</label>
                <input
                  readOnly
                  value={user.branchCode ?? ""}
                  className={inp + " w-32 bg-gray-50 text-gray-500 cursor-default"}
                />
              </div>

              {/* Show button */}
              <button
                onClick={handleShow}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md"
              >
                {loading ? "Loading..." : "Show"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Attendance Table ── */}
        {fetched && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Table header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-base font-bold text-gray-700">Attendance Records</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {rows.length} employee{rows.length !== 1 ? "s" : ""} &nbsp;·&nbsp;
                  {attType === 1
                    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                    : new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
              </div>
              {hasChanges && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  Unsaved changes
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold">No employees found for this branch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Sr.No.", "Branch Code", "Employee Code", "Employee Name", "Designation", "Leave Type", "Leave Count", "Remarks"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={row.empId} className={`transition-colors ${row.changed ? "bg-amber-50/40" : "hover:bg-purple-50/20"}`}>
                        <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-600">{user.branchCode ?? ""}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">{row.empCode}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.empName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{row.designationName || "—"}</td>

                        {/* Leave Type dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={row.leaveType}
                            onChange={e => updateRow(i, "leaveType", e.target.value as LeaveKey)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer min-w-[200px]"
                          >
                            {LEAVE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Leave Count */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="31"
                            step="0.5"
                            value={row.leaveCount || ""}
                            disabled={row.leaveType === ""}
                            onChange={e => updateRow(i, "leaveCount", parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.remarks}
                            maxLength={100}
                            onChange={e => updateRow(i, "remarks", e.target.value)}
                            placeholder="Optional"
                            className="w-full min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer: Save + Close */}
            {rows.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-500">{rows.filter(r => r.changed).length}</span> record(s) modified
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setRows([]); setFetched(false); }}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <X size={15} /> Close
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    <Save size={15} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {!fetched && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 flex flex-col items-center text-gray-400">
            <Calendar size={48} className="mb-4 text-gray-200" />
            <p className="text-base font-semibold text-gray-500">Select attendance type and date, then click Show</p>
            <p className="text-sm mt-1">Employee list will load with existing leave records</p>
          </div>
        )}

      </div>
    } />
  );
}
