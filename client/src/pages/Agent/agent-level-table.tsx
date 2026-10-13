import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { AgentLevel } from "../../services/agent/agentApi";

interface Props {
  items: AgentLevel[];
  onEdit: (item: AgentLevel) => void;
  onDelete: (item: AgentLevel) => void;
}

const AgentLevelTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="min-w-full divide-y divide-gray-100 text-sm">
      <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <tr>
          {["#", "Code", "Description", "Parent Level", "Actions"].map(h => (
            <th
              key={h}
              className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${h === "Actions" ? "text-center" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
              No agent levels found.
            </td>
          </tr>
        ) : (
          items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
                  {item.code}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{item.parentLevelName ?? "—"}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 rounded border border-blue-300 text-blue-500 hover:bg-blue-50 transition cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="p-1.5 rounded border border-red-300 text-red-500 hover:bg-red-50 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default AgentLevelTable;
