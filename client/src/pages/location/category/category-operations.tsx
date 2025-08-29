// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Category"
      addPath="/category"
      modifyPath="/category-info"
    />
  );
};

export default PostOfficeModule;
