import React from "react";
import CRUDDashboard from "../../components/Location/CRUDDashboard";

export default function AgentMasterOperations() {
  return (
    <CRUDDashboard
      title="Agent Master"
      addPath="/agent-master-data"
      modifyPath="/agent-master-data"
    />
  );
}
