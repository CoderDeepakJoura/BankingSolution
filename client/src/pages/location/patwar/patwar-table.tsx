import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Patwar } from "../../../services/Patwar/Patwarapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface PatwarTableProps {
  Patwars: Patwar[];
  handleModify: (Patwar: Patwar) => void;
  handleDelete: (Patwar: Patwar) => void;
}

const PatwarTable: React.FC<PatwarTableProps> = ({
  Patwars,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Patwar data type.
  const columns: Column<Patwar>[] = [
    { key: "description", header: "Description" },
    { key: "descriptionSL", header: "Description SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Patwar) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Patwar)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Patwar"
            title="Modify Patwar"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Patwar)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Patwar"
            title="Delete Patwar"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Patwar data.
  const getPatwarKey = (Patwar: Patwar) => Patwar.PatwarId;

  return <GenericTable data={Patwars} columns={columns} getKey={getPatwarKey} />;
};

export default PatwarTable;