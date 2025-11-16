import CRUDDashboard from '../../components/Location/CRUDDashboard';

const BranchMasterModule = () => {
  return (
    <CRUDDashboard
      title="Branch Master"
      addPath="/branchmaster"
      modifyPath="/branchmaster-info"

    />
  );
};

export default BranchMasterModule;
