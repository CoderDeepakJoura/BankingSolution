import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { AccountHeadType } from "../../../services/accountHead/accountheadtypeapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface AccountHeadTypeTableProps {
  AccountHeadTypes: AccountHeadType[];
  handleModify: (AccountHeadType: AccountHeadType) => void;
  handleDelete: (AccountHeadType: AccountHeadType) => void;
}

const AccountHeadTypeTable: React.FC<AccountHeadTypeTableProps> = ({
  AccountHeadTypes,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the AccountHeadType data type.
  const columns: Column<AccountHeadType>[] = [
    { key: "accountHeadTypeName", header: "Account Head Type Name" },
    { key: "accountHeadTypeNameSL", header: "Account Head Type Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (AccountHeadType) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(AccountHeadType)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Account Head Type"
            title="Modify Account Head Type"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(AccountHeadType)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Account Head Type"
            title="Delete Account Head Type"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the AccountHeadType data.
  const getAccountHeadTypeKey = (AccountHeadType: AccountHeadType) => AccountHeadType.accountheadtypeId;

  return <GenericTable data={AccountHeadTypes} columns={columns} getKey={getAccountHeadTypeKey} />;
};

export default AccountHeadTypeTable;