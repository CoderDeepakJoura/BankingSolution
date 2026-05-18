import React, { useState } from "react";
import {
  Search, Trash2, Edit, ArrowLeft, FileText, AlertCircle, CheckCircle, Lock,
} from "lucide-react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import voucherOperationsApi, {
  VoucherPreview,
  EDIT_ROUTE_MAP,
} from "../../services/vouchers/voucherOperationsApi";
import commonservice from "../../services/common/commonservice";
import DatePicker from "../../components/DatePicker";

const VoucherSearch: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [voucherNo, setVoucherNo] = useState("");
  const workingDateISO = user.workingdate
    ? commonservice.parseWorkingDate(user.workingdate)
    : commonservice.getTodaysDate();

  const [voucherDate, setVoucherDate] = useState(workingDateISO);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<VoucherPreview | null>(null);
  const [error, setError] = useState("");

  const drEntries = preview?.entries.filter((e) => e.entryType === "Dr") ?? [];
  const crEntries = preview?.entries.filter((e) => e.entryType === "Cr") ?? [];

  const handleSearch = async () => {
    if (!voucherNo || !voucherDate) return;
    if (voucherDate > workingDateISO) {
      setError(`Voucher date cannot be after the working date (${workingDateISO}).`);
      return;
    }
    setLoading(true);
    setPreview(null);
    setError("");
    try {
      const res = await voucherOperationsApi.getPreview(user.branchid, voucherDate, Number(voucherNo));
      if (res.success && res.data) {
        setPreview(res.data);
      } else {
        setError(res.message || "Voucher not found.");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!preview) return;

    if (preview.hasClosedAccounts) {
      Swal.fire({
        icon: "error",
        title: "Cannot Delete",
        text: "One or more accounts in this voucher have been closed. Deletion is not allowed.",
        confirmButtonColor: "#EF4444",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Confirm Deletion",
      html: `
        <p>You are about to delete <strong>Voucher No. ${preview.voucherNo}</strong>.</p>
        <p class="text-sm text-gray-500 mt-1">${preview.voucherTypeName} — ${preview.voucherSubTypeName}</p>
        ${preview.deleteOnly ? `<p class="mt-2 text-orange-600 text-sm font-medium">⚠️ This will also reopen the closed account.</p>` : ""}
        <p class="mt-2 text-red-600 text-sm">This action cannot be undone.</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
    });

    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const res = await voucherOperationsApi.deleteVoucher(user.branchid, voucherDate, preview.voucherNo);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text: `Voucher No. ${preview.voucherNo} deleted successfully.`,
          confirmButtonColor: "#10B981",
        });
        setPreview(null);
        setVoucherNo("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Deletion Failed",
          text: res.message || "Failed to delete voucher.",
          confirmButtonColor: "#EF4444",
        });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "An unexpected error occurred.", confirmButtonColor: "#EF4444" });
    } finally {
      setDeleting(false);
    }
  };

  const handleModify = () => {
    if (!preview) return;
    const key = `${preview.voucherType}-${preview.voucherSubType}`;
    const route = EDIT_ROUTE_MAP[key];
    if (!route) {
      Swal.fire({
        icon: "info",
        title: "Not Supported",
        text: "Modify is not available for this voucher type.",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }
    navigate(route, { state: { editVoucher: preview } });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      V: "bg-green-100 text-green-700",
      A: "bg-yellow-100 text-yellow-700",
    };
    const label: Record<string, string> = { V: "Verified", A: "Pending" };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
        {label[status] ?? status}
      </span>
    );
  };

  const EntryTable = ({ entries, side }: { entries: typeof drEntries; side: "Dr" | "Cr" }) => {
    const isdr = side === "Dr";
    const borderColor = isdr ? "border-rose-200" : "border-green-200";
    const headerBg = isdr ? "bg-rose-50 border-b border-rose-200" : "bg-green-50 border-b border-green-200";
    const badgeColor = isdr ? "bg-rose-500" : "bg-green-600";
    const amountColor = isdr ? "text-rose-700" : "text-green-700";
    const thColor = isdr ? "text-rose-800" : "text-green-800";
    const rowHover = isdr ? "hover:bg-rose-50" : "hover:bg-green-50";
    const total = entries.reduce((s, e) => s + e.amount, 0);

    return (
      <div className={`rounded-xl border-2 ${borderColor} overflow-hidden`}>
        <div className={`flex items-center gap-3 px-5 py-3 ${headerBg}`}>
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${badgeColor} text-white text-xs font-bold shadow-sm`}>
            {side}
          </span>
          <p className={`text-sm font-semibold ${isdr ? "text-rose-700" : "text-green-700"}`}>
            {isdr ? "Debit Entries" : "Credit Entries"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isdr ? "bg-rose-50/50" : "bg-green-50/50"}`}>
              <tr>
                {["#", "Account", "Identifier", "Amount", "Narration", "Status"].map((h) => (
                  <th key={h} className={`px-4 py-2 text-left text-xs font-semibold ${thColor} uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {entries.map((e, i) => (
                <tr key={i} className={`${rowHover} transition-colors`}>
                  <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.accountName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{e.accountIdentifier}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${amountColor}`}>₹{e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.narration || "—"}</td>
                  <td className="px-4 py-3">
                    {e.isAccClosed ? (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <Lock className="w-3 h-3" /> Closed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className={`${isdr ? "bg-rose-50 border-t-2 border-rose-200" : "bg-green-50 border-t-2 border-green-200"}`}>
                <td colSpan={3} className={`px-4 py-2 text-sm font-semibold ${isdr ? "text-rose-800" : "text-green-800"}`}>
                  Total
                </td>
                <td className={`px-4 py-2 text-sm font-bold ${amountColor}`}>
                  ₹{total.toFixed(2)}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      enableScroll
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Voucher Search</h2>
                      <p className="text-sm text-gray-600">Search a voucher to view, modify or delete</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/voucher-operations")}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Search form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher Date</label>
                    <DatePicker
                      value={voucherDate}
                      max={workingDateISO}
                      workingDate={workingDateISO}
                      onChange={(v) => { setVoucherDate(v); setPreview(null); setError(""); }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Voucher No <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={voucherNo}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setVoucherNo(digits);
                        setPreview(null);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Enter voucher number"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSearch}
                      disabled={!voucherNo || loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      {loading ? "Searching..." : "Search"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Preview card */}
            {preview && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Voucher meta header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Voucher No</p>
                        <p className="text-lg font-bold text-gray-800">#{preview.voucherNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(preview.voucherDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).replace(/ /g, "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-semibold text-gray-700">{preview.voucherTypeName} — {preview.voucherSubTypeName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Status</p>
                        {statusBadge(preview.status)}
                      </div>
                      {preview.deleteOnly && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          Delete Only
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                      {!preview.deleteOnly && (
                        <button
                          onClick={handleModify}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                          Modify
                        </button>
                      )}
                      <button
                        onClick={handleDelete}
                        disabled={deleting || preview.hasClosedAccounts}
                        title={preview.hasClosedAccounts ? "Cannot delete: one or more accounts are closed" : ""}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                      >
                        {deleting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {preview.narration && (
                    <p className="mt-3 text-sm text-gray-600 italic">Narration: {preview.narration}</p>
                  )}

                  {preview.hasClosedAccounts && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      One or more accounts in this voucher are closed. Deletion is blocked.
                    </div>
                  )}
                </div>

                {/* Dr / Cr tables */}
                <div className="p-6 space-y-5">
                  {drEntries.length > 0 && <EntryTable entries={drEntries} side="Dr" />}
                  {crEntries.length > 0 && <EntryTable entries={crEntries} side="Cr" />}
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

export default VoucherSearch;
