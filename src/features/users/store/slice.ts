import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { usersApi } from "../api";
import type { ListUsersResponse } from "../types";

type UsersState = {
  status: "idle" | "loading" | "succeeded" | "failed";
  data?: ListUsersResponse;
  error?: string;
};

const initialState: UsersState = {
  status: "idle",
};

export const fetchUsers = createAsyncThunk(
  "users/fetch",
  async (_, { rejectWithValue }) => {
    const res = await usersApi.list();
    if (!res.ok) return rejectWithValue(res.message);
    return res.data;
  },
);

const slice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = undefined;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Request failed";
      });
  },
});

export const usersReducer = slice.reducer;

