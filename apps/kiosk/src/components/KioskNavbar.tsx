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
    <>
      {/* ── 1. Top iPhone-Style Dynamic Notch (Black, centered, with campus kiosk name) ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-neutral-950 text-white px-5 py-1.5 rounded-b-2xl shadow-xl flex items-center justify-center gap-2.5 pointer-events-none select-none border-t-0">
        {/* Camera Lens Circle */}
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700/80 shrink-0 shadow-inner" />
        
        {/* Campus Kiosk Name */}
        <span className="text-[11px] font-semibold tracking-tight text-neutral-200">
          {machineName || "Campus Kiosk"}
        </span>

        {/* Live Status Indicator Dot */}
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            printerState === "READY"
              ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              : "bg-amber-400"
          }`}
        />
      </div>

      {/* ── 2. Desktop Mode Header (Warm Honey-Golden Gradient matching User Panel) ── */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs select-none relative">
        {/* Brand Logo - Same as User Desktop Mode */}
        <div className="flex items-center gap-3 pl-1.5 sm:pl-2.5">
          <img
            src="/brand/printmart-logo.webp"
            alt="PrintMart"
            className="h-8.5 sm:h-9.5 w-auto object-contain"
          />
        </div>

        {/* Right: Live Clock & Staff Button (Dispenser Ready pill and Center pill removed) */}
        <div className="flex items-center gap-2.5">
          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-800 bg-white/60 backdrop-blur-xs px-3 py-1 rounded-full border-0 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-neutral-700" />
            <span>{timeStr}</span>
          </div>

          {/* Staff PIN Button */}
          <button
            type="button"
            onClick={onOpenStaff}
            className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
            title="Kiosk Administration"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff</span>
          </button>
        </div>
      </header>
    </>
  );
}
