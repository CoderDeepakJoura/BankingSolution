import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const SavingIntSlabModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="FD Slab Management"
      addPath="/fdproduct-interest-slab"
      modifyPath="/fd-slab-info"
    />
  );
};

export default SavingIntSlabModule;
