import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const LoanAccountModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Loan Account Master"
      addPath="/loan-acc-master"
      modifyPath="/loan-acc-info"
    />
  );
};

export default LoanAccountModule;
