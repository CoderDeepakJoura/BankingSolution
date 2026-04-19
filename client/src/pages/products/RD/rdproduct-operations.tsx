import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const FDProductModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="RD Product Master"
      addPath="/rd-product"
      modifyPath="/rdproduct-info"
    />
  );
};

export default FDProductModule;
