// src/pages/StateModule.tsx

import React from 'react';
import CRUDDashboard from '../../../components/Location/CRUDDashboard';

const StateModule = () => {
  return (
    <CRUDDashboard
      title="State"
      addPath="/state"
      modifyPath="/state-info"

    />
  );
};

export default StateModule;
