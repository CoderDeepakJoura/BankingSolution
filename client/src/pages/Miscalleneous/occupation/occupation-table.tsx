import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Occupation } from "../../../services/Occupation/Occupationapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface OccupationTableProps {
  Occupations: Occupation[];
  handleModify: (Occupation: Occupation) => void;
  handleDelete: (Occupation: Occupation) => void;
}

const OccupationTable: React.FC<OccupationTableProps> = ({
  Occupations,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Occupation data type.
  const columns: Column<Occupation>[] = [
    { key: "description", header: "Description" },
    { key: "descriptionSL", header: "Description SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Occupation) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Occupation)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Occupation"
            title="Modify Occupation"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Occupation)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Occupation"
            title="Delete Occupation"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Occupation data.
  const getOccupationKey = (Occupation: Occupation) => Occupation.OccupationId;

  return <GenericTable data={Occupations} columns={columns} getKey={getOccupationKey} />;
};

export default OccupationTable;