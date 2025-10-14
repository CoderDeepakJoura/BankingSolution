// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Patwar Circle"
      addPath="/patwar"
      modifyPath="/patwar-info"
    />
  );
};

export default PostOfficeModule;
