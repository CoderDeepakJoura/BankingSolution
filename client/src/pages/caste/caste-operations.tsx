// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Caste"
      addPath="/caste"
      modifyPath="/caste-info"
    />
  );
};

export default PostOfficeModule;
