"use client";

import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setClockStyle, setTimeFormat, ClockStyle, TimeFormat } from "@/app/store/settingsSlice";

interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingItem({ label, description, children }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div>
        <p className="text-text-primary text-sm">{label}</p>
        {description && (
          <p className="text-text-muted text-xs mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface ToggleButtonGroupProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function ToggleButtonGroup<T extends string>({
  value,
  options,
  onChange,
}: ToggleButtonGroupProps<T>) {
  return (
    <div className="flex bg-bg-tertiary rounded-lg p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-3 py-1.5 text-xs rounded-md transition-all
            ${
              value === option.value
                ? "bg-accent text-bg-primary font-medium"
                : "text-text-secondary hover:text-text-primary"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const dispatch = useAppDispatch();
  const clockStyle = useAppSelector((s) => s.settings.clockStyle);
  const timeFormat = useAppSelector((s) => s.settings.timeFormat);

  return (
    <div className="h-full bg-bg-primary overflow-y-auto">
      <div className="max-w-xl mx-auto p-6">
        {/* Clock Settings Section */}
        <div className="mb-8">
          <h2 className="text-text-primary font-medium mb-1 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Clock
          </h2>
          <p className="text-text-muted text-xs mb-4">Customize the clock widget on your home screen</p>
          
          <div className="bg-bg-secondary rounded-xl p-4 border border-border/30">
            <SettingItem
              label="Clock Style"
              description="Choose between digital or analog display"
            >
              <ToggleButtonGroup
                value={clockStyle}
                options={[
                  { value: "digital" as ClockStyle, label: "Digital" },
                  { value: "analog" as ClockStyle, label: "Analog" },
                ]}
                onChange={(v) => dispatch(setClockStyle(v))}
              />
            </SettingItem>

            <SettingItem
              label="Time Format"
              description="12-hour (AM/PM) or 24-hour format"
            >
              <ToggleButtonGroup
                value={timeFormat}
                options={[
                  { value: "12h" as TimeFormat, label: "12 Hour" },
                  { value: "24h" as TimeFormat, label: "24 Hour" },
                ]}
                onChange={(v) => dispatch(setTimeFormat(v))}
              />
            </SettingItem>
          </div>
        </div>

        {/* Placeholder for more settings */}
        <div className="text-center py-8 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">More settings coming soon</p>
        </div>
      </div>
    </div>
  );
}
