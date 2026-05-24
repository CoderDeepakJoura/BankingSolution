import React from "react";
import CRUDDashboard from "../../../components/Location/CRUDDashboard";

const ExpenseCategoryOperations: React.FC = () => (
  <CRUDDashboard
    title="Loan Expense Category"
    addPath="/expense-category"
    modifyPath="/expense-category-info"
  />
);

export default ExpenseCategoryOperations;
