import React, { useState, useRef, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux";
import { setUser, clearUser } from "../../redux/userSlice";
import DashboardLayout from "../../Common/Layout";
import api from "../../services/api";
import ApiService from "../../services/api";
import commonservice from "../../services/common/commonservice";
import { API_CONFIG } from "../../constants/config";
import Swal from "sweetalert2";
import { CalendarDays, LayoutDashboard, Save } from "lucide-react";

interface BranchSessionDTO {
  id: number;
  branchSessionInfo: string;
}
interface SessionData {
  sessionFrom: string;
  sessionTo: string;
  minDate: Date;
  maxDate: Date;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Parse "29-September-2025" → Date
function parseWorkingDateString(wd: string): Date | null {
  if (!wd) return null;
  const parts = wd.split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
  const year = parseInt(parts[2]);
  if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
  const d = new Date(year, monthIdx, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const fmtDisplay = (d: Date | null) =>
  d ? `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}` : "";

const getRealToday = () => { const t = new Date(); t.setHours(0,0,0,0); return t; };

const ChangeSessionPage: React.FC = () => {
  const user     = useSelector((s: RootState) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [branchSessions, setBranchSessions]   = useState<BranchSessionDTO[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving]                   = useState(false);

  const [selectedSession, setSelectedSession]     = useState<number | null>(null);
  const [sessionDateRange, setSessionDateRange]   = useState<SessionData | null>(null);
  const [selectedDate, setSelectedDate]           = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth]           = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen]       = useState(false);
  const [calendarPosition, setCalendarPosition]   = useState<"bottom"|"top">("bottom");
  const [calendarCoords, setCalendarCoords]       = useState({ left: 0, top: 0 });

  const dateInputRef = useRef<HTMLInputElement>(null);
  const calendarRef  = useRef<HTMLDivElement>(null);

  // ── load sessions then pre-fill current session & date ──────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSessions(true);
      try {
        const res = await commonservice.fetch_branch_sessions(user.branchid || 1) as any;
        const sessions: BranchSessionDTO[] = Array.isArray(res.data) ? res.data : [];
        setBranchSessions(sessions);

        // pre-fill with current session
        if (user.sessionId && sessions.length > 0) {
          const found = sessions.find(s => s.id === user.sessionId);
          if (found) applySession(found, sessions, parseWorkingDateString(user.workingdate ?? ""));
        }
      } catch { /* ignore */ }
      finally { setLoadingSessions(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySession = (
    session: BranchSessionDTO,
    _sessions: BranchSessionDTO[],
    prefillDate?: Date | null
  ) => {
    const parts = session.branchSessionInfo.split("-");
    if (parts.length !== 2) return;
    const fromYear = parseInt(parts[0].trim());
    const toYear   = parseInt(parts[1].trim());
    if (isNaN(fromYear) || isNaN(toYear)) return;

    const sessionStart = new Date(fromYear, 3, 1);
    const sessionEnd   = new Date(toYear,   2, 31);
    const today        = getRealToday();
    const maxDate      = today <= sessionEnd ? today : sessionEnd;

    if (sessionStart > maxDate) return;

    const range: SessionData = {
      sessionFrom: fromYear.toString(),
      sessionTo:   toYear.toString(),
      minDate:     sessionStart,
      maxDate,
    };
    setSelectedSession(session.id);
    setSessionDateRange(range);

    // use prefill date if it's within range, otherwise use today or sessionStart
    const target = prefillDate && prefillDate >= sessionStart && prefillDate <= maxDate
      ? prefillDate
      : (today >= sessionStart && today <= maxDate ? today : null);

    setSelectedDate(target);
    setCurrentMonth(target
      ? new Date(target.getFullYear(), target.getMonth(), 1)
      : new Date(fromYear, 3, 1));
  };

  const handleSessionChange = (sessionId: number) => {
    setSelectedDate(null);
    setSessionDateRange(null);
    setIsCalendarOpen(false);
    if (!sessionId || isNaN(sessionId)) { setSelectedSession(null); return; }
    const found = branchSessions.find(s => s.id === sessionId);
    if (!found) return;
    applySession(found, branchSessions, null);
  };

  // calendar position
  useEffect(() => {
    if (isCalendarOpen && dateInputRef.current) {
      const rect = dateInputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 400 && rect.top > spaceBelow) {
        setCalendarPosition("top");
        setCalendarCoords({ left: rect.left, top: rect.top });
      } else {
        setCalendarPosition("bottom");
        setCalendarCoords({ left: rect.left, top: rect.bottom });
      }
    }
  }, [isCalendarOpen]);

  // outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)
        && dateInputRef.current && !dateInputRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canGoToPrevMonth = () => {
    if (!sessionDateRange) return false;
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return prev >= new Date(sessionDateRange.minDate.getFullYear(), sessionDateRange.minDate.getMonth(), 1);
  };
  const canGoToNextMonth = () => {
    if (!sessionDateRange) return false;
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return next <= new Date(sessionDateRange.maxDate.getFullYear(), sessionDateRange.maxDate.getMonth(), 1);
  };

  const handleDateSelect = (day: number) => {
    if (!sessionDateRange) return;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    d.setHours(0,0,0,0);
    if (d < sessionDateRange.minDate || d > sessionDateRange.maxDate) return;
    setSelectedDate(d);
    setIsCalendarOpen(false);
  };

  // Raw fetch bypasses ApiService's auto-redirect on 401 so we control the outcome.
  const handleBackToDashboard = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        await doLogout();
      }
    } catch {
      await doLogout();
    }
  };

  const doLogout = async () => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore — we're clearing session regardless */ }
    dispatch(clearUser());
    navigate('/');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSession) { Swal.fire("Validation","Please select a session.","warning"); return; }
    if (!selectedDate)    { Swal.fire("Validation","Please select a working date.","warning"); return; }

    const day     = String(selectedDate.getDate()).padStart(2,"0");
    const month   = selectedDate.toLocaleString("en-US", { month: "long" });
    const year    = selectedDate.getFullYear();
    const fmtDate = `${day}-${month}-${year}`;
    const sessInfo = `${sessionDateRange!.sessionFrom}-${sessionDateRange!.sessionTo}`;

    setSaving(true);
    try {
      const res = await api.set_working_date(fmtDate, sessInfo, selectedSession);
      if (!(res as any).success) throw new Error((res as any).message || "Failed to update.");

      // re-fetch login info so Redux stays in sync
      const info = await ApiService.get_login_info() as any;
      if (info.success) {
        dispatch(setUser({
          name:                info.userName,
          email:               info.email,
          branch_name:         info.branchName,
          address:             info.address,
          contact:             info.contact,
          workingdate:         info.workingDate,
          branchid:            info.branchId,
          sessionInfo:         info.sessionInfo,
          sessionId:           info.sessionId,
          isFirstSession:      info.isFirstSession,
          firstSessionFromDate:info.firstSessionFromDate,
          firstSessionToDate:  info.firstSessionToDate,
          sessionFromDate:     info.sessionFromDate,
          sessionToDate:       info.sessionToDate,
          isSu:                info.isSu ?? false,
        }));
        commonservice.setWorkingDate(info.workingDate);
      }

      await Swal.fire({ icon: "success", title: "Updated", text: "Session and working date updated successfully.", timer: 1500, showConfirmButton: false });
      navigate("/dashboard");
    } catch (err: any) {
      Swal.fire("Error", err?.message || "Failed to update.", "error");
    } finally { setSaving(false); }
  };

  // ── Calendar sub-render ──────────────────────────────────────────────
  const renderCalendarHeader = () => {
    if (!sessionDateRange) return null;
    const startYear = sessionDateRange.minDate.getFullYear();
    const endYear   = sessionDateRange.maxDate.getFullYear();
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);

    const minMth = new Date(sessionDateRange.minDate.getFullYear(), sessionDateRange.minDate.getMonth(), 1);
    const maxMth = new Date(sessionDateRange.maxDate.getFullYear(), sessionDateRange.maxDate.getMonth(), 1);

    return (
      <div className="flex justify-between items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
        <button type="button" onClick={() => {
          if (!canGoToPrevMonth()) return;
          const m = currentMonth.getMonth() === 0 ? 11 : currentMonth.getMonth() - 1;
          const y = currentMonth.getMonth() === 0 ? currentMonth.getFullYear() - 1 : currentMonth.getFullYear();
          setCurrentMonth(new Date(y, m, 1));
        }} disabled={!canGoToPrevMonth()} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-30">◀</button>

        <select value={currentMonth.getMonth()} onChange={e => {
          const nm = parseInt(e.target.value);
          const nd = new Date(currentMonth.getFullYear(), nm, 1);
          if (nd >= minMth && nd <= maxMth) setCurrentMonth(nd);
        }} className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none">
          {MONTH_NAMES.map((mn, i) => {
            const td = new Date(currentMonth.getFullYear(), i, 1);
            return <option key={i} value={i} disabled={td < minMth || td > maxMth}>{mn}</option>;
          })}
        </select>

        <select value={currentMonth.getFullYear()} onChange={e => {
          const ny = parseInt(e.target.value);
          const nd = new Date(ny, currentMonth.getMonth(), 1);
          if (nd < minMth) setCurrentMonth(new Date(sessionDateRange.minDate.getFullYear(), sessionDateRange.minDate.getMonth(), 1));
          else if (nd > maxMth) setCurrentMonth(new Date(sessionDateRange.maxDate.getFullYear(), sessionDateRange.maxDate.getMonth(), 1));
          else setCurrentMonth(nd);
        }} className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <button type="button" onClick={() => {
          if (!canGoToNextMonth()) return;
          const m = currentMonth.getMonth() === 11 ? 0 : currentMonth.getMonth() + 1;
          const y = currentMonth.getMonth() === 11 ? currentMonth.getFullYear() + 1 : currentMonth.getFullYear();
          setCurrentMonth(new Date(y, m, 1));
        }} disabled={!canGoToNextMonth()} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-30">▶</button>
      </div>
    );
  };

  const renderCalendarDays = () => {
    if (!sessionDateRange) return [];
    const startDay   = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const today      = getRealToday();
    const cells      = [];
    for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} className="p-2" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      date.setHours(0,0,0,0);
      const outside    = date < sessionDateRange.minDate || date > sessionDateRange.maxDate;
      const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentMonth.getMonth() && selectedDate?.getFullYear() === currentMonth.getFullYear();
      const isToday    = today.getDate() === d && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
      cells.push(
        <button key={d} type="button" onClick={() => !outside && handleDateSelect(d)} disabled={outside}
          className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all
            ${isSelected ? "bg-violet-600 text-white shadow-md scale-105 ring-2 ring-violet-300"
              : isToday && !outside ? "border-2 border-violet-500 text-violet-600 hover:bg-violet-50"
              : outside ? "text-gray-300 cursor-not-allowed bg-gray-50"
              : "hover:bg-violet-100 text-gray-700 cursor-pointer"}`}>
          {d}
        </button>
      );
    }
    return cells;
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500 shadow-sm bg-white";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Change Session / Working Date</h2>
                <p className="text-xs text-slate-500">
                  Current: <span className="font-medium text-violet-700">{user.sessionInfo}</span>
                  {" · "}
                  <span className="font-medium text-violet-700">{user.workingdate}</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 space-y-5">
              <div>
                <label className={lbl}>Branch Session *</label>
                <select
                  value={selectedSession ?? ""}
                  onChange={e => {
                    const v = e.target.value;
                    if (v) handleSessionChange(parseInt(v));
                    else { setSelectedSession(null); setSessionDateRange(null); setSelectedDate(null); }
                  }}
                  disabled={loadingSessions}
                  className={inp}
                >
                  <option value="">{loadingSessions ? "Loading…" : "Select a session"}</option>
                  {branchSessions.map(s => (
                    <option key={s.id} value={s.id}>{s.branchSessionInfo}</option>
                  ))}
                </select>
              </div>

              {selectedSession && sessionDateRange && (
                <div>
                  <label className={lbl}>Working Date *</label>
                  <p className="text-xs text-slate-400 mb-1.5">
                    Valid range: {fmtDisplay(sessionDateRange.minDate)} — {fmtDisplay(sessionDateRange.maxDate)}
                  </p>
                  <input
                    ref={dateInputRef}
                    type="text"
                    readOnly
                    value={fmtDisplay(selectedDate)}
                    onClick={() => setIsCalendarOpen(true)}
                    onFocus={() => setIsCalendarOpen(true)}
                    placeholder="Click to select date"
                    className={`${inp} cursor-pointer`}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
              <button type="button" onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">
                <LayoutDashboard size={15} /> Back to Dashboard
              </button>
              <button type="submit" disabled={saving || !selectedDate}
                className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save size={15} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Calendar portal */}
        {isCalendarOpen && selectedSession && sessionDateRange && createPortal(
          <div
            ref={calendarRef}
            className="z-[9999] w-80 bg-white border border-gray-300 rounded-xl shadow-2xl"
            style={{
              position: "fixed",
              left: `${calendarCoords.left}px`,
              ...(calendarPosition === "bottom"
                ? { top: `${calendarCoords.top + 4}px` }
                : { bottom: `${window.innerHeight - calendarCoords.top + 4}px` }),
            }}
          >
            <div className="p-3 border-b border-gray-200 bg-violet-50">
              <div className="text-xs text-gray-500 mb-0.5">Selected Date</div>
              <div className="text-base font-semibold text-gray-800">{fmtDisplay(selectedDate) || "No date selected"}</div>
            </div>
            {renderCalendarHeader()}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 uppercase py-2 px-1">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5 p-2">{renderCalendarDays()}</div>
            <div className="flex justify-between items-center p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button type="button" onClick={() => setSelectedDate(null)}
                className="px-3 py-1.5 text-xs text-violet-600 hover:bg-violet-100 rounded-lg transition font-medium">Clear</button>
              <span className="text-xs text-gray-400">{fmtDisplay(sessionDateRange.minDate)} – {fmtDisplay(sessionDateRange.maxDate)}</span>
              <button type="button" onClick={() => {
                const today = getRealToday();
                if (today >= sessionDateRange.minDate && today <= sessionDateRange.maxDate) {
                  setSelectedDate(today);
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setIsCalendarOpen(false);
                } else {
                  Swal.fire("Out of Range","Today is outside the session range.","warning");
                }
              }} className="px-3 py-1.5 text-xs text-violet-600 hover:bg-violet-100 rounded-lg transition font-medium">Today</button>
            </div>
          </div>,
          document.body
        )}
      </div>
    } />
  );
};

export default ChangeSessionPage;
