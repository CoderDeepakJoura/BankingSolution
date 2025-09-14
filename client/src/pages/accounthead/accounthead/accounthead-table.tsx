import React from "react";
import { FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import { AccountHead } from "../../../services/accountHead/accountheadapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface AccountHeadTableProps {
  AccountHeads: AccountHead[];
  handleModify: (accountHead: AccountHead) => void;
  handleDelete: (accountHead: AccountHead) => void;
}

const AccountHeadTable: React.FC<AccountHeadTableProps> = ({
  AccountHeads,
  handleModify,
  handleDelete,
}) => {
  

  const columns: Column<AccountHead>[] = [
    { 
      key: "accountHeadName", 
      header: "Account Head Name",
      render: (row) => (
        <div className="font-medium text-gray-900">
          {row.accountHeadName || "-"}
        </div>
      )
    },
    { 
      key: "accountHeadNameSL", 
      header: "Account Head Name SL",
      render: (row) => (
        <div className="text-gray-700" lang="hi">
          {row.accountHeadNameSL || "-"}
        </div>
      )
    },
    { 
      key: "accountHeadTypeName", 
      header: "Account Head Type",
      render: (row) => (
        <div className="text-gray-700">
          {row.accountHeadTypeName || 
           row.accountHeadType || 
           (row.accountHeadTypeId ? `Type ${row.accountHeadTypeId}` : "-")}
        </div>
      )
    },
    { 
      key: "headCode", 
      header: "Head Code",
      render: (row) => (
        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {row.headCode || row.HeadCode || "-"}
        </div>
      )
    },
    { 
      key: "parentName", 
      header: "Parent Head",
      render: (row) => (
        <div className="text-gray-700">
          {row.parentName || 
           row.parentHeadName || 
           row.parentHeadCode || 
           "-"}
        </div>
      )
    },
    {
      key: "isAnnexure",
      header: "Is Annexure",
      render: (row) => {
        const isAnnexure = row.isAnnexure === true || 
                          row.isAnnexure === "1" || 
                          row.isAnnexure === 1;
        return (
          <div className="flex justify-center">
            {isAnnexure ? (
              <div className="flex items-center gap-1">
                <FaCheck className="text-green-500" size={14} />
                <span className="text-xs text-green-600 font-medium">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <FaTimes className="text-red-500" size={14} />
                <span className="text-xs text-red-600 font-medium">No</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "showInReport",
      header: "Show In Report",
      render: (row) => {
        const showInReport = row.showInReport === true || 
                           row.showInReport === "1" || 
                           row.showInReport === 1;
        return (
          <div className="flex justify-center">
            {showInReport ? (
              <div className="flex items-center gap-1">
                <FaCheck className="text-green-500" size={14} />
                <span className="text-xs text-green-600 font-medium">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <FaTimes className="text-red-500" size={14} />
                <span className="text-xs text-red-600 font-medium">No</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (accountHead) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(accountHead)}
            className="group p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
            aria-label="Modify Account Head"
            title="Edit Account Head"
          >
            <FaEdit 
              size={14} 
              className="group-hover:scale-110 transition-transform" 
            />
          </button>
          <button
            onClick={() => handleDelete(accountHead)}
            className="group p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-105"
            aria-label="Delete Account Head"
            title="Delete Account Head"
          >
            <FaTrash 
              size={14} 
              className="group-hover:scale-110 transition-transform" 
            />
          </button>
        </div>
      ),
    },
  ];

  const getAccountHeadKey = (accountHead: AccountHead) =>
    accountHead.accountHeadId?.toString() || 
    `${accountHead.accountHeadName}-${Math.random()}`;

  if (!AccountHeads || AccountHeads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FaTimes className="text-gray-400 text-2xl" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Account Heads Found</h3>
        <p className="text-gray-500">
          No account heads are available to display. Try adjusting your search criteria or add a new account head.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <GenericTable
        data={AccountHeads}
        columns={columns}
        getKey={getAccountHeadKey}
      />
    </div>
  );
};

export default AccountHeadTable;
