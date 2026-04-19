// src/pages/VouchersModule.tsx
import React from "react";
import DashboardLayout from "../../Common/Layout";
import VoucherOperations from "./VoucherActions";
import {
  Wallet,
  TrendingDown,
  PiggyBank,
  Calendar,
  RefreshCw,
  TimerOff,
  RotateCcw,
} from "lucide-react";

const VouchersModule: React.FC = () => {
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
    ,
    {
      VoucherType: "Recurring Deposit (RD) Kist Voucher",
      addPath: "/rd-kist-voucher",
      icon: <PiggyBank size={20} className="text-purple-600" />,
    },
    {
      VoucherType: "Loan Advancement Voucher",
      addPath: "/loan-advancement",
      modifyPath: "/Vouchers/rd/modify",
      icon: <RefreshCw size={20} className="text-indigo-600" />,
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

            {/* Vouchers List */}
            <VoucherOperations vouchers={vouchersList} />
          </div>
        </div>
      }
    />
  );
};

export default VouchersModule;
