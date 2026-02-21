import { configureStore } from "@reduxjs/toolkit";
import workspaceReducer from "./workspaceSlice";
import settingsReducer from "./settingsSlice";

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Date objects in messages
        ignoredPaths: ["workspace.messages"],
        ignoredActions: ["workspace/addMessage"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
