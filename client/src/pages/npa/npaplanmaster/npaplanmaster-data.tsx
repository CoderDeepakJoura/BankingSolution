import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { encryptId } from "../../../utils/encryption";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import NPAPlanMasterTable from "./npaplanmaster-table";
import npaplanmasterApi, { NPAPlanMasterDTO } from "../../../services/npa/npaplanmasterapi";

const NPAPlanMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchData = useCallback(async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
    try {
      const res = await npaplanmasterApi.getAll(user.branchid, { ...filter, searchTerm: filter.searchTerm || "" });
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

  const handleEdit = (item: NPAPlanMasterDTO) => {
    if (item.id) navigate(`/npaplanmaster/${encryptId(item.id)}`);
  };

  const handleDelete = async (item: NPAPlanMasterDTO) => {
    const result = await Swal.fire({
      title: "Delete NPA Plan?",
      text: `Are you sure you want to delete plan "${item.code}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const res = await npaplanmasterApi.remove(item.id!, user.branchid);
        if (res.success || (res as any).success) {
          await Swal.fire({ icon: "success", title: "Deleted!", text: `NPA Plan "${item.code}" deleted.`, timer: 1500, showConfirmButton: false });
          window.location.reload();
        } else throw new Error((res as any).message || "Delete failed.");
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      }
    }
  };

  return (
    <CRUDMaster<NPAPlanMasterDTO>
      fetchData={fetchData}
      addEntry={() => navigate("/npaplanmaster")}
      modifyEntry={handleEdit}
      deleteEntry={handleDelete}
      pageTitle="NPA Plan Master Operations"
      addLabel="Add NPA Plan"
      onClose={() => navigate("/npaplanmaster-operations")}
      searchPlaceholder="Search by code or description..."
      renderTable={(items, onModify, onDelete) => (
        <NPAPlanMasterTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id || 0}
    />
  );
};

export default NPAPlanMasterCRUD;
