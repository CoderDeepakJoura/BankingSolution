// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Occupation"
      addPath="/occupation"
      modifyPath="/occupation-info"
    />
  );
};

export default PostOfficeModule;
