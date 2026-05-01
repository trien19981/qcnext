import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/features/auth";
import { healthReducer } from "@/features/health";
import { usersReducer } from "@/features/users";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    health: healthReducer,
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

