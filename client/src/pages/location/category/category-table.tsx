import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Category } from "../../../services/category/categoryapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface CategoryTableProps {
  Categorys: Category[];
  handleModify: (Category: Category) => void;
  handleDelete: (Category: Category) => void;
}

const CategoryTable: React.FC<CategoryTableProps> = ({
  Categorys,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the Category data type.
  const columns: Column<Category>[] = [
    { key: "categoryName", header: "Category Name" },
    { key: "categoryNameSL", header: "Category Name SL" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (Category) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(Category)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Category"
            title="Modify Category"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(Category)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete Category"
            title="Delete Category"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the Category data.
  const getCategoryKey = (Category: Category) => Category.categoryId;

  return <GenericTable data={Categorys} columns={columns} getKey={getCategoryKey} />;
};

export default CategoryTable;