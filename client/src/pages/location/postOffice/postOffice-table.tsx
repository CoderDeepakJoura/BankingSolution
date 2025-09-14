import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { PostOffice } from "../../../services/PostOffice/postOfficeapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface PostOfficeTableProps {
  PostOffices: PostOffice[];
  handleModify: (PostOffice: PostOffice) => void;
  handleDelete: (PostOffice: PostOffice) => void;
}

const PostOfficeTable: React.FC<PostOfficeTableProps> = ({
  PostOffices,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the PostOffice data type.
  const columns: Column<PostOffice>[] = [
    { key: "postOfficeName", header: "Post Office Name" },
    { key: "postOfficeCode", header: "Post Office Code" },
    { key: "postOfficeNameSL", header: "Post Office Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (PostOffice) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(PostOffice)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Post Office"
            title="Modify Post Office"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(PostOffice)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Post Office"
            title="Delete Post Office"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the PostOffice data.
  const getPostOfficeKey = (PostOffice: PostOffice) => PostOffice.postOfficeId;

  return <GenericTable data={PostOffices} columns={columns} getKey={getPostOfficeKey} />;
};

export default PostOfficeTable;