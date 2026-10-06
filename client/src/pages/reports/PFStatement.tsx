import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { FileText, Printer } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { SalaryVoucherDropdown, PFStatementResponse } from "../../services/salary/salaryApi";

interface MonthOpt { value: string; label: string }
interface VnoOpt { value: number; label: string }

function buildMonthOptions(): MonthOpt[] {
  const opts: MonthOpt[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    opts.push({ value: val, label: d.toLocaleString("en-IN", { month: "long", year: "numeric" }) });
  }
  return opts;
}

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };
const MONTH_OPTS = buildMonthOptions();
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PFStatement() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;
  const printRef = useRef<HTMLDivElement>(null);

  const [month, setMonth]         = useState<MonthOpt | null>(null);
  const [vouchers, setVouchers]   = useState<SalaryVoucherDropdown[]>([]);
  const [selVno, setSelVno]       = useState<VnoOpt | null>(null);
  const [report, setReport]       = useState<PFStatementResponse | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!month) { setVouchers([]); setSelVno(null); setReport(null); return; }
    salaryApi.getSalaryVouchers(branchId, month.value)
      .then(r => { setVouchers((r as any).items ?? []); setSelVno(null); setReport(null); })
      .catch(() => setVouchers([]));
  }, [branchId, month]);

  const vnoOpts: VnoOpt[] = vouchers.map(v => ({ value: v.id, label: `Vno ${v.id} — ${v.label}` }));

  const handleGenerate = async () => {
    if (!selVno) { Swal.fire("Select Voucher", "Please select a salary voucher.", "warning"); return; }
    setLoading(true);
    try {
      const res = await salaryApi.getPFStatement({ branchId, salaryVoucherId: selVno.value });
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
    w.document.write(`<html><head><title>PF Statement</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px}
      th{background:#eee;font-weight:bold}tfoot td{font-weight:bold;background:#f5f5f5}
      h2,h3{text-align:center;margin:4px 0}.text-right{text-align:right}.text-center{text-align:center}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <DashboardLayout enableScroll mainContent={
    <div className="w-full min-h-screen bg-slate-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 py-4 flex items-center gap-4 shadow-lg">
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
          <h1 className="text-xl font-bold text-white">PF Statement Report</h1>
          <p className="text-sm text-white/70">Provident Fund contribution details</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Filter</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Salary Month</label>
              <Select options={MONTH_OPTS} value={month} onChange={opt => setMonth(opt as MonthOpt | null)}
                placeholder="Select month..." styles={ctrlStyle} isClearable />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Voucher</label>
              <Select options={vnoOpts} value={selVno} onChange={opt => setSelVno(opt as VnoOpt | null)}
                placeholder="Select voucher..." styles={ctrlStyle} isClearable isDisabled={!month || vnoOpts.length === 0} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleGenerate} disabled={loading || !selVno}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50 cursor-pointer">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileText size={15} />}
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
              <h3 className="text-base font-semibold text-center text-slate-700 mb-4">
                PF Statement — {report.salaryMonth}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      {["Sr.No", "PF A/C No.", "UAN No.", "Employee Name", "Salary", "Share (12%)", "EPF (3.67%)", "FPF (8.33%)"].map(h => (
                        <th key={h} className="px-3 py-2 border border-slate-300 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 border border-slate-200 text-slate-500">{row.srNo}</td>
                        <td className="px-3 py-2 border border-slate-200">{row.pfAccount || "—"}</td>
                        <td className="px-3 py-2 border border-slate-200">{row.uanNo || "—"}</td>
                        <td className="px-3 py-2 border border-slate-200 font-medium">{row.empName}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right font-variant-numeric">{fmt(row.salary)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{fmt(row.share)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{fmt(row.epf)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{fmt(row.fpf)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 border border-slate-300 text-right">Total</td>
                      <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalSalary)}</td>
                      <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalShare)}</td>
                      <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalEpf)}</td>
                      <td className="px-3 py-2 border border-slate-300 text-right">{fmt(report.totalFpf)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">Rates: Employee EPF 3.67% | Employer FPF 8.33% | Admin 1.10% | EDLI 0.50% | A/C 22 0.01%</p>
            </div>
          </div>
        )}

        {!report && !loading && month && selVno && (
          <div className="text-center py-8 text-slate-400 text-sm">Click "Generate" to view the PF Statement.</div>
        )}
      </div>
    </div>
    } />
  );
}
