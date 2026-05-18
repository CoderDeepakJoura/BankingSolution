import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (val: string) => void;
  onBlur?: (value: string) => void;
  min?: string;            // YYYY-MM-DD
  max?: string;            // YYYY-MM-DD
  workingDate?: string;    // YYYY-MM-DD — calendar always opens at this month
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const parseYMD = (s: string): Date | null => {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() + 1 !== m || dt.getDate() !== d) return null;
  return dt;
};

const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDisplay = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

// Parse DD/MM/YYYY typed by user → Date | null
const parseDMY = (s: string): Date | null => {
  const clean = s.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  const d = parseInt(clean.slice(0, 2), 10);
  const m = parseInt(clean.slice(2, 4), 10);
  const y = parseInt(clean.slice(4, 8), 10);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() + 1 !== m || dt.getDate() !== d) return null;
  return dt;
};

// Auto-format raw digits into DD/MM/YYYY as user types
const autoFormat = (digits: string): string => {
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  if (digits.length <= 2) return d;
  if (digits.length <= 4) return `${d}/${m}`;
  return `${d}/${m}/${y}`;
};

const todayDate = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  onBlur,
  min,
  max,
  workingDate,
  placeholder = "DD/MM/YYYY",
  className = "",
  disabled = false,
}) => {
  const selectedDate = value ? parseYMD(value) : null;
  const minDate = min ? parseYMD(min) : null;
  const maxDate = max ? parseYMD(max) : null;
  const workingDateParsed = workingDate ? parseYMD(workingDate) : null;

  // Raw text the user is actively typing; null = not in typing mode
  const [rawText, setRawText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0, bottom: 0 });
  const [position, setPosition] = useState<"bottom" | "top">("bottom");

  // Calendar opens at selected date's month; falls back to working date when empty
  const defaultCalendarMonth = (): Date => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const ref = workingDateParsed ?? maxDate;
    if (ref) return new Date(ref.getFullYear(), ref.getMonth(), 1);
    const t = todayDate();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  };

  const [currentMonth, setCurrentMonth] = useState<Date>(defaultCalendarMonth);

  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Sync calendar month as user types or arrows through the date
  useEffect(() => {
    if (rawText === null) return;
    const parsed = parseDMY(rawText);
    if (parsed) setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [rawText]);

  // Close calendar on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Text input handlers ───────────────────────────────────────────────────

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setRawText(autoFormat(digits));
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const cursorPos = inputRef.current?.selectionStart ?? 0;
      const delta = e.key === "ArrowUp" ? 1 : -1;

      // Base date: current rawText > selectedDate > workingDate > maxDate > today
      const base =
        (rawText ? parseDMY(rawText) : null) ??
        selectedDate ??
        workingDateParsed ??
        maxDate ??
        todayDate();

      let y = base.getFullYear();
      let m = base.getMonth();  // 0-based
      let d = base.getDate();

      // DD/MM/YYYY layout: 0-1 = day, 2 = '/', 3-4 = month, 5 = '/', 6-9 = year
      if (cursorPos <= 2) {
        // Day section
        d += delta;
        const maxDay = new Date(y, m + 1, 0).getDate();
        if (d < 1) d = maxDay;
        if (d > maxDay) d = 1;
      } else if (cursorPos <= 5) {
        // Month section
        m += delta;
        if (m < 0) m = 11;
        if (m > 11) m = 0;
        const maxDay = new Date(y, m + 1, 0).getDate();
        if (d > maxDay) d = maxDay;
      } else {
        // Year section
        y += delta;
        const maxDay = new Date(y, m + 1, 0).getDate();
        if (d > maxDay) d = maxDay;
      }

      const next = new Date(y, m, d);
      next.setHours(0, 0, 0, 0);
      if (minDate && next < minDate) return;
      if (maxDate && next > maxDate) return;

      const newDisplay = fmtDisplay(next);
      onChange(toYMD(next));
      setRawText(newDisplay);

      // Restore cursor to same section
      setTimeout(() => {
        inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      }, 0);
      return;
    }

    if (e.key === "Backspace" && rawText !== null) {
      const digits = rawText.replace(/\D/g, "");
      const shorter = digits.slice(0, -1);
      setRawText(autoFormat(shorter));
      e.preventDefault();
    }
  };

  const commitText = () => {
    if (rawText === null) return;
    const parsed = parseDMY(rawText);
    let committedValue = selectedDate ? toYMD(selectedDate) : "";
    if (parsed) {
      const inRange =
        (!minDate || parsed >= minDate) && (!maxDate || parsed <= maxDate);
      if (inRange) {
        committedValue = toYMD(parsed);
        onChange(committedValue);
        setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      } else {
        // Out of range — revert to last valid value
        setRawText(selectedDate ? fmtDisplay(selectedDate) : null);
      }
    } else if (rawText === "" || rawText.replace(/\D/g, "").length === 0) {
      committedValue = "";
      onChange("");
    } else {
      // Incomplete / invalid — revert
      setRawText(selectedDate ? fmtDisplay(selectedDate) : null);
    }
    setRawText(null);
    onBlur?.(committedValue);
  };

  const handleFocus = () => {
    if (disabled) return;
    // Enter typing mode: show current value as editable text
    setRawText(selectedDate ? fmtDisplay(selectedDate) : "");
    setOpen(false);
  };

  // ── Calendar handlers ─────────────────────────────────────────────────────

  const openCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setRawText(null);
    inputRef.current?.blur();
    // Always reset to working-date month on every open
    setCurrentMonth(defaultCalendarMonth());
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 360 && rect.top > spaceBelow) {
        setPosition("top");
        setCoords({ left: rect.left, top: rect.top, bottom: window.innerHeight - rect.top });
      } else {
        setPosition("bottom");
        setCoords({ left: rect.left, top: rect.bottom + 4, bottom: 0 });
      }
    }
    setOpen((prev) => !prev);
  };

  const monthStart = (m: Date) => new Date(m.getFullYear(), m.getMonth(), 1);

  const canPrev = (): boolean => {
    if (!minDate) return true;
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return prev >= monthStart(minDate);
  };

  const canNext = (): boolean => {
    if (!maxDate) return true;
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return next <= monthStart(maxDate);
  };

  const handleDayClick = (day: number) => {
    const dt = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    dt.setHours(0, 0, 0, 0);
    if (minDate && dt < minDate) return;
    if (maxDate && dt > maxDate) return;
    onChange(toYMD(dt));
    setOpen(false);
  };

  const handleToday = () => {
    const t = todayDate();
    if (minDate && t < minDate) return;
    if (maxDate && t > maxDate) return;
    onChange(toYMD(t));
    setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  // ── Year options: wide range ───────────────────────────────────────────────
  const today = todayDate();
  const startYear = minDate ? minDate.getFullYear() : today.getFullYear() - 100;
  const endYear   = maxDate ? maxDate.getFullYear() : today.getFullYear() + 5;
  const yearOptions: number[] = [];
  for (let y = startYear; y <= endYear; y++) yearOptions.push(y);

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay    = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  // What to show in the input
  const displayValue = rawText !== null
    ? rawText
    : selectedDate
    ? fmtDisplay(selectedDate)
    : "";

  return (
    <>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={handleFocus}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onBlur={commitText}
          inputMode="numeric"
          className={`pr-8 ${className} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text"}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={openCalendar}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40"
        >
          <Calendar size={14} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={calendarRef}
          style={{
            position: "fixed",
            left: coords.left,
            ...(position === "bottom" ? { top: coords.top } : { bottom: coords.bottom + 4 }),
            zIndex: 9999,
          }}
          className="w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-1 px-2 py-2 bg-slate-50 border-b border-slate-200">
            <button
              type="button"
              onClick={() => canPrev() && setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              disabled={!canPrev()}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed text-slate-600 font-bold text-base leading-none"
            >‹</button>

            <select
              value={currentMonth.getMonth()}
              onChange={(e) => {
                const nm = +e.target.value;
                const nd = new Date(currentMonth.getFullYear(), nm, 1);
                const minMs = minDate ? monthStart(minDate) : null;
                const maxMs = maxDate ? monthStart(maxDate) : null;
                if ((!minMs || nd >= minMs) && (!maxMs || nd <= maxMs)) setCurrentMonth(nd);
              }}
              className="flex-1 text-xs border border-slate-200 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              {MONTHS.map((name, i) => {
                const testMs = new Date(currentMonth.getFullYear(), i, 1);
                const minMs = minDate ? monthStart(minDate) : null;
                const maxMs = maxDate ? monthStart(maxDate) : null;
                const isDisabled = !!(minMs && testMs < minMs) || !!(maxMs && testMs > maxMs);
                return <option key={i} value={i} disabled={isDisabled}>{name}</option>;
              })}
            </select>

            <select
              value={currentMonth.getFullYear()}
              onChange={(e) => {
                const ny = +e.target.value;
                let nd = new Date(ny, currentMonth.getMonth(), 1);
                const minMs = minDate ? monthStart(minDate) : null;
                const maxMs = maxDate ? monthStart(maxDate) : null;
                if (minMs && nd < minMs) nd = monthStart(minDate!);
                if (maxMs && nd > maxMs) nd = monthStart(maxDate!);
                setCurrentMonth(nd);
              }}
              className="text-xs border border-slate-200 rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <button
              type="button"
              onClick={() => canNext() && setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              disabled={!canNext()}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed text-slate-600 font-bold text-base leading-none"
            >›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 uppercase px-2 pt-2 pb-1">
            {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-px px-2 pb-2">
            {Array.from({ length: startDay }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dt = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              dt.setHours(0, 0, 0, 0);
              const outside    = (minDate != null && dt < minDate) || (maxDate != null && dt > maxDate);
              const isSelected = selectedDate != null && toYMD(dt) === toYMD(selectedDate);
              const isToday    = toYMD(dt) === toYMD(today);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={outside}
                  onClick={() => handleDayClick(day)}
                  className={[
                    "h-8 w-full rounded-lg text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : isToday && !outside
                      ? "border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                      : outside
                      ? "text-slate-200 cursor-not-allowed"
                      : "text-slate-700 hover:bg-blue-50",
                  ].join(" ")}
                >{day}</button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
            <button type="button" onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
              Clear
            </button>
            <span className="text-xs text-slate-400">
              {minDate && maxDate
                ? `${fmtDisplay(minDate)} – ${fmtDisplay(maxDate)}`
                : minDate ? `From ${fmtDisplay(minDate)}`
                : maxDate ? `Up to ${fmtDisplay(maxDate)}`
                : ""}
            </span>
            <button type="button" onClick={handleToday}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DatePicker;
