import React from "react";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { Caste } from "../../services/caste/casteapi";
import GenericTable, { Column } from "../../components/Location/GenericTable";

interface CasteTableProps {
  Castes: Caste[];
  handleModify: (caste: Caste) => void;
  handleDelete: (caste: Caste) => void;
}

const CasteTable: React.FC<CasteTableProps> = ({
  Castes,
  handleModify,
  handleDelete,
}) => {
  const columns: Column<Caste>[] = [
    { 
      key: "casteDescription", 
      header: "Caste Name",
      render: (row) => (
        <div className="font-medium text-gray-900">
          {row.casteDescription || "-"}
        </div>
      )
    },
    { 
      key: "casteDescriptionSL", 
      header: "Caste Name (Hindi)",
      render: (row) => (
        <div className="text-gray-700" lang="hi">
          {row.casteDescriptionSL || "-"}
        </div>
      )
    },
    { 
      key: "categoryName", 
      header: "Category Name",
      render: (row) => (
        <div className="text-gray-700">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {row.categoryName} 
          </span>
        </div>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (caste) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(caste)}
            className="group p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
            aria-label="Modify Caste"
            title="Edit Caste"
          >
            <FaEdit 
              size={14} 
              className="group-hover:scale-110 transition-transform" 
            />
          </button>
          <button
            onClick={() => handleDelete(caste)}
            className="group p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-105"
            aria-label="Delete Caste"
            title="Delete Caste"
          >
            <FaTrash 
              size={14} 
              className="group-hover:scale-110 transition-transform" 
            />
          </button>
        </div>
      ),
    },
  ];

  const getCasteKey = (caste: Caste) =>
    caste.casteId?.toString() || 
    `${caste.casteName}-${Math.random()}`;

  if (!Castes || Castes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FaTimes className="text-gray-400 text-2xl" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Castes Found</h3>
        <p className="text-gray-500">
          No castes are available to display. Try adjusting your search criteria or add a new caste.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <GenericTable
        data={Castes}
        columns={columns}
        getKey={getCasteKey}
      />
    </div>
  );
};

export default CasteTable;
