import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import salaryApi, { EmployeeMaster, SalaryComponentLine, SalaryCreationData } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import { getSessionFromDate } from "../../utils/sessionUtils";
import DashboardLayout from "../../Common/Layout";

interface ComponentRow extends SalaryComponentLine {
  editedAmount: number;
  active: boolean;
}

export default function SalaryCreation() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const workingDate = commonservice.parseWorkingDate(user.workingdate);
  const sessionStart = getSessionFromDate(user.sessionInfo, workingDate);

  // derive default salary month as YYYY-MM (current working month)
  const defaultMonth = workingDate.slice(0, 7);

  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number>(0);
  const [salaryMonth, setSalaryMonth] = useState(defaultMonth);
  const [salaryData, setSalaryData] = useState<SalaryCreationData | null>(null);
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    salaryApi.getEmployeeDropdown(branchId).then(r => setEmployees(r.items ?? []));
  }, [branchId]);

  const handleFetch = async () => {
    if (!selectedEmpId) { Swal.fire("Required", "Please select an employee.", "warning"); return; }
    if (!salaryMonth) { Swal.fire("Required", "Please select a salary month.", "warning"); return; }

    // Derive date range for selected month
    const [yr, mo] = salaryMonth.split("-").map(Number);
    const dateFrom = `${salaryMonth}-01`;
    const lastDay = new Date(yr, mo, 0).getDate();
    const dateTo = `${salaryMonth}-${String(lastDay).padStart(2, "0")}`;
    // salaryDate = last day of the month
    const salaryDate = dateTo;

    setLoading(true);
    try {
      const res = await salaryApi.fetchEmployeeSalary({
        branchId, empId: selectedEmpId, salaryDate, dateFrom, dateTo,
      });
      if (!res.success || !res.data) throw new Error("Failed to fetch salary data.");
      setSalaryData(res.data);
      setRows(res.data.components.map(c => ({
        ...c,
        editedAmount: c.amount,
        active: c.isActive === 1,
      })));
      setFetched(true);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not fetch salary data.", "error");
    } finally { setLoading(false); }
  };

  const handleAmountChange = (idx: number, val: string) => {
    const n = parseFloat(val) || 0;
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, editedAmount: n } : r));
  };

  const handleActiveToggle = (idx: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, active: !r.active, editedAmount: !r.active ? r.amount : 0 } : r));
  };

  const earnings = rows.filter(r => r.active && r.isDeduction !== 1);
  const deductions = rows.filter(r => r.active && r.isDeduction === 1);
  const totalGross = earnings.reduce((s, r) => s + r.editedAmount, 0);
  const totalDeduction = deductions.reduce((s, r) => s + r.editedAmount, 0);
  const netPay = totalGross - totalDeduction;

  const handleSave = async () => {
    if (!salaryData || !selectedEmpId) return;
    setSaving(true);
    try {
      const res = await salaryApi.saveMonthlySalary({
        branchId,
        sessionId: user.sessionId ?? 0,
        processedBy: 0,
        salaryMonth: `${salaryMonth}-01`,
        employees: [{
          empId: selectedEmpId,
          totalGross, totalDeduction, netPay,
          components: rows.filter(r => r.active).map(r => ({
            compId: r.componentId, amount: r.editedAmount, isDeduction: r.isDeduction,
          })),
        }],
      });
      if (!res.success) throw new Error(res.message);
      await Swal.fire("Saved", res.message, "success");
      setFetched(false); setSalaryData(null); setRows([]); setSelectedEmpId(0);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Could not save salary.", "error");
    } finally { setSaving(false); }
  };

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-amber-50 to-orange-100">
      <div className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Salary Creation</h1>
          <p className="text-sm text-white/80">Process monthly salary for employees</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Selection Panel */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-base font-bold text-slate-700 mb-4">Select Employee & Month</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Employee <span className="text-red-500">*</span></label>
              <select value={selectedEmpId} onChange={e => { setSelectedEmpId(parseInt(e.target.value)); setFetched(false); setSalaryData(null); setRows([]); }}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 cursor-pointer text-sm bg-white">
                <option value={0}>-- Select Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.code} — {e.firstName} {e.lastName ?? ""}</option>)}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-semibold text-slate-600 mb-1">Salary Month <span className="text-red-500">*</span></label>
              <input type="month" value={salaryMonth} onChange={e => { setSalaryMonth(e.target.value); setFetched(false); setSalaryData(null); setRows([]); }}
                max={workingDate.slice(0, 7)}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 text-sm bg-white"/>
            </div>
            <button onClick={handleFetch} disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-md text-sm">
              {loading ? "Fetching..." : "Fetch Salary"}
            </button>
          </div>
        </div>

        {/* Salary Details */}
        {fetched && salaryData && (
          <>
            {/* Employee Info */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Employee</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{salaryData.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Designation</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{salaryData.designationName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Salary Month</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{salaryMonth}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Days in Month</p>
                  <p className="text-base font-semibold text-slate-700 mt-0.5">{salaryData.daysInMonth}</p>
                </div>
              </div>
            </div>

            {/* Component Table */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <h2 className="text-base font-bold text-slate-700">Salary Components</h2>
                <p className="text-xs text-slate-500 mt-0.5">Toggle active/inactive and edit amounts as needed</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 w-8">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Component</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600 w-20">Active</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600 w-40">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.componentId} className={`border-b border-slate-100 transition-colors ${row.active ? "hover:bg-amber-50/40" : "bg-slate-50/60 opacity-50"}`}>
                        <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.name}</td>
                        <td className="px-4 py-3 text-center">
                          {row.isDeduction === 1
                            ? <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">Deduction</span>
                            : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Earning</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleActiveToggle(i)}
                            className={`w-10 h-5 rounded-full transition-all ${row.active ? "bg-orange-400" : "bg-slate-300"} relative`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${row.active ? "left-5" : "left-0.5"}`}/>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" step="0.01"
                            value={row.editedAmount}
                            onChange={e => handleAmountChange(i, e.target.value)}
                            disabled={!row.active}
                            className="w-full px-3 py-1.5 border-2 border-slate-200 rounded-lg outline-none focus:border-orange-400 text-right text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h2 className="text-base font-bold text-slate-700 mb-4">Salary Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Gross</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">₹{fmt(totalGross)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Deduction</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">₹{fmt(totalDeduction)}</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Net Pay</p>
                  <p className="text-2xl font-bold text-orange-700 mt-1">₹{fmt(netPay)}</p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button onClick={handleSave} disabled={saving || rows.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-lg text-sm">
                  {saving ? "Saving..." : "Save Monthly Salary"}
                </button>
              </div>
            </div>
          </>
        )}

        {!fetched && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-semibold">Select an employee and month, then click Fetch Salary</p>
          </div>
        )}
      </div>
    </div>
    } />
  );
}
