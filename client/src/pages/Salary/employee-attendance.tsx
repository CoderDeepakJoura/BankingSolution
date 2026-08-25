import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import salaryApi, { AttendanceRow } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import DashboardLayout from "../../Common/Layout";

interface EditableRow extends AttendanceRow {
  changed: boolean;
}

const NUM_COLS = ["el", "cl", "mlsl", "lwp"] as const;
type LeaveCol = typeof NUM_COLS[number];

export default function EmployeeAttendancePage() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const workingDate = commonservice.parseWorkingDate(user.workingdate);
  const defaultMonth = workingDate.slice(0, 7);

  const [attMonth, setAttMonth] = useState(defaultMonth);
  const [attType, setAttType] = useState<1 | 2>(2); // 1=Daily, 2=Monthly
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleShow = async () => {
    if (!attMonth) { Swal.fire("Required", "Please select a month.", "warning"); return; }
    setLoading(true);
    try {
      const res = await salaryApi.getAttendance(branchId, attMonth);
      if (!res.success) throw new Error("Failed to fetch attendance data.");
      setRows((res.items ?? []).map(r => ({ ...r, changed: false })));
      setFetched(true);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not load attendance.", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, field: LeaveCol | "remarks", value: string | number) => {
    setRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, [field]: value, changed: true } : r
    ));
  };

  const handleSave = async () => {
    const changed = rows.filter(r => r.changed);
    if (changed.length === 0) {
      Swal.fire("No Changes", "No attendance records have been modified.", "info");
      return;
    }

    // Validate: leave counts must be non-negative
    for (const r of changed) {
      if (r.el < 0 || r.cl < 0 || r.mlsl < 0 || r.lwp < 0) {
        Swal.fire("Validation Error", `Negative leave values are not allowed for ${r.empName}.`, "warning");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await salaryApi.saveAttendance({
        branchId,
        attMonth: `${attMonth}-01`,
        attType,
        rows: changed.map(r => ({
          empId: r.empId,
          el: r.el,
          cl: r.cl,
          mlsl: r.mlsl,
          lwp: r.lwp,
          remarks: r.remarks,
        })),
      });
      if (!res.success) throw new Error(res.message);
      await Swal.fire("Saved", res.message || "Attendance saved successfully.", "success");
      setRows(prev => prev.map(r => ({ ...r, changed: false })));
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not save attendance.", "error");
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = attMonth
    ? new Date(`${attMonth}-01`).toLocaleString("en-IN", { month: "long", year: "numeric" })
    : "";

  return (
    <DashboardLayout enableScroll={true} mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100">
        {/* Header */}
        <div className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 px-6 py-4 flex items-center gap-4 shadow-lg">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="p-2 rounded-xl bg-white/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Employee Attendance</h1>
            <p className="text-sm text-white/80">Record monthly leave and attendance for employees</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="text-base font-bold text-slate-700 mb-4">Select Month</h2>
            <div className="flex flex-wrap gap-5 items-end">
              {/* Attendance Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Attendance Type</label>
                <div className="flex gap-4">
                  {([{ label: "Monthly", val: 2 }, { label: "Daily", val: 1 }] as const).map(opt => (
                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="attType"
                        value={opt.val}
                        checked={attType === opt.val}
                        onChange={() => { setAttType(opt.val); setFetched(false); setRows([]); }}
                        className="accent-teal-600 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Month picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Month <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={attMonth}
                  max={workingDate.slice(0, 7)}
                  onChange={e => { setAttMonth(e.target.value); setFetched(false); setRows([]); }}
                  className="px-3 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-teal-400 text-sm bg-white"
                />
              </div>

              {/* Show button */}
              <button
                onClick={handleShow}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-md text-sm">
                {loading ? "Loading..." : "Show"}
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          {fetched && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-700">
                    Attendance — {monthLabel}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rows.length} employee{rows.length !== 1 ? "s" : ""} · enter leave days for each
                  </p>
                </div>
                {rows.some(r => r.changed) && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    Unsaved changes
                  </span>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  <p className="font-semibold">No employees found for this branch.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600 w-10">#</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Emp Code</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Name</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Designation</th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600 w-24">
                          <span className="text-green-600">EL</span>
                        </th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600 w-24">
                          <span className="text-blue-600">CL</span>
                        </th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600 w-24">
                          <span className="text-purple-600">ML/SL</span>
                        </th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600 w-24">
                          <span className="text-red-600">LWP</span>
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={row.empId}
                          className={`border-b border-slate-100 transition-colors ${row.changed ? "bg-amber-50/40" : "hover:bg-teal-50/30"}`}>
                          <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 text-xs">{row.empCode}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.empName}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{row.designationName || "—"}</td>
                          {NUM_COLS.map(col => {
                            const colorMap: Record<LeaveCol, string> = {
                              el: "focus:border-green-400",
                              cl: "focus:border-blue-400",
                              mlsl: "focus:border-purple-400",
                              lwp: "focus:border-red-400",
                            };
                            return (
                              <td key={col} className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={row[col]}
                                  onChange={e => updateRow(i, col, parseFloat(e.target.value) || 0)}
                                  className={`w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg outline-none ${colorMap[col]} text-center text-sm`}
                                />
                              </td>
                            );
                          })}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.remarks}
                              maxLength={100}
                              onChange={e => updateRow(i, "remarks", e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg outline-none focus:border-teal-400 text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend + Save */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-4 text-xs text-slate-500 font-medium">
                  <span><span className="text-green-600 font-semibold">EL</span> = Earned Leave</span>
                  <span><span className="text-blue-600 font-semibold">CL</span> = Casual Leave</span>
                  <span><span className="text-purple-600 font-semibold">ML/SL</span> = Medical / Sick Leave</span>
                  <span><span className="text-red-600 font-semibold">LWP</span> = Leave Without Pay</span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !rows.some(r => r.changed)}
                  className="px-8 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md text-sm">
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </div>
          )}

          {/* Empty state before first Show */}
          {!fetched && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-semibold">Select a month and click Show</p>
              <p className="text-sm mt-1">Employees will load with their existing leave records</p>
            </div>
          )}
        </div>
      </div>
    } />
  );
}
