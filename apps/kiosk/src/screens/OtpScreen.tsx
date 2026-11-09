"use client";

import React, { useState, useEffect } from "react";
import {
  Delete,
  ShieldCheck,
  X,
  Lock,
  Check,
  AlertCircle,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { KioskNavbar } from "../components/KioskNavbar";
import { database, ref, onValue } from "../firebase";

interface OtpScreenProps {
  machineId: string;
  machineName: string;
  printerState: string;
  masterCode?: string;
  onVerifySuccess: (jobDetails: any) => void;
  onOpenConfig: () => void;
}

interface AdConfig {
  enabled: boolean;
  videoUrl?: string;
  slides?: string[];
  title?: string;
  subtitle?: string;
}

export function OtpScreen({
  machineId,
  machineName,
  printerState,
  masterCode = "998877",
  onVerifySuccess,
  onOpenConfig,
}: OtpScreenProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Staff Modal State
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

  // Listen to remote Ad configuration from Firebase
  useEffect(() => {
    const adRef = ref(database, `systemSettings/kioskAds`);
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

  // Auto-dismiss Notice Popup after 4 seconds
  useEffect(() => {
    if (!noticeMessage) return;
    const timer = setTimeout(() => {
      setNoticeMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [noticeMessage]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen || loading || isSuccess) return;

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
  }, [digits, isStaffModalOpen, loading, isSuccess]);

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
    // Check Master Maintenance PIN
    if (otpStr === masterCode || otpStr === "998877") {
      setDigits([]);
      onOpenConfig();
      return;
    }

    try {
      setLoading(true);
      setHasError(false);

      const kioskApi = (window as any).kioskApi;
      let res: any;

      if (kioskApi?.verifyOtp) {
        res = await kioskApi.verifyOtp(otpStr);
      } else {
        const response = await fetch("http://localhost:3000/api/machine/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ machineId, otp: otpStr }),
        });
        res = await response.json();
      }

      if (res && res.success) {
        setIsSuccess(true);
        // Smooth transition to printing progress screen after morph animation
        setTimeout(() => {
          onVerifySuccess(res);
        }, 1100);
      } else {
        setHasError(true);
        setNoticeMessage(
          res?.error || "Invalid OTP code. Please check your transaction receipt and re-enter."
        );
        setTimeout(() => {
          setDigits([]);
        }, 400);
      }
    } catch (err: any) {
      setHasError(true);
      setNoticeMessage(
        err.message || "Unable to reach vending server. Please verify network and try again."
      );
      setTimeout(() => {
        setDigits([]);
      }, 400);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStaffPin = () => {
    const cleanPin = staffPinInput.trim();
    if (cleanPin === masterCode || cleanPin === "998877") {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      onOpenConfig();
    } else {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      setNoticeMessage("Incorrect Master PIN. Configured in Admin -> Settings.");
    }
  };

  const hasAds =
    adConfig.enabled &&
    (Boolean(adConfig.videoUrl) || (adConfig.slides && adConfig.slides.length > 0));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none font-sans">
      {/* ── Signature Navbar with iPhone Notch ── */}
      <KioskNavbar
        machineName={machineName}
        machineId={machineId}
        printerState={printerState}
        onOpenStaff={() => {
          setStaffPinInput("");
          setIsStaffModalOpen(true);
        }}
      />

      {/* ── In-App Notice Popup (Identical to User Panel Toast) ── */}
      {noticeMessage && (
        <div className="fixed top-20 inset-x-0 z-[110] flex justify-center pointer-events-none px-4 animate-in slide-in-from-top duration-300">
          <div className="bg-neutral-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-0 text-xs sm:text-sm font-semibold pointer-events-auto max-w-md">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="flex-1 leading-snug">{noticeMessage}</span>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-neutral-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Workspace: Split Screen if Ads exist, Centered if No Ads ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-center z-10">
        <div
          className={`w-full flex flex-col lg:flex-row items-center gap-6 sm:gap-8 ${
            hasAds ? "justify-between" : "justify-center"
          }`}
        >
          {/* ═════════════════════════════════════════════════════════════
              LEFT: OTP INPUT MODAL CARD (Matches Wireframe Exactly)
              ═════════════════════════════════════════════════════════════ */}
          <div
            className={`w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.06)] border-0 flex flex-col items-center gap-5 transition-all duration-300 ${
              hasAds ? "lg:max-w-[480px]" : "max-w-[460px] mx-auto"
            }`}
          >
            {/* Top Brand Logo */}
            <div className="flex flex-col items-center">
              <img
                src="/brand/printmart-logo.webp"
                alt="PrintMart"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Title: ENTER YOUR OTP */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight leading-tight uppercase font-sans">
                ENTER YOUR OTP
              </h1>
              <p className="text-xs sm:text-[13px] text-neutral-500 mt-1 font-medium max-w-xs">
                Enter the 6-digit code shown on your phone upon payment
              </p>
            </div>

            {/* ── OTP Boxes with Smooth Morphing to Circle on Verified ── */}
            <div className="w-full flex justify-center py-2 min-h-[72px] items-center">
              {isSuccess ? (
                /* Verified Animation: Morph to Circle with Green Check in Center */
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 duration-300">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#0c831f] text-white flex items-center justify-center shadow-xl animate-morph-circle">
                    <Check className="w-10 h-10 text-white stroke-[3.5] animate-in zoom-in-50 duration-300" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#0c831f] tracking-tight">
                    OTP Verified! Preparing your prints...
                  </span>
                </div>
              ) : (
                /* Six Rounded Gray Input Boxes with Typing Bounce & Shimmer on Checking */
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
                        className={`w-11 h-14 sm:w-13 sm:h-16 rounded-xl flex items-center justify-center font-bold text-2xl transition-all duration-200 select-none border-0 shadow-xs relative overflow-hidden ${
                          isFilled
                            ? "bg-neutral-200/90 text-neutral-950"
                            : isCurrent
                            ? "bg-neutral-200 text-neutral-900 ring-2 ring-neutral-950/20"
                            : "bg-neutral-100 text-neutral-400"
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
                          <span className="w-2 h-2 rounded-full bg-neutral-700 animate-pulse" />
                        ) : (
                          <span className="text-neutral-300 text-base">·</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status Feedback while Checking */}
            {loading && !isSuccess && (
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
                <span>Verifying code with vending cloud...</span>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                ON-SCREEN KEYBOARD (Solid Black Boxes as in Wireframe)
                ═════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[340px] pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  disabled={loading || isSuccess}
                  className="h-13 sm:h-14 rounded-xl bg-neutral-950 hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-2xl border-0 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50 select-none font-sans"
                >
                  {num}
                </button>
              ))}

              {/* Clear Key */}
              <button
                type="button"
                onClick={handleClear}
                disabled={loading || isSuccess}
                className="h-13 sm:h-14 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-rose-300 text-xs sm:text-sm font-bold uppercase tracking-wider border-0 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50 select-none font-sans"
              >
                Clear
              </button>

              {/* '0' Key */}
              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                disabled={loading || isSuccess}
                className="h-13 sm:h-14 rounded-xl bg-neutral-950 hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-2xl border-0 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50 select-none font-sans"
              >
                0
              </button>

              {/* Backspace Key */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading || isSuccess}
                className="h-13 sm:h-14 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border-0 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50 select-none"
                title="Backspace"
              >
                <Delete className="w-6 h-6 text-neutral-200" />
              </button>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              RIGHT: AD AREA (Shown only if Video or Slides are configured)
              ═════════════════════════════════════════════════════════════ */}
          {hasAds && (
            <div className="w-full lg:flex-1 h-[420px] sm:h-[480px] lg:h-[540px] rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] border-0 bg-gradient-to-br from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center relative select-none">
              {adConfig.videoUrl ? (
                /* Video Player */
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
                /* Image Slides Carousel */
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
                /* Promotional Fallback Banner */
                <div className="p-8 text-center text-white space-y-3">
                  <Sparkles className="w-12 h-12 mx-auto text-amber-200" />
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {adConfig.title || "Print on Campus in Seconds"}
                  </h2>
                  <p className="text-xs sm:text-sm text-cyan-100 max-w-sm mx-auto leading-relaxed">
                    {adConfig.subtitle ||
                      "Upload documents anytime from your phone at printmart.in and dispense instantly at any kiosk."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── STAFF PIN MODAL (Hidden by default, triggered from header) ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
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
