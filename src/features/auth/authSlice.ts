import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "./types";

export type AuthState = {
  user: AuthUser | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearAuthUser(state) {
      state.user = null;
    },
  },
});

export const { setAuthUser, clearAuthUser } = authSlice.actions;
export const authReducer = authSlice.reducer;
