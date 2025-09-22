import React from "react";

const Header = () => {
  return (
    <header className="sticky top-0 relative z-10 w-full py-6 px-8 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
            >
              <path
                d="M3 17l6-6 4 4 8-8"
                stroke="#16A34A"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="12" cy="12" r="10" stroke="#FBBF24" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              AHS FinCore
            </h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">
              Cloud-Ready, Enterprise Banking Platform
            </p>
          </div>
        </div>

        {/* <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </span>
            <span className="text-gray-400">|</span>
            <span>24/7 Support</span>
          </div>
        </div> */}
      </div>
    </header>
  );
};

export default Header;
