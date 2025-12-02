import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedFDIntInfoDTO } from "../../../services/interestslab/fdinterestslabservice";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface FDInterestSlabTableProps {
  slabs: CombinedFDIntInfoDTO[];
  handleModify: (slab: CombinedFDIntInfoDTO) => void;
  handleDelete: (slab: CombinedFDIntInfoDTO) => void;
}

// Simplified flattened type for FD Interest Slab
type FlatFDInterestSlab = {
  id: number;
  fdProductId: number;
  fdProductName?: string;
  applicableDate: string;
  slabCount: number;
  minRate: number;
  maxRate: number;
  minAge: number;
  maxAge: number;
  // keep full original object for actions
  _original: CombinedFDIntInfoDTO;
};

const FDInterestSlabTable: React.FC<FDInterestSlabTableProps> = ({
  slabs,
  handleModify,
  handleDelete,
}) => {
  // ✅ Flatten the FD DTOs - simplified structure
  const flatSlabs: FlatFDInterestSlab[] = slabs.map((dto) => {
    const slabDetails = dto.fdInterestSlabDetails || [];
    
    // Calculate min/max rates and ages
    const rates = slabDetails.map(s => s.interestRate || 0);
    const ageFromValues = slabDetails.map(s => s.ageFrom || 0);
    const ageToValues = slabDetails.map(s => s.ageTo || 0);
    return {
      id: dto.fdInterestSlabInfo?.id || 0,
      fdProductId: dto.fdInterestSlabInfo?.fdProductId || 0,
      fdProductName: dto.fdInterestSlabInfo?.productName || "N/A",
      applicableDate: dto.fdInterestSlabInfo?.applicableDate || "",
      slabCount: slabDetails.length,
      minRate: rates.length > 0 ? Math.min(...rates) : 0,
      maxRate: rates.length > 0 ? Math.max(...rates) : 0,
      minAge: ageFromValues.length > 0 ? Math.min(...ageFromValues) : 0,
      maxAge: ageToValues.length > 0 ? Math.max(...ageToValues) : 0,
      _original: dto,
    };
  });

  // ✅ Columns for simplified FD Interest Slab structure
  const columns: Column<FlatFDInterestSlab>[] = [
    {
      key: "fdProductName",
      header: "FD Product",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.fdProductName}</span>
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
      header: "No. of Age Slabs",
      render: (row) => (
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {row.slabCount}
          </span>
        </div>
      ),
    },
    {
      key: "minAge",
      header: "Age Range",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">
            From: {row.minAge} years
          </span>
          <span className="text-xs text-gray-600">
            To: {row.maxAge} years
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
            aria-label="Modify FD Interest Slab"
            title="Modify FD Interest Slab"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete FD Interest Slab"
            title="Delete FD Interest Slab"
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

export default FDInterestSlabTable;
