// src/pages/VouchersModule.tsx
import React from "react";
import DashboardLayout from "../../Common/Layout";
import VoucherOperations from "./VoucherActions";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  RefreshCw,
  TimerOff,
  RotateCcw,
  SearchCheck,
  Banknote,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react";

const VouchersModule: React.FC = () => {
  const navigate = useNavigate();
  const vouchersList = [
    {
      VoucherType: "Saving Deposit Voucher",
      addPath: "/saving-deposit-voucher",
      icon: <Wallet size={20} className="text-green-600" />,
    },
    {
      VoucherType: "Saving Withdrawal Voucher",
      addPath: "/saving-withdrawal-voucher",
      icon: <TrendingDown size={20} className="text-red-600" />,
    },
    {
      VoucherType: "Pre-Mature Fixed Deposit (FD) Voucher",
      addPath: "/premature-fd-account",
      // modifyPath: "/Vouchers/fd/modify",
      icon: <TimerOff size={20} className="text-purple-600" />, // or AlarmClockOff
    },
    {
      VoucherType: "Mature/Renew Fixed Deposit (FD) Voucher",
      addPath: "/mature-fd-account",
      // modifyPath: "/Vouchers/fd/modify",
      icon: <RotateCcw size={20} className="text-purple-600" />, // or RefreshCcw
    },

    {
      VoucherType: "Mature Recurring Deposit (RD) Voucher",
      addPath: "/mature-rd-account",
      icon: <RefreshCw size={20} className="text-indigo-600" />,
    },
    {
      VoucherType: "Pre-Mature Recurring Deposit (RD) Voucher",
      addPath: "/premature-rd-account",
      icon: <TimerOff size={20} className="text-purple-600" />,
    },
    {
      VoucherType: "Recurring Deposit (RD) Kist Voucher",
      addPath: "/rd-kist-voucher",
      icon: <PiggyBank size={20} className="text-purple-600" />,
    },
    {
      VoucherType: "Loan Advancement Voucher",
      addPath: "/loan-advancement",
      icon: <RefreshCw size={20} className="text-indigo-600" />,
    },
    {
      VoucherType: "Loan Recovery Voucher",
      addPath: "/loan-recovery",
      icon: <TrendingDown size={20} className="text-orange-600" />,
    },
    {
      VoucherType: "Loan Interest Posting Voucher",
      addPath: "/loan-interest-posting",
      icon: <TrendingUp size={20} className="text-blue-600" />,
    },
    {
      VoucherType: "Cash Payment / Receipt Voucher",
      addPath: "/cash-payment-receipt-voucher",
      icon: <Banknote size={20} className="text-teal-600" />,
    },
    {
      VoucherType: "Journal / Transfer Voucher",
      addPath: "/journal-transfer-voucher",
      icon: <ArrowLeftRight size={20} className="text-violet-600" />,
    },
  ];

  return (
    <DashboardLayout
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                Voucher Management Dashboard
              </h1>
              <p className="text-gray-600">
                Create and manage all types of vouchers efficiently
              </p>
            </div>

            {/* Search / Modify / Delete */}
            <div
              onClick={() => navigate("/voucher-search")}
              className="bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="flex items-center gap-5 px-6 py-5">
                <div className="w-14 h-14 bg-blue-600 group-hover:bg-blue-700 rounded-xl flex items-center justify-center shadow-md transition-colors">
                  <SearchCheck size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    Search / Modify / Delete Voucher
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Find any voucher by date &amp; number, preview its entries, then modify or delete
                  </p>
                </div>
                <div className="px-5 py-2.5 bg-blue-600 group-hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-colors">
                  Open
                </div>
              </div>
            </div>

            {/* Vouchers List */}
            <VoucherOperations vouchers={vouchersList} />
          </div>
        </div>
      }
    />
  );
};

export default VouchersModule;
