import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { BillBookDTO } from "../../../services/gst/billbookapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const GEN_MAP: Record<number, string> = { 1: "Financial Year", 2: "Continuous" };

interface Props {
  items: BillBookDTO[];
  onEdit: (item: BillBookDTO) => void;
  onDelete: (item: BillBookDTO) => void;
}

type Row = BillBookDTO & { _idx: number; _original: BillBookDTO };

const BillBookTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  const data: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "description", header: "Description", render: r => r.description || "—" },
    { key: "billNoPrefix", header: "Prefix", render: r => r.billNoPrefix || "—" },
    { key: "billNoFrom", header: "Bill No. From" },
    { key: "billNoGeneration", header: "Generation", render: r => GEN_MAP[r.billNoGeneration] || "—" },
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

export default BillBookTable;
