import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CombinedFDIntDTO } from "../../../services/interestslab/fdinterestslabservice";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface FDInterestSlabTableProps {
  slabs: CombinedFDIntDTO[];
  handleModify: (slab: CombinedFDIntDTO) => void;
  handleDelete: (slab: CombinedFDIntDTO) => void;
}

// Simplified flattened type - Only Basic Information
type FlatFDInterestSlab = {
  id: number;
  fdProductId: number;
  fdProductName?: string;
  slabName: string;
  applicableDate: string;
  fromDays: number;
  toDays: number;
  compoundingInterval: number;
  // keep full original object for actions
  _original: CombinedFDIntDTO;
};

const FDInterestSlabTable: React.FC<FDInterestSlabTableProps> = ({
  slabs,
  handleModify,
  handleDelete,
}) => {
  // Helper function to get compounding interval label
  const getCompoundingLabel = (interval: number): string => {
    switch (interval) {
      case 1: return "no Compounding";
      case 2: return "Daily";
      case 3: return "Monthly";
      case 4: return "Quarterly";
      case 5: return "Half-Yearly";
      case 6: return "Yearly";
      case 7: return "Two-Yearly";
      default: return `${interval} months`;
    }
  };

  // ✅ Flatten the FD DTOs - Only Basic Information
  const flatSlabs: FlatFDInterestSlab[] = slabs.map((dto) => {
    return {
      id: dto.fdInterestSlab?.id || 0,
      fdProductId: dto.fdInterestSlab?.fdProductId || 0,
      fdProductName: dto.fdInterestSlab?.productName || "N/A",
      slabName: dto.fdInterestSlab?.slabName || "",
      applicableDate: dto.fdInterestSlab?.applicableDate || "",
      fromDays: dto.fdInterestSlab?.fromDays || 0,
      toDays: dto.fdInterestSlab?.toDays || 0,
      compoundingInterval: dto.fdInterestSlab?.compoundingInterval || 0,
      _original: dto,
    };
  });

  // ✅ Simplified columns - Only Basic Information
  const columns: Column<FlatFDInterestSlab>[] = [
    {
      key: "fdProductName",
      header: "FD Product",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.fdProductName}</span>
      ),
    },
    {
      key: "slabName",
      header: "Slab Name",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          {row.slabName}
        </span>
      ),
    },
   {
      key: "fromDays",
      header: "Tenure Range (Days)",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-600">
            From: {row.fromDays} days
          </span>
          <span className="text-xs text-gray-600">
            To: {row.toDays} days
          </span>
        </div>
      ),
    },
    {
      key: "compoundingInterval",
      header: "Compounding",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
          {getCompoundingLabel(row.compoundingInterval)}
        </span>
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
