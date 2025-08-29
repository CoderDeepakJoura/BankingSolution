import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Tehsil } from "../../../services/tehsil/tehsilapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface TehsilTableProps {
  Tehsils: Tehsil[];
  handleModify: (Tehsil: Tehsil) => void;
  handleDelete: (Tehsil: Tehsil) => void;
}

const TehsilTable: React.FC<TehsilTableProps> = ({
  Tehsils,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Tehsil data type.
  const columns: Column<Tehsil>[] = [
    { key: "tehsilName", header: "Tehsil Name" },
    { key: "tehsilCode", header: "Tehsil Code" },
    { key: "tehsilNameSL", header: "Tehsil Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Tehsil) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Tehsil)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Tehsil"
            title="Modify Tehsil"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Tehsil)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Tehsil"
            title="Delete Tehsil"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Tehsil data.
  const getTehsilKey = (Tehsil: Tehsil) => Tehsil.tehsilId;

  return <GenericTable data={Tehsils} columns={columns} getKey={getTehsilKey} />;
};

export default TehsilTable;