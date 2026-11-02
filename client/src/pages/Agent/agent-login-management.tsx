import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import agentLoginManagementApi, { AgentLoginEntry, CreateAgentLoginDTO } from "../../services/agent/agentLoginManagementApi";
import agentApi, { AgentMaster } from "../../services/agent/agentApi";
import { ArrowLeft, RefreshCw, Plus, Key, Power, Trash2, ShieldCheck, Shield } from "lucide-react";

type AgentOpt = { value: number; label: string };

export default function AgentLoginManagement() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const [logins, setLogins] = useState<AgentLoginEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentOpts, setAgentOpts] = useState<AgentOpt[]>([]);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [selAgent, setSelAgent] = useState<AgentOpt | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperAgent, setIsSuperAgent] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loginsRes, agentsRes] = await Promise.all([
        agentLoginManagementApi.getAll(branchId),
        agentApi.getAgentDropdown(branchId, false),
      ]);
      setLogins((loginsRes as any).data ?? []);
      const raw: AgentMaster[] = (agentsRes as any).Items ?? (agentsRes as any).items ?? [];
      setAgentOpts(raw.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })));
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!selAgent) { Swal.fire("Validation", "Select an agent.", "warning"); return; }
    if (!username.trim() || username.length < 4) { Swal.fire("Validation", "Username must be at least 4 characters.", "warning"); return; }
    if (!password || password.length < 6) { Swal.fire("Validation", "Password must be at least 6 characters.", "warning"); return; }

    setSaving(true);
    try {
      const dto: CreateAgentLoginDTO = {
        branchId,
        agentMasterId: selAgent.value,
        username: username.trim(),
        password,
        isSuperAgent,
      };
      await agentLoginManagementApi.create(dto);
      Swal.fire("Success", "Agent login created.", "success");
      setShowForm(false);
      setSelAgent(null);
      setUsername("");
      setPassword("");
      setIsSuperAgent(false);
      loadData();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to create login.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (login: AgentLoginEntry) => {
    const { value: newPass } = await Swal.fire({
      title: `Reset password for ${login.agentName}`,
      input: "password",
      inputPlaceholder: "Enter new password (min 6 chars)",
      showCancelButton: true,
      inputValidator: (v) => (!v || v.length < 6) ? "Password must be at least 6 characters" : undefined,
    });
    if (!newPass) return;

    try {
      await agentLoginManagementApi.resetPassword({ agentLoginId: login.id, branchId, newPassword: newPass });
      Swal.fire("Success", "Password reset successfully.", "success");
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to reset password.", "error");
    }
  };

  const handleToggle = async (login: AgentLoginEntry) => {
    const action = login.isActive ? "disable" : "enable";
    const confirm = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} login?`,
      text: `This will ${action} the login for ${login.agentName}.`,
      icon: "question",
      showCancelButton: true,
    });
    if (!confirm.isConfirmed) return;

    try {
      await agentLoginManagementApi.toggle({ agentLoginId: login.id, branchId, isActive: !login.isActive });
      loadData();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to update status.", "error");
    }
  };

  const handleDelete = async (login: AgentLoginEntry) => {
    const confirm = await Swal.fire({
      title: "Delete login?",
      text: `This will permanently remove the login for ${login.agentName}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;

    try {
      await agentLoginManagementApi.delete(login.id, branchId);
      Swal.fire("Deleted", "Login removed.", "success");
      loadData();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to delete.", "error");
    }
  };

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50">
        {/* Header */}
        <div className="w-full bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 px-6 py-4 flex items-center gap-4 shadow-lg">
          <button onClick={() => navigate(-1)} className="text-white hover:text-indigo-200 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <ShieldCheck size={22} className="text-indigo-200" />
          <h1 className="text-xl font-semibold text-white flex-1">Agent Login Management</h1>
          <button onClick={loadData} disabled={loading} className="text-white hover:text-indigo-200 transition-colors disabled:opacity-50">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Login
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Create form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-5 space-y-4">
              <h2 className="text-base font-semibold text-indigo-800">Create Agent Login</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Agent</label>
                  <Select
                    options={agentOpts}
                    value={selAgent}
                    onChange={opt => setSelAgent(opt)}
                    placeholder="Select agent..."
                    styles={{ control: (b) => ({ ...b, cursor: "pointer" }) }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="min 4 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    placeholder="min 6 characters"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSuperAgent}
                    onChange={e => setIsSuperAgent(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Super Agent (can view all agents' collections)</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? "Creating..." : "Create Login"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Logins table */}
          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : logins.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No agent logins created yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 border-b border-indigo-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-indigo-700 font-semibold">Agent</th>
                    <th className="text-left px-4 py-3 text-indigo-700 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 text-indigo-700 font-semibold">Username</th>
                    <th className="text-center px-4 py-3 text-indigo-700 font-semibold">Type</th>
                    <th className="text-center px-4 py-3 text-indigo-700 font-semibold">Status</th>
                    <th className="text-center px-4 py-3 text-indigo-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((l, i) => (
                    <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                      <td className="px-4 py-3 font-medium text-gray-800">{l.agentName}</td>
                      <td className="px-4 py-3 text-gray-500">{l.agentCode}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{l.username}</td>
                      <td className="px-4 py-3 text-center">
                        {l.isSuperAgent ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            <ShieldCheck size={12} /> Super
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Shield size={12} /> Agent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${l.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {l.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResetPassword(l)}
                            title="Reset Password"
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Key size={15} />
                          </button>
                          <button
                            onClick={() => handleToggle(l)}
                            title={l.isActive ? "Disable" : "Enable"}
                            className={`p-1.5 rounded-lg transition-colors ${l.isActive ? "text-yellow-500 hover:bg-yellow-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(l)}
                            title="Delete"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    } />
  );
}
