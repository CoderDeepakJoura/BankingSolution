import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Village, village } from "../../../services/location/village/villageapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface VillageTableProps {
  Villages: village[];
  handleModify: (Village: village) => void;
  handleDelete: (Village: village) => void;
}

const VillageTable: React.FC<VillageTableProps> = ({
  Villages,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Village data type.
  const columns: Column<Village>[] = [
    { key: "villageName", header: "Village Name" },
    { key: "villageNameSL", header: "Village Name SL" },
    { key: "thanaName", header: "Thana Name" },
    { key: "tehsilName", header: "Tehsil Name" },
    { key: "postOfficeName", header: "Post Office Name" },
    { key: "zoneName", header: "Zone Name" },
    { key: "pinCode", header: "PIN Code" },
    { key: "patwarName", header: "Patwar Name" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Village) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Village)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Village"
            title="Modify Village"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Village)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Village"
            title="Delete Village"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Village data.
  const getVillageKey = (Village: village) => Village.villageId;

  return <GenericTable data={Villages} columns={columns} getKey={getVillageKey} />;
};

export default VillageTable;