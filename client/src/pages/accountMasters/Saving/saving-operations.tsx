import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const SavingAccModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Saving Account Master"
      addPath="/savingacc-master"
      modifyPath="/savingacc-master-info"
    />
  );
};

export default SavingAccModule;
