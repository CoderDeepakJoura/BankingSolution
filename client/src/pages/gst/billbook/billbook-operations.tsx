import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const BillBookOperations: React.FC = () => (
  <CRUDDashboard
    title="Bill Book"
    addPath="/billbook"
    modifyPath="/billbook-info"
  />
);

export default BillBookOperations;
