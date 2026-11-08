"use client";

import React from "react";
import { AlertTriangle, Clock, Wrench, ShieldCheck, Printer } from "lucide-react";
import { MachineOverlay } from "@printmart/shared";

interface OverlayScreenProps {
  overlay: MachineOverlay;
  onOpenConfig: () => void;
}

export function OverlayScreen({ overlay, onOpenConfig }: OverlayScreenProps) {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf7ee] select-none">
      {/* ── Top Honey-Golden Header ── */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/40 px-5 sm:px-8 h-16 flex items-center justify-between shadow-2xs">
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

        <button
          type="button"
          onClick={onOpenConfig}
          className="px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-850 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          Staff Login
        </button>
      </header>

      {/* ── Main Overlay Card with Guilloché Pattern ── */}
      <main className="flex-1 guilloche-bg flex items-center justify-center p-6">
        <div className="kiosk-card max-w-lg w-full p-8 sm:p-10 flex flex-col items-center text-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-200/90 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Status Badge Icon */}
          <div className="w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 text-amber-700 flex items-center justify-center shadow-sm">
            <Wrench className="w-10 h-10" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {overlay.type || "MAINTENANCE MODE"}
            </span>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              {overlay.title || "Kiosk Unavailable"}
            </h1>
            <p className="text-sm font-medium text-neutral-600 max-w-sm mt-1">
              {overlay.message || "This self-service terminal is undergoing routine service. Please check back shortly or visit another PrintMart kiosk."}
            </p>
          </div>

          {overlay.countdownSeconds && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Estimated Return in ~{Math.round(overlay.countdownSeconds / 60)} minutes</span>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-100 w-full flex justify-center">
            <button
              type="button"
              onClick={onOpenConfig}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              Technician / Staff Maintenance Access
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
