import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { encryptId } from "../../../utils/encryption";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import ServiceTable from "./service-table";
import serviceApi, { ServiceDTO } from "../../../services/services/serviceapi";

const ServiceData: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchData = useCallback(async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
    try {
      const res = await serviceApi.getAll(user.branchid, { ...filter });
      return { success: res.success ?? false, data: (res as any).items ?? [], totalCount: (res as any).totalCount ?? 0, message: res.message ?? "" };
    } catch (e: any) {
      return { success: false, data: [], totalCount: 0, message: e.message };
    }
  }, [user.branchid]);

  const handleEdit = (item: ServiceDTO) => {
    if (item.id) navigate(`/service/${encryptId(item.id)}`);
  };

  const handleDelete = async (item: ServiceDTO) => {
    const result = await Swal.fire({ title: "Delete Service?", text: `Delete "${item.name}"? This cannot be undone.`, icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete it!" });
    if (result.isConfirmed) {
      try {
        const res = await serviceApi.remove(item.id!, user.branchid);
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
    <CRUDMaster<ServiceDTO>
      fetchData={fetchData}
      addEntry={() => navigate("/service")}
      modifyEntry={handleEdit}
      deleteEntry={handleDelete}
      pageTitle="Service"
      addLabel="Add Service"
      onClose={() => navigate("/service-operations")}
      searchPlaceholder="Search by name..."
      renderTable={(items, onModify, onDelete) => <ServiceTable items={items} onEdit={onModify} onDelete={onDelete} />}
      getKey={(item) => item.id || 0}
    />
  );
};

export default ServiceData;
