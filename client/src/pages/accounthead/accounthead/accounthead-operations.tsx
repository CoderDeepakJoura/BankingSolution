// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Account Head"
      addPath="/accounthead"
      modifyPath="/accounthead-info"
    />
  );
};

export default PostOfficeModule;
