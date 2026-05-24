import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, FileText } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import npaplanmasterApi, { NPAPlanMasterDTO } from "../../../services/npa/npaplanmasterapi";

const CAL_NPA_DATE_OPTIONS = [
  { value: 0, label: "Overdue Date" },
  { value: 1, label: "Loan Date" },
  { value: 2, label: "Last Installment Date" },
];

const OVR_DUE_OPTIONS = [
  { value: 1, label: "Overdue Period" },
  { value: 2, label: "Overdue Instalments" },
];

const makeInitial = (branchId: number): NPAPlanMasterDTO => ({
  branchId,
  code: "",
  description: "",
  calNPADate: 0,
  ovrDuePeriodOrInst: 1,
  calNPAFromLoanDate: 0,
});

const NPAPlanMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId: encId } = useParams<{ planId?: string }>();
  const planId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!planId;
  const codeRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<NPAPlanMasterDTO>(() => makeInitial(user.branchid));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (!planId || Number.isNaN(Number(planId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid NPA Plan selected." });
      navigate("/npaplanmaster-info");
      return;
    }
    loadPlan(Number(planId));
  }, [planId, isEdit, user.branchid]);

  const loadPlan = async (id: number) => {
    setLoading(true);
    try {
      const res = await npaplanmasterApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/npaplanmaster-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); codeRef.current?.focus(); };

  const handleSubmit = async () => {
    if (!data.code.trim()) { Swal.fire({ icon: "warning", title: "Required", text: "Code is required." }); return; }
    setLoading(true);
    try {
      const dto = isEdit && planId ? { ...data, id: Number(planId), branchId: user.branchid } : data;
      const res = isEdit && planId
        ? await npaplanmasterApi.update(dto, Number(planId))
        : await npaplanmasterApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) {
          navigate("/npaplanmaster-info");
        } else {
          handleReset();
        }
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
                  <FileText className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} NPA Plan Master</h1>
                  <p className="text-sm text-gray-500">Configure NPA plan parameters</p>
                </div>
              </div>
              <button onClick={() => navigate("/npaplanmaster-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5">

              {/* Code & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
                  <input
                    ref={codeRef}
                    type="text"
                    autoFocus
                    value={data.code}
                    onChange={e => setData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    maxLength={50}
                    placeholder="e.g. GEN"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={data.description || ""}
                    onChange={e => setData(p => ({ ...p, description: e.target.value }))}
                    maxLength={500}
                    placeholder="Enter description"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Cal. NPA From Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cal. NPA From Date <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-6">
                  {CAL_NPA_DATE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="calNPADate"
                        checked={data.calNPADate === opt.value}
                        onChange={() => {
                          setData(p => ({
                            ...p,
                            calNPADate: opt.value,
                            calNPAFromLoanDate: opt.value === 1 ? 1 : 0,
                          }));
                        }}
                        className="text-blue-600 w-4 h-4"
                      />
                      <span className="text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* NPA By */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">NPA By <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-6">
                  {OVR_DUE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="ovrDuePeriodOrInst"
                        checked={data.ovrDuePeriodOrInst === opt.value}
                        onChange={() => setData(p => ({ ...p, ovrDuePeriodOrInst: opt.value }))}
                        className="text-blue-600 w-4 h-4"
                      />
                      <span className="text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Updating..." : "Saving..."}</>
                    : <><Save className="w-4 h-4" />{isEdit ? "Update" : "Save"} NPA Plan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default NPAPlanMasterPage;
