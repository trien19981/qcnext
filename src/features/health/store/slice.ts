import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { healthApi } from "../api";
import type { HealthResponse } from "../types";

type HealthState = {
  status: "idle" | "loading" | "succeeded" | "failed";
  data?: HealthResponse;
  error?: string;
};

const initialState: HealthState = {
  status: "idle",
};

export const fetchHealth = createAsyncThunk(
  "health/fetch",
  async (_, { rejectWithValue }) => {
    const res = await healthApi.get();
    if (!res.ok) return rejectWithValue(res.message);
    return res.data;
  },
);

const slice = createSlice({
  name: "health",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHealth.pending, (state) => {
        state.status = "loading";
        state.error = undefined;
      })
      .addCase(fetchHealth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchHealth.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Request failed";
      });
  },
});

export const healthReducer = slice.reducer;

