import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedRDIntDTO } from "../../../services/interestslab/rdinterestslab";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

// ── Props ────────────────────────────────────────────────────────────────────

interface InterestSlabTableProps {
  slabs: CombinedRDIntDTO[];
  handleModify: (slab: CombinedRDIntDTO) => void;
  handleDelete: (slab: CombinedRDIntDTO) => void;
}

// ── Flattened row type ───────────────────────────────────────────────────────

type FlatInterestSlab = {
  id: number;
  rdProductId: number;
  slabName: string;
  description: string;         // NEW
  applicableDate: string;
  slabCount: number;
  minAmount: number;
  maxAmount: number;
  minRate: number;
  maxRate: number;
  kistIntervals: string;       // NEW – comma-joined unique intervals
  minPeriod: number;           // NEW
  maxPeriod: number;           // NEW
  _original: CombinedRDIntDTO;
};

// ── Component ────────────────────────────────────────────────────────────────

const InterestSlabTable: React.FC<InterestSlabTableProps> = ({
  slabs,
  handleModify,
  handleDelete,
}) => {

  // ── Flatten DTOs ───────────────────────────────────────────────────────────
  const flatSlabs: FlatInterestSlab[] = slabs.map((dto) => {
    const details = dto.rdInterestSlabDetails || [];

    const rates      = details.map((s) => s.interestRate  || 0);
    const toAmounts  = details.map((s) => s.toAmount      || 0);
    const periods    = details.flatMap((s) => [s.periodFrom || 0, s.periodTo || 0]);

    // Unique kist intervals joined for display
    const uniqueIntervals = [...new Set(details.map((s) => s.kistInterval).filter(Boolean))];

    return {
      id:             dto.rdInterestSlab?.id            || 0,
      rdProductId:    dto.rdInterestSlab?.rdProductId   || 0,
      slabName:       dto.rdInterestSlab?.slabName      || "",
      description:    dto.rdInterestSlab?.description   || "",
      applicableDate: dto.rdInterestSlab?.applicableDate || "",
      slabCount:      details.length,
      minAmount:      details[0]?.fromAmount             || 0,
      maxAmount:      toAmounts.length > 0 ? Math.max(...toAmounts) : 0,
      minRate:        rates.length > 0    ? Math.min(...rates)     : 0,
      maxRate:        rates.length > 0    ? Math.max(...rates)     : 0,
      kistIntervals:  uniqueIntervals.join(", ") || "—",
      minPeriod:      periods.length > 0  ? Math.min(...periods)   : 0,
      maxPeriod:      periods.length > 0  ? Math.max(...periods)   : 0,
      _original:      dto,
    };
  });

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: Column<FlatInterestSlab>[] = [
    {
      key: "slabName",
      header: "Slab Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.slabName}</span>
          {row.description && (
            <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={row.description}>
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "applicableDate",
      header: "Applicable Date",
      render: (row) => (
        <span className="text-sm text-gray-700">
          {new Date(row.applicableDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
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
          <span className="text-xs text-gray-600">
            From: ₹{row.minAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-gray-600">
            To: ₹{row.maxAmount.toLocaleString("en-IN")}
          </span>
        </div>
      ),
    },
    {
      key: "kistIntervals",       // NEW
      header: "Kist Interval",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.kistIntervals.split(", ").map((interval) => (
            <span
              key={interval}
              className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
            >
              {interval}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "minPeriod",           // NEW
      header: "Period Range",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">
            From: {row.minPeriod} mo
          </span>
          <span className="text-xs text-gray-600">
            To: {row.maxPeriod} mo
          </span>
        </div>
      ),
    },
    {
      key: "minRate",
      header: "Interest Rate Range",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-sm text-green-600 font-medium">
            Min: {row.minRate.toFixed(2)}%
          </span>
          <span className="text-sm text-green-600 font-medium">
            Max: {row.maxRate.toFixed(2)}%
          </span>
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
            aria-label="Modify Interest Slab"
            title="Modify Interest Slab"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Interest Slab"
            title="Delete Interest Slab"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <GenericTable
      data={flatSlabs}
      columns={columns}
      getKey={(row) => row.id}
    />
  );
};

export default InterestSlabTable;
