import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const ServiceOperations: React.FC = () => (
  <CRUDDashboard
    title="Service"
    addPath="/service"
    modifyPath="/service-info"
  />
);

export default ServiceOperations;
