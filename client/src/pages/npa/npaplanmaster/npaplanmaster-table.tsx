import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { NPAPlanMasterDTO } from "../../../services/npa/npaplanmasterapi";

const CAL_NPA_LABELS: Record<number, string> = { 0: "Overdue Date", 1: "Loan Date", 2: "Last Installment Date" };
const OVR_DUE_LABELS: Record<number, string> = { 1: "Overdue Period", 2: "Overdue Instalments" };

interface Props {
  items: NPAPlanMasterDTO[];
  onEdit: (item: NPAPlanMasterDTO) => void;
  onDelete: (item: NPAPlanMasterDTO) => void;
}

const NPAPlanMasterTable: React.FC<Props> = ({ items, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          {["#", "Code", "Description", "Cal. NPA From Date", "NPA By", "Actions"].map(h => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {items.length === 0 ? (
          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No NPA Plans found.</td></tr>
        ) : items.map((item, idx) => (
          <tr key={item.id} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
            <td className="px-4 py-3 font-medium text-gray-800">{item.code}</td>
            <td className="px-4 py-3 text-gray-600">{item.description || "—"}</td>
            <td className="px-4 py-3 text-gray-600">{CAL_NPA_LABELS[item.calNPADate] ?? "—"}</td>
            <td className="px-4 py-3 text-gray-600">{OVR_DUE_LABELS[item.ovrDuePeriodOrInst] ?? "—"}</td>
            <td className="px-4 py-3">
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

export default NPAPlanMasterTable;
