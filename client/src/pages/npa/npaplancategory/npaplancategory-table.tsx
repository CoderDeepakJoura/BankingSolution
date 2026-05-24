import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { NPAPlanCategoryDTO } from "../../../services/npa/npaplancategoryapi";

interface Props {
  items: NPAPlanCategoryDTO[];
  onEdit: (item: NPAPlanCategoryDTO) => void;
  onDelete: (item: NPAPlanCategoryDTO) => void;
}

const NPAPlanCategoryTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          {["#", "Seq", "Description", "NPA Plan", "Parent", "Is Group", "Period (From-To)", "Prov. %", "All Prin. Overdue", "Actions"].map(h => (
            <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {items.length === 0 ? (
          <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No NPA Plan Categories found.</td></tr>
        ) : items.map((item, idx) => (
          <tr key={item.id} className="hover:bg-gray-50 transition">
            <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-3 text-gray-600">{item.seqNo ?? "—"}</td>
            <td className="px-3 py-3 font-medium text-gray-800">{item.description || "—"}</td>
            <td className="px-3 py-3 text-gray-600">{item.planCode || "—"}</td>
            <td className="px-3 py-3 text-gray-600">{item.parentDescription || "—"}</td>
            <td className="px-3 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isGroup === "Y" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                {item.isGroup === "Y" ? "Yes" : "No"}
              </span>
            </td>
            <td className="px-3 py-3 text-gray-600">
              {item.periodFrom != null || item.periodTo != null ? `${item.periodFrom ?? "—"} - ${item.periodTo ?? "—"}` : "—"}
            </td>
            <td className="px-3 py-3 text-gray-600">{item.provisioningPerc != null ? `${item.provisioningPerc}%` : "—"}</td>
            <td className="px-3 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.allPrinOverdue === 1 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                {item.allPrinOverdue === 1 ? "Yes" : "No"}
              </span>
            </td>
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

export default NPAPlanCategoryTable;
