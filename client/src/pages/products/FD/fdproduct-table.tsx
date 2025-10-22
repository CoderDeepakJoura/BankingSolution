// fdproduct-table.tsx
import React from "react";
import { FaEdit, FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { CombinedFDDTO } from "../../../services/productmasters/FD/fdproductapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface FdProductTableProps {
  fdProducts: CombinedFDDTO[];
  handleModify: (product: CombinedFDDTO) => void;
  handleDelete: (product: CombinedFDDTO) => void;
}

type FlatFdProduct = {
  id: number;
  branchId: number;
  productName: string;
  productCode: string;
  effectiveFrom: string;
  effectiveTill?: string;
  isSeparateFdAccountAllowed: boolean;
  isActive: boolean;
  
  intAccountType: number;
  intAccountTypeText: string;
  fdMaturityReminderInMonths?: number;
  fdMaturityReminderInDays?: number;
  
  interestRateMinValue: number;
  interestRateMaxValue: number;
  intPostingInterval: number;
  intPostingIntervalText: string;
  applicableDate: string;
  
  principalBalHeadCode: number;
  suspendedBalHeadCode: number;
  intPayableHeadCode: number;
  
  _original: CombinedFDDTO;
};

const FdProductTable: React.FC<FdProductTableProps> = ({
  fdProducts,
  handleModify,
  handleDelete,
}) => {
  const getIntAccountTypeText = (type: number): string => {
    switch (type) {
      case 1: return "Same Account";
      case 2: return "Other A/c";
      default: return "—";
    }
  };

  const getIntPostingIntervalText = (interval: number): string => {
    switch (interval) {
      case 1: return "Daily";
      case 2: return "Monthly";
      case 3: return "Quarterly";
      case 4: return "Half Yearly";
      case 5: return "Yearly";
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

  const flatProducts: FlatFdProduct[] = fdProducts.map((dto) => {
    const product = dto.fdProductDTO;
    const rules = dto.fdProductRulesDTO;
    const postingHeads = dto.fdProductPostingHeadsDTO;
    const interestRules = dto.fdProductInterestRulesDTO;

    return {
      id: product?.id || 0,
      branchId: product?.branchId || 0,
      productName: product?.productName || "",
      productCode: product?.productCode || "",
      effectiveFrom: product?.effectiveFrom || "",
      effectiveTill: product?.effectiveTill,
      isSeparateFdAccountAllowed: product?.isSeparateFdAccountAllowed || false,
      isActive: isProductActive(product?.effectiveTill),
      
      intAccountType: rules?.intAccountType || 0,
      intAccountTypeText: getIntAccountTypeText(rules?.intAccountType || 0),
      fdMaturityReminderInMonths: rules?.fdMaturityReminderInMonths,
      fdMaturityReminderInDays: rules?.fdMaturityReminderInDays,
      
      interestRateMinValue: interestRules?.interestRateMinValue || 0,
      interestRateMaxValue: interestRules?.interestRateMaxValue || 0,
      intPostingInterval: interestRules?.intPostingInterval || 0,
      intPostingIntervalText: getIntPostingIntervalText(interestRules?.intPostingInterval || 0),
      applicableDate: interestRules?.applicableDate || "",
      
      principalBalHeadCode: postingHeads?.principalBalHeadCode || 0,
      suspendedBalHeadCode: postingHeads?.suspendedBalHeadCode || 0,
      intPayableHeadCode: postingHeads?.intPayableHeadCode || 0,
      
      _original: dto,
    };
  });

  const columns: Column<FlatFdProduct>[] = [
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
            {row.isSeparateFdAccountAllowed && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                Sep A/c
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
      key: "interestRate",
      header: "Interest",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-lg font-bold text-green-600 mb-1">
            {row.interestRateMinValue}% - {row.interestRateMaxValue}%
          </div>
          <div className="text-xs text-gray-600 mb-1">
            {row.intPostingIntervalText}
          </div>
          {row.applicableDate && (
            <div className="text-xs text-gray-500">
              {formatDate(row.applicableDate)}
            </div>
          )}
        </div>
      ),
    },

    {
      key: "productRules",
      header: "Rules",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded inline-block mb-2">
            {row.intAccountTypeText}
          </div>
          {(row.fdMaturityReminderInMonths! > 0 || row.fdMaturityReminderInDays! > 0) && (
            <div className="text-xs text-gray-600">
              <div className="font-medium text-gray-700">Reminder:</div>
              {row.fdMaturityReminderInMonths! > 0 && (
                <div>{row.fdMaturityReminderInMonths}M</div>
              )}
              {row.fdMaturityReminderInDays! > 0 && (
                <div>{row.fdMaturityReminderInDays}D</div>
              )}
            </div>
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
      <GenericTable
        data={flatProducts}
        columns={columns}
        getKey={(row) => row.id}
      />
    </div>
  );
};

export default FdProductTable;
