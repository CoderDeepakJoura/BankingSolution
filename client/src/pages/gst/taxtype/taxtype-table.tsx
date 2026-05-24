import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { TaxTypeDTO } from "../../../services/gst/taxtypeapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const APPLIED_IN: Record<number, string> = { 1: "Within State", 2: "Out of State", 3: "Both" };
const CALC_FROM: Record<number, string> = { 1: "Ratio", 2: "Item" };
const IS_UT: Record<number, string> = { 0: "No", 1: "Yes", 2: "Both" };

interface Props {
  items: TaxTypeDTO[];
  onEdit: (item: TaxTypeDTO) => void;
  onDelete: (item: TaxTypeDTO) => void;
}

type Row = TaxTypeDTO & { _idx: number; _original: TaxTypeDTO };

const TaxTypeTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  const data: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "code", header: "Code", render: r => r.code || "—" },
    { key: "description", header: "Name", render: r => r.description || "—" },
    { key: "seqNo", header: "Seq" },
    { key: "appliedIn", header: "Applied In", render: r => (r.appliedIn ? APPLIED_IN[r.appliedIn] || "—" : "—") },
    { key: "calculatedFrom", header: "Calc From", render: r => CALC_FROM[r.calculatedFrom] || "—" },
    { key: "isUT", header: "Is UT", render: r => (r.isUT !== undefined && r.isUT !== null ? IS_UT[r.isUT] ?? "—" : "—") },
    { key: "inAccDisplay", header: "In Account", render: r => r.inAccDisplay || "—" },
    { key: "outAccDisplay", header: "Out Account", render: r => r.outAccDisplay || "—" },
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

export default TaxTypeTable;
