import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedLoanSlabDTO } from "../../../services/interestslab/loanslabservice";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface LoanSlabTableProps {
  slabs: CombinedLoanSlabDTO[];
  handleModify: (slab: CombinedLoanSlabDTO) => void;
  handleDelete: (slab: CombinedLoanSlabDTO) => void;
}

type FlatLoanSlab = {
  id:          number;
  name:        string;
  productName: string;
  date:        string;
  slabCount:   number;
  minAmount:   number;
  maxAmount:   number;
  minStdRate:  number;
  maxStdRate:  number;
  _original:   CombinedLoanSlabDTO;
};

const LoanSlabTable: React.FC<LoanSlabTableProps> = ({ slabs, handleModify, handleDelete }) => {
  const flatSlabs: FlatLoanSlab[] = slabs.map((dto) => {
    const details   = dto.loanSlabDetails || [];
    const toAmounts = details.map((s) => s.toAmount || 0);
    const stdRates  = details.map((s) => s.stdIntRate || 0);

    return {
      id:          dto.loanSlab?.id          || 0,
      name:        dto.loanSlab?.name        || "",
      productName: dto.loanSlab?.productName || "",
      date:        dto.loanSlab?.date        || "",
      slabCount:   details.length,
      minAmount:   details[0]?.fromAmount    || 0,
      maxAmount:   toAmounts.length > 0 ? Math.max(...toAmounts) : 0,
      minStdRate:  stdRates.length  > 0 ? Math.min(...stdRates)  : 0,
      maxStdRate:  stdRates.length  > 0 ? Math.max(...stdRates)  : 0,
      _original:   dto,
    };
  });

  const columns: Column<FlatLoanSlab>[] = [
    {
      key: "name",
      header: "Slab Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.name}</span>
          {row.productName && (
            <span className="text-xs text-gray-500 mt-0.5">{row.productName}</span>
          )}
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-sm text-gray-700">
          {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "slabCount",
      header: "No. of Slabs",
      render: (row) => (
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {row.slabCount}
          </span>
        </div>
      ),
    },
    {
      key: "minAmount",
      header: "Amount Range",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">From: ₹{row.minAmount.toLocaleString("en-IN")}</span>
          <span className="text-xs text-gray-600">To: ₹{row.maxAmount.toLocaleString("en-IN")}</span>
        </div>
      ),
    },
    {
      key: "minStdRate",
      header: "Std. Interest Rate",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-sm text-green-600 font-medium">Min: {row.minStdRate.toFixed(2)}%</span>
          <span className="text-sm text-green-600 font-medium">Max: {row.maxStdRate.toFixed(2)}%</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            title="Modify Loan Slab">
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            title="Delete Loan Slab">
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return <GenericTable data={flatSlabs} columns={columns} getKey={(row) => row.id} />;
};

export default LoanSlabTable;
