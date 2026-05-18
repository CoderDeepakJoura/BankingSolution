import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

export interface LoanAccListItemDTO {
  accId: number;
  accountNumber: string;
  accountName: string;
  relativeName?: string;
  accOpeningDate: string;
  isAccClosed: boolean;
  productName?: string;
  loanAmountPassed?: number;
  kistAmount?: number;
  loanPeriod?: number;
  standardInterestRate?: number;
  loanType?: string;
}

interface LoanAccountTableProps {
  accounts: LoanAccListItemDTO[];
  handleModify: (account: LoanAccListItemDTO) => void;
  handleDelete: (account: LoanAccListItemDTO) => void;
}

const LoanAccountTable: React.FC<LoanAccountTableProps> = ({
  accounts,
  handleModify,
  handleDelete,
}) => {
  const columns: Column<LoanAccListItemDTO>[] = [
    {
      key: "accountNumber",
      header: "Account No.",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold text-blue-600">
            {row.accountNumber}
          </span>
          <span className="text-xs text-gray-500">
            {row.accOpeningDate
              ? new Date(row.accOpeningDate).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "accountName",
      header: "Account Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.accountName}</span>
          {row.relativeName && (
            <span className="text-xs text-gray-500 italic">{row.relativeName}</span>
          )}
        </div>
      ),
    },
    {
      key: "productName",
      header: "Product",
      render: (row) => (
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
          {row.productName || "-"}
        </span>
      ),
    },
    {
      key: "loanAmountPassed",
      header: "Loan Amount",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-gray-900">
            ₹{" "}
            {row.loanAmountPassed?.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </span>
          {row.kistAmount != null && (
            <span className="text-xs text-gray-500">
              EMI: ₹{row.kistAmount.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "standardInterestRate",
      header: "Rate / Period",
      render: (row) => (
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-indigo-700">
            {row.standardInterestRate != null ? `${row.standardInterestRate}%` : "-"}
          </span>
          <span className="text-xs text-gray-500">
            {row.loanPeriod != null ? `${row.loanPeriod} Months` : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "loanType",
      header: "Type",
      render: (row) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {row.loanType || "-"}
        </span>
      ),
    },
    {
      key: "isAccClosed",
      header: "Status",
      render: (row) => (
        <div className="flex justify-center">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              !row.isAccClosed
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !row.isAccClosed ? "bg-green-600" : "bg-red-600"
              }`}
            />
            {!row.isAccClosed ? "Active" : "Closed"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(row)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition duration-200 transform hover:scale-110"
            aria-label="Edit Loan Account"
            title="Edit Loan Account"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110"
            aria-label="Delete Loan Account"
            title="Delete Loan Account"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <GenericTable
      data={accounts}
      columns={columns}
      getKey={(row) => row.accId}
    />
  );
};

export default LoanAccountTable;
