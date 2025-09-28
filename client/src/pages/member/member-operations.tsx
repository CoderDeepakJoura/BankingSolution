import React from 'react';
import CRUDDashboard from '../../components/Location/CRUDDashboard';

const PostOfficeModule: React.FC = () => {
  return (
    <CRUDDashboard
      title="Member Master"
      addPath="/member"
      modifyPath="/generalacc-master-info"
    />
  );
};

export default PostOfficeModule;
