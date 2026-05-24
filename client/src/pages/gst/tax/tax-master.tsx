import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, Receipt, Edit2, Trash2 } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import taxApi, { TaxDTO, TaxDetailDTO } from "../../../services/gst/taxapi";
import taxTypeApi, { TaxTypeDTO } from "../../../services/gst/taxtypeapi";
import taxGroupApi, { TaxGroupDTO } from "../../../services/gst/taxgroupapi";

const TAX_CATEGORIES = [
  { value: 1, label: "Taxable" },
  { value: 2, label: "Nil Rated" },
  { value: 3, label: "Exempted" },
];

const EVALUATED_ON = [
  { value: 1, label: "Gross Amount" },
  { value: 2, label: "Parent Tax" },
];

const today = () => new Date().toISOString().split("T")[0];

const makeInitial = (branchId: number): TaxDTO => ({
  branchId,
  name: "",
  nameSL: "",
  alias: "",
  aliasSL: "",
  introductionDate: today(),
  taxPercentage: 0,
  tCId: 1,
  taxGroupId: undefined,
  details: [],
});

const makeEmptyDetail = (): TaxDetailDTO => ({
  detailDate: today(),
  taxTypeId: 0,
  nRatio: 1,
  dRatio: 1,
  evaluatedOn: 1,
  percentage: 0,
});

const TaxMaster: React.FC = () => {
  const navigate = useNavigate();
  const { taxId: encId } = useParams<{ taxId?: string }>();
  const taxId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!taxId;
  const nameRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<TaxDTO>(() => makeInitial(user.branchid));
  const [taxTypes, setTaxTypes] = useState<TaxTypeDTO[]>([]);
  const [taxGroups, setTaxGroups] = useState<TaxGroupDTO[]>([]);
  const [detail, setDetail] = useState<TaxDetailDTO>(makeEmptyDetail());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDropdowns();
  }, [user.branchid]);

  useEffect(() => {
    if (!isEdit) return;
    if (!taxId || Number.isNaN(Number(taxId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Tax selected." });
      navigate("/tax-info");
      return;
    }
    loadTax(Number(taxId));
  }, [user.branchid, taxId]);

  const loadDropdowns = async () => {
    try {
      const [ttRes, tgRes] = await Promise.all([
        taxTypeApi.getList(user.branchid),
        taxGroupApi.getList(user.branchid),
      ]);
      if (ttRes.success) setTaxTypes((ttRes as any).items ?? []);
      if (tgRes.success) setTaxGroups((tgRes as any).items ?? []);
    } catch { /* ignore */ }
  };

  const loadTax = async (id: number) => {
    setLoading(true);
    try {
      const res = await taxApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) {
        setData({
          ...payload,
          id,
          branchId: user.branchid,
          introductionDate: payload.introductionDate ? payload.introductionDate.split("T")[0] : today(),
          details: (payload.details ?? []).map((d: any) => ({
            ...d,
            detailDate: d.detailDate ? d.detailDate.split("T")[0] : today(),
          })),
        });
      } else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/tax-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setData(makeInitial(user.branchid));
    setDetail(makeEmptyDetail());
    setEditingIdx(null);
    nameRef.current?.focus();
  };

  const handleAddDetail = () => {
    const detailErrors: string[] = [];
    if (!detail.taxTypeId || detail.taxTypeId === 0) detailErrors.push("Tax Type is required.");
    if (detail.percentage <= 0) detailErrors.push("Percentage must be greater than 0.");
    const duplicate = data.details.some((row, idx) => row.taxTypeId === detail.taxTypeId && idx !== editingIdx);
    if (detail.taxTypeId && duplicate) detailErrors.push("This Tax Type is already added in the detail.");
    if (detailErrors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${detailErrors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    const tt = taxTypes.find(t => t.id === detail.taxTypeId);
    const evalOn = EVALUATED_ON.find(e => e.value === detail.evaluatedOn);
    const newRow: TaxDetailDTO = {
      ...detail,
      taxTypeName: tt ? `${tt.description}-${tt.code}` : String(detail.taxTypeId),
      evaluatedOnName: evalOn?.label,
    };

    setData(prev => {
      const updated = [...prev.details];
      if (editingIdx !== null) updated[editingIdx] = newRow;
      else updated.push(newRow);
      return { ...prev, details: updated };
    });
    setDetail(makeEmptyDetail());
    setEditingIdx(null);
  };

  const handleEditDetail = (idx: number) => {
    const row = data.details[idx];
    setDetail({ ...row });
    setEditingIdx(idx);
  };

  const handleDeleteDetail = async (idx: number) => {
    const row = data.details[idx];
    const result = await Swal.fire({
      title: "Remove Detail?",
      text: `Remove "${row.taxTypeName || "this entry"}" from the detail?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove it!",
    });
    if (!result.isConfirmed) return;
    setData(prev => ({ ...prev, details: prev.details.filter((_, i) => i !== idx) }));
    if (editingIdx === idx) { setDetail(makeEmptyDetail()); setEditingIdx(null); }
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.name?.trim()) errors.push("Name is required.");
    if (!data.alias?.trim()) errors.push("Alias is required.");
    if (!data.introductionDate) errors.push("Introduction Date is required.");
    if (!isEdit && !data.tCId) errors.push("Tax Category is required.");
    if (!isEdit && !data.taxGroupId) errors.push("Tax Group is required.");
    if (data.details.length === 0) errors.push("At least one Tax Detail is required.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    setLoading(true);
    try {
      const dto = isEdit && taxId ? { ...data, id: Number(taxId), branchId: user.branchid } : data;
      const res = isEdit && taxId
        ? await taxApi.update(dto, Number(taxId))
        : await taxApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/tax-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof TaxDTO, val: any) => setData(p => ({ ...p, [key]: val }));
  const setDet = (key: keyof TaxDetailDTO, val: any) => setDetail(p => ({ ...p, [key]: val }));

  const inp = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";
  const sel = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white";
  const selDis = "w-full px-4 py-3 border-2 border-gray-100 rounded-lg outline-none text-sm bg-gray-50 text-gray-500 cursor-not-allowed";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <Receipt className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} GST Tax</h1>
                  <p className="text-sm text-gray-500">Manage GST tax details</p>
                </div>
              </div>
              <button onClick={() => navigate("/tax-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Main form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">

              {/* Top fields: 3 left, 3 right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input ref={nameRef} autoFocus type="text" value={data.name || ""} onChange={e => set("name", e.target.value)} maxLength={100} placeholder="e.g. GST 18%" className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span></label>
                    <input type="text" value={data.nameSL || ""} onChange={e => set("nameSL", e.target.value)} maxLength={100} placeholder="Enter Hindi name" className={inp} lang="hi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Alias <span className="text-red-500">*</span></label>
                    <input type="text" value={data.alias || ""} onChange={e => set("alias", e.target.value)} maxLength={30} placeholder="e.g. 18%" className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Alias (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span></label>
                    <input type="text" value={data.aliasSL || ""} onChange={e => set("aliasSL", e.target.value)} maxLength={50} placeholder="Enter Hindi alias" className={inp} lang="hi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Introduction Date <span className="text-red-500">*</span></label>
                    <input type="date" value={data.introductionDate} onChange={e => set("introductionDate", e.target.value)} className={inp} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Percentage <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={data.taxPercentage}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) set("taxPercentage", v);
                      }}
                      onBlur={e => set("taxPercentage", parseFloat(e.target.value) || 0)}
                      maxLength={6}
                      placeholder="e.g. 18.5"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Category <span className="text-red-500">*</span></label>
                    {isEdit
                      ? <select value={data.tCId} disabled className={selDis}>
                          {TAX_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      : <select value={data.tCId} onChange={e => set("tCId", Number(e.target.value))} className={sel}>
                          {TAX_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    }
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Group <span className="text-red-500">*</span></label>
                    {isEdit
                      ? <select value={data.taxGroupId ?? 0} disabled className={selDis}>
                          <option value={0}>-- Select Tax Group --</option>
                          {taxGroups.map(g => <option key={g.id} value={g.id}>{g.description}</option>)}
                        </select>
                      : <select value={data.taxGroupId ?? 0} onChange={e => set("taxGroupId", Number(e.target.value) || undefined)} className={sel}>
                          <option value={0}>-- Select Tax Group --</option>
                          {taxGroups.map(g => <option key={g.id} value={g.id}>{g.description}</option>)}
                        </select>
                    }
                  </div>
                </div>
              </div>

              {/* Tax Detail section */}
              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm font-semibold text-gray-700 mb-4">Tax Detail</p>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                  {/* Detail input form */}
                  <div className="lg:col-span-2 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                      <input type="date" value={detail.detailDate} onChange={e => setDet("detailDate", e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tax Type</label>
                      <select value={detail.taxTypeId} onChange={e => setDet("taxTypeId", Number(e.target.value))} className={sel}>
                        <option value={0}>-- Select --</option>
                        {taxTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.description}-{tt.code}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">N Ratio</label>
                        <input
                          type="text"
                          value={detail.nRatio}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDet("nRatio", v);
                          }}
                          onBlur={e => setDet("nRatio", parseFloat(e.target.value) || 0)}
                          maxLength={6}
                          placeholder="e.g. 1.00"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">D Ratio</label>
                        <input
                          type="text"
                          value={detail.dRatio}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDet("dRatio", v);
                          }}
                          onBlur={e => setDet("dRatio", parseFloat(e.target.value) || 0)}
                          maxLength={6}
                          placeholder="e.g. 2.00"
                          className={inp}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Evaluated On</label>
                      <select value={detail.evaluatedOn} onChange={e => setDet("evaluatedOn", Number(e.target.value))} className={sel}>
                        {EVALUATED_ON.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Percentage</label>
                      <input
                        type="text"
                        value={detail.percentage}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDet("percentage", v);
                        }}
                        onBlur={e => setDet("percentage", parseFloat(e.target.value) || 0)}
                        maxLength={6}
                        placeholder="e.g. 9.00"
                        className={inp}
                      />
                    </div>
                    <button
                      onClick={handleAddDetail}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      {editingIdx !== null ? "Update" : "OK"}
                    </button>
                  </div>

                  {/* Detail table */}
                  <div className="lg:col-span-3 overflow-x-auto rounded-lg border border-gray-200 self-start">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Date", "Tax Type", "N Ratio", "D Ratio", "Evaluated On", "Perc", "Action"].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {data.details.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No detail added yet.</td></tr>
                        ) : data.details.map((row, idx) => (
                          <tr key={idx} className={`transition ${editingIdx === idx ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700">{row.detailDate}</td>
                            <td className="px-3 py-3 text-gray-800 font-medium">{row.taxTypeName || row.taxTypeId}</td>
                            <td className="px-3 py-3 text-gray-600">{row.nRatio}</td>
                            <td className="px-3 py-3 text-gray-600">{row.dRatio}</td>
                            <td className="px-3 py-3 text-gray-600">{row.evaluatedOnName || row.evaluatedOn}</td>
                            <td className="px-3 py-3 text-gray-600">{row.percentage}</td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => handleEditDetail(idx)} className="p-1.5 rounded border border-blue-400 text-blue-500 hover:bg-blue-50" title="Edit">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDeleteDetail(idx)} className="p-1.5 rounded border border-red-400 text-red-500 hover:bg-red-50" title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

export default TaxMaster;
