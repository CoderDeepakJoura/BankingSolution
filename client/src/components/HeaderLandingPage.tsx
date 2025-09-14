import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {createPortal } from "react-dom";
import ApiService from '../services/api';
import { useSelector } from "react-redux";
import { RootState } from "../redux";


const Header = () => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());
  const[error, setError] = useState("");
  const user = useSelector((state: RootState) => state.user);



  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log("Searching for:", searchTerm);
    }
  };
  const navigate = useNavigate();
  const LogoutFn = async () => {
      try {
            const data = await ApiService.logout();
            if (!data.success) {
              setError(data.message || "Logout failed");
              return;
            }
            navigate("/");
          } catch (error) {
            setError("Network error. Please try again.");
            console.error("Login error:", error);
            alert("An error occurred while logging in. Please try again later.");
          } 
  }


  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    LogoutFn();
  };
  const cancelLogout = () => setShowLogoutConfirm(false);


  return (
    <header style={{position: "sticky", top: 0}} className="w-full bg-white border-b border-gray-200 shadow-sm z-50">
      {/* SIMPLE GRID: Left (logo), Center (search, flexible), Right (controls, min width) */}
      <nav className="flex items-center h-16 w-full px-2 md:px-8 gap-4">
        {/* Left: Logo and Brand */}
        <div className="flex items-center gap-2 flex-none min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent truncate">
            SecureBank
          </span>
        </div>

        {/* Center: Search Bar (flex-1, stretches full width between fixed left/right) */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 flex mx-2"
          autoComplete="off"
        >
          <div className="relative w-lg">
            <input
              type="search"
              className="w-lg py-2 pl-4 pr-10 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-2 p-0 text-blue-600 hover:text-blue-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          </div>
        </form>

        {/* Right: Time, Date, User, Logout */}
        <div className="flex items-center gap-1 md:gap-4 flex-none min-w-0 justify-end">
          <span className="hidden sm:flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap select-none">
            <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {now.toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata",
            })} IST
          </span>
          <span className="hidden sm:flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap select-none">
            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
              <line x1={16} y1={2} x2={16} y2={6}/>
              <line x1={8} y1={2} x2={8} y2={6}/>
              <line x1={3} y1={10} x2={21} y2={10}/>
            </svg>
            {user.workingdate}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-800 font-semibold whitespace-nowrap">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-3-3.87M4 21v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-md text-white font-semibold transition ml-1"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile search bar below nav */}
      <form
        onSubmit={handleSearchSubmit}
        className="md:hidden flex px-2 pb-2 pt-1"
        autoComplete="off"
      >
        <div className="flex-1 relative">
          <input
            type="search"
            className="w-full py-2 pl-4 pr-10 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="Search…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 top-2 p-0 text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>
      </form>

      {/* Logout confirm modal */}
      {showLogoutConfirm &&
  createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirm Logout</h3>
        <p className="mb-6 text-gray-700">Are you sure you want to logout?</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={cancelLogout}
            className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 font-semibold text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={confirmLogout}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
    </header>
  );
};

export default Header;
