import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { TaxDTO } from "../../../services/gst/taxapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const TC_MAP: Record<number, string> = { 1: "Taxable", 2: "Nil Rated", 3: "Exempted" };

interface Props {
  items: TaxDTO[];
  onEdit: (item: TaxDTO) => void;
  onDelete: (item: TaxDTO) => void;
}

type Row = TaxDTO & { _idx: number; _original: TaxDTO };

const TaxTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  const data: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "name", header: "Name", render: r => r.name || "—" },
    { key: "alias", header: "Alias", render: r => r.alias || "—" },
    { key: "introductionDate", header: "Intro. Date", render: r => r.introductionDate ? r.introductionDate.split("T")[0] : "—" },
    { key: "taxPercentage", header: "Tax %", render: r => `${r.taxPercentage}%` },
    { key: "tCId", header: "Category", render: r => (r.tCId ? TC_MAP[r.tCId] || "—" : "—") },
    { key: "taxGroupName", header: "Tax Group", render: r => r.taxGroupName || "—" },
    { key: "details", header: "Details", render: r => r.details?.length ?? 0 },
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

export default TaxTable;
