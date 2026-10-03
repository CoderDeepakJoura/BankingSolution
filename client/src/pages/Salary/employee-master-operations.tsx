import React from "react";
import CRUDDashboard from "../../components/Location/CRUDDashboard";

export default function EmployeeMasterOperations() {
  return (
    <CRUDDashboard
      title="Employee Master"
      addPath="/employee-master/add"
      modifyPath="/employee-master-data"
    />
  );
}
