import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { TaxGroupDTO } from "../../../services/gst/taxgroupapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

const PRINTING_FORMAT: Record<number, string> = { 1: "Format1", 2: "Format2" };

interface Props {
  items: TaxGroupDTO[];
  onEdit: (item: TaxGroupDTO) => void;
  onDelete: (item: TaxGroupDTO) => void;
}

type Row = TaxGroupDTO & { _idx: number; _original: TaxGroupDTO };

const badge = (val: boolean) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${val ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
    {val ? "Yes" : "No"}
  </span>
);

const TaxGroupTable: React.FC<Props> = ({ items, onEdit, onDelete }) => {
  const data: Row[] = items.map((item, idx) => ({ ...item, _idx: idx + 1, _original: item }));

  const columns: Column<Row>[] = [
    { key: "_idx", header: "#" },
    { key: "code", header: "Code", render: r => r.code || "—" },
    { key: "description", header: "Name", render: r => r.description || "—" },
    { key: "printingFormat", header: "Printing Format", render: r => (r.printingFormat ? PRINTING_FORMAT[r.printingFormat] || "—" : "—") },
    { key: "isStateMandatory", header: "State Mand.", render: r => badge(!!r.isStateMandatory) },
    { key: "isShippingMandatory", header: "Shipping Mand.", render: r => badge(!!r.isShippingMandatory) },
    { key: "isBillingMandatory", header: "Billing Mand.", render: r => badge(!!r.isBillingMandatory) },
    { key: "selectedTaxTypeIds", header: "Tax Types", render: r => r.selectedTaxTypeIds?.length ?? 0 },
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

export default TaxGroupTable;
