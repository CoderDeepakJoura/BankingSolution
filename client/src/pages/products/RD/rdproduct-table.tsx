// rdproduct-table.tsx
import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedRDProductDTO } from "../../../services/productmasters/RD/rdproductapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";
import { documentPlanOptions } from "./rdproduct-master";

// ─── Flat row type ────────────────────────────────────────────────────────────
type FlatRDProduct = {
  id:                   number;
  branchId:             number;
  productName:          string;
  productNameInSL:      string;
  productCode:          string;
  effectiveFrom:        string;

  documentPlan:         number;
  documentPlanText:     string;
  periodLimitMin:       number;
  periodLimitMax:       number;

  principalBalHeadCode: number;
  intPayableHeadCode:   number;

  interestRuleCount:    number;
  minInterestRate:      number;
  maxInterestRate:      number;

  _original: CombinedRDProductDTO;
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface RdProductTableProps {
  rdProducts:   CombinedRDProductDTO[];
  handleModify: (dto: CombinedRDProductDTO) => void;
  handleDelete: (dto: CombinedRDProductDTO) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const RdProductTable: React.FC<RdProductTableProps> = ({
  rdProducts,
  handleModify,
  handleDelete,
}) => {

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  };

  const getDocPlanText = (value: number): string =>
    documentPlanOptions.find((o) => o.value === Number(value))?.label || "—";

  // ── Flatten ──────────────────────────────────────────────────────────────────
  const flatProducts: FlatRDProduct[] = rdProducts.map((dto) => {
    const product      = dto.rdProductDTO;
    const rules        = dto.rdProductRulesDTO;
    const posting      = dto.rdProductPostingHeadsDTO;
    const interestRows = dto.rdProductInterestRulesDetails || [];

    const rates = interestRows.map((r) => r.interestRateFrom || 0);

    return {
      id:                   product?.id                              || 0,
      branchId:             product?.branchId                       || 0,
      productName:          product?.productName                    || "",
      productNameInSL:      product?.productNameInSL                || "",
      productCode:          product?.productCode                    || "",
      effectiveFrom:        product?.effectiveFrom                  || "",

      documentPlan:         rules?.documentPlan                     ?? 0,
      documentPlanText:     getDocPlanText(rules?.documentPlan      ?? 0),
      periodLimitMin:       rules?.periodLimitMin                   ?? 0,
      periodLimitMax:       rules?.periodLimitMax                   ?? 0,

      principalBalHeadCode: Number(posting?.principalBalHeadCode)   || 0,
      intPayableHeadCode:   Number(posting?.intPayableHeadCode)     || 0,

      interestRuleCount:    interestRows.length,
      minInterestRate:      rates.length > 0 ? Math.min(...rates)  : 0,
      maxInterestRate:      rates.length > 0 ? Math.max(...rates)  : 0,

      _original: dto,
    };
  });

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<FlatRDProduct>[] = [

    // 1. Product Info
    {
      key: "productName",
      header: "Product",
      render: (row) => (
        <div className="text-center py-2">
          <div className="font-semibold text-gray-900 text-sm mb-1">
            {row.productName}
          </div>
          <div className="font-mono text-xs text-blue-600 font-medium mb-1">
            {row.productCode}
          </div>
          {row.productNameInSL && (
            <div
              className="text-xs text-gray-500 truncate max-w-[160px] mx-auto"
              title={row.productNameInSL}
            >
              {row.productNameInSL}
            </div>
          )}
        </div>
      ),
    },

    // 2. Effective From
    {
      key: "effectiveFrom",
      header: "Effective From",
      render: (row) => (
        <div className="text-center py-2">
          <div className="text-xs text-gray-500 mb-0.5">From</div>
          <div className="font-medium text-sm text-gray-900">
            {formatDate(row.effectiveFrom)}
          </div>
        </div>
      ),
    },

    // 3. Document Plan + Period
    {
      key: "documentPlan",
      header: "Rules",
      render: (row) => (
        <div className="text-center py-2">
          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium mb-2">
            {row.documentPlanText}
          </span>
          <div className="text-xs text-gray-600 mt-1">
            <div>Period: <span className="font-medium text-gray-800">{row.periodLimitMin} – {row.periodLimitMax} mo</span></div>
          </div>
        </div>
      ),
    },

    // 4. Interest
    {
      key: "minInterestRate",
      header: "Interest",
      render: (row) => (
        <div className="text-center py-2">
          {row.interestRuleCount > 0 ? (
            <>
              <div className="text-lg font-bold text-green-600 mb-1">
                {row.minInterestRate.toFixed(2)}% – {row.maxInterestRate.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                  {row.interestRuleCount} rule{row.interestRuleCount > 1 ? "s" : ""}
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">No rules set</span>
          )}
        </div>
      ),
    },

    // 5. Posting Heads
    {
      key: "principalBalHeadCode",
      header: "Posting Heads",
      render: (row) => (
        <div className="text-center py-2 space-y-1">
          <div className="text-xs text-gray-600">
            Principal:{" "}
            <span className="font-mono font-medium text-gray-800">
              {row.principalBalHeadCode || "—"}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Int. Payable:{" "}
            <span className="font-mono font-medium text-gray-800">
              {row.intPayableHeadCode || "—"}
            </span>
          </div>
        </div>
      ),
    },

    // 6. Actions
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            aria-label="Modify"
            title="Modify RD Product"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Delete"
            title="Delete RD Product"
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

export default RdProductTable;
