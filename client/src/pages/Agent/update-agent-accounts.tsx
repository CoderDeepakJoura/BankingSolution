import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { RootState } from "../../redux";
import agentApi, { AgentMaster, AccountAgent } from "../../services/agent/agentApi";
import DashboardLayout from "../../Common/Layout";
import commonservice from "../../services/common/commonservice";
import { ArrowLeft, RefreshCw, ArrowRightLeft, History, CheckSquare, Square } from "lucide-react";

type AgentOpt = { value: number; label: string };
type Tab = "transfer" | "history";

export default function UpdateAgentAccounts() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;
  const workingDate = commonservice.parseWorkingDate(user.workingdate ?? "");

  const [tab, setTab] = useState<Tab>("transfer");
  const [agentOpts, setAgentOpts] = useState<AgentOpt[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Transfer tab state
  const [fromAgent, setFromAgent] = useState<AgentOpt | null>(null);
  const [toAgent, setToAgent] = useState<AgentOpt | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(workingDate);
  const [accounts, setAccounts] = useState<AccountAgent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // History tab state
  const [histAgent, setHistAgent] = useState<AgentOpt | null>(null);
  const [histAccounts, setHistAccounts] = useState<AccountAgent[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histSearch, setHistSearch] = useState("");
  const [selectedHistAcc, setSelectedHistAcc] = useState<AccountAgent | null>(null);
  const [history, setHistory] = useState<AccountAgent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const res = await agentApi.getAgentDropdown(branchId, false);
      const raw: AgentMaster[] = (res as any).items ?? [];
      setAgentOpts(raw.map(a => ({ value: a.id, label: `${a.code} — ${a.name}${!a.isActive ? " (Inactive)" : ""}` })));
    } catch { /* non-critical */ }
    finally { setLoadingAgents(false); }
  }, [branchId]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const loadAccountsForAgent = useCallback(async (agentId: number) => {
    setLoadingAccounts(true);
    setAccounts([]);
    setSelectedIds(new Set());
    try {
      const res = await agentApi.getAccountsByAgent(branchId, agentId);
      setAccounts((res as any).items ?? []);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load accounts.", "error");
    } finally { setLoadingAccounts(false); }
  }, [branchId]);

  const handleFromAgentChange = (opt: AgentOpt | null) => {
    setFromAgent(opt);
    setAccounts([]);
    setSelectedIds(new Set());
    if (opt) loadAccountsForAgent(opt.value);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map(a => a.accountId)));
    }
  };

  const handleTransfer = async () => {
    if (!fromAgent || !toAgent) { Swal.fire("Validation", "Select both agents.", "warning"); return; }
    if (fromAgent.value === toAgent.value) { Swal.fire("Validation", "Source and destination agent must be different.", "warning"); return; }
    if (selectedIds.size === 0) { Swal.fire("Validation", "Select at least one account to transfer.", "warning"); return; }
    if (!effectiveDate) { Swal.fire("Validation", "Select an effective date.", "warning"); return; }

    const confirm = await Swal.fire({
      title: "Confirm Transfer",
      html: `Transfer <strong>${selectedIds.size}</strong> account(s) from <strong>${fromAgent.label}</strong> to <strong>${toAgent.label}</strong> effective <strong>${effectiveDate}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Transfer",
      confirmButtonColor: "#4f46e5",
    });
    if (!confirm.isConfirmed) return;

    setTransferring(true);
    try {
      await agentApi.transferAccounts({
        branchId,
        fromAgentId: fromAgent.value,
        toAgentId: toAgent.value,
        accountIds: Array.from(selectedIds),
        effectiveDate,
      });
      Swal.fire({ icon: "success", title: "Transferred", text: `${selectedIds.size} account(s) transferred successfully.`, timer: 2000, showConfirmButton: false });
      loadAccountsForAgent(fromAgent.value);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Transfer failed.", "error");
    } finally { setTransferring(false); }
  };

  const loadHistAccounts = useCallback(async (agentId: number) => {
    setLoadingHist(true);
    setHistAccounts([]);
    setSelectedHistAcc(null);
    setHistory([]);
    try {
      const res = await agentApi.getAccountsByAgent(branchId, agentId);
      setHistAccounts((res as any).items ?? []);
    } catch { /* non-critical */ }
    finally { setLoadingHist(false); }
  }, [branchId]);

  const handleHistAgentChange = (opt: AgentOpt | null) => {
    setHistAgent(opt);
    setHistAccounts([]);
    setSelectedHistAcc(null);
    setHistory([]);
    if (opt) loadHistAccounts(opt.value);
  };

  const handleViewHistory = async (acc: AccountAgent) => {
    setSelectedHistAcc(acc);
    setLoadingHistory(true);
    setHistory([]);
    try {
      const res = await agentApi.getAccountAgentHistory(branchId, acc.accountId);
      setHistory((res as any).items ?? []);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load history.", "error");
    } finally { setLoadingHistory(false); }
  };

  const filteredHistAccounts = histAccounts.filter(a =>
    !histSearch || a.accountName.toLowerCase().includes(histSearch.toLowerCase()) || a.accountNo.includes(histSearch)
  );

  const selectStyles = {
    control: (base: any) => ({ ...base, borderRadius: "0.5rem", borderColor: "#e2e8f0", cursor: "pointer", minHeight: "42px" }),
    menu: (base: any) => ({ ...base, zIndex: 50 }),
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 px-8 py-6 shadow-lg">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-white/5 rounded-full" />
            </div>
            <div className="relative flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Update Agent of Accounts</h2>
                <p className="text-indigo-200 text-sm">Transfer accounts between agents with full history</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 flex gap-1">
            {(["transfer", "history"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-all cursor-pointer ${
                  tab === t ? "bg-white text-indigo-700 shadow-sm" : "bg-white/50 text-gray-500 hover:bg-white/80"
                }`}
              >
                {t === "transfer" ? <ArrowRightLeft className="w-4 h-4" /> : <History className="w-4 h-4" />}
                {t === "transfer" ? "Transfer Accounts" : "View History"}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="px-6 pb-6">
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-lg border border-gray-100 p-6">

              {/* ── Transfer Tab ──────────────────────────────────────────── */}
              {tab === "transfer" && (
                <div className="space-y-5">
                  {/* Agent & Date selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">From Agent <span className="text-red-500">*</span></label>
                      <Select
                        options={agentOpts}
                        value={fromAgent}
                        onChange={handleFromAgentChange}
                        placeholder="Select source agent…"
                        isLoading={loadingAgents}
                        isClearable
                        styles={selectStyles}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">To Agent <span className="text-red-500">*</span></label>
                      <Select
                        options={agentOpts.filter(o => o.value !== fromAgent?.value)}
                        value={toAgent}
                        onChange={setToAgent}
                        placeholder="Select destination agent…"
                        isClearable
                        styles={selectStyles}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Effective Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={e => setEffectiveDate(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-400 text-sm cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Accounts list */}
                  {fromAgent && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">
                          Accounts under {fromAgent.label}
                          {accounts.length > 0 && <span className="ml-2 text-xs text-gray-400">({accounts.length} total)</span>}
                        </span>
                        {accounts.length > 0 && (
                          <button
                            onClick={toggleAll}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            {selectedIds.size === accounts.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            {selectedIds.size === accounts.length ? "Deselect All" : "Select All"}
                          </button>
                        )}
                      </div>

                      {loadingAccounts ? (
                        <div className="flex justify-center py-8 text-indigo-400 text-sm gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Loading accounts…
                        </div>
                      ) : accounts.length === 0 ? (
                        <div className="flex justify-center py-8 text-gray-400 text-sm">No accounts found for this agent.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-white text-gray-500 text-xs border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-2.5 w-10"></th>
                                <th className="px-4 py-2.5 text-left">Account No</th>
                                <th className="px-4 py-2.5 text-left">Account Name</th>
                                <th className="px-4 py-2.5 text-left">Type</th>
                                <th className="px-4 py-2.5 text-left">From Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {accounts.map(acc => (
                                <tr
                                  key={acc.accountId}
                                  onClick={() => toggleSelect(acc.accountId)}
                                  className={`cursor-pointer transition-colors ${selectedIds.has(acc.accountId) ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                                >
                                  <td className="px-4 py-2.5 text-center">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mx-auto ${selectedIds.has(acc.accountId) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                                      {selectedIds.has(acc.accountId) && <span className="text-white text-xs">✓</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-indigo-700">{acc.accountNo}</td>
                                  <td className="px-4 py-2.5 text-gray-800">{acc.accountName}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{acc.accTypeName}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 tabular-nums">{acc.fromDate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transfer button */}
                  {fromAgent && accounts.length > 0 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-500">
                        {selectedIds.size} account{selectedIds.size !== 1 ? "s" : ""} selected
                      </span>
                      <button
                        onClick={handleTransfer}
                        disabled={transferring || selectedIds.size === 0 || !toAgent}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {transferring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                        {transferring ? "Transferring…" : "Transfer Selected"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── History Tab ───────────────────────────────────────────── */}
              {tab === "history" && (
                <div className="space-y-5">
                  <div className="max-w-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Agent</label>
                    <Select
                      options={agentOpts}
                      value={histAgent}
                      onChange={handleHistAgentChange}
                      placeholder="Select agent…"
                      isLoading={loadingAgents}
                      isClearable
                      styles={selectStyles}
                    />
                  </div>

                  {histAgent && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Accounts list */}
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <span className="text-sm font-semibold text-gray-700">Current Accounts</span>
                          <input
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-300"
                            placeholder="Search…"
                            value={histSearch}
                            onChange={e => setHistSearch(e.target.value)}
                          />
                        </div>
                        {loadingHist ? (
                          <div className="flex justify-center py-6 text-indigo-400 text-sm gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
                          </div>
                        ) : filteredHistAccounts.length === 0 ? (
                          <div className="flex justify-center py-6 text-gray-400 text-sm">No accounts.</div>
                        ) : (
                          <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-white text-gray-500 text-xs sticky top-0 border-b border-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Account</th>
                                  <th className="px-3 py-2 text-left">Type</th>
                                  <th className="px-3 py-2 text-center">History</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {filteredHistAccounts.map(acc => (
                                  <tr
                                    key={acc.accountId}
                                    className={`transition-colors ${selectedHistAcc?.accountId === acc.accountId ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="font-medium text-gray-800 text-xs">{acc.accountName}</div>
                                      <div className="font-mono text-indigo-600 text-xs">{acc.accountNo}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{acc.accTypeName}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() => handleViewHistory(acc)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                                      >
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* History panel */}
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <span className="text-sm font-semibold text-gray-700">
                            {selectedHistAcc ? `History — ${selectedHistAcc.accountName} (${selectedHistAcc.accountNo})` : "Agent History"}
                          </span>
                        </div>
                        {!selectedHistAcc ? (
                          <div className="flex justify-center py-6 text-gray-400 text-sm">Select an account to view its agent history.</div>
                        ) : loadingHistory ? (
                          <div className="flex justify-center py-6 text-indigo-400 text-sm gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
                          </div>
                        ) : history.length === 0 ? (
                          <div className="flex justify-center py-6 text-gray-400 text-sm">No history found.</div>
                        ) : (
                          <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-white text-gray-500 text-xs sticky top-0 border-b border-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Agent</th>
                                  <th className="px-3 py-2 text-left">From</th>
                                  <th className="px-3 py-2 text-left">To</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {history.map((h, i) => (
                                  <tr key={i} className={h.toDate == null ? "bg-green-50" : ""}>
                                    <td className="px-3 py-2 text-gray-800 font-medium">{h.agentName}</td>
                                    <td className="px-3 py-2 text-gray-600 tabular-nums">{h.fromDate}</td>
                                    <td className="px-3 py-2 tabular-nums">
                                      {h.toDate
                                        ? <span className="text-gray-600">{h.toDate}</span>
                                        : <span className="text-green-600 font-semibold text-xs">Current</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  );
}
