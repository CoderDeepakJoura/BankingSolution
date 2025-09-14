// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const AccountHeadTypeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Account Head Type"
      addPath="/accountheadtype"
      modifyPath="/accountheadtype-info"
    />
  );
};

export default AccountHeadTypeModule;
