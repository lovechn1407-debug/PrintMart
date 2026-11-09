"use client";

import React from "react";
import { AlertTriangle, Clock, Wrench, ShieldCheck, Printer, AlertCircle, PowerOff } from "lucide-react";
import { MachineOverlay } from "@printmart/shared";

interface OverlayScreenProps {
  overlay: MachineOverlay;
  machineName?: string;
  onOpenConfig: () => void;
}

export function OverlayScreen({ overlay, machineName = "Campus Kiosk", onOpenConfig }: OverlayScreenProps) {
  const typeStr = String(overlay.type || "MAINTENANCE");
  const isMaintenance = typeStr === "MAINTENANCE" || typeStr === "NETWORK_MAINTENANCE";
  const isError = typeStr === "PAPER_OUT" || typeStr.includes("ERROR");
  const isOffline = typeStr === "SERVICE_DISABLED" || typeStr.includes("OFFLINE") || typeStr.includes("DISABLED");

  let IconComponent = Wrench;
  let iconBgClass = "bg-amber-50 text-amber-600";
  let badgeBgClass = "bg-amber-100/70 text-amber-900";
  let defaultTitle = "Kiosk Under Maintenance";
  let defaultSubtitle =
    "This self-service terminal is undergoing routine service. Please visit another campus kiosk.";

  if (isError) {
    IconComponent = AlertCircle;
    iconBgClass = "bg-rose-50 text-rose-600";
    badgeBgClass = "bg-rose-100/70 text-rose-900";
    defaultTitle = "Hardware Service Required";
    defaultSubtitle = "The paper tray or laser engine needs attention. A technician has been notified.";
  } else if (isOffline) {
    IconComponent = PowerOff;
    iconBgClass = "bg-neutral-100 text-neutral-800";
    badgeBgClass = "bg-neutral-200/80 text-neutral-800";
    defaultTitle = "Kiosk Temporarily Disabled";
    defaultSubtitle = "This terminal has been temporarily paused by campus administration.";
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none font-sans">
      {/* ── 1. Top iPhone-Style Dynamic Notch ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-neutral-950 text-white px-5 py-1.5 rounded-b-2xl shadow-xl flex items-center justify-center gap-2.5 pointer-events-none select-none border-t-0">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700/80 shrink-0 shadow-inner" />
        <span className="text-[11px] font-semibold tracking-tight text-neutral-200">
          {machineName}
        </span>
        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 animate-pulse" />
      </div>

      {/* ── 2. Desktop Mode Header ── */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs select-none relative">
        <div className="flex items-center gap-3 pl-1.5 sm:pl-2.5">
          <img
            src="/brand/printmart-logo.webp"
            alt="PrintMart"
            className="h-8.5 sm:h-9.5 w-auto object-contain"
          />
        </div>

        <button
          type="button"
          onClick={onOpenConfig}
          className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          <span>Staff Login</span>
        </button>
      </header>

      {/* ── 3. Main Overlay Card (Zero Borders, Clean Soft Shadow, Matching App UI) ── */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 z-10 relative flex flex-col justify-center py-8">
        <div className="bg-white rounded-[20px] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-0 space-y-5 text-center animate-in zoom-in-95 duration-200">
          {/* Status Badge Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs border-0 ${iconBgClass}`}>
            <IconComponent className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border-0 inline-block ${badgeBgClass}`}>
              {overlay.type || "MAINTENANCE MODE"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight">
              {overlay.title || defaultTitle}
            </h1>
            <p className="text-xs sm:text-[13px] text-neutral-600 max-w-xs mx-auto leading-relaxed font-normal">
              {overlay.message || defaultSubtitle}
            </p>
          </div>

          {overlay.countdownSeconds && (
            <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-50/80 rounded-xl border-0 text-xs font-semibold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Estimated Return in ~{Math.round(overlay.countdownSeconds / 60)} minutes</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-100 flex justify-center">
            <button
              type="button"
              onClick={onOpenConfig}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5 border-0 bg-transparent"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
              <span>Technician Maintenance Login</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
