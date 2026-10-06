import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";
import { ArrowRightLeft } from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { EmployeeMaster } from "../../services/salary/salaryApi";
import { API_CONFIG } from "../../constants/config";
import commonservice from "../../services/common/commonservice";

interface EmpOpt { value: number; label: string }
interface BranchOpt { value: number; label: string }

const ctrlStyle = { control: (b: any) => ({ ...b, borderRadius: "0.5rem", borderColor: "#cbd5e1", minHeight: "38px", fontSize: "0.875rem", cursor: "pointer" }) };

export default function EmployeeTransfer() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [empOptions, setEmpOptions]       = useState<EmpOpt[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchOpt[]>([]);
  const [selEmp, setSelEmp]               = useState<EmpOpt | null>(null);
  const [selBranch, setSelBranch]         = useState<BranchOpt | null>(null);
  const [transferDate, setTransferDate]   = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [empDetail, setEmpDetail]         = useState<EmployeeMaster | null>(null);

  useEffect(() => {
    salaryApi.getEmployeeDropdown(branchId)
      .then(r => {
        const items: EmployeeMaster[] = (r as any).items ?? [];
        setEmpOptions(items.map(e => ({ value: e.id, label: `${e.code} — ${e.firstName} ${e.lastName ?? ""}`.trim() })));
      })
      .catch(() => {});

    fetch(`${API_CONFIG.BASE_URL}/fetchdata/get_all_branches`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ SocietyId: 0 }),
    })
      .then(r => r.json())
      .then(data => {
        const branches = data?.branches ?? data?.data?.branches ?? [];
        setBranchOptions(
          branches
            .filter((b: any) => (b.id ?? b.Id) !== branchId)
            .map((b: any) => ({
              value: b.id ?? b.Id,
              label: `${b.branchCode ?? b.BranchCode ?? ""} — ${b.branchmaster_name ?? b.Name ?? b.name ?? ""}`,
            }))
        );
      })
      .catch(() => {});
  }, [branchId]);

  useEffect(() => {
    if (!selEmp) { setEmpDetail(null); return; }
    salaryApi.getEmployeeById(selEmp.value, branchId)
      .then(r => setEmpDetail((r as any).data ?? null))
      .catch(() => setEmpDetail(null));
  }, [selEmp, branchId]);

  const handleTransfer = async () => {
    if (!selEmp) { Swal.fire("Select Employee", "Please select an employee.", "warning"); return; }
    if (!selBranch) { Swal.fire("Select Branch", "Please select a destination branch.", "warning"); return; }
    if (!transferDate) { Swal.fire("Select Date", "Please select a transfer date.", "warning"); return; }

    const confirm = await Swal.fire({
      title: "Confirm Transfer",
      html: `Transfer <b>${selEmp.label}</b> to <b>${selBranch.label}</b>?<br/><small class="text-slate-500">This will update the employee's current branch.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      confirmButtonText: "Yes, Transfer",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const res = await salaryApi.transferEmployee({
        empId: selEmp.value,
        fromBranchId: branchId,
        toBranchId: selBranch.value,
        transferDate,
        remarks,
      });
      if (!res.success) throw new Error(res.message);
      await Swal.fire("Transferred!", res.message ?? "Employee transferred successfully.", "success");
      setSelEmp(null); setSelBranch(null); setRemarks(""); setEmpDetail(null);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Transfer failed.", "error");
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout enableScroll={true} mainContent={
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 px-6 py-4 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="p-2 rounded-xl bg-white/20">
          <ArrowRightLeft className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Employee Transfer</h1>
          <p className="text-sm text-white/70">Transfer employee to another branch</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-orange-600" />
            <span className="font-semibold text-slate-700 text-sm">Transfer Details</span>
          </div>
          <div className="p-6 space-y-5">
            {/* Employee */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Employee <span className="text-red-500">*</span></label>
              <Select options={empOptions} value={selEmp}
                onChange={opt => { setSelEmp(opt as EmpOpt | null); }}
                placeholder="Search employee..." styles={ctrlStyle} isClearable />
            </div>

            {/* Employee info card */}
            {empDetail && (
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-slate-500">Code</span><p className="font-semibold">{empDetail.code}</p></div>
                <div><span className="text-xs text-slate-500">Designation</span><p className="font-semibold">{empDetail.designationName ?? "—"}</p></div>
                <div><span className="text-xs text-slate-500">Joining Date</span><p className="font-semibold">{empDetail.joiningDate?.slice(0, 10) ?? "—"}</p></div>
                <div><span className="text-xs text-slate-500">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${empDetail.status === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {empDetail.status === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            )}

            {/* Destination Branch */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Destination Branch <span className="text-red-500">*</span></label>
              <Select options={branchOptions} value={selBranch}
                onChange={opt => setSelBranch(opt as BranchOpt | null)}
                placeholder="Select branch..." styles={ctrlStyle} isClearable />
            </div>

            {/* Transfer Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Transfer Date <span className="text-red-500">*</span></label>
              <input type="date" value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-orange-400 text-sm" />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                rows={3} placeholder="Reason for transfer (optional)"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-orange-400 text-sm resize-none" />
            </div>

            <button onClick={handleTransfer} disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ArrowRightLeft size={16} />}
              {saving ? "Processing..." : "Transfer Employee"}
            </button>
          </div>
        </div>
      </div>
    </div>
    } />
  );
}
