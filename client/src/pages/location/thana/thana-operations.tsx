// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const ThanaModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Thana"
      addPath="/thana"
      modifyPath="/thana-info"
    />
  );
};

export default ThanaModule;
