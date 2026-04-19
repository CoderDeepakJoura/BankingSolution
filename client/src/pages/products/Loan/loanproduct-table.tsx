import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedLoanProductDTO } from "../../../services/productmasters/Loan/loanproductapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface LoanProductTableProps {
  loanProducts: CombinedLoanProductDTO[];
  handleModify: (product: CombinedLoanProductDTO) => void;
  handleDelete: (product: CombinedLoanProductDTO) => void;
}

type FlatLoanProduct = {
  id: number;
  branchId: number;
  productName: string;
  code: string;
  effectiveFrom: string;
  loanTypeText: string;
  minLoanAmount: number;
  maxLoanAmount: number;
  disbursmentMode: string;
  maxNoofDisbursments: number;
  principalBalHeadCode: number;
  _original: CombinedLoanProductDTO;
};

const LOAN_TYPE_MAP: Record<number, string> = {
  1: "Installments",
  2: "Overdraft",
  3: "Demand Loan",
  4: "Limit Wise",
};

const LoanProductTable: React.FC<LoanProductTableProps> = ({
  loanProducts,
  handleModify,
  handleDelete,
}) => {
  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number): string => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const flatProducts: FlatLoanProduct[] = loanProducts.map((dto) => {
    const product = dto.loanProductDTO;
    const definition = dto.loanProductDefinitionDTO;
    const advancement = dto.loanProductAdvancementDTO;
    const posting = dto.loanProductPostingDTO;

    return {
      id: product?.id || 0,
      branchId: product?.branchId || 0,
      productName: product?.productName || "",
      code: product?.code || "",
      effectiveFrom: product?.effectiveFrom || "",
      loanTypeText: LOAN_TYPE_MAP[definition?.typeId || 0] || "—",
      minLoanAmount: advancement?.minLoanAmount || 0,
      maxLoanAmount: advancement?.maxLoanAmount || 0,
      disbursmentMode: advancement?.disbursmentMode || "",
      maxNoofDisbursments: advancement?.maxNoofDisbursments || 0,
      principalBalHeadCode: posting?.principalBalHeadCode || 0,
      _original: dto,
    };
  });

  const columns: Column<FlatLoanProduct>[] = [
    {
      key: "productName",
      header: "Product",
      render: (row) => (
        <div className="text-center py-2">
          <div className="font-semibold text-gray-900 text-sm mb-1">{row.productName}</div>
          <div className="font-mono text-xs text-blue-600 font-medium">{row.code}</div>
        </div>
      ),
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      render: (row) => (
        <div className="text-center py-2">
          <div className="font-medium text-sm text-gray-900">{formatDate(row.effectiveFrom)}</div>
        </div>
      ),
    },
    {
      key: "loanTypeText",
      header: "Loan Type",
      render: (row) => (
        <div className="text-center py-2">
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
            {row.loanTypeText}
          </span>
        </div>
      ),
    },
    {
      key: "minLoanAmount",
      header: "Loan Amount",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs text-gray-500 mb-0.5">Min</div>
          <div className="font-medium text-sm text-gray-900 mb-1">{formatAmount(row.minLoanAmount)}</div>
          <div className="text-xs text-gray-500 mb-0.5">Max</div>
          <div className="font-medium text-sm text-green-700">{formatAmount(row.maxLoanAmount)}</div>
        </div>
      ),
    },
    {
      key: "disbursmentMode",
      header: "Disbursement",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs text-gray-700 mb-1">
            {row.disbursmentMode
              ? row.disbursmentMode.split(",").map((m, i) => (
                  <span
                    key={i}
                    className="inline-block px-1.5 py-0.5 mr-1 mb-1 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {m.trim()}
                  </span>
                ))
              : "—"}
          </div>
          {row.maxNoofDisbursments > 0 && (
            <div className="text-xs text-gray-500">Max: {row.maxNoofDisbursments}</div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            aria-label="Modify"
            title="Modify Product"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Delete"
            title="Delete Product"
          >
            <FaTrash size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      <GenericTable data={flatProducts} columns={columns} getKey={(row) => row.id} />
    </div>
  );
};

export default LoanProductTable;
