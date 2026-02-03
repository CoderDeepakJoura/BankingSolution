import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const FDAccModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="FD Account Master"
      addPath="/fd-account-master"
      modifyPath="/fd-account-master-info"
    />
  );
};

export default FDAccModule;
