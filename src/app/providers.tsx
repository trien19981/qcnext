"use client";

import { Provider } from "react-redux";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { SessionBar } from "@/components/auth/SessionBar";
import { store } from "@/store/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
      <SessionBar />
    </Provider>
  );
}

