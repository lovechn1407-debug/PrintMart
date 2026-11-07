"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "@/lib/authContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <AuthProvider>{children}</AuthProvider>
    </HeroUIProvider>
  );
}

