// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="General Account Master"
      addPath="/category"
      modifyPath="/generalacc-master-info"
    />
  );
};

export default PostOfficeModule;
