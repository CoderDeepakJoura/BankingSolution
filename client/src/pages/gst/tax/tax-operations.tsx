import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const TaxOperations: React.FC = () => (
  <CRUDDashboard
    title="GST Tax"
    addPath="/tax"
    modifyPath="/tax-info"
  />
);

export default TaxOperations;
