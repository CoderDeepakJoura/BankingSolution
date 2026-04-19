import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const RDIntSlabModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="RD Interest Slab Management"
      addPath="/rd-interest-slab"
      modifyPath="/rd-slab-info"
    />
  );
};

export default RDIntSlabModule;
