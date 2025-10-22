// src/pages/ProductsModule.tsx
import React from 'react';
import DashboardLayout from '../../Common/Layout'; // Assuming this is your main layout wrapper
import ProductOperations from './ProductActions'; // Your operations component
import { useNavigate } from 'react-router-dom';
import { Eye, Repeat, FileText, Bell, ChevronRight, BarChart2,PlusCircle  } from 'lucide-react'; // Added FileText, Bell, ChevronRight, BarChart2 icons
import { useEffect } from "react";


// Define a simple card component for general operations within the hub
interface GeneralOperationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const GeneralOperationCard: React.FC<GeneralOperationCardProps> = ({ title, description, icon, path }) => {
  const navigate = useNavigate();
  return (
    <div
      className="group relative bg-white rounded-xl shadow-lg p-6 flex flex-col items-start text-left cursor-pointer
                 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden" // Enhanced shadow, border, and hover
      onClick={() => navigate(path)}
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <ChevronRight size={24} className="text-blue-500" /> {/* Arrow to indicate navigation */}
      </div>
      <div className="text-blue-600 group-hover:text-blue-700 transition-colors duration-300 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed flex-grow">{description}</p>
      {/* Optional: Add a "Learn More" or "Go" button for clearer CTA if needed */}
      <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium hidden group-hover:block transition-all duration-300">
        Go to {title.split(' ')[0]} <ChevronRight size={14} className="inline ml-1" />
      </button>
    </div>
  );
};


const ProductsModule: React.FC = () => {
  return (
    <DashboardLayout
      mainContent={
        <div className="space-y-12 p-8 bg-gray-50 min-h-full rounded-lg shadow-inner border border-gray-100"> {/* Added subtle background and border to content area */}
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 pb-4 border-b-2 border-blue-200">
            Product Management Dashboard            
          </h1>

          {/* Operations by Specific Product Type */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PlusCircle size={24} className="text-blue-600" /> Product Type Specific Operations
            </h2>
            <div className="space-y-8"> {/* Increased spacing between ProductOperations components */}
              <ProductOperations
                productType="FD Product(s)"
                addPath="/fd-product"
                modifyPath="/fdproduct-info"
              />
               <ProductOperations
                productType="Loan Product(s)"
                addPath="/products/savings/add"
                modifyPath="/products/savings/modify"
              />
              <ProductOperations
                productType="Saving Product(s)"
                addPath="/saving-product"
                modifyPath="/savingproduct-info"
              />
              <ProductOperations
                productType="Recurring Deposit (RD) Product(s)"
                addPath="/products/rd/add"
                modifyPath="/products/rd/modify"
              />

              

              
             

              {/* Add other product types here as needed */}
            </div>
          </section>
        </div>
      }
    />
  );
};

export default ProductsModule;