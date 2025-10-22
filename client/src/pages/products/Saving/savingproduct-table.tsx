// pages/productmasters/Savings/savingsproduct-table.tsx
import React from "react";
import { FaEdit, FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { CombinedSavingsDTO } from "../../../services/productmasters/Saving/savingproductapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface SavingsProductTableProps {
  savingsProducts: CombinedSavingsDTO[];
  handleModify: (product: CombinedSavingsDTO) => void;
  handleDelete: (product: CombinedSavingsDTO) => void;
}

type FlatSavingsProduct = {
  id: number;
  branchId: number;
  productName: string;
  productCode: string;
  effectiveFrom: string;
  effectiveTill?: string;
  isActive: boolean;
  
  acStatementFrequency: number;
  acStatementFrequencyText: string;
  acRetentionDays: number;
  minBalanceAmt: number;
  
  interestRateMinValue: number;
  interestRateMaxValue: number;
  rateAppliedMethod: number;
  rateAppliedMethodText: string;
  calculationMethod: number;
  calculationMethodText: string;
  
  principalBalHeadCode: number;
  suspendedBalHeadCode: number;
  intPayableHeadCode: number;
  
  _original: CombinedSavingsDTO;
};

const SavingsProductTable: React.FC<SavingsProductTableProps> = ({
  savingsProducts,
  handleModify,
  handleDelete,
}) => {
  const getStatementFrequencyText = (type: number): string => {
    switch (type) {
      case 1: return "Monthly";
      case 2: return "Quarterly";
      case 3: return "Half-Yearly";
      case 4: return "Yearly";
      case 5: return "On Demand";
      default: return "—";
    }
  };

  const getRateAppliedMethodText = (type: number): string => {
    switch (type) {
      case 1: return "Changed Rate";
      case 2: return "Fixed Rate";
      case 3: return "Slab Wise Rate";
      default: return "—";
    }
  };

  const getCalculationMethodText = (type: number): string => {
    switch (type) {
      case 1: return "Monthly Min Balance";
      case 2: return "Balance Method";
      default: return "—";
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isProductActive = (effectiveTill?: string): boolean => {
    if (!effectiveTill) return true;
    const tillDate = new Date(effectiveTill);
    const today = new Date();
    return tillDate >= today;
  };

  const flatProducts: FlatSavingsProduct[] = savingsProducts.map((dto) => {
    const product = dto.savingsProductDTO;
    const rules = dto.savingsProductRulesDTO;
    const postingHeads = dto.savingsProductPostingHeadsDTO;
    const interestRules = dto.savingsProductInterestRulesDTO;

    return {
      id: product?.id || 0,
      branchId: product?.branchId || 0,
      productName: product?.productName || "",
      productCode: product?.productCode || "",
      effectiveFrom: product?.effectiveFrom || "",
      effectiveTill: product?.effectiveTill,
      isActive: isProductActive(product?.effectiveTill),
      
      acStatementFrequency: rules?.acStatementFrequency || 0,
      acStatementFrequencyText: getStatementFrequencyText(rules?.acStatementFrequency || 0),
      acRetentionDays: rules?.acRetentionDays || 0,
      minBalanceAmt: rules?.minBalanceAmt || 0,
      
      interestRateMinValue: interestRules?.interestRateMinValue || 0,
      interestRateMaxValue: interestRules?.interestRateMaxValue || 0,
      rateAppliedMethod: interestRules?.rateAppliedMethod || 0,
      rateAppliedMethodText: getRateAppliedMethodText(interestRules?.rateAppliedMethod || 0),
      calculationMethod: interestRules?.calculationMethod || 0,
      calculationMethodText: getCalculationMethodText(interestRules?.calculationMethod || 0),
      
      principalBalHeadCode: postingHeads?.principalBalHeadCode || 0,
      suspendedBalHeadCode: postingHeads?.suspendedBalHeadCode || 0,
      intPayableHeadCode: postingHeads?.intPayableHeadCode || 0,
      
      _original: dto,
    };
  });

  const columns: Column<FlatSavingsProduct>[] = [
    {
      key: "productInfo",
      header: "Product",
      render: (row) => (
        <div className="text-center py-2">
          <div className="font-semibold text-gray-900 text-sm mb-1">
            {row.productName}
          </div>
          <div className="font-mono text-xs text-blue-600 font-medium">
            {row.productCode}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {row.isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                <FaCheckCircle className="w-2.5 h-2.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                <FaTimesCircle className="w-2.5 h-2.5" />
                Inactive
              </span>
            )}
          </div>
        </div>
      ),
    },

    {
      key: "effectivePeriod",
      header: "Effective Period",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs text-gray-500 mb-0.5">From</div>
          <div className="font-medium text-sm text-gray-900 mb-2">
            {formatDate(row.effectiveFrom)}
          </div>
          {row.effectiveTill && (
            <>
              <div className="text-xs text-gray-500 mb-0.5">Till</div>
              <div className="font-medium text-sm text-gray-900">
                {formatDate(row.effectiveTill)}
              </div>
            </>
          )}
        </div>
      ),
    },

    {
      key: "accountRules",
      header: "Account Rules",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded inline-block mb-2">
            {row.acStatementFrequencyText}
          </div>
          <div className="text-xs text-gray-600">
            <div><span className="font-medium">Min Balance:</span> ₹{row.minBalanceAmt}</div>
            <div><span className="font-medium">Retention:</span> {row.acRetentionDays} days</div>
          </div>
        </div>
      ),
    },

    {
      key: "interestConfig",
      header: "Interest",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-lg font-bold text-green-600 mb-1">
            {row.interestRateMinValue}% - {row.interestRateMaxValue}%
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <div className="font-medium text-blue-700">{row.rateAppliedMethodText}</div>
            <div className="text-gray-500">{row.calculationMethodText}</div>
          </div>
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
      <GenericTable
        data={flatProducts}
        columns={columns}
        getKey={(row) => row.id}
      />
    </div>
  );
};

export default SavingsProductTable;
