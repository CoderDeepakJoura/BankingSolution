import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { encryptId } from "../../../utils/encryption";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import NPAPlanCategoryTable from "./npaplancategory-table";
import npaplancategoryApi, { NPAPlanCategoryDTO } from "../../../services/npa/npaplancategoryapi";

const NPAPlanCategoryCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchData = useCallback(async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
    try {
      const res = await npaplancategoryApi.getAll(user.branchid, { ...filter, searchTerm: filter.searchTerm || "" });
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

  const handleEdit = (item: NPAPlanCategoryDTO) => {
    if (item.id) navigate(`/npaplancategory/${encryptId(item.id)}`);
  };

  const handleDelete = async (item: NPAPlanCategoryDTO) => {
    const result = await Swal.fire({
      title: "Delete NPA Plan Category?",
      text: `Are you sure you want to delete "${item.description}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const res = await npaplancategoryApi.remove(item.id!, user.branchid);
        if (res.success || (res as any).success) {
          await Swal.fire({ icon: "success", title: "Deleted!", text: `Category "${item.description}" deleted.`, timer: 1500, showConfirmButton: false });
          window.location.reload();
        } else throw new Error((res as any).message || "Delete failed.");
      } catch (err: any) {
        await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      }
    }
  };

  return (
    <CRUDMaster<NPAPlanCategoryDTO>
      fetchData={fetchData}
      addEntry={() => navigate("/npaplancategory")}
      modifyEntry={handleEdit}
      deleteEntry={handleDelete}
      pageTitle="NPA Plan Category Operations"
      addLabel="Add NPA Plan Category"
      onClose={() => navigate("/npaplancategory-operations")}
      searchPlaceholder="Search by description..."
      renderTable={(items, onModify, onDelete) => (
        <NPAPlanCategoryTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id || 0}
    />
  );
};

export default NPAPlanCategoryCRUD;
