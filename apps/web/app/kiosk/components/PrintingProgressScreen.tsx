"use client";

import React, { useEffect, useState } from "react";
import { Printer, CheckCircle2, FileText, ArrowDown, Sparkles, Check } from "lucide-react";

interface PrintingProgressScreenProps {
  jobDetails: {
    jobId: string;
    documentName?: string;
    configuration: {
      colorMode: string;
      simplexDuplex: string;
      totalPagesToPrint: number;
      copies: number;
    };
  };
  machineName?: string;
  onComplete: () => void;
}

export function PrintingProgressScreen({
  jobDetails,
  machineName = "Campus Kiosk",
  onComplete,
}: PrintingProgressScreenProps) {
  const [pagesPrinted, setPagesPrinted] = useState<number>(0);
  const totalPages =
    (jobDetails.configuration?.totalPagesToPrint || 5) *
    (jobDetails.configuration?.copies || 1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Browser simulation for web preview
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setPagesPrinted(current);
      if (current >= totalPages) {
        clearInterval(interval);
        setIsCompleted(true);
        setTimeout(() => onComplete(), 3500);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [jobDetails, totalPages, onComplete]);

  const percentage = Math.min(100, Math.round((pagesPrinted / totalPages) * 100));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none font-sans">
      {/* ── 1. Top iPhone-Style Dynamic Notch ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-neutral-950 text-white px-5 py-1.5 rounded-b-2xl shadow-xl flex items-center justify-center gap-2.5 pointer-events-none select-none border-t-0">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700/80 shrink-0 shadow-inner" />
        <span className="text-[11px] font-semibold tracking-tight text-neutral-200">
          {machineName}
        </span>
        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
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

        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-800 bg-white/70 px-3 py-1 rounded-full border-0 shadow-2xs">
          <span>Job ID:</span>
          <code className="font-bold text-[#0c831f]">{jobDetails.jobId}</code>
        </div>
      </header>

      {/* ── 3. Main Dispensing Card (Zero Borders, Matching App UI) ── */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 z-10 relative flex flex-col justify-center py-8">
        <div className="bg-white rounded-[20px] p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-0 space-y-6 text-center animate-in zoom-in-95 duration-200">
          {/* Animated Status Icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xs transition-all duration-300 border-0 ${
              isCompleted
                ? "bg-emerald-50 text-[#0c831f] scale-110"
                : "bg-amber-50 text-amber-600 animate-pulse"
            }`}
          >
            {isCompleted ? (
              <Check className="w-8 h-8 stroke-[3.5] text-[#0c831f]" />
            ) : (
              <Printer className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block border-0 ${
                isCompleted
                  ? "bg-emerald-100 text-[#0c831f]"
                  : "bg-amber-100/70 text-amber-900"
              }`}
            >
              {isCompleted ? "Printing Complete" : "Laser Spooler Active"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight">
              {isCompleted ? "Please Collect Your Prints" : "Dispensing Document..."}
            </h1>
            <p className="text-xs sm:text-[13px] text-neutral-600 max-w-xs mx-auto leading-relaxed">
              {isCompleted
                ? "Your document has been printed and dispensed into the exit tray below."
                : `Printing page ${pagesPrinted} of ${totalPages}. Keep the tray clear.`}
            </p>
          </div>

          {/* Progress Bar & Page Counter */}
          <div className="space-y-2 bg-neutral-50 p-4 rounded-xl border-0">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  {pagesPrinted} of {totalPages} pages dispensed
                </span>
              </span>
              <span className="font-mono font-bold text-[#0c831f] text-sm">
                {percentage}%
              </span>
            </div>

            <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted ? "bg-[#0c831f]" : "bg-neutral-900"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Print Options Pills (Clean Zero-Border Badges) */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-neutral-600">
            <span className="px-2.5 py-1 rounded-md bg-neutral-100 border-0">
              {jobDetails.configuration?.colorMode === "COLOR" ? "Color Print" : "Black & White"}
            </span>
            <span>•</span>
            <span className="px-2.5 py-1 rounded-md bg-neutral-100 border-0">
              {jobDetails.configuration?.simplexDuplex === "DUPLEX" ? "Double-Sided" : "Single-Sided"}
            </span>
            <span>•</span>
            <span className="px-2.5 py-1 rounded-md bg-neutral-100 border-0">
              {jobDetails.configuration?.copies || 1} {jobDetails.configuration?.copies === 1 ? "Copy" : "Copies"}
            </span>
          </div>

          {/* Exit Tray Callout */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700">
            <ArrowDown className="w-4 h-4 text-[#0c831f] animate-bounce" />
            <span>Collect from bottom delivery tray</span>
          </div>
        </div>
      </main>
    </div>
  );
}
