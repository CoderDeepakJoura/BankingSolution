// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const TehsilModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Tehsil"
      addPath="/tehsil"
      modifyPath="/tehsil-info"
    />
  );
};

export default TehsilModule;
