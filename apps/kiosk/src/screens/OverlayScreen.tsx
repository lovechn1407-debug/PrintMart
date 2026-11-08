"use client";

import React from "react";
import { AlertTriangle, Clock, Wrench, ShieldCheck, Printer } from "lucide-react";
import { MachineOverlay } from "@printmart/shared";
import { GuillocheAura } from "../components/GuillocheAura";

interface OverlayScreenProps {
  overlay: MachineOverlay;
  onOpenConfig: () => void;
}

export function OverlayScreen({ overlay, onOpenConfig }: OverlayScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none">
      {/* ── Signature Honey-Golden Header (Matching AppNavbar) ── */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs">
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

        <button
          type="button"
          onClick={onOpenConfig}
          className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          <span>Staff Login</span>
        </button>
      </header>

      {/* ── Top Aura & Delicate SVG Guilloché Curves (Matching Homepage) ── */}
      <GuillocheAura />

      {/* ── Main Overlay Card ── */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 z-10 relative flex flex-col justify-center py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-5 text-center animate-in zoom-in-95 duration-150">

          {/* Status Badge Icon */}
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Wrench className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200 inline-block">
              {overlay.type || "MAINTENANCE MODE"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight">
              {overlay.title || "Kiosk Unavailable"}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#5c6874] max-w-xs mx-auto leading-relaxed">
              {overlay.message || "This self-service terminal is undergoing routine service. Please visit another campus kiosk."}
            </p>
          </div>

          {overlay.countdownSeconds && (
            <div className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-50/70 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Estimated Return in ~{Math.round(overlay.countdownSeconds / 60)} minutes</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-100 flex justify-center">
            <button
              type="button"
              onClick={onOpenConfig}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5"
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
