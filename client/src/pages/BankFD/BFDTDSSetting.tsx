import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { Save, Trash2, Pencil, Settings, ArrowLeft } from "lucide-react";
import bfdTdsSettingApi, { BFDHeadTDSSetting } from "../../services/bankfd/bfdTdsSettingApi";
import commonservice from "../../services/common/commonservice";
import { useNavigate } from "react-router-dom";

interface AccountHeadOption {
  value: number;
  label: string;
}

interface GeneralAccOption {
  value: number;
  label: string;
}

const emptyForm = (): BFDHeadTDSSetting => ({ id: 0, brId: 0, headCode: 0, tdsAccId: 0 });

const BFDTDSSetting: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const [accountHeads, setAccountHeads] = useState<AccountHeadOption[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<GeneralAccOption[]>([]);
  const [settings, setSettings] = useState<BFDHeadTDSSetting[]>([]);
  const [form, setForm] = useState<BFDHeadTDSSetting>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.branchid) loadAll();
  }, [user.branchid]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load account heads
      const headRes = await commonservice.makeRequest<any>(
        "/fetchdata/get_all_accountheads",
        { method: "POST", body: JSON.stringify({ BranchId: user.branchid }), headers: { "Content-Type": "application/json" } }
      );
      const headData = (headRes as any)?.data ?? [];
      setAccountHeads(
        headData.map((h: any) => ({ value: h.accountHeadId ?? h.AccountHeadId, label: h.accountHeadName ?? h.AccountHeadName }))
      );

      // Load general accounts
      const accRes = await commonservice.general_accmasters_info(user.branchid);
      const accData = (accRes as any)?.data ?? [];
      setGeneralAccounts(
        accData.map((a: any) => ({ value: a.accId ?? a.AccId, label: a.accountName ?? a.AccountName }))
      );

      // Load existing settings
      await loadSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await bfdTdsSettingApi.getAll(user.branchid);
      const data = (res as any)?.data ?? [];
      setSettings(data);
    } catch { /* ignore */ }
  };

  const selectedHead = accountHeads.find(h => h.value === form.headCode) ?? null;
  const selectedAcc = generalAccounts.find(a => a.value === form.tdsAccId) ?? null;

  const handleSave = async () => {
    if (!form.headCode || form.headCode === 0) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Please select an Account Head." }); return;
    }
    if (!form.tdsAccId || form.tdsAccId === 0) {
      Swal.fire({ icon: "warning", title: "Validation", text: "Please select a TDS Account." }); return;
    }

    setSaving(true);
    try {
      const dto: BFDHeadTDSSetting = { ...form, brId: user.branchid };
      const res = await bfdTdsSettingApi.save(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved successfully.", confirmButtonColor: "#3B82F6", timer: 1500, showConfirmButton: false });
        setForm(emptyForm());
        await loadSettings();
      } else {
        throw new Error(res.message || "Save failed.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: BFDHeadTDSSetting) => {
    setForm({ ...item });
  };

  const handleDelete = async (item: BFDHeadTDSSetting) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete?",
      text: "Are you sure you want to delete this TDS setting?",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await bfdTdsSettingApi.remove(user.branchid, item.id);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Deleted!", timer: 1200, showConfirmButton: false });
        await loadSettings();
        if (form.id === item.id) setForm(emptyForm());
      } else {
        throw new Error(res.message || "Delete failed.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const handleReset = () => setForm(emptyForm());

  const headLabel = (headCode: number) => {
    const found = accountHeads.find(h => h.value === headCode);
    return found ? found.label : `Head ${headCode}`;
  };

  const accLabel = (accId: number) => {
    const found = generalAccounts.find(a => a.value === accId);
    return found ? found.label : `Account ${accId}`;
  };

  const selectCls = "text-sm";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Settings className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Bank FD TDS Setting
                    </h1>
                    <p className="text-gray-600 text-sm">Configure TDS account mappings for FD head codes</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">
                {form.id > 0 ? "Edit TDS Setting" : "Add New TDS Setting"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Account Head <span className="text-red-500">*</span>
                  </label>
                  <Select
                    classNamePrefix="react-select"
                    className={selectCls}
                    options={accountHeads}
                    value={selectedHead}
                    onChange={opt => setForm(p => ({ ...p, headCode: opt?.value ?? 0 }))}
                    placeholder="-- Select Account Head --"
                    isClearable
                    isLoading={loading}


                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    TDS Account <span className="text-red-500">*</span>
                  </label>
                  <Select
                    classNamePrefix="react-select"
                    className={selectCls}
                    options={generalAccounts}
                    value={selectedAcc}
                    onChange={opt => setForm(p => ({ ...p, tdsAccId: opt?.value ?? 0 }))}
                    placeholder="-- Select TDS Account --"
                    isClearable
                    isLoading={loading}


                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                    : <><Save className="w-4 h-4" />{form.id > 0 ? "Update" : "Save"}</>}
                </button>
                {form.id > 0 && (
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Settings List */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-700">Existing TDS Settings</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : settings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No TDS settings configured yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">S.No</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Account Head</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">TDS Account</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.map((item, idx) => (
                        <tr key={item.id} className={`border-b border-gray-100 ${form.id === item.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{headLabel(item.headCode)}</td>
                          <td className="px-4 py-3 text-gray-700">{accLabel(item.tdsAccId)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      }
    />
  );
};

export default BFDTDSSetting;
