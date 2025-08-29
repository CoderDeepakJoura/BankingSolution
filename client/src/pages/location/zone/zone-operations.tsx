// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const ZoneModule = () => {
  return (
    <CRUDDashboard
      title="Zone"
      addPath="/zone"
      modifyPath="/zoneinfo"

    />
  );
};

export default ZoneModule;
