import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const SavingIntSlabModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Saving Interest Slab Management"
      addPath="/savingproduct-interest-slab"
      modifyPath="/saving-slab-info"
    />
  );
};

export default SavingIntSlabModule;
