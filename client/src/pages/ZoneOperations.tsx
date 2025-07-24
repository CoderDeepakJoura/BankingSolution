// src/pages/AccountsModule.tsx
import React from 'react';
import DashboardLayout from '../Common/Layout'; // Assuming this is your main layout wrapper
import AccountOperations from '../components/AccountOperations'; // Your operations component
import { useNavigate } from 'react-router-dom';
import { Eye, Repeat, FileText, Bell, ChevronRight, BarChart2,PlusCircle  } from 'lucide-react'; // Added FileText, Bell, ChevronRight, BarChart2 icons




const ZoneModule: React.FC = () => {
  return (
    <DashboardLayout
      mainContent={
        <div className="space-y-12 p-8 bg-gray-50 min-h-full rounded-lg shadow-inner border border-gray-100"> {/* Added subtle background and border to content area */}
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 pb-4 border-b-2 border-blue-200">
            Zone Management Dashboard            
          </h1>

          {/* Operations by Specific Account Type */}
          <section>
            <div className="space-y-8"> {/* Increased spacing between AccountOperations components */}
              <AccountOperations
                accountType="Zone"
                addPath="/zone"
                modifyPath="/zoneinfo"
                deletePath="/accounts/fd/delete"
              />
            </div>
          </section>
        </div>
      }
    />
  );
};

export default ZoneModule;