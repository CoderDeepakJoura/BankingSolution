import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const SavingIntSlabModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="FD Interest Slab Management"
      addPath="/fdproduct-interest-slab"
      modifyPath="/fd-interest-slab-info"
    />
  );
};

export default SavingIntSlabModule;
