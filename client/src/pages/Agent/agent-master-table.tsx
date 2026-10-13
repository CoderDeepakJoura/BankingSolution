import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { AgentMaster } from "../../services/agent/agentApi";

interface Props {
  items: AgentMaster[];
  onEdit: (item: AgentMaster) => void;
  onDelete: (item: AgentMaster) => void;
}

const AgentMasterTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="min-w-full divide-y divide-gray-100 text-sm">
      <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <tr>
          {["#", "Code", "Name", "Level", "Phone", "Status", "Actions"].map(h => (
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
            <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
              No agents found.
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
              <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{item.agentLevelName ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">{item.phone || "—"}</td>
              <td className="px-4 py-3">
                {item.isActive ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                    Inactive
                  </span>
                )}
              </td>
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

export default AgentMasterTable;
