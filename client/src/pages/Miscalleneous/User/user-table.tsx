import React from "react";
import { FaEdit, FaTrash, FaBan, FaCheck } from "react-icons/fa";
import { UserListDTO } from "../../../services/user/userapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface UserTableProps {
  users: UserListDTO[];
  handleModify: (user: UserListDTO) => void;
  handleDelete: (user: UserListDTO) => void;
  handleUnauthorize: (user: UserListDTO) => void;
  handleAuthorize: (user: UserListDTO) => void;
}

const userTypeLabel = (type: number) => {
  switch (type) {
    case 1: return "Admin";
    case 2: return "Operator";
    case 3: return "Viewer";
    default: return `Type ${type}`;
  }
};

const UserTable: React.FC<UserTableProps> = ({
  users,
  handleModify,
  handleDelete,
  handleUnauthorize,
  handleAuthorize,
}) => {
  const columns: Column<UserListDTO>[] = [
    { key: "username", header: "Username" },
    {
      key: "userType",
      header: "User Type",
      render: (u) => <span>{userTypeLabel(u.userType)}</span>,
    },
    {
      key: "isBranchSu",
      header: "Branch SU",
      render: (u) => (
        <span className={u.isBranchSu ? "text-green-600 font-semibold" : "text-gray-400"}>
          {u.isBranchSu ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "isAuthorized",
      header: "Status",
      render: (u) => (
        <span
          className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${
            u.isAuthorized ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {u.isAuthorized ? "Authorized" : "Unauthorized"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(u)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            title="Modify User"
          >
            <FaEdit size={14} />
          </button>
          {u.isAuthorized ? (
            <button
              onClick={() => handleUnauthorize(u)}
              className="p-2 rounded-full border border-orange-500 text-orange-500 hover:bg-orange-50 transition"
              title="Unauthorize User"
            >
              <FaBan size={14} />
            </button>
          ) : (
            <button
              onClick={() => handleAuthorize(u)}
              className="p-2 rounded-full border border-green-500 text-green-500 hover:bg-green-50 transition"
              title="Authorize User"
            >
              <FaCheck size={14} />
            </button>
          )}
          <button
            onClick={() => handleDelete(u)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            title="Delete User"
          >
            <FaTrash size={14} />
          </button>
        </div>
      ),
    },
  ];

  return <GenericTable data={users} columns={columns} getKey={(u) => u.id} />;
};

export default UserTable;
