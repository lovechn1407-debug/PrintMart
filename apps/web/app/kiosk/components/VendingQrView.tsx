"use client";

import React from "react";
import { Smartphone, Printer, Zap, Sparkles, ExternalLink, CheckCircle } from "lucide-react";

interface GlobalPricingData {
  bwPerSidePaise: number;
  colorPerSidePaise: number;
  serviceChargePaise?: number;
}

interface VendingQrViewProps {
  targetUrl?: string;
  title?: string;
  subtitle?: string;
  pricing: GlobalPricingData;
  aspectRatio?: string;
}

export function VendingQrView({
  targetUrl = "https://itsprintmart.vercel.app",
  title,
  subtitle,
  pricing,
  aspectRatio = "16:9",
}: VendingQrViewProps) {
  const cleanUrl = targetUrl?.trim() || "https://itsprintmart.vercel.app";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(cleanUrl)}`;

  const bwRate = ((pricing.bwPerSidePaise ?? 150) / 100).toFixed(2);
  const colorRate = ((pricing.colorPerSidePaise ?? 500) / 100).toFixed(2);
  const isPortrait = ["9:16", "9:14", "3:4"].includes(aspectRatio);

  const displayTitle = title?.trim() || "Print from Your Phone";
  const displaySubtitle =
    subtitle?.trim() || "Scan QR with camera, upload PDF & dispense prints instantly.";

  if (isPortrait) {
    /* ══════════════════════════════════════════════════════════════════════
       PORTRAIT LAYOUT (9:16, 9:14, 3:4) - Vertically Stacked & Optimized
       ══════════════════════════════════════════════════════════════════════ */
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#090d16] text-white p-3.5 sm:p-4 flex flex-col items-center justify-between overflow-hidden select-none relative">
        {/* Decorative Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#0c831f]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Header & Badge */}
        <div className="w-full flex flex-col items-center text-center gap-1 z-10 pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mobile Vending Hub</span>
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight uppercase mt-0.5">
            {displayTitle}
          </h2>
          <p className="text-[11px] text-neutral-300 max-w-[240px] leading-tight line-clamp-2">
            {displaySubtitle}
          </p>
        </div>

        {/* 2. QR Code Scannable Card */}
        <div className="flex flex-col items-center gap-1.5 my-auto z-10 py-1">
          <div className="p-2 sm:p-2.5 bg-white rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.35)] border-2 border-emerald-500/30 relative">
            {/* Target Reticle Accents */}
            <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 rounded-br" />

            <img
              src={qrImageUrl}
              alt="Scan to Print"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold tracking-tight">
            <Smartphone className="w-3 h-3" />
            <span>Scan with Phone Camera</span>
          </div>
        </div>

        {/* 3. Dynamic Real-time Campus Rates */}
        <div className="w-full z-10 space-y-2 pb-0.5">
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Live Campus Print Rates</span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] mx-auto">
            {/* B&W Rate Card */}
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                B&W Print
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-black text-white">₹{bwRate}</span>
                <span className="text-[10px] text-neutral-400 font-medium">/page</span>
              </div>
            </div>

            {/* Color Rate Card */}
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Color Print
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-black text-emerald-400">₹{colorRate}</span>
                <span className="text-[10px] text-emerald-200/70 font-medium">/page</span>
              </div>
            </div>
          </div>

          {/* 3-Step Mini Flow */}
          <div className="flex items-center justify-center gap-2 pt-0.5 text-[9px] font-bold text-neutral-400">
            <span>1. Scan QR</span>
            <span>•</span>
            <span>2. Upload PDF</span>
            <span>•</span>
            <span className="text-emerald-400">3. Enter OTP Here</span>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     LANDSCAPE LAYOUT (16:9, 4:3, custom) - Side-by-Side Dual Column
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full h-full bg-gradient-to-r from-[#111827] via-[#0f172a] to-[#0a1120] text-white p-4 sm:p-5 flex items-center justify-between gap-4 overflow-hidden select-none relative">
      {/* Decorative Ambient Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#0c831f]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* LEFT COLUMN: Promo Info & Dynamic Price Cards */}
      <div className="flex-1 flex flex-col justify-between h-full z-10 py-1">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Instant Mobile Vending</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight uppercase">
            {displayTitle}
          </h2>
          <p className="text-xs text-neutral-300 max-w-sm leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* Dynamic Pricing Rates */}
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Dynamic Campus Rates</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-w-sm">
            {/* B&W Card */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                Black & White
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-white">₹{bwRate}</span>
                <span className="text-[11px] text-neutral-400 font-medium">/ side</span>
              </div>
            </div>

            {/* Color Card */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex flex-col">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Vibrant Color
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-emerald-400">₹{colorRate}</span>
                <span className="text-[11px] text-emerald-200/70 font-medium">/ side</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Steps */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 pt-1">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">1. Scan QR</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">2. Upload PDF</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            3. Enter OTP on Keypad
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Scannable QR Code */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-2 z-10 pl-2">
        <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-2 border-emerald-500/30 relative">
          {/* Target Reticle Accents */}
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />

          <img
            src={qrImageUrl}
            alt="Scan to Print"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain rounded-lg"
          />
        </div>

        <div className="text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-400 tracking-tight">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Point camera to open website</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {targetUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    </div>
  );
}
