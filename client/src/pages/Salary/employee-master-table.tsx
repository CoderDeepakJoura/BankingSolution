import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { EmployeeMaster } from "../../services/salary/salaryApi";

const STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "Active",   cls: "bg-green-100 text-green-700" },
  0: { label: "Inactive", cls: "bg-red-100 text-red-600" },
  2: { label: "On Leave", cls: "bg-amber-100 text-amber-700" },
  3: { label: "Resigned", cls: "bg-slate-100 text-slate-600" },
};

interface Props {
  items: EmployeeMaster[];
  onEdit: (item: EmployeeMaster) => void;
  onDelete: (item: EmployeeMaster) => void;
}

const EmployeeMasterTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="min-w-full divide-y divide-gray-100 text-sm">
      <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <tr>
          {["#", "Code", "Name", "Designation", "Phone", "Joining Date", "Status", "Actions"].map(h => (
            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${h === "Actions" ? "text-center" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {items.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-4 py-10 text-center text-slate-400">No employees found.</td>
          </tr>
        ) : items.map((item, idx) => {
          const status = STATUS_LABELS[item.status] ?? { label: "—", cls: "bg-slate-100 text-slate-600" };
          return (
            <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">{item.code}</span>
              </td>
              <td className="px-4 py-3 font-medium text-slate-700">{item.firstName} {item.lastName ?? ""}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{item.designationName ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">{item.phone ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">{item.joiningDate ?? "—"}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>{status.label}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center gap-2">
                  <button onClick={() => onEdit(item)} className="p-1.5 rounded border border-blue-300 text-blue-500 hover:bg-blue-50 transition" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDelete(item)} className="p-1.5 rounded border border-red-300 text-red-500 hover:bg-red-50 transition" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default EmployeeMasterTable;
