import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const LoanSlabModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Loan Interest Slab Management"
      addPath="/loan-interest-slab"
      modifyPath="/loan-slab-info"
    />
  );
};

export default LoanSlabModule;
