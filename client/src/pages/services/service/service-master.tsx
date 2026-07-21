import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, Briefcase, Trash2, Edit2 } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import serviceApi, { ServiceDTO, ServiceTaxRuleDTO, ServiceTaxTypeDetDTO } from "../../../services/services/serviceapi";
import taxTypeApi, { AccountLookupDTO, TaxTypeDTO } from "../../../services/gst/taxtypeapi";
import taxApi, { TaxDTO } from "../../../services/gst/taxapi";

const today = () => new Date().toISOString().split("T")[0];

const makeInitial = (branchId: number): ServiceDTO => ({
  branchId,
  name: "",
  sac: "",
  otherReceipts: 0,
  deductRefunds: 0,
  penalties: 0,
  isIncludeTax: false,
  purchaseAccId: 0,
  taxRules: [],
  taxTypeDets: [],
});

const ServiceMaster: React.FC = () => {
  const navigate = useNavigate();
  const { serviceId: encId } = useParams<{ serviceId?: string }>();
  const serviceId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!serviceId;
  const nameRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<ServiceDTO>(() => makeInitial(user.branchid));
  const [accounts, setAccounts] = useState<AccountLookupDTO[]>([]);
  const [taxes, setTaxes] = useState<TaxDTO[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxTypeDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"tax" | "taxtype">("tax");
  const [loading, setLoading] = useState(false);

  // Tax Rule detail input
  const [ruleDate, setRuleDate] = useState(today());
  const [ruleTaxId, setRuleTaxId] = useState(0);
  const [ruleEditIdx, setRuleEditIdx] = useState<number | null>(null);

  // Tax Type detail input
  const [detDate, setDetDate] = useState(today());
  const [detTaxTypeId, setDetTaxTypeId] = useState(0);
  const [detPerc, setDetPerc] = useState<number | string>(0);
  const [detEditIdx, setDetEditIdx] = useState<number | null>(null);

  useEffect(() => { loadDropdowns(); }, [user.branchid]);
  useEffect(() => {
    if (!isEdit) return;
    if (!serviceId || Number.isNaN(Number(serviceId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Service selected." });
      navigate("/service-info");
      return;
    }
    loadService(Number(serviceId));
  }, [user.branchid, serviceId]);

  const loadDropdowns = async () => {
    try {
      const [accRes, taxRes, ttRes] = await Promise.all([
        taxTypeApi.getAccountList(user.branchid),
        taxApi.getList(user.branchid),
        taxTypeApi.getList(user.branchid),
      ]);
      if (accRes.success) setAccounts((accRes as any).items ?? []);
      if (taxRes.success) setTaxes((taxRes as any).items ?? []);
      if (ttRes.success) setTaxTypes((ttRes as any).items ?? []);
    } catch { /* ignore */ }
  };

  const loadService = async (id: number) => {
    setLoading(true);
    try {
      const res = await serviceApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/service-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setData(makeInitial(user.branchid));
    setRuleDate(today()); setRuleTaxId(0); setRuleEditIdx(null);
    setDetDate(today()); setDetTaxTypeId(0); setDetPerc(0); setDetEditIdx(null);
    nameRef.current?.focus();
  };

  const maxDate = user.workingdate || today();

  // ── Tax Rule (Tab 1) handlers ────────────────────────────────────────────────
  const handleAddRule = () => {
    const errors: string[] = [];
    if (!ruleDate) errors.push("Date is required.");
    if (ruleDate > maxDate) errors.push(`Applicable date cannot be greater than working date (${maxDate}).`);
    if (!ruleTaxId || ruleTaxId === 0) errors.push("Tax is required.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }
    const tax = taxes.find(t => t.id === ruleTaxId);
    const newRow: ServiceTaxRuleDTO = { applicableDate: ruleDate, taxId: ruleTaxId, taxName: tax?.name };
    setData(prev => {
      const updated = [...prev.taxRules];
      if (ruleEditIdx !== null) updated[ruleEditIdx] = newRow;
      else updated.push(newRow);
      return { ...prev, taxRules: updated };
    });
    setRuleDate(today()); setRuleTaxId(0); setRuleEditIdx(null);
  };

  const handleEditRule = (idx: number) => {
    const r = data.taxRules[idx];
    setRuleDate(r.applicableDate); setRuleTaxId(r.taxId); setRuleEditIdx(idx);
  };

  const handleDeleteRule = async (idx: number) => {
    const result = await Swal.fire({ title: "Remove?", text: "Remove this Tax Detail row?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes" });
    if (!result.isConfirmed) return;
    setData(prev => ({ ...prev, taxRules: prev.taxRules.filter((_, i) => i !== idx) }));
    if (ruleEditIdx === idx) { setRuleDate(today()); setRuleTaxId(0); setRuleEditIdx(null); }
  };

  // ── Tax Type Det (Tab 2) handlers ────────────────────────────────────────────
  const handleAddDet = () => {
    const errors: string[] = [];
    if (!detDate) errors.push("Date is required.");
    if (detDate > maxDate) errors.push(`Date cannot be greater than working date (${maxDate}).`);
    if (!detTaxTypeId || detTaxTypeId === 0) errors.push("Tax Type is required.");
    if (Number(detPerc) <= 0) errors.push("Percentage must be greater than 0.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }
    const tt = taxTypes.find(t => t.id === detTaxTypeId);
    const newRow: ServiceTaxTypeDetDTO = { date: detDate, taxTypeId: detTaxTypeId, taxTypeName: tt ? `${tt.description}-${tt.code}` : String(detTaxTypeId), perc: parseFloat(String(detPerc)) || 0 };
    setData(prev => {
      const updated = [...prev.taxTypeDets];
      if (detEditIdx !== null) updated[detEditIdx] = newRow;
      else updated.push(newRow);
      return { ...prev, taxTypeDets: updated };
    });
    setDetDate(today()); setDetTaxTypeId(0); setDetPerc(0); setDetEditIdx(null);
  };

  const handleEditDet = (idx: number) => {
    const d = data.taxTypeDets[idx];
    setDetDate(d.date); setDetTaxTypeId(d.taxTypeId); setDetPerc(d.perc); setDetEditIdx(idx);
  };

  const handleDeleteDet = async (idx: number) => {
    const result = await Swal.fire({ title: "Remove?", text: "Remove this Tax Type Detail row?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes" });
    if (!result.isConfirmed) return;
    setData(prev => ({ ...prev, taxTypeDets: prev.taxTypeDets.filter((_, i) => i !== idx) }));
    if (detEditIdx === idx) { setDetDate(today()); setDetTaxTypeId(0); setDetPerc(0); setDetEditIdx(null); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.name?.trim()) errors.push("Name is required.");
    if (!data.sac?.trim()) errors.push("SAC(TC) is required.");
    if (!data.purchaseAccId || data.purchaseAccId === 0) errors.push("Purchase Account is required.");
    if (data.taxRules.length === 0) errors.push("At least one Tax Detail is required.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }
    setLoading(true);
    try {
      const dto = isEdit && serviceId ? { ...data, id: Number(serviceId), branchId: user.branchid } : data;
      const res = isEdit && serviceId
        ? await serviceApi.update(dto, Number(serviceId))
        : await serviceApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/service-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof ServiceDTO, val: any) => setData(p => ({ ...p, [key]: val }));
  const inp = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";
  const sel = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white";
  const btnRow = "p-1.5 rounded border transition";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} Service</h1>
                  <p className="text-sm text-gray-500">Manage service master details</p>
                </div>
              </div>
              <button onClick={() => navigate("/service-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-6">

              {/* Main fields: 2-col grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Left col */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input ref={nameRef} autoFocus type="text" value={data.name || ""} onChange={e => set("name", e.target.value)} maxLength={100} placeholder="Enter service name" className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">SAC(TC) <span className="text-red-500">*</span></label>
                    <input type="text" value={data.sac || ""} onChange={e => set("sac", e.target.value)} maxLength={20} placeholder="e.g. 9971" className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Other Receipts <span className="text-red-500">*</span></label>
                    <input type="text" value={data.otherReceipts} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) set("otherReceipts", v); }} onBlur={e => set("otherReceipts", parseFloat(e.target.value) || 0)} maxLength={10} className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Deduct Refunds <span className="text-red-500">*</span></label>
                    <input type="text" value={data.deductRefunds} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) set("deductRefunds", v); }} onBlur={e => set("deductRefunds", parseFloat(e.target.value) || 0)} maxLength={10} className={inp} />
                  </div>
                </div>

                {/* Right col */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Penalties <span className="text-red-500">*</span></label>
                    <input type="text" value={data.penalties} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) set("penalties", v); }} onBlur={e => set("penalties", parseFloat(e.target.value) || 0)} maxLength={10} className={inp} />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="isIncludeTax" checked={!!data.isIncludeTax} onChange={e => set("isIncludeTax", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="isIncludeTax" className="text-sm font-semibold text-gray-700 cursor-pointer">Is Include Tax</label>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Account <span className="text-red-500">*</span></label>
                    <select value={data.purchaseAccId || 0} onChange={e => set("purchaseAccId", Number(e.target.value))} className={sel}>
                      <option value={0}>-- Select Account --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex gap-1 mb-4">
                  {(["tax", "taxtype"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {tab === "tax" ? "Tax Detail" : "Tax Type Detail"}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Tax Detail */}
                {activeTab === "tax" && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                        <input type="date" value={ruleDate} max={maxDate} onChange={e => setRuleDate(e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Tax <span className="text-red-500">*</span></label>
                        <select value={ruleTaxId} onChange={e => setRuleTaxId(Number(e.target.value))} className={sel}>
                          <option value={0}>-- Select Tax --</option>
                          {taxes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <button onClick={handleAddRule} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition">
                        {ruleEditIdx !== null ? "Update" : "OK"}
                      </button>
                    </div>
                    <div className="lg:col-span-3 overflow-x-auto rounded-lg border border-gray-200 self-start">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>{["Date", "Tax", "Action"].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {data.taxRules.length === 0
                            ? <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No tax detail added.</td></tr>
                            : data.taxRules.map((r, idx) => (
                              <tr key={idx} className={`transition ${ruleEditIdx === idx ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                                <td className="px-3 py-3 text-gray-700">{r.applicableDate}</td>
                                <td className="px-3 py-3 font-medium text-gray-800">{r.taxName || r.taxId}</td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditRule(idx)} className={`${btnRow} border-blue-400 text-blue-500 hover:bg-blue-50`}><Edit2 size={13} /></button>
                                    <button onClick={() => handleDeleteRule(idx)} className={`${btnRow} border-red-400 text-red-500 hover:bg-red-50`}><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 2: Tax Type Detail */}
                {activeTab === "taxtype" && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                        <input type="date" value={detDate} max={maxDate} onChange={e => setDetDate(e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Tax Type <span className="text-red-500">*</span></label>
                        <select value={detTaxTypeId} onChange={e => setDetTaxTypeId(Number(e.target.value))} className={sel}>
                          <option value={0}>-- Select Tax Type --</option>
                          {taxTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.description}-{tt.code}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Perc <span className="text-red-500">*</span></label>
                        <input type="text" value={detPerc} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDetPerc(v); }} onBlur={e => setDetPerc(parseFloat(e.target.value) || 0)} maxLength={6} placeholder="e.g. 9.00" className={inp} />
                      </div>
                      <button onClick={handleAddDet} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition">
                        {detEditIdx !== null ? "Update" : "OK"}
                      </button>
                    </div>
                    <div className="lg:col-span-3 overflow-x-auto rounded-lg border border-gray-200 self-start">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>{["Date", "Tax Type", "Perc", "Action"].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {data.taxTypeDets.length === 0
                            ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No tax type detail added.</td></tr>
                            : data.taxTypeDets.map((d, idx) => (
                              <tr key={idx} className={`transition ${detEditIdx === idx ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                                <td className="px-3 py-3 text-gray-700">{d.date}</td>
                                <td className="px-3 py-3 font-medium text-gray-800">{d.taxTypeName || d.taxTypeId}</td>
                                <td className="px-3 py-3 text-gray-600">{d.perc}</td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditDet(idx)} className={`${btnRow} border-blue-400 text-blue-500 hover:bg-blue-50`}><Edit2 size={13} /></button>
                                    <button onClick={() => handleDeleteDet(idx)} className={`${btnRow} border-red-400 text-red-500 hover:bg-red-50`}><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
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

export default ServiceMaster;
