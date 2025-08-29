import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Zone } from "../../../services/zone/zoneapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface ZoneTableProps {
  zones: Zone[];
  handleModify: (zone: Zone) => void;
  handleDelete: (zone: Zone) => void;
}

const ZoneTable: React.FC<ZoneTableProps> = ({
  zones,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Zone data type.
  const columns: Column<Zone>[] = [
    { key: "zoneName", header: "Zone Name" },
    { key: "zoneCode", header: "Zone Code" },
    { key: "zoneNameSL", header: "Zone Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (zone) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(zone)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Zone"
            title="Modify Zone"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(zone)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Zone"
            title="Delete Zone"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Zone data.
  const getZoneKey = (zone: Zone) => zone.zoneId;

  return <GenericTable data={zones} columns={columns} getKey={getZoneKey} />;
};

export default ZoneTable;