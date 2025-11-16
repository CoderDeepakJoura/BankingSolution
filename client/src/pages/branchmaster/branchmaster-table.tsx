import React from "react";
import { FaEdit, FaTrash, FaBuilding, FaEnvelope, FaPhone } from "react-icons/fa";
import { Branch } from "../../services/branch/branchapi";

interface BranchTableProps {
  branches: Branch[];
  handleModify: (branch: Branch) => void;
  handleDelete: (branch: Branch) => void;
}

const BranchTable: React.FC<BranchTableProps> = ({
  branches,
  handleModify,
  handleDelete,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              Branch Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              Address
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              GSTIN
            </th>
            <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {branches.map((branch) => (
            <tr
              key={branch.id}
              className="hover:bg-blue-50 transition-colors duration-150"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-purple-500" />
                  <span className="text-sm font-mono font-semibold text-gray-900">
                    {branch.code}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {branch.name}
                </div>
                {branch.nameSL && (
                  <div className="text-xs text-gray-500">{branch.nameSL}</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                  {branch.addressLine}
                </div>
                <div className="text-xs text-gray-500">
                  {branch.pincode}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-sm text-gray-900 mb-1">
                  <FaEnvelope className="text-rose-500 text-xs" />
                  {branch.emailId}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-900">
                  <FaPhone className="text-green-500 text-xs" />
                  {branch.phonePrefix1} {branch.phoneNo1}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-mono text-gray-900">
                  {branch.gstinNo}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleModify(branch)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200"
                    title="Edit Branch"
                  >
                    <FaEdit className="text-lg" />
                  </button>
                  {/* <button
                    onClick={() => handleDelete(branch)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200"
                    title="Delete Branch"
                  >
                    <FaTrash className="text-lg" />
                  </button> */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BranchTable;
