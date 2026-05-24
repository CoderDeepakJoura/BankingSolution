import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, Percent } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import taxTypeApi, { TaxTypeDTO, AccountLookupDTO } from "../../../services/gst/taxtypeapi";

const APPLIED_IN = [
  { value: 1, label: "Within State" },
  { value: 2, label: "Out of State" },
  { value: 3, label: "Both" },
];

const CALC_FROM = [
  { value: 1, label: "Ratio" },
  { value: 2, label: "Item" },
];

const IS_UT = [
  { value: 0, label: "No" },
  { value: 1, label: "Yes" },
  { value: 2, label: "Both" },
];

const makeInitial = (branchId: number): TaxTypeDTO => ({
  branchId,
  description: "",
  descriptionSL: "",
  code: "",
  appliedIn: 1,
  isUT: 0,
  calculatedFrom: 1,
  seqNo: 1,
  inAccId: 0,
  outAccId: 0,
});

const TaxTypeMaster: React.FC = () => {
  const navigate = useNavigate();
  const { taxTypeId: encId } = useParams<{ taxTypeId?: string }>();
  const taxTypeId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!taxTypeId;
  const nameRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<TaxTypeDTO>(() => makeInitial(user.branchid));
  const [accounts, setAccounts] = useState<AccountLookupDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [user.branchid]);

  useEffect(() => {
    if (!isEdit) return;
    if (!taxTypeId || Number.isNaN(Number(taxTypeId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Tax Type selected." });
      navigate("/taxtype-info");
      return;
    }
    loadTaxType(Number(taxTypeId));
  }, [user.branchid, taxTypeId]);

  const loadAccounts = async () => {
    try {
      const res = await taxTypeApi.getAccountList(user.branchid);
      if (res.success) setAccounts((res as any).items ?? []);
    } catch { /* ignore */ }
  };

  const loadTaxType = async (id: number) => {
    setLoading(true);
    try {
      const res = await taxTypeApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/taxtype-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); nameRef.current?.focus(); };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.description?.trim()) errors.push("Name is required.");
    if (!data.code?.trim()) errors.push("Code is required.");
    if (!data.seqNo || data.seqNo < 1) errors.push("Sequence No. must be at least 1.");
    if (!data.appliedIn) errors.push("Applied In is required.");
    if (!data.inAccId || data.inAccId === 0) errors.push("In Account is required.");
    if (!data.outAccId || data.outAccId === 0) errors.push("Out Account is required.");
    if (data.inAccId && data.outAccId && data.inAccId === data.outAccId) errors.push("In Account and Out Account cannot be the same.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    setLoading(true);
    try {
      const dto = isEdit && taxTypeId ? { ...data, id: Number(taxTypeId), branchId: user.branchid } : data;
      const res = isEdit && taxTypeId
        ? await taxTypeApi.update(dto, Number(taxTypeId))
        : await taxTypeApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/taxtype-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof TaxTypeDTO, val: any) => setData(p => ({ ...p, [key]: val }));

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
                  <Percent className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} GST Tax Type</h1>
                  <p className="text-sm text-gray-500">Manage GST tax type details</p>
                </div>
              </div>
              <button onClick={() => navigate("/taxtype-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Name */}
                <div className="lg:col-span-2">
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
                    placeholder="Enter tax type name"
                    className={inp}
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.code || ""}
                    onChange={e => set("code", e.target.value)}
                    maxLength={10}
                    placeholder="e.g. CGST"
                    className={inp}
                  />
                </div>

                {/* Name SL */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span>
                  </label>
                  <input
                    type="text"
                    value={data.descriptionSL || ""}
                    onChange={e => set("descriptionSL", e.target.value)}
                    maxLength={100}
                    placeholder="Enter Hindi name"
                    className={inp}
                    lang="hi"
                  />
                </div>

                {/* Sequence No */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sequence No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={data.seqNo}
                    onChange={e => set("seqNo", Number(e.target.value))}
                    className={inp}
                  />
                </div>

                {/* Applied In */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Applied In <span className="text-red-500">*</span>
                  </label>
                  <select value={data.appliedIn ?? 1} onChange={e => set("appliedIn", Number(e.target.value))} className={sel}>
                    {APPLIED_IN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Calculate From */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Calculate From <span className="text-red-500">*</span>
                  </label>
                  <select value={data.calculatedFrom} onChange={e => set("calculatedFrom", Number(e.target.value))} className={sel}>
                    {CALC_FROM.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Is UT */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Is UT</label>
                  <select value={data.isUT ?? 0} onChange={e => set("isUT", Number(e.target.value))} className={sel}>
                    {IS_UT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* In Account */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    In Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.inAccId || 0}
                    onChange={e => set("inAccId", Number(e.target.value))}
                    className={sel}
                  >
                    <option value={0}>-- Select Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.accountNumber} - {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Out Account */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Out Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.outAccId || 0}
                    onChange={e => set("outAccId", Number(e.target.value))}
                    className={sel}
                  >
                    <option value={0}>-- Select Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.accountNumber} - {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
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

export default TaxTypeMaster;
