"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, X, FileText, Plus, Trash2 } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import {
  getStoredDrafts,
  removeDraftById,
  clearAllDrafts,
  PrintDraftItem,
} from "@/lib/draftStorage";

export default function HomePage() {
  const [drafts, setDrafts] = useState<PrintDraftItem[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [previewImgErrors, setPreviewImgErrors] = useState<Record<string, boolean>>({});
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const loadDrafts = () => {
    const stored = getStoredDrafts();
    setDrafts(stored);
    if (stored.length === 0) {
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    loadDrafts();

    const handleUpdate = () => loadDrafts();
    window.addEventListener("printmart_drafts_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("printmart_drafts_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Smooth cycling index for sliding titles text when multiple drafts exist
  useEffect(() => {
    if (drafts.length <= 1) {
      setActiveSlideIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % drafts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [drafts.length]);

  const handleDeleteDraft = (id: string) => {
    const remaining = removeDraftById(id);
    setDrafts(remaining);
    if (remaining.length === 0) {
      setIsExpanded(false);
    }
  };

  const handleClearAllDrafts = () => {
    clearAllDrafts();
    setDrafts([]);
    setIsExpanded(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 pb-28 relative overflow-x-hidden">
      <AppNavbar />

      {/* ─────────────────────────────────────────────────────────────
          TOP AURA & FINE GUILLOCHÉ WAVY CONTOUR TEXTURE
          Matches the subtle banknote security lines in screenshot
          ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none overflow-hidden z-0">
        {/* Soft Golden Radial Glow */}
        <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#fde047]/40 via-[#fef08a]/15 to-transparent" />

        {/* Left Delicate Contour Guilloché Waves */}
        <svg
          className="absolute -top-6 -left-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`left-arc-${i}`}
              d={`M -20 ${20 + i * 16} C 120 ${10 + i * 16}, 210 ${90 + i * 16}, 260 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>

        {/* Right Delicate Contour Guilloché Waves */}
        <svg
          className="absolute -top-6 -right-12 w-80 h-96 opacity-30 text-[#d9b44a] pointer-events-none"
          viewBox="0 0 320 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`right-arc-${i}`}
              d={`M 340 ${20 + i * 16} C 200 ${10 + i * 16}, 110 ${90 + i * 16}, 60 ${240 + i * 16}`}
              stroke="currentColor"
              strokeWidth="0.85"
              strokeDasharray={i % 3 === 0 ? "3 3" : undefined}
            />
          ))}
        </svg>

        {/* Center Golden Halo */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-44 bg-radial from-[#fde68a]/30 via-transparent to-transparent blur-xl" />
      </div>

      {/* Main Print Store Container */}
      <main className="flex-1 w-full max-w-md sm:max-w-xl mx-auto px-3.5 sm:px-4 z-10 relative">
        
        {/* Generous Breathing Room at Top as in Screenshot */}
        <div className="text-center pt-12 sm:pt-16 pb-7 sm:pb-9">
          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#1c1c1c] tracking-tight leading-tight">
            Print Store
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5c6874] mt-2 font-normal tracking-wide">
            PrintMart ensures secure prints at every stage
          </p>
        </div>

        {/* Cards Stack */}
        <div className="space-y-3.5">
          
          {/* CARD 1: Documents */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
            <div className="flex-1 pr-1">
              <h2 className="text-base sm:text-lg font-bold text-[#1c1c1c] tracking-tight">
                Documents
              </h2>
              <ul className="mt-2 space-y-1 text-xs text-neutral-600 font-normal">
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Price starting at ₹3/page</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Paper quality: 70 GSM</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Single side prints</span>
                </li>
              </ul>
              <Link
                href="/user/print?new=1"
                className="mt-3.5 w-36 h-9 sm:h-10 inline-flex items-center justify-center bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs sm:text-[13px] font-semibold rounded-lg shadow-xs active:scale-95 transition-all text-center"
              >
                Upload Files
              </Link>
            </div>

            {/* Graphic: 3 Layered Documents */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none pointer-events-none">
              {/* Back Left Page */}
              <div className="absolute w-20 h-26 bg-white border border-slate-200 rounded-sm shadow-xs -rotate-12 -translate-x-3.5 p-1.5 flex flex-col justify-between">
                <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center text-[7px] text-cyan-700 font-bold">
                  DOC
                </div>
                <div className="space-y-1">
                  <div className="h-1 bg-slate-200 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-4/5" />
                  <div className="h-1 bg-slate-200 rounded w-2/3" />
                </div>
              </div>

              {/* Back Right Page */}
              <div className="absolute w-20 h-26 bg-white border border-slate-200 rounded-sm shadow-xs rotate-12 translate-x-3.5 p-1.5 flex flex-col justify-between">
                <div className="h-2.5 bg-sky-100 rounded w-3/4" />
                <div className="space-y-1">
                  <div className="h-1 bg-slate-200 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-3/4" />
                </div>
              </div>

              {/* Front Page with 'Lorem' Header */}
              <div className="absolute w-22 h-28 bg-white border border-slate-200/90 rounded-sm shadow-md rotate-2 p-2 flex flex-col z-10">
                <div className="bg-[#7e22ce] text-white font-bold text-[8px] px-1.5 py-0.5 rounded-xs tracking-wider mb-2 flex items-center justify-between">
                  <span>Lorem</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-1 bg-slate-300 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-11/12" />
                  <div className="h-1 bg-slate-200 rounded w-4/5" />
                  <div className="h-1 bg-slate-200 rounded w-full" />
                  <div className="h-1 bg-slate-200 rounded w-3/4" />
                  <div className="h-1 bg-slate-200 rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Passport Photos (Unavailable) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
            <div className="flex-1 pr-1">
              <h2 className="text-base sm:text-lg font-bold text-[#1c1c1c] tracking-tight">
                Passport photos
              </h2>
              <ul className="mt-2 space-y-1 text-xs text-neutral-600 font-normal">
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Printed on Kodak glossy paper</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Photo sets available: 8, 16, 32</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Paper quality 210 GSM</span>
                </li>
              </ul>
              <button
                type="button"
                disabled
                className="mt-3.5 w-36 h-9 sm:h-10 inline-flex items-center justify-center bg-[#e5e7eb] text-[#9ca3af] text-xs sm:text-[13px] font-semibold rounded-lg cursor-not-allowed select-none shadow-none text-center"
              >
                Unavailable
              </button>
            </div>

            {/* Graphic: Fanned Passport Photos with Portrait */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none pointer-events-none opacity-80">
              {/* Back Left Passport Photo */}
              <div className="absolute w-14 h-19 bg-white p-1 border border-slate-200 rounded-sm shadow-xs -rotate-12 -translate-x-4">
                <div className="w-full h-full bg-[#bfdbfe] rounded-xs flex flex-col items-center justify-end overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-[#60a5fa] mb-1" />
                  <div className="w-10 h-6 bg-[#1d4ed8] rounded-t-lg" />
                </div>
              </div>

              {/* Back Right Passport Photo */}
              <div className="absolute w-14 h-19 bg-white p-1 border border-slate-200 rounded-sm shadow-xs rotate-12 translate-x-4">
                <div className="w-full h-full bg-[#bfdbfe] rounded-xs flex flex-col items-center justify-end overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-[#60a5fa] mb-1" />
                  <div className="w-10 h-6 bg-[#1d4ed8] rounded-t-lg" />
                </div>
              </div>

              {/* Front Main Passport Portrait */}
              <div className="absolute w-18 h-24 bg-white p-1 border border-slate-200/90 rounded-sm shadow-md z-10 flex flex-col items-center">
                <div className="w-full h-full bg-gradient-to-b from-[#e0f2fe] to-[#bae6fd] rounded-xs relative overflow-hidden flex flex-col items-center justify-end">
                  <svg className="w-14 h-20 text-slate-700" viewBox="0 0 60 70" fill="none">
                    <path d="M16 35 C 14 12, 46 12, 44 35 C 48 48, 52 65, 52 70 L 8 70 C 8 65, 12 48, 16 35 Z" fill="#1e293b" />
                    <ellipse cx="30" cy="30" rx="10" ry="12" fill="#d97706" opacity="0.4" />
                    <ellipse cx="30" cy="30" rx="9" ry="11" fill="#fde68a" />
                    <path d="M26 34 Q 30 38 34 34" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="26" cy="28" r="1.2" fill="#1e293b" />
                    <circle cx="34" cy="28" r="1.2" fill="#1e293b" />
                    <path d="M12 70 L 22 46 L 30 52 L 38 46 L 48 70 Z" fill="#2563eb" />
                    <path d="M26 48 L 30 54 L 34 48" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Photos (Unavailable) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
            <div className="flex-1 pr-1">
              <h2 className="text-base sm:text-lg font-bold text-[#1c1c1c] tracking-tight">
                Photos
              </h2>
              <ul className="mt-2 space-y-1 text-xs text-neutral-600 font-normal">
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Printed on Kodak glossy paper</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Cropping & Editing available</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">✦</span>
                  <span>Paper quality 210 GSM</span>
                </li>
              </ul>
              <button
                type="button"
                disabled
                className="mt-3.5 w-36 h-9 sm:h-10 inline-flex items-center justify-center bg-[#e5e7eb] text-[#9ca3af] text-xs sm:text-[13px] font-semibold rounded-lg cursor-not-allowed select-none shadow-none text-center"
              >
                Unavailable
              </button>
            </div>

            {/* Graphic: Cluster of Sunflowers Photos */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex flex-col justify-between p-1 select-none pointer-events-none opacity-80">
              {/* Top Horizontal Photo */}
              <div className="w-full h-11 rounded-md bg-[#38bdf8] border border-white shadow-xs overflow-hidden relative flex items-center justify-around px-1">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute w-7 h-7 rounded-full bg-yellow-400" />
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-[#78350f]" />
                </div>
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <div className="absolute w-6 h-6 rounded-full bg-yellow-400" />
                  <div className="absolute w-3 h-3 rounded-full bg-[#78350f]" />
                </div>
              </div>

              {/* Bottom 2 Photos */}
              <div className="flex gap-1.5 h-13 mt-1">
                <div className="flex-1 bg-[#0284c7] rounded-md border border-white shadow-xs overflow-hidden flex items-center justify-center p-0.5">
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <div className="absolute w-5.5 h-5.5 rounded-full bg-yellow-400" />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-[#78350f]" />
                  </div>
                </div>

                <div className="flex-1 bg-white p-0.5 rounded-md border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex-1 bg-[#38bdf8] rounded-xs flex items-center justify-center overflow-hidden">
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <div className="absolute w-4.5 h-4.5 rounded-full bg-yellow-400" />
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-[#78350f]" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-white" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            FLOATING "VIEW CART" DRAFT WIDGET
            - Displays sliding text of draft document titles when multiple drafts exist
            - Clicking on the popup transforms it into an expanded rectangle box
            - In the rectangle box, all drafts are listed with a "Select" button to open in Print Studio
            ───────────────────────────────────────────────────────────── */}
        {!isDismissed && drafts.length > 0 && (
          <>
            {/* Backdrop for expanded rectangle box */}
            {isExpanded && (
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] animate-in fade-in duration-200"
                onClick={() => setIsExpanded(false)}
              />
            )}

            <div
              className={`fixed z-50 transition-all duration-300 ease-out inset-x-3.5 sm:inset-x-4 mx-auto ${
                isExpanded
                  ? "bottom-16 sm:bottom-6 max-w-sm sm:max-w-md"
                  : "bottom-16 sm:bottom-6 max-w-xs sm:max-w-sm"
              }`}
            >
              {!isExpanded ? (
                /* ── 1. COLLAPSED FLOATING PILL WITH SLIDING TITLE TEXT ── */
                <div className="relative flex items-center">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsExpanded(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setIsExpanded(true);
                    }}
                    className="w-full bg-[#0c831f] hover:bg-[#0a6e1a] text-white rounded-full px-3.5 py-2.5 flex items-center justify-between shadow-2xl transition-all active:scale-98 cursor-pointer select-none"
                  >
                    {/* Left: Preview Icon / Image */}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-white/95 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                      {(() => {
                        const currentDraft = drafts[activeSlideIndex] || drafts[0];
                        const isImg =
                          currentDraft?.previewUrl &&
                          !previewImgErrors[currentDraft.id] &&
                          (currentDraft.mimeType?.startsWith("image/") ||
                            currentDraft.title.match(/\.(jpe?g|png|webp|gif|svg)$/i));

                        if (isImg) {
                          return (
                            <img
                              src={currentDraft.previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={() =>
                                setPreviewImgErrors((prev) => ({
                                  ...prev,
                                  [currentDraft.id]: true,
                                }))
                              }
                            />
                          );
                        }

                        return (
                          <div className="w-full h-full bg-emerald-50 flex flex-col items-center justify-center p-0.5">
                            <FileText className="w-4 h-4 text-[#0c831f]" />
                            <span className="text-[7.5px] font-bold uppercase tracking-tight text-neutral-600 leading-none mt-0.5">
                              {((currentDraft?.title || "DOC").split(".").pop() || "DOC").slice(0, 4)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Center: Sliding Titles Animation */}
                    {drafts.length === 1 ? (
                      <div className="flex-1 text-left px-3 min-w-0">
                        <span className="font-bold text-xs sm:text-sm block leading-tight truncate text-white">
                          {drafts[0].title}
                        </span>
                        <span className="text-[11px] font-normal opacity-90 block leading-tight truncate text-white">
                          {drafts[0].pageCount ? `${drafts[0].pageCount} ${drafts[0].pageCount === 1 ? "page" : "pages"}` : "1 file"} • Tap to view draft
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 text-left px-3 min-w-0 h-9 overflow-hidden relative">
                        <div
                          className="transition-transform duration-500 ease-in-out flex flex-col"
                          style={{ transform: `translateY(-${activeSlideIndex * 36}px)` }}
                        >
                          {drafts.map((d, idx) => (
                            <div key={d.id} className="h-9 flex flex-col justify-center">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-xs sm:text-sm block leading-tight truncate text-white">
                                  {d.title}
                                </span>
                                <span className="text-[9.5px] bg-white/25 text-white px-1.5 py-0.2 rounded-full font-semibold shrink-0 leading-tight">
                                  {idx + 1}/{drafts.length}
                                </span>
                              </div>
                              <span className="text-[11px] font-normal opacity-90 block leading-tight truncate text-white">
                                {d.pageCount} {d.pageCount === 1 ? "page" : "pages"} • Tap to view all drafts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Right: Badge or Chevron */}
                    {drafts.length > 1 ? (
                      <div className="bg-white/20 hover:bg-white/30 text-white rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0">
                        <span>{drafts.length}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Dismiss X button on corner */}
                  <button
                    type="button"
                    onClick={() => setIsDismissed(true)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-800 text-white flex items-center justify-center shadow-md hover:bg-neutral-900 transition-colors"
                    title="Dismiss popup"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                /* ── 2. EXPANDED RECTANGLE BOX WITH ALL DRAFTS LIST & SELECT OPTION ── */
                <div className="bg-white text-neutral-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-neutral-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {/* Box Header */}
                  <div className="p-4 pb-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0c831f]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-neutral-900">Saved Draft Prints</h3>
                          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          Select a draft to configure and print in Studio
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="w-7 h-7 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* List of Drafts with Select Option on All */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 p-3 space-y-2">
                    {drafts.map((d) => (
                      <div
                        key={d.id}
                        className="bg-neutral-50/80 hover:bg-neutral-100/80 border border-neutral-200/70 rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors"
                      >
                        {/* File Thumbnail Badge */}
                        <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <FileText className="w-4 h-4 text-[#0c831f]" />
                          <span className="text-[7.5px] font-bold uppercase text-neutral-600 mt-0.5">
                            {((d.title || "DOC").split(".").pop() || "DOC").slice(0, 4)}
                          </span>
                        </div>

                        {/* Draft Details */}
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-bold text-xs sm:text-sm text-neutral-900 truncate" title={d.title}>
                            {d.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                            <span>{d.pageCount} {d.pageCount === 1 ? "page" : "pages"}</span>
                            <span>•</span>
                            <span className="capitalize">{d.config?.colorMode === "color" ? "Color" : "B&W"}</span>
                            <span>•</span>
                            <span>{d.config?.copies || 1} {(d.config?.copies || 1) === 1 ? "copy" : "copies"}</span>
                          </div>
                        </div>

                        {/* Actions: Select button opens in Print Studio */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/user/print?draftId=${encodeURIComponent(d.id)}`}
                            className="px-3.5 py-1.5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                          >
                            <span>Select</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteDraft(d.id);
                            }}
                            className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="Remove draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer: Upload New & Clear All */}
                  <div className="p-3 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <Link
                      href="/user/print?new=1"
                      className="text-[#0c831f] hover:text-[#0a6e1a] font-bold flex items-center gap-1.5 py-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload New Document</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleClearAllDrafts}
                      className="text-neutral-400 hover:text-red-600 transition-colors py-1"
                    >
                      Clear All Drafts
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
