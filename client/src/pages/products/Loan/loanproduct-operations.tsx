import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const LoanProductOperations: React.FC = () => {
  return (
    <CRUDDashboard
      title="Loan Product Master"
      addPath="/loan-product"
      modifyPath="/loanproduct-info"
    />
  );
};

export default LoanProductOperations;
