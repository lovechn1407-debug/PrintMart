"use client";

import React, { useEffect, useState } from "react";
import { Printer, CheckCircle2, FileText, ArrowDown, Sparkles } from "lucide-react";

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
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf7ee]">
      {/* Top Honey-Gold Bar */}
      <header className="bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] border-b border-amber-300/40 px-6 h-16 flex items-center justify-between shadow-2xs select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center shadow-xs">
            <Printer className="w-5 h-5 text-amber-300" />
          </div>
          <span className="font-extrabold text-lg text-neutral-950 tracking-tight leading-tight">
            Print<span className="text-[#0c831f]">Mart</span> Dispenser
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-800 bg-white/70 px-3 py-1 rounded-full border border-amber-400/40">
          Job ID: {jobDetails.jobId}
        </div>
      </header>

      {/* Main Dispensing Card with Guilloché Pattern */}
      <main className="flex-1 guilloche-bg flex items-center justify-center p-4 sm:p-8">
        <div className="kiosk-card max-w-lg w-full p-8 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-200/90 text-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* Animated Status Icon */}
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-sm transition-all duration-300 ${
              isCompleted
                ? "bg-emerald-100 text-[#0c831f] scale-105"
                : "bg-emerald-50 text-[#0c831f] animate-pulse border-2 border-emerald-300"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <Printer className="w-10 h-10" />
            )}
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              {isCompleted ? "Printing Complete!" : "Dispensing Your Sheets..."}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              {isCompleted
                ? "Please collect your fresh documents from the output tray below"
                : "High-speed laser spooling in progress. Please wait a moment."}
            </p>
          </div>

          {/* Document Spec Card */}
          <div className="w-full bg-neutral-50 rounded-2xl border border-neutral-200/80 p-4 text-left flex flex-col gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-700" /> Document Name
              </span>
              <span className="font-bold text-neutral-900 max-w-[200px] truncate">
                {jobDetails.documentName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Print Configuration</span>
              <span className="font-semibold text-neutral-800 capitalize bg-neutral-200/60 px-2 py-0.5 rounded text-[11px]">
                {jobDetails.configuration?.colorMode === "color" ? "🌈 Color" : "🖤 B&W"} • {jobDetails.configuration?.simplexDuplex}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-neutral-500 font-medium">Hardware Progress</span>
              <span className="font-bold text-[#0c831f]">
                {pagesPrinted} of {totalPages} Pages
              </span>
            </div>
          </div>

          {/* Progress Bar Gauge */}
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-neutral-600">Dispense Progress</span>
              <span className="text-[#0c831f]">{percentage}%</span>
            </div>
            <div className="w-full bg-neutral-100 h-4 rounded-full overflow-hidden border border-neutral-200 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#0c831f] to-[#10b981] h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Tray Arrow Callout */}
          <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-2">
            <ArrowDown className="w-4 h-4 text-amber-700 animate-bounce" />
            <span>Output Tray is located below the touchscreen</span>
          </div>
        </div>
      </main>
    </div>
  );
}
