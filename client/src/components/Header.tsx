import React from "react";

const Header = () => {
  return (
    
    <header className="relative z-10 w-full py-6 px-8 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg">
        
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              SecureBank
            </h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">Enterprise Banking Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </span>
            <span className="text-gray-400">|</span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
