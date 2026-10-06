import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { TrendingUp, Printer } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { ArrearReportResponse } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import { getSessionMonthOptions } from "../../utils/sessionUtils";

interface MonthOpt { value: string; label: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ArrearReport() {
  const navigate = useNavigate();
  const user     = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;
  const printRef = useRef<HTMLDivElement>(null);

  const workingDate = commonservice.parseWorkingDate(user.workingdate);
  const MONTH_OPTS  = getSessionMonthOptions(user.sessionInfo, workingDate);

  const [fromMonth, setFromMonth] = useState<MonthOpt | null>(null);
  const [toMonth, setToMonth]     = useState<MonthOpt | null>(null);
  const [report, setReport]       = useState<ArrearReportResponse | null>(null);
  const [loading, setLoading]     = useState(false);

  const handleGenerate = async () => {
    if (!fromMonth || !toMonth) { Swal.fire("Select Date Range", "Please select both From and To month.", "warning"); return; }
    if (fromMonth.value > toMonth.value) { Swal.fire("Invalid Range", "From Month cannot be after To Month.", "warning"); return; }
    setLoading(true);
    try {
      const res = await salaryApi.getArrearReport({ branchId, fromMonth: fromMonth.value, toMonth: toMonth.value, compIds: [] });
      if (!res.success) throw new Error(res.message);
      setReport(res.data ?? null);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to generate report.", "error");
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Arrear Report</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px}
      th{background:#eee;font-weight:bold}tfoot td{font-weight:bold;background:#f5f5f5}
      h2,h3{text-align:center;margin:4px 0}.text-right{text-align:right}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <DashboardLayout enableScroll mainContent={
    <div className="w-full min-h-screen bg-slate-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Arrear Report</h1>
          <p className="text-sm text-white/70">Due vs drawn salary component comparison</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <div className="p-2 bg-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Filter</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">From Month <span className="text-red-500">*</span></label>
              <Select options={MONTH_OPTS} value={fromMonth} onChange={opt => setFromMonth(opt as MonthOpt | null)}
                placeholder="From..." styles={ctrlStyle} isClearable />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">To Month <span className="text-red-500">*</span></label>
              <Select options={MONTH_OPTS} value={toMonth} onChange={opt => setToMonth(opt as MonthOpt | null)}
                placeholder="To..." styles={ctrlStyle} isClearable />
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <button onClick={handleGenerate} disabled={loading || !fromMonth || !toMonth}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <TrendingUp size={15} />}
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
              <h3 className="text-base font-semibold text-center text-slate-700 mb-4">
                Arrear Report — {report.fromMonth} to {report.toMonth}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      {["Sr.", "Employee Name", "Month", "Component", "Due (₹)", "Drawn (₹)", "Arrear (₹)"].map(h => (
                        <th key={h} className="px-3 py-2 border border-slate-300 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-400">No arrear differences found in this period.</td></tr>
                    ) : report.rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 border border-slate-200 text-slate-400">{row.srNo}</td>
                        <td className="px-3 py-2 border border-slate-200 font-medium">{row.empName}</td>
                        <td className="px-3 py-2 border border-slate-200 whitespace-nowrap">{row.salaryMonth}</td>
                        <td className="px-3 py-2 border border-slate-200">{row.compName}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{fmt(row.due)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{fmt(row.drawn)}</td>
                        <td className={`px-3 py-2 border border-slate-200 text-right font-semibold ${row.arrear > 0 ? "text-green-700" : row.arrear < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {fmt(Math.abs(row.arrear))}{row.arrear < 0 ? " (Dr)" : row.arrear > 0 ? " (Cr)" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {report.rows.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 border border-slate-300 text-right">Total</td>
                        <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalDue)}</td>
                        <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalDrawn)}</td>
                        <td className="px-3 py-2 border border-slate-300 text-right">{fmt(Math.abs(report.totalArrear))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    } />
  );
}
