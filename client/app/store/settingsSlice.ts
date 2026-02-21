import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ClockStyle = "digital" | "analog";
export type TimeFormat = "12h" | "24h";

interface SettingsState {
  clockStyle: ClockStyle;
  timeFormat: TimeFormat;
}

const initialState: SettingsState = {
  clockStyle: "digital",
  timeFormat: "12h",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setClockStyle: (state, action: PayloadAction<ClockStyle>) => {
      state.clockStyle = action.payload;
    },
    setTimeFormat: (state, action: PayloadAction<TimeFormat>) => {
      state.timeFormat = action.payload;
    },
    hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setClockStyle, setTimeFormat, hydrateSettings } = settingsSlice.actions;

export default settingsSlice.reducer;
