import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, Settings } from "lucide-react";
import taxTypeApi, { AccountLookupDTO } from "../../../services/gst/taxtypeapi";
import gstSettingApi, { GSTSettingDTO } from "../../../services/gst/gstsettingapi";

const GSTSettings: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);

  const [accounts, setAccounts] = useState<AccountLookupDTO[]>([]);
  const [data, setData] = useState<GSTSettingDTO>({ branchId: user.branchid, roundOffExpAccId: 0, roundOffIncAccId: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, [user.branchid]);

  const loadAll = async () => {
    try {
      const accRes = await taxTypeApi.getAccountList(user.branchid);
      if (accRes.success) setAccounts((accRes as any).items ?? []);
    } catch { /* ignore */ }

    try {
      const settingRes = await gstSettingApi.get(user.branchid);
      const payload = (settingRes as any).data;
      if (settingRes.success && payload) {
        setData({
          branchId: user.branchid,
          roundOffExpAccId: payload.roundOffExpAccId ?? 0,
          roundOffIncAccId: payload.roundOffIncAccId ?? 0,
        });
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.roundOffExpAccId || data.roundOffExpAccId === 0) errors.push("Round Off Exp. A/c is required.");
    if (!data.roundOffIncAccId || data.roundOffIncAccId === 0) errors.push("Round Off Inc. A/c is required.");
    if (data.roundOffExpAccId && data.roundOffIncAccId && data.roundOffExpAccId === data.roundOffIncAccId)
      errors.push("Round Off Exp. A/c and Round Off Inc. A/c cannot be the same.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    setSaving(true);
    try {
      const res = await gstSettingApi.save({ ...data, branchId: user.branchid });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "GST Settings saved.", confirmButtonColor: "#3B82F6" });
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setSaving(false); }
  };

  const sel = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Settings className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">GST Settings</h1>
                <p className="text-sm text-gray-500">Configure GST round-off accounts for this branch</p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">

                {/* Round Off Exp. A/c */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Round Off Exp. A/c <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.roundOffExpAccId}
                    onChange={e => setData(p => ({ ...p, roundOffExpAccId: Number(e.target.value) }))}
                    className={sel}
                  >
                    <option value={0}>-- Select Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>
                    ))}
                  </select>
                </div>

                {/* Round Off Inc. A/c */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Round Off Inc. A/c <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.roundOffIncAccId}
                    onChange={e => setData(p => ({ ...p, roundOffIncAccId: Number(e.target.value) }))}
                    className={sel}
                  >
                    <option value={0}>-- Select Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                    : <><Save className="w-4 h-4" />Save</>}
                </button>
              </div>
            </div>

          </div>
        </div>
      }
    />
  );
};

export default GSTSettings;
