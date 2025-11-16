// src/components/VoucherOperations.tsx
import React from 'react';
import { PlusCircle, Edit, ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VoucherItem {
  VoucherType: string;
  addPath: string;
  modifyPath?: string;
  icon?: React.ReactNode;
}

interface VoucherOperationsProps {
  vouchers: VoucherItem[];
}

const VoucherOperations: React.FC<VoucherOperationsProps> = ({ vouchers }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <FileText size={24} className="text-white" />
          </div>
          Voucher Type Specific Operations
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Manage all voucher types from one place
        </p>
      </div>

      {/* Voucher List */}
      <div className="divide-y divide-gray-100">
        {vouchers.map((voucher, index) => (
          <div
            key={index}
            className="group relative px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                     transition-all duration-300 cursor-pointer border-l-4 border-transparent 
                     hover:border-blue-500"
          >
            <div className="flex items-center justify-between">
              {/* Left: Title and Icon */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center 
                              group-hover:bg-blue-200 transition-colors duration-300">
                  {voucher.icon || <FileText size={20} className="text-blue-600" />}
                </div>
                
                <div>
                  <h3 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 
                               transition-colors duration-200">
                    {voucher.VoucherType}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {voucher.modifyPath ? 'Add or modify voucher' : 'Add new voucher'}
                  </p>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Add Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(voucher.addPath);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg 
                           hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5
                           transition-all duration-200 text-sm font-medium group/btn"
                >
                  <PlusCircle size={16} className="group-hover/btn:rotate-90 transition-transform duration-300" />
                  Add
                </button>

                {/* Modify Button */}
                {voucher.modifyPath && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(voucher.modifyPath!);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg 
                             hover:bg-gray-200 hover:shadow-lg hover:-translate-y-0.5
                             transition-all duration-200 text-sm font-medium border border-gray-300"
                  >
                    <Edit size={16} />
                    Modify
                  </button>
                )}

                {/* Arrow indicator */}
                <ChevronRight 
                  size={20} 
                  className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 
                           transition-all duration-300" 
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Total {vouchers.length} voucher types available
        </p>
      </div>
    </div>
  );
};

export default VoucherOperations;
