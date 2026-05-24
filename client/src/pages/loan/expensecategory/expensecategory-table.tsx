import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { ExpenseCategoryDTO } from "../../../services/loan/expensecategoryapi";

interface Props {
  items: ExpenseCategoryDTO[];
  onEdit: (item: ExpenseCategoryDTO) => void;
  onDelete: (item: ExpenseCategoryDTO) => void;
}

const ExpenseCategoryTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          {["#", "Code", "Description", "Description (SL)", "Actions"].map(h => (
            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {items.length === 0 ? (
          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No Expense Categories found.</td></tr>
        ) : items.map((item, idx) => (
          <tr key={item.id} className="hover:bg-gray-50 transition">
            <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-3 font-medium text-gray-800">{item.code || "—"}</td>
            <td className="px-3 py-3 text-gray-700">{item.description || "—"}</td>
            <td className="px-3 py-3 text-gray-500">{item.descriptionSL || "—"}</td>
            <td className="px-3 py-3">
              <div className="flex gap-2">
                <button onClick={() => onEdit(item)} className="p-1.5 rounded border border-blue-400 text-blue-500 hover:bg-blue-50 transition" title="Edit">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => onDelete(item)} className="p-1.5 rounded border border-red-400 text-red-500 hover:bg-red-50 transition" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ExpenseCategoryTable;
