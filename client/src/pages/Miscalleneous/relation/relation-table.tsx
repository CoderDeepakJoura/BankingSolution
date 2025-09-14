import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Relation } from "../../../services/relation/relationapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface RelationTableProps {
  Relations: Relation[];
  handleModify: (Relation: Relation) => void;
  handleDelete: (Relation: Relation) => void;
}

const RelationTable: React.FC<RelationTableProps> = ({
  Relations,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Relation data type.
  const columns: Column<Relation>[] = [
    { key: "description", header: "Relation Description" },
    { key: "descriptionSL", header: "Relation Description SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Relation) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Relation)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Relation"
            title="Modify Relation"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Relation)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Relation"
            title="Delete Relation"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Relation data.
  const getRelationKey = (Relation: Relation) => Relation.relationId;

  return <GenericTable data={Relations} columns={columns} getKey={getRelationKey} />;
};

export default RelationTable;