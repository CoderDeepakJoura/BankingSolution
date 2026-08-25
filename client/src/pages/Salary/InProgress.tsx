import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../Common/Layout";

interface Props {
  title: string;
}

export default function InProgress({ title }: Props) {
  const navigate = useNavigate();

  return (
    <DashboardLayout enableScroll={true} mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
        <div className="w-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 px-6 py-4 flex items-center gap-4 shadow-lg">
          <button onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="p-2 rounded-xl bg-white/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-white/70">Payroll Module</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center shadow-inner">
            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">{title}</h2>
          <p className="text-slate-500 text-base mb-1">This screen is currently under development.</p>
          <p className="text-slate-400 text-sm mb-8">It will be available in an upcoming update.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-xl shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all text-sm">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    } />
  );
}
