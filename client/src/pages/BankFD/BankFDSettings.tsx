import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { ArrowLeft, Settings, Save, Pencil, Trash2, Plus } from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import bankFDMatureApi, { BFDIntIncomeSettingItem } from "../../services/bankfd/bankFDMatureApi";

interface HeadOption { value: number; label: string; }
interface GenAcc { value: number; label: string; }

const emptyForm = () => ({ headCode: 0, intIncomeAccId: 0 });

const BankFDSettings: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [accountHeads, setAccountHeads] = useState<HeadOption[]>([]);
  const [generalAccounts, setGeneralAccounts] = useState<GenAcc[]>([]);
  const [settings, setSettings] = useState<BFDIntIncomeSettingItem[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectStyles = {
    control: (b: any, s: any) => ({
      ...b, minHeight: "38px", borderWidth: "2px", cursor: "pointer",
      borderColor: s.isFocused ? "#3b82f6" : "#e5e7eb", borderRadius: "0.5rem",
      boxShadow: s.isFocused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    option: (b: any, s: any) => ({
      ...b, backgroundColor: s.isSelected ? "#3b82f6" : s.isFocused ? "#dbeafe" : "#fff",
      color: s.isSelected ? "#fff" : "#374151", cursor: "pointer",
    }),
    menu: (b: any) => ({ ...b, borderRadius: "0.5rem", zIndex: 9999 }),
    menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
    placeholder: (b: any) => ({ ...b, color: "#9ca3af" }),
  };

  useEffect(() => {
    if (!user.branchid) return;
    setLoading(true);
    Promise.all([
      commonservice.makeRequest<any>("/fetchdata/get_all_accountheads-with-headCode", {
        method: "POST",
        body: JSON.stringify({ BranchId: user.branchid }),
        headers: { "Content-Type": "application/json" },
      }),
      commonservice.general_accmasters_info(user.branchid),
      bankFDMatureApi.getInterestIncomeSettings(user.branchid),
    ]).then(([headRes, accRes, settingRes]) => {
      const heads = (headRes as any)?.data ?? [];
      // value = actual headcode (long) so it matches accountmaster.HeadCode used in GetAccountDetails
      setAccountHeads(heads.map((h: any) => ({
        value: parseInt(h.headCode ?? h.HeadCode ?? "0"),
        label: h.accountHeadName ?? h.AccountHeadName,
      })));
      setGeneralAccounts(((accRes as any)?.data ?? []).map((a: any) => ({ value: a.accId, label: a.accountName })));
      setSettings((settingRes as any)?.data ?? []);
    }).finally(() => setLoading(false));
  }, [user.branchid]);

  const loadSettings = async () => {
    const res = await bankFDMatureApi.getInterestIncomeSettings(user.branchid);
    setSettings((res as any)?.data ?? []);
  };

  const handleEdit = (s: BFDIntIncomeSettingItem) => {
    setEditingId(s.id);
    setForm({ headCode: s.headCode, intIncomeAccId: s.intIncomeAccId });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.headCode) { Swal.fire("Warning", "Please select an Account Head.", "warning"); return; }
    if (!form.intIncomeAccId) { Swal.fire("Warning", "Please select an Interest Income Account.", "warning"); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await bankFDMatureApi.updateInterestIncomeSetting(user.branchid, editingId, form.headCode, form.intIncomeAccId);
      } else {
        await bankFDMatureApi.createInterestIncomeSetting(user.branchid, form.headCode, form.intIncomeAccId);
      }
      await loadSettings();
      handleCancel();
      Swal.fire({ icon: "success", title: "Saved!", text: "Setting saved successfully.", timer: 1400, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete Setting?", text: "This will remove the auto-fill for this account head.",
      icon: "warning", showCancelButton: true, confirmButtonText: "Yes, delete", confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await bankFDMatureApi.deleteInterestIncomeSetting(user.branchid, id);
      await loadSettings();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to delete.", "error");
    }
  };

  const headLabel = (headCode: number) => accountHeads.find(h => h.value === headCode)?.label ?? `Head ${headCode}`;
  const accLabel = (accId: number) => generalAccounts.find(a => a.value === accId)?.label ?? `Account ${accId}`;

  // heads already used (excluding the one currently being edited)
  const usedHeadCodes = settings.filter(s => s.id !== editingId).map(s => s.headCode);
  const availableHeads = accountHeads.filter(h => !usedHeadCodes.includes(h.value));

  return (
    <DashboardLayout
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Settings className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Bank FD — Interest Income Settings
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                      Map each account head to its Interest Income account for auto-fill during Maturity, Renewal and Pre-Mature
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </div>

            {/* Add / Edit form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  {editingId !== null ? "Edit Setting" : "Add Setting"}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Account Head <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={availableHeads}
                      value={availableHeads.find(h => h.value === form.headCode) ?? null}
                      onChange={o => setForm(f => ({ ...f, headCode: o?.value ?? 0 }))}
                      placeholder="Select Bank FD account head..."
                      isClearable styles={selectStyles}
                      menuPortalTarget={document.body} menuPosition="fixed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Interest Income Account (Cr) <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={generalAccounts}
                      value={generalAccounts.find(a => a.value === form.intIncomeAccId) ?? null}
                      onChange={o => setForm(f => ({ ...f, intIncomeAccId: o?.value ?? 0 }))}
                      placeholder="Select interest income GL..."
                      isClearable styles={selectStyles}
                      menuPortalTarget={document.body} menuPosition="fixed"
                    />
                  </div>
                </div>
                <div className="mt-5 flex gap-3 justify-end">
                  {editingId !== null && (
                    <button onClick={handleCancel}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-md">
                    {saving
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                      : <><Save className="w-4 h-4" /> {editingId !== null ? "Update" : "Add"}</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Settings list */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-800">Configured Settings</h2>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
              ) : settings.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  No settings configured yet. Add one above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <tr>
                        {["Account Head", "Interest Income Account", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {settings.map((s, i) => (
                        <tr key={s.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{headLabel(s.headCode)}</td>
                          <td className="px-5 py-3 text-gray-700">{accLabel(s.intIncomeAccId)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEdit(s)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors">
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                              <button onClick={() => handleDelete(s.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
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

export default BankFDSettings;
