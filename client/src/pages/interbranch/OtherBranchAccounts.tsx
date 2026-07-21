import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import Select from "react-select";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaCodeBranch } from "react-icons/fa";
import otherBranchAccountApi, { OtherBranchAccount } from "../../services/interbranch/otherBranchAccountApi";
import BranchApiService from "../../services/branch/branchapi";
import commonService from "../../services/common/commonservice";

interface BranchOption { value: number; label: string; }
interface AccOption    { value: number; label: string; }

const OtherBranchAccounts: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const isHO = user.isMainBranch;

  const [records, setRecords]           = useState<OtherBranchAccount[]>([]);
  const [branches, setBranches]         = useState<BranchOption[]>([]);
  const [accounts, setAccounts]         = useState<AccOption[]>([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);

  const [formOtherBrId, setFormOtherBrId] = useState<number | null>(null);
  const [formAccId, setFormAccId]         = useState<number | null>(null);
  const [editId, setEditId]               = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await otherBranchAccountApi.getAll(user.branchid) as any;
      if (res.success) setRecords(res.data ?? []);
    } catch {
      Swal.fire("Error", "Failed to load records.", "error");
    } finally {
      setLoading(false);
    }
  }, [user.branchid]);

  useEffect(() => {
    const init = async () => {
      try {
        const [brRes, accRes] = await Promise.all([
          BranchApiService.fetchBranches({ searchTerm: "", pageNumber: 1, pageSize: 1000 }, 1) as any,
          commonService.general_accmasters_info(user.branchid) as any,
        ]);

        if (brRes.success) {
          const opts: BranchOption[] = (brRes.branches ?? [])
            .filter((b: any) => b.id !== user.branchid && (isHO || b.isMainBranch))
            .map((b: any) => ({ value: b.id, label: `${b.code} — ${b.name}` }));
          setBranches(opts);
        }

        if (accRes.success) {
          const opts: AccOption[] = (accRes.data ?? [])
            .map((a: any) => ({ value: a.accId, label: `${a.accountName}` }));
          setAccounts(opts);
        }
      } catch {
        Swal.fire("Error", "Failed to load reference data.", "error");
      }
    };
    init();
    fetchRecords();
  }, [user.branchid, fetchRecords]);

  const resetForm = () => {
    setFormOtherBrId(null);
    setFormAccId(null);
    setEditId(null);
  };

  const handleEdit = (row: OtherBranchAccount) => {
    setEditId(row.id);
    setFormOtherBrId(row.otherBrId);
    setFormAccId(row.accId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row: OtherBranchAccount) => {
    const confirm = await Swal.fire({
      title: "Delete Record",
      text: `Remove mapping for "${row.otherBranchName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await otherBranchAccountApi.remove(row.id, user.branchid) as any;
      if (res.success) {
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
        fetchRecords();
      } else {
        Swal.fire("Error", res.message || "Delete failed.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Delete failed.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOtherBrId) { Swal.fire("Validation", "Please select the other branch.", "warning"); return; }
    if (!formAccId)     { Swal.fire("Validation", "Please select the account.", "warning"); return; }

    setSaving(true);
    try {
      const dto = { id: editId ?? 0, brId: user.branchid, otherBrId: formOtherBrId, accId: formAccId };
      const res = await (editId
        ? otherBranchAccountApi.update(dto)
        : otherBranchAccountApi.create(dto)) as any;

      if (res.success) {
        Swal.fire({ icon: "success", title: editId ? "Updated!" : "Saved!", timer: 1500, showConfirmButton: false });
        resetForm();
        fetchRecords();
      } else {
        Swal.fire("Error", res.message || "Operation failed.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Operation failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FaCodeBranch className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Other Branch Accounts
                    </h1>
                    <p className="text-sm text-gray-500">Map reference accounts for inter-branch transactions</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium text-sm"
                >
                  <FaArrowLeft /> Back to Dashboard
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                    {editId ? <FaEdit className="text-white text-sm" /> : <FaPlus className="text-white text-sm" />}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {editId ? "Edit Mapping" : "Add New Mapping"}
                  </h2>
                </div>
              </div>

              {(() => {
                const allMapped = isHO && !editId && branches.every(b => records.some(r => r.otherBrId === b.value));
                const nonHOFull = !isHO && records.length >= 1 && !editId;
                if (allMapped || nonHOFull) return (
                  <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 text-sm text-amber-700 font-medium">
                    {nonHOFull
                      ? "Non-HO branches can only have one reference account (to the main branch). Edit the existing entry below."
                      : "All branches already have a reference account configured."}
                  </div>
                );
                return (
              <form className="p-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      {isHO ? "Other Branch" : "Main Branch (HO)"} <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={branches.filter(b =>
                        // When adding: hide branches already mapped (exclude current edit row)
                        !editId
                          ? !records.some(r => r.otherBrId === b.value)
                          : b.value === formOtherBrId  // when editing: only show the current value
                      )}
                      value={branches.find(b => b.value === formOtherBrId) ?? null}
                      onChange={opt => setFormOtherBrId(opt?.value ?? null)}
                      placeholder={isHO ? "Select other branch..." : "Select main branch..."}
                      isClearable={isHO}
                      isDisabled={!!editId}
                      styles={{ control: base => ({ ...base, cursor: "pointer" }) }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Reference Account <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={accounts}
                      value={accounts.find(a => a.value === formAccId) ?? null}
                      onChange={opt => setFormAccId(opt?.value ?? null)}
                      placeholder="Select account..."
                      isClearable
                      styles={{ control: base => ({ ...base, cursor: "pointer" }) }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 mt-6">
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 text-sm"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                    ) : (
                      <>{editId ? <FaEdit /> : <FaPlus />}{editId ? "Update" : "Add Mapping"}</>
                    )}
                  </button>
                </div>
              </form>
                );
              })()}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-800">Configured Mappings</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FaCodeBranch className="mx-auto text-4xl mb-3" />
                  <p className="text-lg font-medium">No mappings configured</p>
                  <p className="text-sm">Add a mapping using the form above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch Code</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Other Branch</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference Account</th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {records.map((row, i) => (
                        <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-5 py-3 font-mono text-gray-700">{row.otherBranchCode}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{row.otherBranchName}</td>
                          <td className="px-5 py-3 text-gray-600">{row.accountName}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(row)}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FaTrash />
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

export default OtherBranchAccounts;
