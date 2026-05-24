import React from "react";
import DashboardLayout from "../../Common/Layout";
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
  BookOpen,
  Landmark,
  Receipt,
  ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface VoucherItem {
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

interface VoucherCategory {
  title: string;
  description: string;
  headerColor: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  icon: React.ReactNode;
  vouchers: VoucherItem[];
}

// ── Category definitions ───────────────────────────────────────────────────────

const categories: VoucherCategory[] = [
  {
    title: "Saving Account",
    description: "Deposits and withdrawals for saving accounts",
    headerColor: "from-emerald-600 to-green-700",
    accentColor: "text-emerald-600",
    bgColor: "bg-emerald-50 hover:bg-emerald-100",
    borderColor: "border-emerald-200 hover:border-emerald-400",
    badgeColor: "bg-emerald-100 text-emerald-700",
    icon: <Wallet size={24} className="text-white" />,
    vouchers: [
      {
        label: "Saving Deposit",
        description: "Credit funds into a saving account",
        path: "/saving-deposit-voucher",
        icon: <Wallet size={26} className="text-emerald-600" />,
        color: "bg-emerald-50 border-emerald-200",
      },
      {
        label: "Saving Withdrawal",
        description: "Debit funds from a saving account",
        path: "/saving-withdrawal-voucher",
        icon: <TrendingDown size={26} className="text-rose-600" />,
        color: "bg-rose-50 border-rose-200",
      },
    ],
  },
  {
    title: "Fixed Deposit (FD)",
    description: "FD maturity, renewal and pre-mature closure",
    headerColor: "from-violet-600 to-purple-700",
    accentColor: "text-violet-600",
    bgColor: "bg-violet-50 hover:bg-violet-100",
    borderColor: "border-violet-200 hover:border-violet-400",
    badgeColor: "bg-violet-100 text-violet-700",
    icon: <Landmark size={24} className="text-white" />,
    vouchers: [
      {
        label: "Mature / Renew FD",
        description: "Process matured FD — pay out or renew",
        path: "/mature-fd-account",
        icon: <RotateCcw size={26} className="text-violet-600" />,
        color: "bg-violet-50 border-violet-200",
      },
      {
        label: "Pre-Mature FD",
        description: "Close a fixed deposit before its maturity date",
        path: "/premature-fd-account",
        icon: <TimerOff size={26} className="text-fuchsia-600" />,
        color: "bg-fuchsia-50 border-fuchsia-200",
      },
    ],
  },
  {
    title: "Recurring Deposit (RD)",
    description: "RD kist payments, maturity and pre-mature closure",
    headerColor: "from-indigo-600 to-blue-700",
    accentColor: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
    borderColor: "border-indigo-200 hover:border-indigo-400",
    badgeColor: "bg-indigo-100 text-indigo-700",
    icon: <PiggyBank size={24} className="text-white" />,
    vouchers: [
      {
        label: "RD Kist Payment",
        description: "Record a monthly installment for an RD account",
        path: "/rd-kist-voucher",
        icon: <PiggyBank size={26} className="text-indigo-600" />,
        color: "bg-indigo-50 border-indigo-200",
      },
      {
        label: "Mature RD",
        description: "Process a recurring deposit that has completed its term",
        path: "/mature-rd-account",
        icon: <RefreshCw size={26} className="text-blue-600" />,
        color: "bg-blue-50 border-blue-200",
      },
      {
        label: "Pre-Mature RD",
        description: "Close an RD account before its completion date",
        path: "/premature-rd-account",
        icon: <TimerOff size={26} className="text-purple-600" />,
        color: "bg-purple-50 border-purple-200",
      },
    ],
  },
  {
    title: "Loan",
    description: "Loan disbursement, recovery and interest operations",
    headerColor: "from-orange-600 to-amber-600",
    accentColor: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100",
    borderColor: "border-orange-200 hover:border-orange-400",
    badgeColor: "bg-orange-100 text-orange-700",
    icon: <BookOpen size={24} className="text-white" />,
    vouchers: [
      {
        label: "Loan Advancement",
        description: "Disburse a new loan to a borrower account",
        path: "/loan-advancement",
        icon: <TrendingUp size={26} className="text-orange-600" />,
        color: "bg-orange-50 border-orange-200",
      },
      {
        label: "Loan Recovery",
        description: "Record a repayment against a loan account",
        path: "/loan-recovery",
        icon: <TrendingDown size={26} className="text-amber-600" />,
        color: "bg-amber-50 border-amber-200",
      },
      {
        label: "Loan Interest Posting",
        description: "Post accrued interest charges to loan accounts",
        path: "/loan-interest-posting",
        icon: <Receipt size={26} className="text-red-600" />,
        color: "bg-red-50 border-red-200",
      },
    ],
  },
  {
    title: "Cash & Journal",
    description: "Cash transactions and inter-account transfers",
    headerColor: "from-teal-600 to-cyan-700",
    accentColor: "text-teal-600",
    bgColor: "bg-teal-50 hover:bg-teal-100",
    borderColor: "border-teal-200 hover:border-teal-400",
    badgeColor: "bg-teal-100 text-teal-700",
    icon: <Banknote size={24} className="text-white" />,
    vouchers: [
      {
        label: "Cash Payment / Receipt",
        description: "Record cash inflows or outflows against accounts",
        path: "/cash-payment-receipt-voucher",
        icon: <Banknote size={26} className="text-teal-600" />,
        color: "bg-teal-50 border-teal-200",
      },
      {
        label: "Journal / Transfer",
        description: "Move funds between ledger heads with narration",
        path: "/journal-transfer-voucher",
        icon: <ArrowLeftRight size={26} className="text-cyan-600" />,
        color: "bg-cyan-50 border-cyan-200",
      },
    ],
  },
];

// ── Voucher card ───────────────────────────────────────────────────────────────

const VoucherCard: React.FC<{ item: VoucherItem; accentColor: string }> = ({ item, accentColor }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(item.path)}
      className={`group w-full text-left flex items-center gap-5 p-5 rounded-2xl border-2 ${item.color} transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-bold ${accentColor} leading-tight`}>{item.label}</p>
        <p className="text-sm text-gray-500 mt-1 leading-snug">{item.description}</p>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/70 border border-gray-200 flex items-center justify-center group-hover:bg-white transition-colors">
        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform duration-200" />
      </div>
    </button>
  );
};

// ── Category section ───────────────────────────────────────────────────────────

const CategorySection: React.FC<{ cat: VoucherCategory }> = ({ cat }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    {/* Category header */}
    <div className={`bg-gradient-to-r ${cat.headerColor} px-7 py-5 flex items-center gap-4`}>
      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
        {cat.icon}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white leading-tight">{cat.title}</h3>
        <p className="text-sm text-white/80 mt-0.5">{cat.description}</p>
      </div>
      <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white">
        {cat.vouchers.length} {cat.vouchers.length === 1 ? "voucher" : "vouchers"}
      </span>
    </div>

    {/* Voucher cards grid */}
    <div className={`p-6 grid gap-5 ${cat.vouchers.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
      {cat.vouchers.map((v) => (
        <VoucherCard key={v.path} item={v} accentColor={cat.accentColor} />
      ))}
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const VouchersModule: React.FC = () => {
  const navigate = useNavigate();
  const totalVouchers = categories.reduce((s, c) => s + c.vouchers.length, 0);

  return (
    <DashboardLayout
      mainContent={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 sm:p-10">
          <div className="w-full space-y-7">

            {/* ── Page header ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Voucher Operations</h1>
                <p className="text-sm text-gray-500 mt-1.5">Create and manage all voucher types — organised by category</p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-5 py-3 bg-blue-50 border border-blue-200 rounded-2xl min-w-[90px]">
                  <p className="text-xs text-gray-500 mb-0.5">Categories</p>
                  <p className="text-2xl font-bold text-blue-700">{categories.length}</p>
                </div>
                <div className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl min-w-[90px]">
                  <p className="text-xs text-gray-500 mb-0.5">Voucher Types</p>
                  <p className="text-2xl font-bold text-slate-700">{totalVouchers}</p>
                </div>
              </div>
            </div>

            {/* ── Search / Modify / Delete ────────────────────────────────── */}
            <button
              onClick={() => navigate("/voucher-search")}
              className="group w-full bg-white rounded-2xl shadow-sm border-2 border-blue-300 hover:border-blue-500 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
            >
              <div className="flex items-center gap-6 px-8 py-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:from-blue-600 group-hover:to-indigo-700 rounded-2xl flex items-center justify-center shadow-md transition-colors flex-shrink-0">
                  <SearchCheck size={26} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    Search / Modify / Delete Voucher
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Find any voucher by date &amp; number, preview its entries, then modify or delete
                  </p>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 group-hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors flex-shrink-0">
                  Open <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* ── Divider ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">New Voucher by Category</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ── Category sections ────────────────────────────────────────── */}
            {categories.map((cat) => (
              <CategorySection key={cat.title} cat={cat} />
            ))}

          </div>
        </div>
      }
    />
  );
};

export default VouchersModule;
