// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Post Office"
      addPath="/postOffice"
      modifyPath="/postOffice-info"
    />
  );
};

export default PostOfficeModule;
