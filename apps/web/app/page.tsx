"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X, FileText, Plus, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { AppNavbar } from "@/components/AppNavbar";
import {
  getStoredDrafts,
  removeDraftById,
  clearAllDrafts,
  syncDraftsWithCloud,
  PrintDraftItem,
} from "@/lib/draftStorage";

export default function HomePage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [drafts, setDrafts] = useState<PrintDraftItem[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [previewImgErrors, setPreviewImgErrors] = useState<Record<string, boolean>>({});
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const handleUploadFilesClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (user) {
      router.push("/user/print");
    } else {
      setIsLoginPopupOpen(true);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      setIsLoginPopupOpen(false);
      router.push("/user/print");
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

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

    // Cross-device cloud sync: listens to user's drafts in Firebase RTDB
    let unsubscribeCloud = () => {};
    if (user?.uid) {
      unsubscribeCloud = syncDraftsWithCloud(user.uid);
    }

    return () => {
      window.removeEventListener("printmart_drafts_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      unsubscribeCloud();
    };
  }, [user?.uid]);

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
    const remaining = removeDraftById(id, user?.uid);
    setDrafts(remaining);
    if (remaining.length === 0) {
      setIsExpanded(false);
    }
  };

  const handleClearAllDrafts = () => {
    clearAllDrafts(user?.uid);
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
              <button
                type="button"
                onClick={handleUploadFilesClick}
                className="mt-3.5 w-36 h-9 sm:h-10 inline-flex items-center justify-center bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs sm:text-[13px] font-semibold rounded-lg shadow-xs active:scale-95 transition-all text-center cursor-pointer"
              >
                Upload Files
              </button>
            </div>

            {/* Icon: Documents */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none pointer-events-none">
              <img
                src="/home/documents-icon.webp"
                alt="Documents"
                className="w-full h-full object-contain"
              />
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
                Coming soon
              </button>
            </div>

            {/* Icon: Passport Photos */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none pointer-events-none">
              <img
                src="/home/passport-photos-icon.webp"
                alt="Passport photos"
                className="w-full h-full object-contain"
              />
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
                Coming soon
              </button>
            </div>

            {/* Icon: Photos */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none pointer-events-none">
              <img
                src="/home/photos-icon.webp"
                alt="Photos"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            FLOATING "VIEW CART" DRAFT WIDGET
            Ultra-smooth GPU-accelerated pill & expanded drawer
            ───────────────────────────────────────────────────────────── */}
        {!isDismissed && drafts.length > 0 && (
          <>
            {/* Smooth Backdrop */}
            <div
              className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
                isExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setIsExpanded(false)}
            />

            {/* 1. Collapsed Pill: 100% Mathematically Perfect Circle on both sides */}
            <div
              className={`fixed z-50 bottom-16 sm:bottom-6 inset-x-3.5 sm:inset-x-4 mx-auto max-w-[340px] sm:max-w-[370px] h-[52px] bg-[#0c831f] hover:bg-[#0a6e1a] rounded-full border border-emerald-600/40 shadow-[0_8px_30px_rgba(12,131,31,0.35)] cursor-pointer flex items-center justify-between px-3.5 select-none transition-all duration-200 ease-out will-change-transform ${
                isExpanded ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100 pointer-events-auto"
              }`}
              onClick={() => setIsExpanded(true)}
            >
              {/* Left: Thumbnail Preview Circle */}
              <div className="w-9 h-9 rounded-full border border-white/90 bg-white flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
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

              {/* Center: Sliding Title & Count Text */}
              {drafts.length === 1 ? (
                <div className="flex-1 text-left px-2.5 min-w-0">
                  <span className="font-bold text-xs sm:text-[13px] block leading-tight truncate text-white">
                    {drafts[0].title}
                  </span>
                  <span className="text-[10.5px] font-normal opacity-90 block leading-tight truncate text-white/90">
                    {drafts[0].pageCount ? `${drafts[0].pageCount} ${drafts[0].pageCount === 1 ? "page" : "pages"}` : "1 file"} • Tap to view draft
                  </span>
                </div>
              ) : (
                <div className="flex-1 text-left px-2.5 min-w-0 h-9 overflow-hidden relative">
                  <div
                    className="transition-transform duration-500 ease-in-out flex flex-col"
                    style={{ transform: `translateY(-${activeSlideIndex * 36}px)` }}
                  >
                    {drafts.map((d, idx) => (
                      <div key={d.id} className="h-9 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs sm:text-[13px] block leading-tight truncate text-white">
                            {d.title}
                          </span>
                          <span className="text-[9px] bg-white/25 text-white px-1.5 py-0.2 rounded-full font-semibold shrink-0 leading-tight">
                            {idx + 1}/{drafts.length}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-normal opacity-90 block leading-tight truncate text-white/90">
                          {d.pageCount} {d.pageCount === 1 ? "page" : "pages"} • Tap to view all drafts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right: Badge / Indicator + Dismiss Button */}
              <div className="flex items-center gap-1 shrink-0 pl-1">
                {drafts.length > 1 ? (
                  <div className="bg-white/20 text-white rounded-full px-2 py-0.5 text-[11px] font-bold flex items-center gap-0.5">
                    <span>{drafts.length}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDismissed(true);
                  }}
                  className="w-5 h-5 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center transition-colors ml-0.5"
                  title="Dismiss"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>

            {/* 2. Expanded Modal Box: Super Smooth Hardware-Accelerated Appearance */}
            <div
              className={`fixed z-50 bottom-16 sm:bottom-6 inset-x-3.5 sm:inset-x-4 mx-auto max-w-[400px] sm:max-w-[430px] bg-white rounded-2xl border border-neutral-200/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.28)] overflow-hidden transition-all duration-250 ease-out will-change-[transform,opacity] ${
                isExpanded
                  ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                  : "opacity-0 translate-y-6 scale-95 pointer-events-none"
              }`}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80 select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#0c831f] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-bold text-sm text-neutral-900 truncate">Saved Draft Prints</h3>
                      <span className="text-neutral-400 text-xs shrink-0">•</span>
                      <span className="text-xs font-bold text-[#0c831f] shrink-0">
                        {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">
                      Select a draft to configure and print in Studio
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="w-7 h-7 rounded-full bg-neutral-200/70 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors shrink-0 ml-2"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drafts List */}
              <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-neutral-100 p-2.5 sm:p-3 space-y-1.5">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white hover:bg-neutral-50/60 border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-colors"
                  >
                    {/* File Thumbnail Badge */}
                    <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4 text-[#0c831f]" />
                      <span className="text-[7px] font-bold uppercase text-neutral-600 mt-0.5 leading-none">
                        {((d.title || "DOC").split(".").pop() || "DOC").slice(0, 4)}
                      </span>
                    </div>

                    {/* Draft Details */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4
                        className="font-bold text-xs sm:text-[13px] text-neutral-900 truncate whitespace-nowrap block"
                        title={d.title}
                      >
                        {d.title}
                      </h4>
                      <div className="text-[11px] text-neutral-500 mt-0.5 truncate whitespace-nowrap flex items-center gap-1.5 overflow-hidden">
                        <span className="shrink-0 font-medium whitespace-nowrap">
                          {d.pageCount} {d.pageCount === 1 ? "page" : "pages"}
                        </span>
                        <span className="shrink-0 text-neutral-300">•</span>
                        <span className="shrink-0 font-medium whitespace-nowrap">
                          {d.config?.colorMode === "color" ? "Color" : "B&W"}
                        </span>
                        <span className="shrink-0 text-neutral-300">•</span>
                        <span className="shrink-0 font-medium whitespace-nowrap">
                          {d.config?.copies || 1} {(d.config?.copies || 1) === 1 ? "copy" : "copies"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/user/print?draftId=${encodeURIComponent(d.id)}`}
                        className="px-3 py-1.5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-0.5 shrink-0 whitespace-nowrap"
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
                        className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                        title="Remove draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 px-4 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleUploadFilesClick}
                  className="text-[#0c831f] hover:text-[#0a6e1a] font-bold flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload New Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllDrafts}
                  className="text-neutral-400 hover:text-red-600 transition-colors py-1 text-[11px] font-medium"
                >
                  Clear All Drafts
                </button>
              </div>
            </div>
          </>
        )}

      </main>

      {/* ── NOTIFICATION LOGIN POPUP MODAL ── */}
      {isLoginPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in select-none"
          onClick={() => setIsLoginPopupOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] sm:rounded-[18px] p-5 sm:p-6 max-w-[290px] sm:max-w-[320px] w-full shadow-2xl border-0 space-y-3.5 text-center animate-in zoom-in-95 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setIsLoginPopupOpen(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Notification Icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-xs border-0 text-[#0c831f] bg-emerald-50">
              <Lock className="w-6 h-6" />
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-neutral-900 leading-snug">
                Sign in Required
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed font-normal">
                Please sign in with Google to upload files and print across campus kiosks.
              </p>
            </div>

            {/* Sign in with Google Button with Google SVG and clean rounded-lg */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full h-10 bg-neutral-950 hover:bg-black text-white font-semibold text-xs rounded-lg transition-all border-0 cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
