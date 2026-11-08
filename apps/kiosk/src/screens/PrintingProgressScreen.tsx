"use client";

import React, { useEffect, useState } from "react";
import { Printer, CheckCircle2, FileText, ArrowDown, Sparkles } from "lucide-react";
import { GuillocheAura } from "../components/GuillocheAura";

interface PrintingProgressScreenProps {
  jobDetails: {
    jobId: string;
    documentName: string;
    configuration: {
      colorMode: string;
      simplexDuplex: string;
      totalPagesToPrint: number;
      copies: number;
    };
  };
  onComplete: () => void;
}

export function PrintingProgressScreen({ jobDetails, onComplete }: PrintingProgressScreenProps) {
  const [pagesPrinted, setPagesPrinted] = useState<number>(0);
  const totalPages =
    (jobDetails.configuration?.totalPagesToPrint || 5) *
    (jobDetails.configuration?.copies || 1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    const kioskApi = (window as any).kioskApi;

    // Issue native print command to Electron main process if available
    if (kioskApi?.printJob) {
      kioskApi.printJob(jobDetails.jobId, jobDetails.configuration).then((res: any) => {
        if (res.success) {
          setIsCompleted(true);
          setTimeout(() => onComplete(), 3500);
        }
      });

      const unsub = kioskApi.onPrintProgress((data: any) => {
        if (data.jobId === jobDetails.jobId) {
          setPagesPrinted(data.printedPages);
        }
      });

      return () => unsub();
    } else {
      // Browser fallback simulation
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
    }
  }, [jobDetails, totalPages, onComplete]);

  const percentage = Math.min(100, Math.round((pagesPrinted / totalPages) * 100));

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
              High-Speed Laser Dispenser
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-800 bg-white/70 px-3 py-1 rounded-full border border-amber-400/40 shadow-2xs">
          <span>Job ID:</span>
          <code className="font-bold text-[#0c831f]">{jobDetails.jobId}</code>
        </div>
      </header>

      {/* ── Top Aura & Delicate SVG Guilloché Curves (Matching Homepage) ── */}
      <GuillocheAura />

      {/* ── Main Dispensing Card ── */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 z-10 relative flex flex-col justify-center py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-6 text-center animate-in zoom-in-95 duration-150">
          
          {/* Animated Status Icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs transition-all duration-300 ${
              isCompleted
                ? "bg-emerald-100 text-[#0c831f] scale-105"
                : "bg-emerald-50 text-[#0c831f] animate-pulse border border-emerald-200"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : (
              <Printer className="w-7 h-7" />
            )}
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight">
              {isCompleted ? "Print Order Completed!" : "Printing in Progress..."}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#5c6874] font-normal">
              {isCompleted
                ? "All pages have been laser printed and dispensed."
                : "High-speed laser engine is processing your document pages."}
            </p>
          </div>

          {/* Document Spec Card (Print Studio Summary Box) */}
          <div className="bg-neutral-50/80 p-4 rounded-xl border border-neutral-200/80 space-y-2 text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#0c831f] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs sm:text-sm text-neutral-900 block truncate">
                  {jobDetails.documentName || "PrintMart Document"}
                </span>
                <span className="text-[11px] text-neutral-500">
                  {jobDetails.configuration?.colorMode === "color" ? "🎨 Full Color" : "⚫ Black & White"} • {totalPages} {totalPages === 1 ? "page" : "pages"} total
                </span>
              </div>
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-neutral-600">Dispensing Pages</span>
              <span className="text-[#0c831f]">
                {pagesPrinted} of {totalPages} Pages ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#0c831f] h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Output Tray Callout */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs text-neutral-800 flex items-center justify-center gap-2 font-medium">
            <ArrowDown className="w-4 h-4 text-[#0c831f] shrink-0 animate-bounce" />
            <span>Collect your printed pages from the output tray below</span>
          </div>
        </div>
      </main>
    </div>
  );
}
