import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { Trash2 } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { SalaryVoucherDropdown } from "../../services/salary/salaryApi";
import commonservice from "../../services/common/commonservice";
import { getSessionMonthOptions } from "../../utils/sessionUtils";

interface MonthOpt { value: string; label: string }
interface VnoOpt { value: number; label: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };

export default function DeleteSalary() {
  const navigate = useNavigate();
  const user     = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const workingDate = commonservice.parseWorkingDate(user.workingdate);
  const MONTH_OPTS  = getSessionMonthOptions(user.sessionInfo, workingDate);

  const [month, setMonth]       = useState<MonthOpt | null>(null);
  const [vouchers, setVouchers] = useState<SalaryVoucherDropdown[]>([]);
  const [selected, setSelected] = useState<VnoOpt | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!month) { setVouchers([]); setSelected(null); return; }
    salaryApi.getSalaryVouchers(branchId, month.value)
      .then(r => { setVouchers((r as any).items ?? []); setSelected(null); })
      .catch(() => { setVouchers([]); setSelected(null); });
  }, [branchId, month]);

  const vnoOpts: VnoOpt[] = vouchers.map(v => ({ value: v.id, label: `Vno ${v.id} — ${v.label}` }));

  const handleDelete = async () => {
    if (!selected) { Swal.fire("Select Voucher", "Please select a salary voucher to delete.", "warning"); return; }
    const confirm = await Swal.fire({
      title: "Delete Salary Voucher?",
      html: `<p>This will permanently delete <b>Voucher #${selected.value}</b> and all employee salary details within it.</p><p class="text-red-600 mt-2 font-semibold">This action cannot be undone.</p>`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Yes, Delete", confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setDeleting(true);
    try {
      const res = await salaryApi.deleteSalaryVoucher({ branchId, salaryVoucherId: selected.value });
      if (!res.success) throw new Error(res.message);
      Swal.fire("Deleted", res.message, "success");
      setSelected(null);
      if (month) {
        const r = await salaryApi.getSalaryVouchers(branchId, month.value);
        setVouchers((r as any).items ?? []);
      }
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout enableScroll mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-red-50 to-rose-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <Trash2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Delete Employee Salary Detail</h1>
          <p className="text-sm text-white/70">Remove a processed salary voucher</p>
        </div>
      </div>

      <div className="p-6 max-w-xl">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-rose-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Voucher to Delete</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Salary Month <span className="text-red-500">*</span>
              </label>
              <Select
                options={MONTH_OPTS}
                value={month}
                onChange={opt => setMonth(opt as MonthOpt | null)}
                placeholder="Select month..."
                styles={ctrlStyle}
                isClearable
              />
            </div>

            {month && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Salary Voucher <span className="text-red-500">*</span>
                </label>
                {vnoOpts.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2">No vouchers found for this month.</p>
                ) : (
                  <Select
                    options={vnoOpts}
                    value={selected}
                    onChange={opt => setSelected(opt as VnoOpt | null)}
                    placeholder="Select voucher..."
                    styles={ctrlStyle}
                    isClearable
                  />
                )}
              </div>
            )}

            {selected && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-700 font-medium">
                  You are about to permanently delete <span className="font-bold">Voucher #{selected.value}</span>.
                  All employee salary entries within this voucher will be removed.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleDelete} disabled={deleting || !selected}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-sm">
                {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Delete Voucher"}
              </button>
              <button onClick={() => navigate(-1)}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    } />
  );
}
