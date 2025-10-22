import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const FDProductModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="FD Product Master"
      addPath="/fd-product"
      modifyPath="/fdproduct-info"
    />
  );
};

export default FDProductModule;
