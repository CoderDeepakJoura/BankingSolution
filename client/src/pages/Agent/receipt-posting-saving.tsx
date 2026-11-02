import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import agentReceiptPostingApi, { UnpostedCollection, PostCollectionResult } from "../../services/agent/agentReceiptPostingApi";
import commonservice from "../../services/common/commonservice";
import { ArrowLeft, RefreshCw, CheckSquare, Square, SendHorizonal, Landmark } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceiptPostingSaving() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;
  const workingDate = commonservice.parseWorkingDate(user.workingdate ?? "");

  const [date, setDate] = useState(workingDate);
  const [collections, setCollections] = useState<UnpostedCollection[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<PostCollectionResult[] | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await agentReceiptPostingApi.getUnposted(branchId, date, "Saving");
      const data: UnpostedCollection[] = (res as any).data ?? [];
      setCollections(data);
      setSelected(new Set(data.map(c => c.collectionId)));
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to load collections.", "error");
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const toggleAll = () => {
    if (selected.size === collections.length) setSelected(new Set());
    else setSelected(new Set(collections.map(c => c.collectionId)));
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePost = async () => {
    if (selected.size === 0) { Swal.fire("Validation", "Select at least one collection to post.", "warning"); return; }
    const confirm = await Swal.fire({
      title: "Post Collections?",
      html: `Post <strong>${selected.size}</strong> saving deposit(s) as vouchers for date <strong>${date}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Post",
    });
    if (!confirm.isConfirmed) return;

    setPosting(true);
    try {
      const res = await agentReceiptPostingApi.batchPost({
        branchId,
        collectionIds: Array.from(selected),
        voucherDate: date,
        narration: "Agent saving deposit collection",
      });
      const data: PostCollectionResult[] = (res as any).data ?? [];
      setResults(data);
      const successCount = data.filter(r => r.success).length;
      const failCount = data.filter(r => !r.success).length;
      Swal.fire(
        failCount === 0 ? "Posted!" : "Partial Success",
        `${successCount} posted successfully${failCount > 0 ? `, ${failCount} failed` : ""}.`,
        failCount === 0 ? "success" : "warning"
      );
      loadCollections();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to post.", "error");
    } finally {
      setPosting(false);
    }
  };

  const grandTotal = collections
    .filter(c => selected.has(c.collectionId))
    .reduce((s, c) => s + c.amount, 0);

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
          <button onClick={() => navigate(-1)} className="text-white hover:text-blue-200 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <Landmark size={22} className="text-blue-200" />
          <h1 className="text-xl font-semibold text-white flex-1">Receipt Posting — Saving Deposit</h1>
          <button onClick={loadCollections} disabled={loading} className="text-white hover:text-blue-200 transition-colors disabled:opacity-50">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Collection Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Selected Amount</div>
              <div className="text-xl font-bold text-blue-700">₹{fmt(grandTotal)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : collections.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No unposted saving collections for this date.</div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
                  <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 font-medium">
                    {selected.size === collections.length ? <CheckSquare size={16} /> : <Square size={16} />}
                    {selected.size === collections.length ? "Deselect All" : "Select All"} ({collections.length})
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={posting || selected.size === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    <SendHorizonal size={15} />
                    {posting ? "Posting..." : `Post Selected (${selected.size})`}
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      <th className="px-4 py-3 w-10"></th>
                      <th className="text-left px-4 py-3 text-blue-700 font-semibold">Account</th>
                      <th className="text-left px-4 py-3 text-blue-700 font-semibold">Agent</th>
                      <th className="text-right px-4 py-3 text-blue-700 font-semibold">Amount</th>
                      <th className="text-left px-4 py-3 text-blue-700 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((c, i) => (
                      <tr key={c.collectionId} className={`cursor-pointer ${selected.has(c.collectionId) ? "bg-blue-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} onClick={() => toggle(c.collectionId)}>
                        <td className="px-4 py-3 text-center">
                          {selected.has(c.collectionId) ? <CheckSquare size={16} className="text-blue-600 inline" /> : <Square size={16} className="text-gray-400 inline" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{c.accountName}</div>
                          <div className="text-xs text-gray-400">{c.accountNo}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.agentName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">₹{fmt(c.amount)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{c.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700">Posting Results</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2">Account</th>
                    <th className="text-right px-4 py-2">Amount</th>
                    <th className="text-center px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Voucher / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.collectionId} className={r.success ? "bg-emerald-50/50" : "bg-red-50/50"}>
                      <td className="px-4 py-2">{r.accountName} <span className="text-gray-400">({r.accountNo})</span></td>
                      <td className="px-4 py-2 text-right">₹{fmt(r.amount)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {r.success ? "Posted" : "Failed"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{r.success ? `Voucher No. ${r.voucherNo ?? r.voucherId}` : r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    } />
  );
}
