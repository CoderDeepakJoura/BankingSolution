import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const NPAPlanMasterOperations: React.FC = () => (
  <CRUDDashboard
    title="NPA Plan Master"
    addPath="/npaplanmaster"
    modifyPath="/npaplanmaster-info"
  />
);

export default NPAPlanMasterOperations;
