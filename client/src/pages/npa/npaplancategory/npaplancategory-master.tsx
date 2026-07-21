import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { Save, RotateCcw, ArrowLeft, FileText } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import npaplancategoryApi, { NPAPlanCategoryDTO } from "../../../services/npa/npaplancategoryapi";
import npaplanmasterApi, { NPAPlanMasterListItem } from "../../../services/npa/npaplanmasterapi";

const makeInitial = (branchId: number): NPAPlanCategoryDTO => ({
  branchId,
  isGroup: "N",
  seqNo: undefined,
  description: "",
  descriptionSL: "",
  planId: null,
  parentId: null,
  intMaxPeriod: undefined,
  provisioningPerc: undefined,
  periodFrom: undefined,
  periodTo: undefined,
  allPrinOverdue: 0,
});

const NPAPlanCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId: encId } = useParams<{ categoryId?: string }>();
  const categoryId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!categoryId;
  const descRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<NPAPlanCategoryDTO>(() => makeInitial(user.branchid));
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<NPAPlanMasterListItem[]>([]);
  const [parentGroups, setParentGroups] = useState<NPAPlanCategoryDTO[]>([]);

  useEffect(() => {
    npaplanmasterApi.getList(user.branchid).then(res => {
      if (res.success) setPlans((res as any).items ?? []);
    });
    npaplancategoryApi.getGroups(user.branchid).then(res => {
      if (res.success) setParentGroups((res as any).items ?? []);
    });
    if (!isEdit) return;
    if (!categoryId || Number.isNaN(Number(categoryId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid NPA Plan Category selected." });
      navigate("/npaplancategory-info");
      return;
    }
    loadCategory(Number(categoryId));
  }, [user.branchid, categoryId, isEdit]);

  const loadCategory = async (id: number) => {
    setLoading(true);
    try {
      const res = await npaplancategoryApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/npaplancategory-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); descRef.current?.focus(); };

  const handleSubmit = async () => {
    if (!data.description?.trim()) { Swal.fire({ icon: "warning", title: "Required", text: "Description is required." }); return; }
    if (data.seqNo == null) { Swal.fire({ icon: "warning", title: "Required", text: "Seq. No. is required." }); return; }
    if (!data.planId) { Swal.fire({ icon: "warning", title: "Required", text: "NPA Plan selection is required." }); return; }
    setLoading(true);
    try {
      const dto = isEdit && categoryId ? { ...data, id: Number(categoryId), branchId: user.branchid } : data;
      const res = isEdit && categoryId
        ? await npaplancategoryApi.update(dto, Number(categoryId))
        : await npaplancategoryApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) {
          navigate("/npaplancategory-info");
        } else {
          handleReset();
        }
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof NPAPlanCategoryDTO, val: any) => setData(p => ({ ...p, [key]: val }));

  const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";
  const planOpts = plans.map(p => ({ value: p.id, label: `${p.code}${p.description ? " - " + p.description : ""}` }));
  const parentOpts = parentGroups.filter(g => g.id !== data.id).map(g => ({ value: g.id!, label: g.description || `#${g.id}` }));

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <FileText className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} NPA Plan Category</h1>
                  <p className="text-sm text-gray-500">Configure NPA plan category details</p>
                </div>
              </div>
              <button onClick={() => navigate("/npaplancategory-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-5">

              {/* Row 1: Is Group + Seq No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Is Group</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={data.isGroup === "Y"}
                      onChange={e => set("isGroup", e.target.checked ? "Y" : "N")}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Yes, this is a group</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Seq. No. <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={data.seqNo ?? ""}
                    onChange={e => { const v = parseInt(e.target.value); set("seqNo", isNaN(v) ? undefined : v); }}
                    maxLength={6}
                    placeholder="e.g. 1"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">All Principal Overdue</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={data.allPrinOverdue === 1}
                      onChange={e => set("allPrinOverdue", e.target.checked ? 1 : 0)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Yes</span>
                  </label>
                </div>
              </div>

              {/* Row 2: Description + DescriptionSL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <input
                    ref={descRef}
                    autoFocus
                    type="text"
                    value={data.description || ""}
                    onChange={e => set("description", e.target.value)}
                    maxLength={100}
                    placeholder="Enter description"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span></label>
                  <input
                    type="text"
                    value={data.descriptionSL || ""}
                    onChange={e => set("descriptionSL", e.target.value)}
                    maxLength={100}
                    placeholder="Enter Hindi description"
                    className={inputCls}
                    lang="hi"
                  />
                </div>
              </div>

              {/* Row 3: NPA Plan + Parent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">NPA Plan <span className="text-red-500">*</span></label>
                  <Select
                    options={planOpts}
                    value={planOpts.find(o => o.value === data.planId) || null}
                    onChange={s => set("planId", s?.value ?? null)}
                    placeholder="Select NPA Plan"
                    isClearable
                   
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Parent</label>
                  <Select
                    options={parentOpts}
                    value={parentOpts.find(o => o.value === data.parentId) || null}
                    onChange={s => set("parentId", s?.value ?? null)}
                    placeholder="Select Parent Group"
                    isClearable
                   
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Int Max Period + Provisioning Perc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Int. Max. Period</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={data.intMaxPeriod ?? ""}
                    onChange={e => { const v = parseInt(e.target.value); set("intMaxPeriod", isNaN(v) ? undefined : v); }}
                    placeholder="e.g. 12"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Provisioning Perc (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.provisioningPerc ?? ""}
                    onChange={e => { const v = parseFloat(e.target.value); set("provisioningPerc", isNaN(v) ? undefined : v); }}
                    placeholder="e.g. 10.00"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Row 5: Instalment From + To */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-600 px-2">Instalment Period</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={data.periodFrom ?? ""}
                      onChange={e => { const v = parseInt(e.target.value); set("periodFrom", isNaN(v) ? undefined : v); }}
                      placeholder="e.g. 1"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={data.periodTo ?? ""}
                      onChange={e => { const v = parseInt(e.target.value); set("periodTo", isNaN(v) ? undefined : v); }}
                      placeholder="e.g. 6"
                      className={inputCls}
                    />
                  </div>
                </div>
              </fieldset>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Updating..." : "Saving..."}</>
                    : <><Save className="w-4 h-4" />{isEdit ? "Update" : "Save"} Category</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default NPAPlanCategoryPage;
