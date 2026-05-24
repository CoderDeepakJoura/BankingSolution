import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, X, RefreshCw, Link } from "lucide-react";
import { FaTrash } from "react-icons/fa";
import taxTypeApi, { AccountLookupDTO } from "../../../services/gst/taxtypeapi";
import serviceApi, { ServiceDTO } from "../../../services/services/serviceapi";
import accServiceDetailApi, { AccServiceDetailDTO } from "../../../services/services/accservicedetailapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const AccService: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [accounts, setAccounts] = useState<AccountLookupDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [items, setItems] = useState<AccServiceDetailDTO[]>([]);
  const [accId, setAccId] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, [user.branchid]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accRes, svcRes, listRes] = await Promise.all([
        taxTypeApi.getAccountList(user.branchid),
        serviceApi.getList(user.branchid),
        accServiceDetailApi.getAll(user.branchid),
      ]);
      if (accRes.success) setAccounts((accRes as any).items ?? []);
      if (svcRes.success) setServices((svcRes as any).items ?? []);
      if (listRes.success) setItems((listRes as any).items ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    const errors: string[] = [];
    if (!accId || accId === 0) errors.push("Account is required.");
    if (!serviceId || serviceId === 0) errors.push("Service is required.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }
    setSaving(true);
    try {
      const res = await accServiceDetailApi.add({ branchId: user.branchid, accId, serviceId });
      if (res.success) {
        setAccId(0);
        setServiceId(0);
        await loadAll();
        Swal.fire({ icon: "success", title: "Saved!", text: res.message || "Assignment saved.", timer: 1500, showConfirmButton: false });
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: AccServiceDetailDTO) => {
    const result = await Swal.fire({
      title: "Remove Assignment?",
      text: `Remove service "${item.serviceName}" from account "${item.accDisplay}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove it!",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await accServiceDetailApi.remove(item.id!, user.branchid);
      if (res.success) {
        await loadAll();
        Swal.fire({ icon: "success", title: "Removed!", timer: 1200, showConfirmButton: false });
      } else throw new Error(res.message || "Delete failed.");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    }
  };

  type Row = AccServiceDetailDTO & { _idx: number; _original: AccServiceDetailDTO };
  const tableData: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "accDisplay", header: "Account", render: r => r.accDisplay || "—" },
    { key: "serviceName", header: "Service", render: r => r.serviceName || "—" },
    {
      key: "actions",
      header: "Actions",
      render: r => (
        <div className="flex justify-center">
          <button onClick={() => handleDelete(r._original)} className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110" title="Remove">
            <FaTrash size={14} />
          </button>
        </div>
      ),
    },
  ];

  const sel = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Link className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Update Account Service</h1>
                <p className="text-sm text-gray-500">Assign services to accounts</p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select value={accId} onChange={e => setAccId(Number(e.target.value))} className={sel}>
                    <option value={0}>-- Select Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select value={serviceId} onChange={e => setServiceId(Number(e.target.value))} className={sel}>
                    <option value={0}>-- Select Service --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                    : <><Save className="w-4 h-4" />Save</>}
                </button>
                <button onClick={() => { setAccId(0); setServiceId(0); }} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
              {loading
                ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                : <GenericTable data={tableData} columns={columns} getKey={r => r.id || 0} />}
            </div>

          </div>
        </div>
      }
    />
  );
};

export default AccService;
