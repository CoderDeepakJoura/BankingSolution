import React, { useState, useRef, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import Header from '../../components/Header';
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

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

  const dateInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const validate_token = async () => {
  try {
    await api.validate_token();
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      navigate("/session-expired");
    }
  }
};
validate_token();
  // Close the calendar if click occurs outside
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

  // Recalculate position when opened
  useEffect(() => {
    if (isCalendarOpen && dateInputRef.current) {
      const rect = dateInputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 320 && spaceAbove > spaceBelow) {
        setCalendarPosition("top");
        setCalendarCoords({ left: rect.left, top: rect.top });
      } else {
        setCalendarPosition("bottom");
        setCalendarCoords({ left: rect.left, top: rect.bottom });
      }
    }
  }, [isCalendarOpen]);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const today = new Date();

    // Prevent selecting future dates
    if (newDate > today) return;

    setSelectedDate(newDate);
    setIsCalendarOpen(false);
  };
  const save_working_date = async () => {
    try {
      if (selectedDate) {
        const day = String(selectedDate.getDate()).padStart(2, "0"); // 01
        const month = selectedDate.toLocaleString("en-US", { month: "long" }); // April
        const year = selectedDate.getFullYear(); // 2025

        const formattedDate = `${day}-${month}-${year}`;
        const result = await api.set_working_date(formattedDate);
        if (!result.success) {
          alert("Failed to set working date");
          return;
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      alert(error.message || "Network error. Please try again.");
    }
  };

  

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save_working_date();
  };

  const handleCancel = async () => {
    
    setSelectedDate(null);
      let result = await api.logout();
      navigate("/");
  };

  const renderHeader = () => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return (
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-t-xl border-b border-gray-200">
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
            )
          }
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          ◀️
        </button>
        <span className="text-base font-semibold text-gray-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
            )
          }
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
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
    const today = new Date();

    // Empty cells at start of month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      const isFuture = date > today;

      const isSelected =
        selectedDate &&
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
          onClick={() => !isFuture && handleDateSelect(i)}
          disabled={isFuture}
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
            ${
              isSelected
                ? "bg-blue-600 text-white shadow-lg scale-105"
                : isToday
                ? "border border-blue-500 text-blue-600 font-semibold"
                : isFuture
                ? "text-gray-400 cursor-not-allowed"
                : "hover:bg-blue-100 text-gray-700"
            }
          `}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Background Bubbles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-4000" />
      </div>

      <div className="relative z-10">
        <Header />
      </div>

      <div className=" bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">📅</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Working Date
                </h1>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  📅
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Select Working Date
                  </h2>
                </div>
              </div>
            </div>

            <form className="p-6 sm:p-8" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-6">
                {/* Date Field */}
                <div className="flex flex-col relative">
                  <label
                    htmlFor="workingDate"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                    Working Date <span className="text-red-500 text-xs">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      ref={dateInputRef}
                      type="text"
                      id="workingDate"
                      required
                      value={
                        selectedDate ? selectedDate.toLocaleDateString() : ""
                      }
                      autoComplete="off"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="w-full pl-4 pr-10 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-white cursor-pointer"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      📅
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    ℹ️ Please select the date to proceed.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
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
                  💾 Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Calendar Portal */}
      {isCalendarOpen &&
        createPortal(
          <div
            ref={calendarRef}
            className="absolute z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg animate-fade-in-up"
            style={{
              position: "fixed",
              left: calendarCoords.left,
              top:
                calendarPosition === "bottom"
                  ? calendarCoords.top + 4
                  : undefined,
              bottom:
                calendarPosition === "top"
                  ? window.innerHeight - calendarCoords.top + 4
                  : undefined,
            }}
          >
            {renderHeader()}
            {renderDaysOfWeek()}
            <div className="grid grid-cols-7 gap-1 p-3">
              {renderCalendarDays()}
            </div>
          </div>,
          document.body
        )}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeIn 0.25s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};

export default WorkingDateMaster;
