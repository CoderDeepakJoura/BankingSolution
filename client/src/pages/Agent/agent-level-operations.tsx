import React from "react";
import CRUDDashboard from "../../components/Location/CRUDDashboard";

export default function AgentLevelOperations() {
  return (
    <CRUDDashboard
      title="Agent Level Master"
      addPath="/agent-level-data"
      modifyPath="/agent-level-data"
    />
  );
}
