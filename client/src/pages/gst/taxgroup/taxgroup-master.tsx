import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, Layers } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import taxGroupApi, { TaxGroupDTO } from "../../../services/gst/taxgroupapi";
import taxTypeApi, { TaxTypeDTO } from "../../../services/gst/taxtypeapi";

const PRINTING_FORMAT = [
  { value: 1, label: "Format1" },
  { value: 2, label: "Format2" },
];

const APPLIED_IN: Record<number, string> = { 1: "Within State", 2: "Out of State", 3: "Both" };
const CALC_FROM: Record<number, string> = { 1: "Ratio", 2: "Item" };

const makeInitial = (branchId: number): TaxGroupDTO => ({
  branchId,
  description: "",
  descriptionSL: "",
  code: "",
  printingFormat: 1,
  isStateMandatory: false,
  isShippingMandatory: false,
  isBillingMandatory: false,
  selectedTaxTypeIds: [],
});

const TaxGroupMaster: React.FC = () => {
  const navigate = useNavigate();
  const { taxGroupId: encId } = useParams<{ taxGroupId?: string }>();
  const taxGroupId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!taxGroupId;
  const nameRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<TaxGroupDTO>(() => makeInitial(user.branchid));
  const [allTaxTypes, setAllTaxTypes] = useState<TaxTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTaxTypes();
  }, [user.branchid]);

  useEffect(() => {
    if (!isEdit) return;
    if (!taxGroupId || Number.isNaN(Number(taxGroupId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Tax Group selected." });
      navigate("/taxgroup-info");
      return;
    }
    loadTaxGroup(Number(taxGroupId));
  }, [user.branchid, taxGroupId]);

  const loadTaxTypes = async () => {
    try {
      const res = await taxTypeApi.getList(user.branchid);
      if (res.success) setAllTaxTypes((res as any).items ?? []);
    } catch { /* ignore */ }
  };

  const loadTaxGroup = async (id: number) => {
    setLoading(true);
    try {
      const res = await taxGroupApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/taxgroup-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); nameRef.current?.focus(); };

  const toggleTaxType = (typeId: number) => {
    setData(prev => {
      const ids = prev.selectedTaxTypeIds.includes(typeId)
        ? prev.selectedTaxTypeIds.filter(x => x !== typeId)
        : [...prev.selectedTaxTypeIds, typeId];
      return { ...prev, selectedTaxTypeIds: ids };
    });
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.description?.trim()) errors.push("Name is required.");
    if (!data.code?.trim()) errors.push("Code is required.");
    if (!data.printingFormat) errors.push("Printing Format is required.");
    if (data.selectedTaxTypeIds.length === 0) errors.push("At least one Tax Type must be selected.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    setLoading(true);
    try {
      const dto = isEdit && taxGroupId ? { ...data, id: Number(taxGroupId), branchId: user.branchid } : data;
      const res = isEdit && taxGroupId
        ? await taxGroupApi.update(dto, Number(taxGroupId))
        : await taxGroupApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/taxgroup-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof TaxGroupDTO, val: any) => setData(p => ({ ...p, [key]: val }));

  const inp = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";
  const sel = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <Layers className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} GST Tax Group</h1>
                  <p className="text-sm text-gray-500">Manage GST tax group details</p>
                </div>
              </div>
              <button onClick={() => navigate("/taxgroup-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Main form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">

              {/* Row 1: Name, Code, Printing Format | Checkboxes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left: fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      autoFocus
                      type="text"
                      value={data.description || ""}
                      onChange={e => set("description", e.target.value)}
                      maxLength={50}
                      placeholder="Enter tax group name"
                      className={inp}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Name (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span>
                    </label>
                    <input
                      type="text"
                      value={data.descriptionSL || ""}
                      onChange={e => set("descriptionSL", e.target.value)}
                      maxLength={50}
                      placeholder="Enter Hindi name"
                      className={inp}
                      lang="hi"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.code || ""}
                        onChange={e => set("code", e.target.value)}
                        maxLength={10}
                        placeholder="e.g. GST18"
                        className={inp}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Printing Format <span className="text-red-500">*</span>
                      </label>
                      <select value={data.printingFormat ?? 1} onChange={e => set("printingFormat", Number(e.target.value))} className={sel}>
                        {PRINTING_FORMAT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right: checkboxes */}
                <div className="flex flex-col justify-center gap-4 bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-1">Mandatory Settings</p>
                  {[
                    { key: "isStateMandatory" as const, label: "Is State Mandatory" },
                    { key: "isShippingMandatory" as const, label: "Is Shipping Address Mandatory" },
                    { key: "isBillingMandatory" as const, label: "Is Billing Address Mandatory" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!data[key]}
                        onChange={e => set(key, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tax Type Detail */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Tax Type Detail</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Select", "Name", "Code", "Applied In", "Calculate From"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {allTaxTypes.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No tax types found for this branch.</td></tr>
                      ) : allTaxTypes.map(tt => {
                        const checked = data.selectedTaxTypeIds.includes(tt.id!);
                        return (
                          <tr
                            key={tt.id}
                            onClick={() => toggleTaxType(tt.id!)}
                            className={`cursor-pointer transition ${checked ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTaxType(tt.id!)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{tt.description || "—"}</td>
                            <td className="px-4 py-3 text-gray-600">{tt.code || "—"}</td>
                            <td className="px-4 py-3 text-gray-600">{tt.appliedIn ? APPLIED_IN[tt.appliedIn] || "—" : "—"}</td>
                            <td className="px-4 py-3 text-gray-600">{CALC_FROM[tt.calculatedFrom] || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Updating..." : "Saving..."}</>
                    : <><Save className="w-4 h-4" />{isEdit ? "Update" : "Save"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default TaxGroupMaster;
