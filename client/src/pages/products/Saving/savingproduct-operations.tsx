import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const SavingProducteModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Saving Product Master"
      addPath="/saving-product"
      modifyPath="/savingproduct-info"
    />
  );
};

export default SavingProducteModule;
