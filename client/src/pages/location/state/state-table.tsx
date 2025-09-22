import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { State } from "../../../services/location/state/stateapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface StateTableProps {
  states: State[];
  handleModify: (state: State) => void;
  handleDelete: (state: State) => void;
}

const StateTable: React.FC<StateTableProps> = ({
  states,
  handleModify,
  handleDelete,
}) => {
  // Define the columns specifically for the State data type.
  const columns: Column<State>[] = [
    { key: "stateName", header: "State Name" },
    { key: "stateCode", header: "State Code" },
    {
      key: "actions",
      header: "Actions",
      // Use the render function to provide custom content (buttons in this case).
      render: (state) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(state)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify State"
            title="Modify State"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(state)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
            aria-label="Delete State"
            title="Delete State"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  // A function to get a unique key for each row from the State data.
  const getStateKey = (state: State) => state.stateId;

  return <GenericTable data={states} columns={columns} getKey={getStateKey} />;
};

export default StateTable;