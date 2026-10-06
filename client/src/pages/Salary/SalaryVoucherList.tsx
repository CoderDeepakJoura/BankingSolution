import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { FileText } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { SalaryVoucherListResponse } from "../../services/salary/salaryApi";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SalaryVoucherList() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [data, setData]       = useState<SalaryVoucherListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await salaryApi.getSalaryVoucherList(branchId);
      setData(res.data ?? null);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to load salary vouchers.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [branchId]);

  const rows = data?.rows ?? [];

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Salary Voucher List</h1>
          <p className="text-sm text-white/70">All processed salary vouchers for this branch</p>
        </div>
        <div className="ml-auto">
          <button onClick={load}
            className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-md text-sm">
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
              <tr>
                {["#", "Voucher No.", "Salary Month", "Process Date", "Employees", "Total Gross (₹)", "Deductions (₹)", "Net Pay (₹)"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">No salary vouchers found.</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.voucherId} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{row.srNo}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">#{row.voucherId}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{row.salaryMonth}</td>
                  <td className="px-4 py-3 text-slate-500">{row.processDate}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{row.employeeCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(row.totalGross)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(row.totalDeduction)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(row.totalNetPay)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={5} className="px-4 py-3 font-bold text-slate-600 text-right">Grand Total</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(rows.reduce((s, r) => s + r.totalGross, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(rows.reduce((s, r) => s + r.totalDeduction, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(rows.reduce((s, r) => s + r.totalNetPay, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
    } />
  );
}
