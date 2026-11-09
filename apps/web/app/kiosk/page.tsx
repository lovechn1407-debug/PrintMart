"use client";

import React, { useState, useEffect } from "react";
import {
  Delete,
  ShieldCheck,
  Check,
  AlertCircle,
  RotateCw,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { database, ref, onValue } from "@/lib/firebase";

interface AdConfig {
  enabled: boolean;
  videoUrl?: string;
  slides?: string[];
  title?: string;
  subtitle?: string;
}

export default function OnlineKioskPage() {
  const machineId = "KM-01";
  const machineName = "Campus Kiosk #1";
  const masterCode = "998877";

  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState<string>("");

  // Staff Authorization Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>("");

  // Ad Area State from Admin / Firebase
  const [adConfig, setAdConfig] = useState<AdConfig>({
    enabled: false,
    videoUrl: "",
    slides: [],
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Clock
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

  // Listen to remote Ad configuration from Firebase RTDB (global or machine-specific)
  useEffect(() => {
    const adRef = ref(database, "systemSettings/kioskAds");
    const machineAdRef = ref(database, `machines/${machineId}/adConfig`);

    const unsubAd = onValue(adRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAdConfig((prev) => ({ ...prev, ...val }));
      }
    });

    const unsubMachineAd = onValue(machineAdRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAdConfig((prev) => ({ ...prev, ...val }));
      }
    });

    return () => {
      unsubAd();
      unsubMachineAd();
    };
  }, [machineId]);

  // Slides rotator
  useEffect(() => {
    if (!adConfig.slides || adConfig.slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % (adConfig.slides?.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [adConfig.slides]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen || noticeMessage || loading || isSuccess) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          const nextDigits = [...digits, e.key];
          setDigits(nextDigits);
          setHasError(false);
          if (nextDigits.length === 6) {
            setTimeout(() => handleSubmit(nextDigits.join("")), 80);
          }
        }
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1));
        setHasError(false);
      } else if (e.key === "Enter") {
        if (digits.length === 6) {
          handleSubmit(digits.join(""));
        }
      } else if (e.key === "Escape") {
        setDigits([]);
        setHasError(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [digits, isStaffModalOpen, noticeMessage, loading, isSuccess]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6 && !loading && !isSuccess) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      setHasError(false);
      if (nextDigits.length === 6) {
        setTimeout(() => handleSubmit(nextDigits.join("")), 80);
      }
    }
  };

  const handleBackspace = () => {
    if (!loading && !isSuccess) {
      setDigits((prev) => prev.slice(0, -1));
      setHasError(false);
    }
  };

  const handleClear = () => {
    if (!loading && !isSuccess) {
      setDigits([]);
      setHasError(false);
    }
  };

  const handleSubmit = async (otpStr: string) => {
    if (otpStr === masterCode || otpStr === "998877") {
      setDigits([]);
      setIsStaffModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      setHasError(false);

      const response = await fetch("/api/machine/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, otp: otpStr }),
      });
      const res = await response.json();

      if (res && res.success) {
        setIsSuccess(true);
      } else {
        setHasError(true);
        setNoticeMessage(
          res?.error || "Invalid OTP code. Please check your transaction receipt and re-enter."
        );
        setTimeout(() => {
          setDigits([]);
        }, 350);
      }
    } catch (err: any) {
      setHasError(true);
      setNoticeMessage(
        err.message || "Unable to reach vending server. Please verify network and try again."
      );
      setTimeout(() => {
        setDigits([]);
      }, 350);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStaffPin = () => {
    const cleanPin = staffPinInput.trim();
    if (cleanPin === masterCode || cleanPin === "998877") {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      setNoticeMessage("Staff Authorization Verified! Terminal is healthy.");
    } else {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      setNoticeMessage("Incorrect Master PIN. Configured in Admin -> Settings.");
    }
  };

  const hasAds =
    Boolean(adConfig.enabled) &&
    (Boolean(adConfig.videoUrl) || (adConfig.slides && adConfig.slides.length > 0));

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

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-800 bg-white/60 backdrop-blur-xs px-3 py-1 rounded-full border-0 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-neutral-700" />
            <span>{timeStr}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStaffPinInput("");
              setIsStaffModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
            title="Kiosk Administration"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff</span>
          </button>
        </div>
      </header>

      {/* ── 3. Exact User Site In-App Notification Modal Dialog on Error ── */}
      {noticeMessage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overscroll-none touch-none animate-in fade-in"
          onClick={() => setNoticeMessage(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border-0 space-y-3 touch-auto overscroll-contain animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-neutral-900">Notification</h4>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">
              {noticeMessage}
            </p>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="w-full h-10 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-xl transition-all border-0 cursor-pointer"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Main Workspace: Unified Card ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-center z-10">
        {hasAds ? (
          /* Split Card with Ad Area flush on right */
          <div className="w-full max-w-4xl bg-white rounded-[16px] shadow-[0_12px_45px_rgba(0,0,0,0.08)] border-0 overflow-hidden flex flex-col md:flex-row items-stretch transition-all duration-300">
            {/* LEFT: OTP Input Modal */}
            <div className="w-full md:w-[410px] lg:w-[430px] p-6 sm:p-7 flex flex-col items-center justify-between gap-3 bg-white shrink-0 border-0">
              <div className="flex flex-col items-center pt-1">
                <img
                  src="/brand/printmart-logo.webp"
                  alt="PrintMart"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>

              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-tight uppercase font-sans">
                  ENTER YOUR OTP
                </h1>
              </div>

              {/* 6 OTP Input Boxes */}
              <div className="w-full flex justify-center py-1 min-h-[64px] items-center">
                {isSuccess ? (
                  <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                    <div className="w-16 h-16 rounded-full bg-[#0c831f] text-white flex items-center justify-center shadow-xl animate-morph-circle">
                      <Check className="w-9 h-9 text-white stroke-[3.5] animate-in zoom-in-50 duration-300" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#0c831f] tracking-tight">
                      OTP Verified! Dispensing prints...
                    </span>
                  </div>
                ) : (
                  <div
                    className={`flex gap-2 sm:gap-2.5 justify-center w-full transition-all duration-300 ${
                      hasError ? "animate-shake" : ""
                    }`}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = digits[index];
                      const isFilled = digit !== undefined;
                      const isCurrent = index === digits.length;

                      return (
                        <div
                          key={index}
                          className={`w-11 h-13 sm:w-12 sm:h-14 rounded-[5px] flex items-center justify-center font-bold text-xl sm:text-2xl transition-all duration-200 select-none border-0 relative overflow-hidden ${
                            isFilled
                              ? "bg-slate-200 text-neutral-950"
                              : isCurrent
                              ? "bg-slate-200/90 text-neutral-900 ring-2 ring-neutral-950/20"
                              : "bg-slate-100 text-neutral-400"
                          }`}
                        >
                          {isFilled ? (
                            <span
                              className={`font-sans ${
                                loading
                                  ? "animate-shimmer-text"
                                  : "animate-digit-bounce inline-block"
                              }`}
                            >
                              {digit}
                            </span>
                          ) : isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {loading && !isSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
                  <span>Verifying code...</span>
                </div>
              )}

              {/* On-Screen Keypad */}
              <div className="w-full max-w-[310px] mx-auto select-none pt-1">
                <div className="grid grid-cols-3 gap-[1px] bg-neutral-800 p-[1px] rounded-[6px] overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleKeyPress("1")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tl-[5px] rounded-tr-none rounded-bl-none rounded-br-none disabled:opacity-50"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("2")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("3")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tr-[5px] rounded-tl-none rounded-bl-none rounded-br-none disabled:opacity-50"
                  >
                    3
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeyPress("4")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("5")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("6")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    6
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeyPress("7")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    7
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("8")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    8
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("9")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    9
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-neutral-300 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors border-0 rounded-bl-[5px] rounded-tl-none rounded-tr-none rounded-br-none disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("0")}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    disabled={loading || isSuccess}
                    className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white flex items-center justify-center cursor-pointer transition-colors border-0 rounded-br-[5px] rounded-tl-none rounded-tr-none rounded-bl-none disabled:opacity-50"
                    title="Backspace"
                  >
                    <Delete className="w-5 h-5 text-neutral-200" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: BLUE AD AREA */}
            <div className="flex-1 min-h-[380px] md:min-h-full bg-[#00bcd4] relative flex items-center justify-center overflow-hidden select-none border-0">
              {adConfig.videoUrl ? (
                <div className="w-full h-full relative">
                  <video
                    src={adConfig.videoUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMuted((prev) => !prev)}
                    className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-xs cursor-pointer border-0"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              ) : adConfig.slides && adConfig.slides.length > 0 ? (
                <div className="w-full h-full relative">
                  <img
                    src={adConfig.slides[activeSlideIndex]}
                    alt="Advertisement"
                    className="w-full h-full object-cover animate-in fade-in duration-500"
                  />
                  {adConfig.slides.length > 1 && (
                    <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5">
                      {adConfig.slides.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === activeSlideIndex
                              ? "bg-white w-5 shadow-sm"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-white space-y-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white/95 uppercase">
                    AD AREA
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Centered Card (No Ads) */
          <div className="w-full max-w-[420px] mx-auto bg-white rounded-[16px] p-6 sm:p-7 shadow-[0_12px_45px_rgba(0,0,0,0.08)] border-0 flex flex-col items-center gap-3.5 transition-all duration-300">
            <div className="flex flex-col items-center pt-1">
              <img
                src="/brand/printmart-logo.webp"
                alt="PrintMart"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight leading-tight uppercase font-sans">
                ENTER YOUR OTP
              </h1>
            </div>

            <div className="w-full flex justify-center py-1 min-h-[64px] items-center">
              {isSuccess ? (
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#0c831f] text-white flex items-center justify-center shadow-xl animate-morph-circle">
                    <Check className="w-9 h-9 text-white stroke-[3.5] animate-in zoom-in-50 duration-300" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#0c831f] tracking-tight">
                    OTP Verified! Dispensing prints...
                  </span>
                </div>
              ) : (
                <div
                  className={`flex gap-2 sm:gap-2.5 justify-center w-full transition-all duration-300 ${
                    hasError ? "animate-shake" : ""
                  }`}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = digits[index];
                    const isFilled = digit !== undefined;
                    const isCurrent = index === digits.length;

                    return (
                      <div
                        key={index}
                        className={`w-11 h-13 sm:w-12 sm:h-14 rounded-[5px] flex items-center justify-center font-bold text-xl sm:text-2xl transition-all duration-200 select-none border-0 relative overflow-hidden ${
                          isFilled
                            ? "bg-slate-200 text-neutral-950"
                            : isCurrent
                            ? "bg-slate-200/90 text-neutral-900 ring-2 ring-neutral-950/20"
                            : "bg-slate-100 text-neutral-400"
                        }`}
                      >
                        {isFilled ? (
                          <span
                            className={`font-sans ${
                              loading
                                ? "animate-shimmer-text"
                                : "animate-digit-bounce inline-block"
                            }`}
                          >
                            {digit}
                          </span>
                        ) : isCurrent ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {loading && !isSuccess && (
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
                <span>Verifying code...</span>
              </div>
            )}

            <div className="w-full max-w-[310px] mx-auto select-none pt-1">
              <div className="grid grid-cols-3 gap-[1px] bg-neutral-800 p-[1px] rounded-[6px] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => handleKeyPress("1")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tl-[5px] rounded-tr-none rounded-bl-none rounded-br-none disabled:opacity-50"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("2")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("3")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tr-[5px] rounded-tl-none rounded-bl-none rounded-br-none disabled:opacity-50"
                >
                  3
                </button>

                <button
                  type="button"
                  onClick={() => handleKeyPress("4")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("5")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("6")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  6
                </button>

                <button
                  type="button"
                  onClick={() => handleKeyPress("7")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("8")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("9")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  9
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-neutral-300 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors border-0 rounded-bl-[5px] rounded-tl-none rounded-tr-none rounded-br-none disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("0")}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl sm:text-2xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white flex items-center justify-center cursor-pointer transition-colors border-0 rounded-br-[5px] rounded-tl-none rounded-tr-none rounded-bl-none disabled:opacity-50"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5 text-neutral-200" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── 5. Staff PIN Modal ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border-0 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-neutral-900">Staff Authorization</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Enter Master Maintenance PIN</p>
            </div>

            <input
              type="password"
              value={staffPinInput}
              onChange={(e) => setStaffPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyStaffPin()}
              placeholder="Enter PIN..."
              autoFocus
              className="w-full h-11 text-center font-mono text-xl tracking-widest bg-neutral-100 rounded-xl border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyStaffPin}
                className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer border-0"
              >
                Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
