import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Thana } from "../../../services/thana/thanaapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface ThanaTableProps {
  Thanas: Thana[];
  handleModify: (Thana: Thana) => void;
  handleDelete: (Thana: Thana) => void;
}

const ThanaTable: React.FC<ThanaTableProps> = ({
  Thanas,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Thana data type.
  const columns: Column<Thana>[] = [
    { key: "thanaName", header: "Thana Name" },
    { key: "thanaCode", header: "Thana Code" },
    { key: "thanaNameSL", header: "Thana Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Thana) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Thana)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Thana"
            title="Modify Thana"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Thana)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Thana"
            title="Delete Thana"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Thana data.
  const getThanaKey = (Thana: Thana) => Thana.thanaId;

  return <GenericTable data={Thanas} columns={columns} getKey={getThanaKey} />;
};

export default ThanaTable;