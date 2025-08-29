import React from "react";
import { FaBoxOpen } from "react-icons/fa";

export interface Column<T> {
  // The key must match a property in the data object.
  key: keyof T | "actions"; // 'actions' is a special key for custom content.
  // The display name for the column header.
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
  // An array of data objects to display.
  data: T[];
  // An array of column definitions.
  columns: Column<T>[];
  // A function to get a unique key for each row.
  getKey: (item: T) => string | number;
}

// A generic functional component that accepts data and column configurations.
const GenericTable = <T,>({ data, columns, getKey }: GenericTableProps<T>) => {
  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 h-[450px] overflow-hidden backdrop-blur-sm">
      {/* Subtle gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
      
      {/* Table Wrapper for scroll functionality */}
      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "449px" }}>
        <table className="min-w-full text-sm text-left border-collapse">
          {/* Header */}
          <thead className="sticky top-0 bg-gradient-to-b from-slate-50 to-gray-100 border-b-2 border-slate-200 z-10 shadow-lg">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key as string}
                  className={`
                    p-5 font-bold text-slate-700  text-center uppercase text-xs tracking-wider
                    relative
                    ${index > 0 ? 'border-l border-slate-200' : ''}
                  `}
                  style={{ textAlign: 'center' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r  from-blue-400 to-purple-500 rounded-full opacity-70"></div>
                    {column.header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item, rowIndex) => (
                <tr
                  key={getKey(item)}
                  className={`
                    transition-all duration-300 ease-in-out
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 hover:shadow-md hover:scale-[1.005]
                    ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                    group
                  `}
                  style={{ textAlign: 'center' }}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key as string}
                      className={`
                        p-5 font-medium text-slate-800 
                        items-center justify-center
                        border-slate-100 group-hover:border-blue-100
                        transition-colors duration-300
                        ${colIndex > 0 ? 'border-l' : ''}
                      `}
                    >
                      {/* Use the custom render function if it exists, otherwise use the key to display the data */}
                      {column.render ? column.render(item) : (item[column.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                {/* Display a "No data found" message if the data array is empty */}
                <td colSpan={columns.length} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-20"></div>
                      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 p-6 rounded-2xl shadow-lg">
                        <FaBoxOpen className="text-5xl text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-lg font-semibold text-slate-600 block">No data found</span>
                      <span className="text-sm text-slate-400 block">There are currently no records to display</span>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Bottom accent line */}
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-60"></div>
    </div>
  );
};

export default GenericTable;