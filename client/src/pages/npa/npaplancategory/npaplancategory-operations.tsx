import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const NPAPlanCategoryOperations: React.FC = () => (
  <CRUDDashboard
    title="NPA Plan Category"
    addPath="/npaplancategory"
    modifyPath="/npaplancategory-info"
  />
);

export default NPAPlanCategoryOperations;
