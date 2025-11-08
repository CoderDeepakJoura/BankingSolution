import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedSavingIntDTO } from "../../../services/interestslab/interestslabservice";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface InterestSlabTableProps {
  slabs: CombinedSavingIntDTO[];
  handleModify: (slab: CombinedSavingIntDTO) => void;
  handleDelete: (slab: CombinedSavingIntDTO) => void;
}

// Flattened type so table can work directly with flat properties
type FlatInterestSlab = {
  id: number;
  savingProductId: number;
  productName?: string;
  applicableDate: string;
  slabCount: number;
  slabName: string;
  minRate: number;
  maxRate: number;
  minAmount: number;
  maxAmount: number;
  // keep full original object if you need it for actions
  _original: CombinedSavingIntDTO;
};

const InterestSlabTable: React.FC<InterestSlabTableProps> = ({
  slabs,
  handleModify,
  handleDelete,
}) => {
  // ✅ Flatten the DTOs before sending to GenericTable
  const flatSlabs: FlatInterestSlab[] = slabs.map((dto) => {
    const slabDetails = dto.savingInterestSlabDetails || [];
    
    // Calculate min/max rates and amounts
    const rates = slabDetails.map(s => s.interestRate || 0);
    const amounts = slabDetails.map(s => s.toAmount || 0);
    
    return {
      id: dto.savingInterestSlab?.id || 0,
      savingProductId: dto.savingInterestSlab?.savingProductId || 0,
      applicableDate: dto.savingInterestSlab?.applicableDate || "",
      slabCount: slabDetails.length,
      minRate: rates.length > 0 ? Math.min(...rates) : 0,
      maxRate: rates.length > 0 ? Math.max(...rates) : 0,
      minAmount: slabDetails[0]?.fromAmount || 0,
      maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      slabName: dto.savingInterestSlab?.slabName || "",
      _original: dto,
    };
  });

  // ✅ Columns now map to flat properties
  const columns: Column<FlatInterestSlab>[] = [
    {
      key: "slabName",
      header: "Slab Name",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.slabName}</span>
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
