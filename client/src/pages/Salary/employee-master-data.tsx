import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { RootState } from "../../redux";
import CRUDMaster from "../../components/Location/CRUDOperations";
import EmployeeMasterTable from "./employee-master-table";
import salaryApi, { EmployeeMaster } from "../../services/salary/salaryApi";
import { encryptId } from "../../utils/encryption";

const EmployeeMasterData: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.user);

  const fetchData = useCallback(
    async (filter: { searchTerm: string; pageNumber: number; pageSize: number }) => {
      try {
        const res = await salaryApi.getEmployees(user.branchid, filter);
        return {
          success: res.success ?? false,
          data: res.items ?? [],
          totalCount: res.totalCount ?? 0,
          message: "",
        };
      } catch (e: any) {
        return { success: false, data: [], totalCount: 0, message: e.message };
      }
    },
    [user.branchid]
  );

  const handleEdit = (item: EmployeeMaster) => {
    navigate(`/employee-master/edit/${encryptId(item.id ?? 0)}`);
  };

  const handleDelete = async (item: EmployeeMaster) => {
    const result = await Swal.fire({
      title: "Delete Employee?",
      text: `Delete "${item.firstName} ${item.lastName ?? ""}" (${item.code})? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await salaryApi.deleteEmployee(item.id, user.branchid);
      if (!res.success) throw new Error(res.message);
      await Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
      window.location.reload();
    } catch (err: any) {
      Swal.fire("Error", err.message || "Could not delete.", "error");
    }
  };

  return (
    <CRUDMaster<EmployeeMaster>
      fetchData={fetchData}
      addEntry={async () => navigate("/employee-master/add")}
      modifyEntry={async (item) => handleEdit(item)}
      deleteEntry={handleDelete}
      pageTitle="Employee Master"
      addLabel="Add Employee"
      onClose={() => navigate("/employee-master")}
      searchPlaceholder="Search by name or code..."
      renderTable={(items, onModify, onDelete) => (
        <EmployeeMasterTable items={items} onEdit={onModify} onDelete={onDelete} />
      )}
      getKey={(item) => item.id}
    />
  );
};

export default EmployeeMasterData;
