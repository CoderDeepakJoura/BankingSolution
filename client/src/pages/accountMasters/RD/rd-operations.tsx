import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const RecurringDepositModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Recurring Deposit Master"
      addPath="/rd-acc-master"
      modifyPath="/rd-acc-info"
    />
  );
};

export default RecurringDepositModule;
