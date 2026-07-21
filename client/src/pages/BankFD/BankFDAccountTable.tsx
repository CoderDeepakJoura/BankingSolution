import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Landmark, Plus, Pencil, Trash2, Search, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bankFDAccountApi, { BankFDAccountListItem } from "../../services/bankfd/bankFDAccountApi";
import { encryptId } from "../../utils/encryption";
import commonservice from "../../services/common/commonservice";

const BankFDAccountTable: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<BankFDAccountListItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.branchid) loadAccounts();
  }, [user.branchid]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await bankFDAccountApi.getAll(user.branchid);
      const data = (res as any)?.data ?? [];
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load Bank FD accounts", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = searchText.trim()
    ? accounts.filter(a =>
        a.accountName.toLowerCase().includes(searchText.toLowerCase()) ||
        a.accNo.toLowerCase().includes(searchText.toLowerCase())
      )
    : accounts;

  const handleEdit = (item: BankFDAccountListItem) => {
    navigate(`/bank-fd-account/edit/${encryptId(item.accId)}`);
  };

  const handleDelete = async (item: BankFDAccountListItem) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Account?",
      html: `Are you sure you want to delete <strong>${item.accountName}</strong> (${item.accNo})?<br/>This will remove all FD details.`,
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await bankFDAccountApi.remove(user.branchid, item.accId);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Deleted!", timer: 1200, showConfirmButton: false });
        await loadAccounts();
      } else {
        throw new Error(res.message || "Delete failed.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-teal-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Landmark className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Bank FD Accounts
                    </h1>
                    <p className="text-gray-600 text-sm">Manage Bank Fixed Deposit accounts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/account-operations")}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Operations
                  </button>
                  <button
                    onClick={() => navigate("/bank-fd-account/create")}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg font-semibold text-sm shadow transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Account
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search by account name or account number…"
                className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white"
                maxLength={100}
              />
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {accounts.length === 0 ? (
                    <>
                      <p className="text-base font-medium">No Bank FD accounts found.</p>
                      <p className="text-sm mt-1">Click "New Account" to create the first one.</p>
                    </>
                  ) : (
                    <p className="text-base font-medium">No accounts match your search.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-teal-50 border-b border-teal-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-teal-800 w-12">S.No</th>
                        <th className="text-left px-4 py-3 font-semibold text-teal-800">Account No</th>
                        <th className="text-left px-4 py-3 font-semibold text-teal-800">Account Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-teal-800">Opening Date</th>
                        <th className="text-center px-4 py-3 font-semibold text-teal-800">FD Count</th>
                        <th className="text-right px-4 py-3 font-semibold text-teal-800">Total FD Amount</th>
                        <th className="text-center px-4 py-3 font-semibold text-teal-800 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item, idx) => (
                        <tr
                          key={item.accId}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-teal-700">{item.accNo}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{item.accountName}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {item.openingDate ? commonservice.splitDate(item.openingDate) : "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-semibold text-xs">
                              {item.detailCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-800 font-medium">
                            {item.totalFDAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
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
                    <tfoot>
                      <tr className="bg-teal-50 border-t-2 border-teal-200 font-semibold text-sm">
                        <td className="px-4 py-2.5 text-teal-800" colSpan={4}>
                          Total ({filtered.length} account{filtered.length !== 1 ? "s" : ""})
                        </td>
                        <td className="px-4 py-2.5 text-center text-teal-900">
                          {filtered.reduce((s, a) => s + a.detailCount, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-teal-900">
                          {filtered.reduce((s, a) => s + a.totalFDAmount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
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

export default BankFDAccountTable;
