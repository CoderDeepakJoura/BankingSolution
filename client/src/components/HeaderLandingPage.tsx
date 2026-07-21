import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import ApiService from "../services/api";
import { useSelector } from "react-redux";
import { RootState } from "../redux";
import ibVoucherApi, { IBNotification, IBNotificationItem } from "../services/interbranch/ibVoucherApi";
import { SEARCHABLE_SCREENS } from "../routes/screenList";

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDrop, setShowDrop]     = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const [dropPos, setDropPos]       = useState({ top: 0, left: 0, width: 0 });
  const containerRef                = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const navigate                    = useNavigate();

  const filtered = searchTerm.trim().length > 0
    ? SEARCHABLE_SCREENS.filter(s =>
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  useEffect(() => { setActiveIdx(-1); }, [searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDrop = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: Math.max(rect.width, 320) });
    }
    setShowDrop(true);
  };

  const go = (screen: Screen) => {
    navigate(screen.path);
    setSearchTerm("");
    setShowDrop(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDrop || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); go(filtered[activeIdx]); }
    if (e.key === "Escape") { setShowDrop(false); inputRef.current?.blur(); }
  };

  const dropdown = (showDrop && searchTerm.trim().length > 0) ? createPortal(
    <div
      style={{ position: "absolute", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden"
    >
      {filtered.length > 0 ? filtered.map((s, i) => (
        <button
          key={s.path}
          onMouseDown={() => go(s)}
          onMouseEnter={() => setActiveIdx(i)}
          className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
            i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
          }`}
        >
          <span className="text-sm font-medium text-gray-800">{s.label}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{s.category}</span>
        </button>
      )) : (
        <div className="px-4 py-3 text-sm text-gray-400">No screens found for "{searchTerm}"</div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-72 py-2 pl-4 pr-10 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          placeholder="Search screens..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); openDrop(); }}
          onFocus={() => { if (searchTerm.trim()) openDrop(); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <span className="absolute right-3 top-2.5 text-blue-600 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
      </div>
      {dropdown}
    </div>
  );
};

const NotificationBell: React.FC<{ branchId: number }> = ({ branchId }) => {
  const navigate     = useNavigate();
  const bellRef      = useRef<HTMLDivElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const [open, setOpen]         = useState(false);
  const [data, setData]         = useState<IBNotification | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await ibVoucherApi.getNotifications(branchId) as any;
      if (res.success) setData(res.data);
    } catch { /* silent */ }
  }, [branchId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBell     = bellRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideBell && !insideDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const total = (data?.incomingCount ?? 0) + (data?.pendingHOCount ?? 0);

  const fmtType = (t: string) => t.replace(/([A-Z])/g, " $1").trim();

  const go = (item: IBNotificationItem) => {
    setOpen(false);
    navigate(item.type === "incoming" ? "/ib-incoming-vouchers" : "/ib-pending-vouchers");
  };

  return (
    <div ref={bellRef} className="relative flex-none">
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchData(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="IB Notifications"
      >
        {/* Bell SVG */}
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && createPortal(
        (() => {
          const rect = bellRef.current?.getBoundingClientRect();
          return (
            <div
              ref={dropdownRef}
              style={{ position: "fixed", top: (rect?.bottom ?? 64) + 8, right: window.innerWidth - (rect?.right ?? 0), zIndex: 9999, width: 340 }}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <span className="text-sm font-semibold text-gray-800">IB Notifications</span>
                {total > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">{total} pending</span>
                )}
              </div>

              {!data || data.items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No pending IB vouchers</div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {data.incomingCount > 0 && (
                    <div className="px-4 py-1.5 bg-purple-50">
                      <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">Incoming — awaiting your approval</span>
                    </div>
                  )}
                  {data.items.filter(i => i.type === "incoming").map(item => (
                    <button key={item.id} onClick={() => go(item)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-700 truncate">{fmtType(item.voucherType)}</div>
                        <div className="text-xs text-gray-500 truncate">From {item.fromBrName} · {item.destAccName}</div>
                        <div className="text-xs font-bold text-purple-600 mt-0.5">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                      </div>
                    </button>
                  ))}

                  {data.pendingHOCount > 0 && (
                    <div className="px-4 py-1.5 bg-emerald-50">
                      <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Pending HO settlement</span>
                    </div>
                  )}
                  {data.items.filter(i => i.type === "pendingHO").map(item => (
                    <button key={item.id} onClick={() => go(item)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M8 7h12M8 12h8M8 17h4" /><path d="M3 7h.01M3 12h.01M3 17h.01" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-700 truncate">{fmtType(item.voucherType)}</div>
                        <div className="text-xs text-gray-500 truncate">{item.fromBrName} → {item.destBrName}</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5">₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <button onClick={() => { setOpen(false); navigate("/ib-incoming-vouchers"); }}
                  className="text-xs text-blue-600 hover:underline font-medium">View all incoming</button>
              </div>
            </div>
          );
        })()
      , document.body)}
    </div>
  );
};

const Header = () => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState("");
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navigate = useNavigate();

  const LogoutFn = async () => {
    try {
      const data = await ApiService.logout();
      if (!data.success) { setError(data.message || "Logout failed"); return; }
      navigate("/");
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleLogout  = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { setShowLogoutConfirm(false); LogoutFn(); };
  const cancelLogout  = () => setShowLogoutConfirm(false);

  return (
    <header style={{ position: "sticky", top: 0 }} className="w-full bg-white border-b border-gray-200 shadow-sm z-50">
      <nav className="flex items-center h-16 w-full px-2 md:px-8 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-none min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M3 17l6-6 4 4 8-8" stroke="#16A34A" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="10" stroke="#FBBF24" />
            </svg>
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent truncate">
            Sicswave FinCore
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 flex mx-2">
          <SearchBar />
        </div>

        {/* Right: Time, Date, Session, User, Logout */}
        <div className="flex items-center gap-1 md:gap-4 flex-none min-w-0 justify-end">
          <span className="hidden sm:flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap select-none">
            <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })} IST
          </span>

          <span className="hidden sm:flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap select-none">
            <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
              <line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} />
            </svg>
            {user.workingdate}
          </span>

          <span className="hidden lg:flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap select-none">
            <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-medium">Session:</span> {user.sessionInfo || "N/A"}
          </span>

          <NotificationBell branchId={user.branchid} />

          <span className="flex items-center gap-1 text-sm text-gray-800 font-semibold whitespace-nowrap">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-3-3.87M4 21v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {user.name}
          </span>

          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-md text-white font-semibold transition ml-1">
            Logout
          </button>
        </div>
      </nav>

      {/* Logout modal */}
      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirm Logout</h3>
            <p className="mb-6 text-gray-700">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button onClick={confirmLogout} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition">Logout</button>
              <button onClick={cancelLogout}  className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 font-semibold text-gray-800 transition">Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Header;
