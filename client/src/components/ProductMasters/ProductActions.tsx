// src/components/ProductOperations.tsx
import React from 'react';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductOperationsProps {
  productType: string;
  addPath: string;
  modifyPath: string;
  // deletePath: string | ""; // Made deletePath nullable
}

const ProductOperations: React.FC<ProductOperationsProps> = ({
  productType,
  addPath,
  modifyPath,
  // deletePath,
}) => {
  const navigate = useNavigate();

  const OperationButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-gray-50 text-gray-700 rounded-lg shadow-sm border border-gray-200
                 hover:bg-blue-100 hover:text-blue-800 hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-200 min-h-[100px] text-center cursor-pointer relative overflow-hidden group" // Added group for advanced hover
    >
      <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div> {/* Subtle blue overlay on hover */}
      <span className="mb-2 text-blue-600 group-hover:text-blue-800 transition-colors duration-200 relative z-10">{icon}</span> {/* Icon always blue, above overlay */}
      <span className="text-sm font-medium relative z-10">{label}</span>
    </button>
  );

  return (
    <div className="bg-white p-7 rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl"> {/* Enhanced container */}
      <h2 className="text-xl font-bold text-gray-800 mb-5 border-b pb-3 border-gray-200">{productType}</h2> {/* Stronger title with separator */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <OperationButton
          icon={<PlusCircle size={22} />}
          label={`Add ${productType}`}
          onClick={() => navigate(addPath)}
        />
        <OperationButton
          icon={<Edit size={22} />}
          label={`Modify/Delete ${productType}`}
          onClick={() => navigate(modifyPath)}
        />
        {/* <OperationButton
          icon={<Trash2 size={22} />}
          label={`Delete ${productType}`}
          onClick={() => navigate(deletePath)}
        /> */}
      </div>
    </div>
  );
};

export default ProductOperations;