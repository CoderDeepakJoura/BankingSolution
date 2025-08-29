// src/components/CRUDDashboard.tsx

import React from 'react';
import DashboardLayout from '../../Common/Layout';
import { useNavigate } from 'react-router-dom';
import { Repeat, PlusCircle, ChevronRight } from 'lucide-react';

interface CRUDDashboardProps {
  title: string;
  addPath: string;
  modifyPath: string;
}

const CRUDDashboard: React.FC<CRUDDashboardProps> = ({
  title,
  addPath,
  modifyPath,
}) => {
  const navigate = useNavigate();

  const operations = [
    {
      label: 'Add New',
      path: addPath,
      icon: <PlusCircle size={20} className="text-green-500" />,
    },
    {
      label: 'Modify/Delete',
      path: modifyPath,
      icon: <Repeat size={20} className="text-yellow-500" />,
    },
  ];

  return (
    <DashboardLayout
      mainContent={
        <div className="space-y-12 p-8 bg-gray-50 min-h-full rounded-lg shadow-inner border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 pb-4 border-b-2 border-blue-200">
            {title} Management Dashboard
          </h1>
          <section>
            <div className="space-y-8">
              
              {operations.map((op, index) => (
                <div
                  key={index}
                  onClick={() => navigate(op.path)}
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-gray-100">{op.icon}</div>
                    <span className="text-lg font-semibold text-gray-700">{op.label}</span>
                    <ChevronRight className="ml-auto text-gray-400" size={24} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      }
    />
  );
};

export default CRUDDashboard;
