import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { FaEdit, FaTrash } from "react-icons/fa";
import CRUDMaster from "../../components/Location/CRUDOperations";
import GenericTable, { Column } from "../../components/Location/GenericTable";
import fdTdsSlabApi, { FDTDSSlabListItem } from "../../services/bankfd/fdTdsSlabApi";
import { encryptId } from "../../utils/encryption";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return dateStr; }
};

const FDTDSSlabList: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const fetchSlabs = useCallback(
    async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
      try {
        const res = await fdTdsSlabApi.getAll(user.branchid);
        const all: FDTDSSlabListItem[] = (res as any)?.data ?? [];
        const q = filter.searchTerm.toLowerCase();
        const filtered = q ? all.filter(s => s.name.toLowerCase().includes(q)) : all;
        const start = (filter.pageNumber - 1) * filter.pageSize;
        return {
          success: true,
          data: filtered.slice(start, start + filter.pageSize),
          totalCount: filtered.length,
          message: "",
        };
      } catch (err: any) {
        return { success: false, data: [], totalCount: 0, message: err.message };
      }
    },
    [user.branchid]
  );

  const handleModify = async (item: FDTDSSlabListItem) => {
    navigate(`/fd-tds-slab/edit/${encryptId(item.id)}`);
  };

  const handleDelete = async (item: FDTDSSlabListItem) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Slab?",
      html: `<p>Delete <strong>${item.name}</strong>?</p><p class="text-sm text-gray-500 mt-1">All detail rows for this slab will also be removed.</p>`,
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;
    const res = await fdTdsSlabApi.remove(user.branchid, item.id);
    if (res.success) {
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1200, showConfirmButton: false });
    } else {
      throw new Error(res.message || "Delete failed.");
    }
  };

  return (
    <CRUDMaster<FDTDSSlabListItem>
      fetchData={fetchSlabs}
      addEntry={() => { navigate("/fd-tds-slab/create"); return Promise.resolve(); }}
      modifyEntry={handleModify}
      deleteEntry={handleDelete}
      pageTitle="FD TDS Slab"
      addLabel="Add Slab"
      onClose={() => navigate("/fd-tds-slab")}
      searchPlaceholder="Search by slab name..."
      renderTable={(slabs, onModify, onDelete) => {
        const columns: Column<FDTDSSlabListItem>[] = [
          {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
          },
          {
            key: "date",
            header: "Date",
            render: (row) => <span className="text-gray-700">{formatDate(row.date)}</span>,
          },
          {
            key: "type",
            header: "Type",
            render: (row) => (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {row.type}
              </span>
            ),
          },
          {
            key: "withPanCard",
            header: "With PAN Card",
            render: (row) =>
              row.withPanCard === 1 ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Yes</span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">No</span>
              ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => onModify(row)}
                  className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
                  title="Edit"
                >
                  <FaEdit size={16} />
                </button>
                <button
                  onClick={() => onDelete(row)}
                  className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
                  title="Delete"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ),
          },
        ];
        return <GenericTable data={slabs} columns={columns} getKey={(r) => r.id} />;
      }}
      getKey={(item) => item.id}
    />
  );
};

export default FDTDSSlabList;
