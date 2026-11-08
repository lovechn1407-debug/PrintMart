"use client";

import React, { useState, useEffect } from "react";
import { Printer, ShieldCheck, Clock } from "lucide-react";

interface KioskNavbarProps {
  machineName: string;
  machineId: string;
  printerState: string;
  onOpenStaff: () => void;
}

export function KioskNavbar({
  machineName,
  machineId,
  printerState,
  onOpenStaff,
}: KioskNavbarProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs select-none">
      {/* ── Left: Brand Capsule Logo (Matching AppNavbar) ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
          <Printer className="w-4 h-4 text-amber-300" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight leading-tight">
            Print<span className="text-[#0c831f]">Mart</span>
          </span>
          <span className="text-[10px] font-semibold text-neutral-700 leading-none">
            Campus Kiosk
          </span>
        </div>
      </div>

      {/* ── Center: Terminal Location & Machine Badge ── */}
      <div className="hidden sm:flex items-center gap-2 bg-white/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-amber-400/40 shadow-2xs">
        <span className="text-xs font-semibold text-neutral-900 truncate max-w-[200px]">
          {machineName}
        </span>
        <span className="text-neutral-400 text-xs">•</span>
        <code className="text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
          {machineId}
        </code>
      </div>

      {/* ── Right: Live Telemetry, Clock & Staff Login ── */}
      <div className="flex items-center gap-2.5">
        {/* Printer State Beacon */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-amber-400/30 shadow-2xs text-xs font-semibold text-neutral-800">
          <span
            className={`w-2 h-2 rounded-full ${
              printerState === "READY"
                ? "bg-[#0c831f] animate-pulse"
                : "bg-amber-600"
            }`}
          />
          <span className="text-[11px]">
            {printerState === "READY" ? "Dispenser Ready" : printerState}
          </span>
        </div>

        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-800 bg-amber-200/50 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-neutral-700" />
          <span>{timeStr}</span>
        </div>

        {/* Staff PIN Button */}
        <button
          type="button"
          onClick={onOpenStaff}
          className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          <span>Staff</span>
        </button>
      </div>
    </header>
  );
}
