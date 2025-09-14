// src/pages/ZoneModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const RelationModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Relation"
      addPath="/relation"
      modifyPath="/relation-info"
    />
  );
};

export default RelationModule;
