import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const TaxGroupOperations: React.FC = () => (
  <CRUDDashboard
    title="GST Tax Group"
    addPath="/taxgroup"
    modifyPath="/taxgroup-info"
  />
);

export default TaxGroupOperations;
