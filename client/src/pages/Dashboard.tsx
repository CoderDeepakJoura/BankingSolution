import React from 'react';
import { Building2, MapPin, User2, Phone, Mail, Clock4, BadgeCheck, Banknote } from 'lucide-react';
import DashboardLayout from '../Common/Layout';
import { useSelector } from "react-redux";
import { RootState } from "../redux";
const App: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const branchInfo = {
    name: user.name,
    address: user.address || "123 Main St, City, Country",
    branch_name: user.branch_name || "Main Branch",
    contact: user.contact || "+1 234 567 890",
    email: user.email,
    ifsc: "JOUR0001234",
    workingHours: "Mon - Fri: 9:30 AM - 5:30 PM",
    branchid: user.branchid || 0
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="w-full px-6 lg:px-12 py-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🏢 Branch Information
          </h2>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-200 rounded-2xl shadow-lg p-6 lg:p-8">
            {/* Branch Name */}
            <div className="flex items-start space-x-4">
              <Building2 className="text-blue-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Branch Name</p>
                <p className="text-lg font-semibold text-gray-800">{branchInfo.branch_name}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start space-x-4">
              <MapPin className="text-green-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-lg text-gray-700">{branchInfo.address}</p>
              </div>
            </div>

            {/* Branch Manager */}
            <div className="flex items-start space-x-4">
              <User2 className="text-purple-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">User Name</p>
                <p className="text-lg font-medium text-gray-800">{branchInfo.name}</p>
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex items-start space-x-4">
              <Phone className="text-pink-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="text-lg text-gray-700">{branchInfo.contact}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start space-x-4">
              <Mail className="text-yellow-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-lg text-gray-700">{branchInfo.email}</p>
              </div>
            </div>

            {/* IFSC Code */}
            {/* <div className="flex items-start space-x-4">
              <BadgeCheck className="text-indigo-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">IFSC Code</p>
                <p className="text-lg text-gray-800 font-mono">{branchInfo.ifsc}</p>
              </div>
            </div> */}

            {/* Working Hours */}
            {/* <div className="flex items-start space-x-4">
              <Clock4 className="text-emerald-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Working Hours</p>
                <p className="text-lg text-gray-700">{branchInfo.workingHours}</p>
              </div>
            </div> */}

            {/* Services */}
            {/* <div className="flex items-start space-x-4">
              <Banknote className="text-teal-600 mt-1" size={24} />
              <div>
                <p className="text-sm text-gray-500">Services Offered</p>
                <ul className="list-disc list-inside text-gray-800 text-sm mt-1">
                  {branchInfo.services.map((service, index) => (
                    <li key={index} className="mb-1">{service}</li>
                  ))}
                </ul>
              </div>
            </div> */}
          </div>
        </div>
      }
    />
  );
};

export default App;
