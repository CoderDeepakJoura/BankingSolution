// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Village"
      addPath="/village"
      modifyPath="/village-info"
    />
  );
};

export default PostOfficeModule;
