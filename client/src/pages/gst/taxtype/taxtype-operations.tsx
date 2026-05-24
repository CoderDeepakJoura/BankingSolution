import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const TaxTypeOperations: React.FC = () => (
  <CRUDDashboard
    title="GST Tax Type"
    addPath="/taxtype"
    modifyPath="/taxtype-info"
  />
);

export default TaxTypeOperations;
