import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { encryptId } from "../../../utils/encryption";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import TaxTable from "./tax-table";
import taxApi, { TaxDTO } from "../../../services/gst/taxapi";

const TaxData: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchData = useCallback(async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
    try {
      const res = await taxApi.getAll(user.branchid, { ...filter });
      return {
        success: res.success ?? false,
        data: (res as any).items ?? [],
        totalCount: (res as any).totalCount ?? 0,
        message: res.message ?? "",
      };
    } catch (e: any) {
      return { success: false, data: [], totalCount: 0, message: e.message };
    }
  }, [user.branchid]);

  const handleEdit = (item: TaxDTO) => {
    if (item.id) navigate(`/tax/${encryptId(item.id)}`);
  };

  const handleDelete = async (item: TaxDTO) => {
    const result = await Swal.fire({
      title: "Delete Tax?",
      text: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const res = await taxApi.remove(item.id!, user.branchid);
        if (res.success) {
          await Swal.fire({ icon: "success", title: "Deleted!", text: `"${item.name}" deleted.`, timer: 1500, showConfirmButton: false });
          window.location.reload();
        } else throw new Error((res as any).message || "Delete failed.");
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      }
    }
  };

  return (
    <CRUDMaster<TaxDTO>
      fetchData={fetchData}
      addEntry={() => navigate("/tax")}
      modifyEntry={handleEdit}
      deleteEntry={handleDelete}
      pageTitle="GST Tax"
      addLabel="Add Tax"
      onClose={() => navigate("/tax-operations")}
      searchPlaceholder="Search by name or alias..."
      renderTable={(items, onModify, onDelete) => (
        <TaxTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id || 0}
    />
  );
};

export default TaxData;
