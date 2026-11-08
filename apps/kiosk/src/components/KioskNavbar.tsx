"use client";

import React, { useState, useEffect } from "react";
import { Printer, ShieldCheck, Clock, Wifi } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/40 px-5 sm:px-8 h-16 flex items-center justify-between shadow-2xs select-none">
      {/* ── Left: Brand Capsule Logo ── */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center shadow-xs">
          <Printer className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg text-neutral-950 tracking-tight leading-tight">
            Print<span className="text-[#0c831f]">Mart</span>
          </span>
          <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider leading-none">
            Self-Service Kiosk
          </span>
        </div>
      </div>

      {/* ── Center: Terminal Location & Machine Badge ── */}
      <div className="hidden sm:flex items-center gap-2.5 bg-white/70 backdrop-blur-xs px-4 py-1.5 rounded-full border border-amber-400/40 shadow-2xs">
        <span className="text-xs font-bold text-neutral-900 truncate max-w-[200px]">
          {machineName}
        </span>
        <span className="text-neutral-400 text-xs">•</span>
        <code className="text-[11px] font-mono font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
          {machineId}
        </code>
      </div>

      {/* ── Right: Live Telemetry, Clock & Staff Login ── */}
      <div className="flex items-center gap-3">
        {/* Printer State Beacon */}
        <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-amber-400/40 shadow-2xs text-xs font-bold text-neutral-800">
          <span
            className={`w-2 h-2 rounded-full ${
              printerState === "READY"
                ? "bg-[#0c831f] animate-pulse"
                : "bg-amber-600"
            }`}
          />
          <span>{printerState === "READY" ? "Dispenser Ready" : printerState}</span>
        </div>

        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-800 bg-amber-200/50 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-neutral-700" />
          <span>{timeStr}</span>
        </div>

        {/* Staff / Maintenance Pill Button */}
        <button
          type="button"
          onClick={onOpenStaff}
          className="px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-850 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          Staff
        </button>
      </div>
    </header>
  );
}

