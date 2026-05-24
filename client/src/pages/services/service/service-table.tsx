import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { ServiceDTO } from "../../../services/services/serviceapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface Props {
  items: ServiceDTO[];
  onEdit: (item: ServiceDTO) => void;
  onDelete: (item: ServiceDTO) => void;
}

type Row = ServiceDTO & { _idx: number; _original: ServiceDTO };

const ServiceTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  const data: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "name", header: "Name", render: r => r.name || "—" },
    { key: "sac", header: "SAC(TC)", render: r => r.sac || "—" },
    { key: "otherReceipts", header: "Other Receipts" },
    { key: "deductRefunds", header: "Deduct Refunds" },
    { key: "penalties", header: "Penalties" },
    { key: "isIncludeTax", header: "Inc. Tax", render: r => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isIncludeTax ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {r.isIncludeTax ? "Yes" : "No"}
      </span>
    )},
    { key: "purchaseAccDisplay", header: "Purchase A/c", render: r => r.purchaseAccDisplay || "—" },
    {
      key: "actions",
      header: "Actions",
      render: r => (
        <div className="flex justify-center space-x-2">
          <button onClick={() => onEdit(r._original)} className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition duration-200 transform hover:scale-110" title="Edit">
            <FaEdit size={14} />
          </button>
          <button onClick={() => onDelete(r._original)} className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110" title="Delete">
            <FaTrash size={14} />
          </button>
        </div>
      ),
    },
  ];

  return <GenericTable data={data} columns={columns} getKey={r => r.id || 0} />;
};

export default ServiceTable;
