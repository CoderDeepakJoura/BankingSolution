import React, { useState, useRef, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import commonservice from "../../services/common/commonservice";
import Swal from "sweetalert2";

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

const WorkingDateMaster: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarPosition, setCalendarPosition] = useState<"bottom" | "top">(
    "bottom"
  );
  const [calendarCoords, setCalendarCoords] = useState<{
    left: number;
    top: number;
  }>({ left: 0, top: 0 });

  const [branchSessions, setBranchSessions] = useState<BranchSessionDTO[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [sessionDateRange, setSessionDateRange] = useState<SessionData | null>(
    null
  );
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ✅ FIX 1: Always use real system date — never use commonservice.getTodaysDate()
  // commonservice.getTodaysDate() returns the previously SAVED working date (e.g. 12-04-2013),
  // NOT the actual current date. Using it caused wrong maxDate and empty year dropdowns.
  const getRealToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const validate_token = async () => {
    try {
      await api.get_login_info();
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        navigate("/session-expired");
      }
    }
  };

  useEffect(() => {
    validate_token();
    fetchBranchSessions();
  }, []);

  const fetchBranchSessions = async () => {
    try {
      setLoadingSessions(true);
      const branchId = 1;
      const response = await commonservice.fetch_branch_sessions(branchId);

      console.log("Branch Sessions Response:", response);

      if (response.success && response.data) {
        const sessionsArray = Array.isArray(response.data) ? response.data : [];
        console.log("Sessions Array:", sessionsArray);
        setBranchSessions(sessionsArray);
      } else {
        console.error("Invalid response structure:", response);
        setBranchSessions([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch branch sessions:", error);
      setBranchSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // ✅ FIX 2: Full reset of all date state before applying new session
  // Previously, stale selectedDate / sessionDateRange from a previous session would
  // linger and cause incorrect calendar rendering on session switch.
  const resetDateState = () => {
    setSelectedDate(null);
    setSessionDateRange(null);
    setIsCalendarOpen(false);
    setCurrentMonth(new Date());
  };

  const handleSessionChange = (sessionId: number) => {
    console.log("Selected Session ID:", sessionId);

    // ✅ Always reset date state first on any session change (including clearing)
    resetDateState();

    if (!sessionId || isNaN(sessionId)) {
      setSelectedSession(null);
      return;
    }

    setSelectedSession(sessionId);

    const session = branchSessions.find((s) => s.id === sessionId);
    console.log("Found Session:", session);

    if (!session || !session.branchSessionInfo) {
      console.error("Session not found or missing branchSessionInfo");
      return;
    }

    const parts = session.branchSessionInfo.split("-");

    if (parts.length !== 2) {
      console.error("Invalid session format:", session.branchSessionInfo);
      Swal.fire("Error", "Invalid session format. Expected format: YYYY-YYYY", "error");
      return;
    }

    const fromYear = parseInt(parts[0].trim());
    const toYear = parseInt(parts[1].trim());

    if (isNaN(fromYear) || isNaN(toYear) || fromYear >= toYear) {
      console.error("Failed to parse years or invalid range:", fromYear, toYear);
      Swal.fire("Error", "Invalid session year range", "error");
      return;
    }

    console.log("Parsed Years - From:", fromYear, "To:", toYear);

    // Financial year: April 1 of fromYear → March 31 of toYear
    const sessionStart = new Date(fromYear, 3, 1);  // April 1, fromYear
    const sessionEnd = new Date(toYear, 2, 31);     // March 31, toYear

    // ✅ FIX 3: Use real system date (new Date()), NOT commonservice.getTodaysDate()
    // commonservice returns the previously saved working date — using it caused
    // maxDate to become a past date (e.g. 12-04-2013) making the range invalid.
    const today = getRealToday();

    // ✅ FIX 4: Corrected maxDate logic
    // maxDate = the earlier of (sessionEnd, today)
    // If today is before sessionEnd → maxDate = today (can't select future dates)
    // If today is after sessionEnd → maxDate = sessionEnd (session has fully passed)
    const maxDate = today <= sessionEnd ? today : sessionEnd;

    // ✅ FIX 5: Validate that minDate is not after maxDate (edge case guard)
    if (sessionStart > maxDate) {
      console.warn("Session hasn't started yet or is entirely in the future");
      Swal.fire(
        "Warning",
        `Session ${session.branchSessionInfo} has not started yet or is not accessible.`,
        "warning"
      );
      setSelectedSession(null);
      return;
    }

    console.log("Session Date Range:", {
      sessionStart: sessionStart.toLocaleDateString(),
      sessionEnd: sessionEnd.toLocaleDateString(),
      today: today.toLocaleDateString(),
      maxDate: maxDate.toLocaleDateString(),
    });

    const newSessionDateRange: SessionData = {
      sessionFrom: fromYear.toString(),
      sessionTo: toYear.toString(),
      minDate: sessionStart,
      maxDate: maxDate,
    };

    setSessionDateRange(newSessionDateRange);

    // ✅ FIX 6: Auto-select today only if it falls within the valid session range
    if (today >= sessionStart && today <= maxDate) {
      setSelectedDate(today);
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      console.log("Auto-selected today's date:", today.toLocaleDateString());
    } else {
      // Start calendar view at the beginning of the session
      setCurrentMonth(new Date(fromYear, 3, 1));
      console.log("Today is outside session range; no auto-selection.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        dateInputRef.current &&
        !dateInputRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCalendarOpen && dateInputRef.current) {
      const rect = dateInputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setCalendarPosition("top");
        setCalendarCoords({ left: rect.left, top: rect.top });
      } else {
        setCalendarPosition("bottom");
        setCalendarCoords({ left: rect.left, top: rect.bottom });
      }
    }
  }, [isCalendarOpen]);

  const handleDateSelect = (day: number) => {
    if (!sessionDateRange) return;

    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    newDate.setHours(0, 0, 0, 0);

    if (
      newDate < sessionDateRange.minDate ||
      newDate > sessionDateRange.maxDate
    ) {
      console.log("Date out of range:", newDate.toLocaleDateString());
      return;
    }

    console.log("Date selected:", newDate.toLocaleDateString());
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
  };

  const handleTodayDate = () => {
    if (!sessionDateRange) return;

    // ✅ FIX 7: Use getRealToday() here too, not commonservice
    const today = getRealToday();

    if (today >= sessionDateRange.minDate && today <= sessionDateRange.maxDate) {
      setSelectedDate(today);
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      setIsCalendarOpen(false);
    } else {
      Swal.fire(
        "Out of Range",
        "Today's date is not within the selected session range.",
        "warning"
      );
    }
  };

  const save_working_date = async () => {
    try {
      if (selectedDate && selectedSession) {
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const month = selectedDate.toLocaleString("en-US", { month: "long" });
        const year = selectedDate.getFullYear();

        const formattedDate = `${day}-${month}-${year}`;
        const sessionInfo = `${sessionDateRange?.sessionFrom}-${sessionDateRange?.sessionTo}`;

        const result = await api.set_working_date(
          formattedDate,
          sessionInfo,
          selectedSession
        );

        if (!result.success) {
          Swal.fire(
            "Error",
            result.message || "Failed to set working date",
            "error"
          );
          return;
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.message || "Network error. Please try again.",
        "error"
      );
    }
  };

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedSession) {
      Swal.fire("Validation", "Please select a branch session first", "warning");
      return;
    }

    if (!selectedDate) {
      Swal.fire("Validation", "Please select a working date", "warning");
      return;
    }

    save_working_date();
  };

  const handleCancel = async () => {
    // ✅ FIX 8: Reset all state before logout to avoid stale state on next login
    resetDateState();
    setSelectedSession(null);
    setBranchSessions([]);

    const result = await commonservice.logout();
    if (!result.success) {
      Swal.fire("Error", result.message || "Logout failed", "error");
      return;
    }
    navigate("/");
  };

  // ✅ FIX 9: isMonthNavigable helpers to keep prev/next buttons tightly bounded
  const canGoToPrevMonth = (): boolean => {
    if (!sessionDateRange) return false;
    const prevMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    const minMonthStart = new Date(
      sessionDateRange.minDate.getFullYear(),
      sessionDateRange.minDate.getMonth(),
      1
    );
    return prevMonth >= minMonthStart;
  };

  const canGoToNextMonth = (): boolean => {
    if (!sessionDateRange) return false;
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    const maxMonthStart = new Date(
      sessionDateRange.maxDate.getFullYear(),
      sessionDateRange.maxDate.getMonth(),
      1
    );
    return nextMonth <= maxMonthStart;
  };

  const renderHeader = () => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    if (!sessionDateRange) return null;

    // ✅ FIX 10: Build year options from minDate.year to maxDate.year (not sessionFrom/To)
    // Using sessionFrom/To years could include years where no valid days exist in the
    // calendar, e.g. if maxDate is 12-04-2013 but sessionTo is 2014.
    const startYear = sessionDateRange.minDate.getFullYear();
    const endYear = sessionDateRange.maxDate.getFullYear();
    const yearOptions: number[] = [];
    for (let year = startYear; year <= endYear; year++) {
      yearOptions.push(year);
    }

    return (
      <div className="flex justify-between items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            if (!canGoToPrevMonth()) return;
            const newMonth =
              currentMonth.getMonth() === 0 ? 11 : currentMonth.getMonth() - 1;
            const newYear =
              currentMonth.getMonth() === 0
                ? currentMonth.getFullYear() - 1
                : currentMonth.getFullYear();
            setCurrentMonth(new Date(newYear, newMonth, 1));
          }}
          disabled={!canGoToPrevMonth()}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ◀️
        </button>

        <select
          value={currentMonth.getMonth()}
          onChange={(e) => {
            const newMonth = parseInt(e.target.value);
            const newDate = new Date(currentMonth.getFullYear(), newMonth, 1);
            const minMonthStart = new Date(
              sessionDateRange.minDate.getFullYear(),
              sessionDateRange.minDate.getMonth(),
              1
            );
            const maxMonthStart = new Date(
              sessionDateRange.maxDate.getFullYear(),
              sessionDateRange.maxDate.getMonth(),
              1
            );
            if (newDate >= minMonthStart && newDate <= maxMonthStart) {
              setCurrentMonth(newDate);
            }
          }}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthNames.map((month, index) => {
            const testDate = new Date(currentMonth.getFullYear(), index, 1);
            const minMonthStart = new Date(
              sessionDateRange.minDate.getFullYear(),
              sessionDateRange.minDate.getMonth(),
              1
            );
            const maxMonthStart = new Date(
              sessionDateRange.maxDate.getFullYear(),
              sessionDateRange.maxDate.getMonth(),
              1
            );
            const isDisabled = testDate < minMonthStart || testDate > maxMonthStart;

            return (
              <option key={index} value={index} disabled={isDisabled}>
                {month}
              </option>
            );
          })}
        </select>

        {/* ✅ FIX 11: Year dropdown now guaranteed to have options (startYear <= endYear always) */}
        <select
          value={currentMonth.getFullYear()}
          onChange={(e) => {
            const newYear = parseInt(e.target.value);
            const newDate = new Date(newYear, currentMonth.getMonth(), 1);

            // Clamp month if it's out of range for the selected year
            const minMonthStart = new Date(
              sessionDateRange.minDate.getFullYear(),
              sessionDateRange.minDate.getMonth(),
              1
            );
            const maxMonthStart = new Date(
              sessionDateRange.maxDate.getFullYear(),
              sessionDateRange.maxDate.getMonth(),
              1
            );

            if (newDate < minMonthStart) {
              setCurrentMonth(
                new Date(
                  sessionDateRange.minDate.getFullYear(),
                  sessionDateRange.minDate.getMonth(),
                  1
                )
              );
            } else if (newDate > maxMonthStart) {
              setCurrentMonth(
                new Date(
                  sessionDateRange.maxDate.getFullYear(),
                  sessionDateRange.maxDate.getMonth(),
                  1
                )
              );
            } else {
              setCurrentMonth(newDate);
            }
          }}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            if (!canGoToNextMonth()) return;
            const newMonth =
              currentMonth.getMonth() === 11 ? 0 : currentMonth.getMonth() + 1;
            const newYear =
              currentMonth.getMonth() === 11
                ? currentMonth.getFullYear() + 1
                : currentMonth.getFullYear();
            setCurrentMonth(new Date(newYear, newMonth, 1));
          }}
          disabled={!canGoToNextMonth()}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ▶️
        </button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 uppercase py-2">
        {dayNames.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
    );
  };

  const renderCalendarDays = () => {
    if (!sessionDateRange) return [];

    const startDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();

    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    const days = [];
    // ✅ FIX 12: Use getRealToday() for "today" highlight in calendar
    const today = getRealToday();

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      date.setHours(0, 0, 0, 0);

      const isOutsideRange =
        date < sessionDateRange.minDate || date > sessionDateRange.maxDate;

      const isSelected =
        selectedDate !== null &&
        selectedDate.getDate() === i &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();

      const isToday =
        today.getDate() === i &&
        today.getMonth() === currentMonth.getMonth() &&
        today.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={i}
          type="button"
          onClick={() => !isOutsideRange && handleDateSelect(i)}
          disabled={isOutsideRange}
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 text-sm font-medium
            ${
              isSelected
                ? "bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-300"
                : isToday && !isOutsideRange
                ? "border-2 border-blue-500 text-blue-600 font-semibold hover:bg-blue-50"
                : isOutsideRange
                ? "text-gray-300 cursor-not-allowed bg-gray-50"
                : "hover:bg-blue-100 text-gray-700 cursor-pointer"
            }
          `}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  // Format date as DD-MM-YYYY
  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-4000" />
      </div>

      <div className="relative z-10">
        <Header />
      </div>

      <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8 font-sans overflow-y-auto">
        <div className="w-full space-y-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">📅</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Working Date Setup
                </h1>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  🏢
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Select Branch Session
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Choose the financial year session
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col relative">
                <label
                  htmlFor="branchSession"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                  Branch Session <span className="text-red-500 text-xs">*</span>
                </label>
                <div className="relative group">
                  <select
                    id="branchSession"
                    value={selectedSession || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleSessionChange(parseInt(val));
                      } else {
                        // ✅ FIX 13: Fully reset when user clears the session dropdown
                        resetDateState();
                        setSelectedSession(null);
                      }
                    }}
                    disabled={loadingSessions}
                    className="w-full pl-4 pr-10 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all duration-300 text-gray-700 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingSessions
                        ? "Loading sessions..."
                        : "Select a session"}
                    </option>
                    {branchSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.branchSessionInfo}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                    📊
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  ℹ️ Select the financial year session to proceed
                </p>

                {branchSessions.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✅ {branchSessions.length} session(s) loaded
                  </p>
                )}
              </div>
            </div>
          </div>

          {selectedSession && sessionDateRange && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative animate-fade-in-up">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    📅
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Select Working Date
                    </h2>
                    <p className="text-xs text-gray-600 mt-1">
                      Session: {sessionDateRange.sessionFrom}-
                      {sessionDateRange.sessionTo} • Valid Range:{" "}
                      {formatDate(sessionDateRange.minDate)} to{" "}
                      {formatDate(sessionDateRange.maxDate)}
                    </p>
                  </div>
                </div>
              </div>

              <form className="p-6 sm:p-8" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex flex-col relative">
                    <label
                      htmlFor="workingDate"
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                    >
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                      Working Date{" "}
                      <span className="text-red-500 text-xs">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        ref={dateInputRef}
                        type="text"
                        id="workingDate"
                        required
                        value={formatDate(selectedDate)}
                        autoComplete="off"
                        onClick={() => setIsCalendarOpen(true)}
                        onFocus={() => setIsCalendarOpen(true)}
                        readOnly
                        className="w-full pl-4 pr-10 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-white cursor-pointer"
                        placeholder="Click to select date"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        📅
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      ℹ️ Click above to select a date within the session range
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105 text-sm sm:text-base"
                  >
                    ✖️ Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md text-sm sm:text-base"
                  >
                    💾 Save Working Date
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {isCalendarOpen &&
        selectedSession &&
        sessionDateRange &&
        createPortal(
          <div
            ref={calendarRef}
            className="absolute z-[9999] w-80 bg-white border border-gray-300 rounded-xl shadow-2xl animate-fade-in-up"
            style={{
              position: "fixed",
              left: `${calendarCoords.left}px`,
              top:
                calendarPosition === "bottom"
                  ? `${calendarCoords.top + 4}px`
                  : undefined,
              bottom:
                calendarPosition === "top"
                  ? `${window.innerHeight - calendarCoords.top + 4}px`
                  : undefined,
            }}
          >
            <div className="p-3 border-b border-gray-200 bg-blue-50">
              <div className="text-xs text-gray-600 mb-1">Selected Date</div>
              <div className="text-lg font-semibold text-gray-800">
                {formatDate(selectedDate) || "No date selected"}
              </div>
            </div>

            {renderHeader()}
            {renderDaysOfWeek()}
            <div className="grid grid-cols-7 gap-1 p-3">
              {renderCalendarDays()}
            </div>

            <div className="flex justify-between items-center p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={handleClearDate}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                Clear
              </button>

              <div className="text-xs text-gray-500">
                {formatDate(sessionDateRange.minDate)} -{" "}
                {formatDate(sessionDateRange.maxDate)}
              </div>

              <button
                type="button"
                onClick={handleTodayDate}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeIn 0.2s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};

export default WorkingDateMaster;