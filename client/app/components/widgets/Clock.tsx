"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/app/store/hooks";

function AnalogClock({ time }: { time: Date }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDeg = (hours + minutes / 60) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = seconds * 6;

  return (
    <div className="relative w-32 h-32">
      {/* Clock face */}
      <div className="absolute inset-0 rounded-full border-2 border-border/50 bg-bg-tertiary/50">
        {/* Hour markers */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-full"
            style={{ transform: `rotate(${i * 30}deg)` }}
          >
            <div
              className={`absolute top-1 left-1/2 -translate-x-1/2 ${
                i % 3 === 0 ? "w-0.5 h-2 bg-text-primary" : "w-0.5 h-1 bg-text-muted"
              }`}
            />
          </div>
        ))}

        {/* Hour hand */}
        <div
          className="absolute bottom-1/2 left-1/2 w-1 h-8 -ml-0.5 origin-bottom rounded-full bg-text-primary"
          style={{ transform: `rotate(${hourDeg}deg)` }}
        />

        {/* Minute hand */}
        <div
          className="absolute bottom-1/2 left-1/2 w-0.5 h-11 -ml-[1px] origin-bottom rounded-full bg-text-secondary"
          style={{ transform: `rotate(${minuteDeg}deg)` }}
        />

        {/* Second hand */}
        <div
          className="absolute bottom-1/2 left-1/2 w-[1px] h-12 origin-bottom bg-accent"
          style={{ transform: `rotate(${secondDeg}deg)` }}
        />

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-accent" />
      </div>
    </div>
  );
}

function DigitalClockDisplay({ time, is24Hour }: { time: Date; is24Hour: boolean }) {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  
  let displayHours: number;
  let ampm = "";
  
  if (is24Hour) {
    displayHours = hours;
  } else {
    displayHours = hours % 12 || 12;
    ampm = hours >= 12 ? "PM" : "AM";
  }

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-0.5">
        <span className="text-4xl font-light text-text-primary tracking-tight">
          {formatNumber(displayHours)}
        </span>
        <span className="text-4xl font-light text-accent animate-pulse">:</span>
        <span className="text-4xl font-light text-text-primary tracking-tight">
          {formatNumber(minutes)}
        </span>
        <span className="text-lg font-light text-text-secondary ml-1">
          {formatNumber(seconds)}
        </span>
      </div>
      {!is24Hour && (
        <span className="text-sm text-text-muted mt-0.5">{ampm}</span>
      )}
    </div>
  );
}

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);
  const clockStyle = useAppSelector((s) => s.settings.clockStyle);
  const timeFormat = useAppSelector((s) => s.settings.timeFormat);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const is24Hour = timeFormat === "24h";

  return (
    <div className="bg-bg-secondary/60 backdrop-blur-md rounded-xl p-4 border border-border/30 flex items-center justify-center">
      {clockStyle === "analog" ? (
        <AnalogClock time={time} />
      ) : (
        <DigitalClockDisplay time={time} is24Hour={is24Hour} />
      )}
    </div>
  );
}
