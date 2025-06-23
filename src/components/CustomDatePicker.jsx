"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
} from "lucide-react";

/* ─────────── Compact Date-Picker ─────────── */
export default function CustomDatePicker({
  value,
  onChange,
  label,
  isOpen,
  onToggle,
}) {
  /* ── local state ── */
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const containerRef = useRef(null);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  /* ── click-outside to close ── */
  useEffect(() => {
    const outside = (e) =>
      containerRef.current &&
      !containerRef.current.contains(e.target) &&
      isOpen &&
      onToggle(false);
    if (isOpen) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [isOpen, onToggle]);

  /* ── helpers ── */
  const display = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString() : "mm/dd/yyyy";

  const daysInView = (date) => {
    const y = date.getFullYear(),
      m = date.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < first.getDay(); i++) grid.push(null);
    for (let d = 1; d <= last; d++) grid.push(d);
    return grid;
  };

  /* store in “YYYY-MM-DD” (no TZ) */
  const pickDay = (d) => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth() + 1;
    const pad = (n) => String(n).padStart(2, "0");
    onChange(`${y}-${pad(m)}-${pad(d)}`);
    onToggle(false);
  };

  const isSel = (d) =>
    Boolean(
      value &&
        new Date(value + "T00:00:00").toDateString() ===
          new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toDateString()
    );

  const move = (dir) =>
    setCurrentMonth((p) => {
      const n = new Date(p);
      n.setMonth(p.getMonth() + (dir === "prev" ? -1 : 1));
      return n;
    });

  const years = () => {
    const base = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => base - 10 + i);
  };

  /* ── body renderer ── */
  const view = () => {
    if (showMonthPicker)
      return (
        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowMonthPicker(false)}
            className="mb-3 text-xs text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <div className="grid grid-cols-3 gap-1">
            {months.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setCurrentMonth((p) => new Date(p.getFullYear(), i, 1));
                  setShowMonthPicker(false);
                }}
                className={`py-1 text-xs rounded hover:bg-gray-100
                  ${currentMonth.getMonth() === i ? "bg-primary/10 text-primary" : ""}`}
              >
                {m.slice(0,3)}
              </button>
            ))}
          </div>
        </div>
      );

    if (showYearPicker)
      return (
        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowYearPicker(false)}
            className="mb-3 text-xs text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
            {years().map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setCurrentMonth((p) => new Date(y, p.getMonth(), 1));
                  setShowYearPicker(false);
                }}
                className={`py-1 text-xs rounded hover:bg-gray-100
                  ${currentMonth.getFullYear() === y ? "bg-primary/10 text-primary" : ""}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      );

    return (
      <div className="p-3">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => move("prev")} className="p-0.5 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setShowMonthPicker(true); setShowYearPicker(false); }}
              className="text-xs hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"
            >
              {months[currentMonth.getMonth()].slice(0,3)}
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => { setShowYearPicker(true); setShowMonthPicker(false); }}
              className="text-xs hover:bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"
            >
              {currentMonth.getFullYear()}
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <button type="button" onClick={() => move("next")} className="p-0.5 hover:bg-gray-100 rounded">
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* weekdays */}
        <div className="grid grid-cols-7 text-[10px] text-gray-500 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>

        {/* days */}
        <div className="grid grid-cols-7 gap-0.5">
          {daysInView(currentMonth).map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={!d}
              onClick={() => d && pickDay(d)}
              className={`h-6 w-6 text-[11px] rounded flex items-center justify-center
                ${!d ? "invisible" : ""}
                ${
                  isSel(d)
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ── markup ── */
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => onToggle(!isOpen)}
          className="w-full px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 text-left flex items-center justify-between hover:bg-gray-100"
        >
          <span className={value ? "text-gray-900 text-sm" : "text-gray-400 text-sm"}>
            {display(value)}
          </span>
          <Calendar className="h-4 w-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1
                          bg-white border border-gray-200 rounded-xl shadow-xl
                          z-[200] max-w-xs">
            {view()}
          </div>
        )}
      </div>
    </div>
  );
}
