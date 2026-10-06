import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { User, Printer } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { EmployeeMaster, EmpSalaryStatementResponse } from "../../services/salary/salaryApi";

interface EmpOpt { value: number; label: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EmpSalaryStatement() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;
  const printRef = useRef<HTMLDivElement>(null);

  const [empOptions, setEmpOptions] = useState<EmpOpt[]>([]);
  const [selEmp, setSelEmp]         = useState<EmpOpt | null>(null);
  const [report, setReport]         = useState<EmpSalaryStatementResponse | null>(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    salaryApi.getEmployeeDropdown(branchId)
      .then(r => {
        const items: EmployeeMaster[] = (r as any).items ?? [];
        setEmpOptions(items.map(e => ({
          value: e.id,
          label: `${e.code} — ${e.firstName}${e.lastName ? " " + e.lastName : ""}`,
        })));
      })
      .catch(() => {});
  }, [branchId]);

  const handleGenerate = async () => {
    if (!selEmp) { Swal.fire("Select Employee", "Please select an employee.", "warning"); return; }
    setLoading(true);
    try {
      const res = await salaryApi.getEmpSalaryStatement({ branchId, empId: selEmp.value });
      if (!res.success) throw new Error(res.message);
      setReport(res.data ?? null);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to generate statement.", "error");
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Employee Salary Statement</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px}
      th{background:#eee;font-weight:bold}tfoot td{font-weight:bold;background:#f5f5f5}
      h2,h3,p{text-align:center;margin:3px 0}.text-right{text-align:right}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <DashboardLayout enableScroll mainContent={
    <div className="w-full min-h-screen bg-slate-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-violet-700 via-purple-700 to-pink-700 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Salary Statement</h1>
          <p className="text-sm text-white/70">Per-employee monthly salary history</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <div className="p-2 bg-violet-600 rounded-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Select Employee</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Employee</label>
              <Select options={empOptions} value={selEmp} onChange={opt => { setSelEmp(opt as EmpOpt | null); setReport(null); }}
                placeholder="Search employee..." styles={ctrlStyle} isClearable />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleGenerate} disabled={loading || !selEmp}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <User size={15} />}
                Generate
              </button>
              {report && (
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition text-sm cursor-pointer">
                  <Printer size={15} /> Print
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {report && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div ref={printRef} className="p-5">
              <h2 className="text-lg font-bold text-center text-slate-800">{report.branchName}</h2>
              <p className="text-sm text-center text-slate-500 mb-1">{report.branchAddress}</p>
              <h3 className="text-base font-semibold text-center text-slate-700">Employee Salary Statement</h3>
              <p className="text-sm text-center text-slate-600 mb-1">
                {report.empCode} — {report.empName} | {report.designation}
              </p>
              <p className="text-xs text-center text-slate-400 mb-4">&nbsp;</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 border border-slate-300 text-left whitespace-nowrap">Month</th>
                      {report.allComponents.map(c => (
                        <th key={c.compId} className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap">{c.compAlias}</th>
                      ))}
                      <th className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap bg-green-50">Gross</th>
                      <th className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap bg-red-50">Deduction</th>
                      <th className="px-3 py-2 border border-slate-300 text-right whitespace-nowrap bg-blue-50">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 border border-slate-200 font-medium whitespace-nowrap">{row.salaryMonth}</td>
                        {report.allComponents.map(c => {
                          const amt = row.components.find(x => x.compId === c.compId)?.amount ?? 0;
                          return (
                            <td key={c.compId} className="px-3 py-2 border border-slate-200 text-right">
                              {amt !== 0 ? fmt(Math.abs(amt)) : "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 border border-slate-200 text-right font-semibold text-green-700">{fmt(row.totalGross)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right font-semibold text-red-600">{fmt(row.totalDeduction)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right font-bold text-blue-700">{fmt(row.netPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {report?.rows.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No salary records found for this employee.</div>
        )}
      </div>
    </div>
    } />
  );
}
