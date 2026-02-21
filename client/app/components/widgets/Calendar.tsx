"use client";

import { useState, useEffect } from "react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  if (!currentDate) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = currentDate.getDate();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="bg-bg-secondary/60 backdrop-blur-md rounded-xl p-3 border border-border/30 w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-primary">
          {MONTHS[month]} {year}
        </span>
        <span className="text-2xl font-light text-accent">{today}</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-[9px] text-text-muted font-medium py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              w-6 h-6 flex items-center justify-center text-[10px] rounded
              ${day === null ? "" : "hover:bg-bg-hover cursor-default"}
              ${
                day === today
                  ? "bg-accent text-bg-primary font-medium"
                  : "text-text-secondary"
              }
            `}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
