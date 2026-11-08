"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Delete,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  KeyRound,
  RotateCw,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { KioskNavbar } from "../components/KioskNavbar";
import { NoticeModal } from "../components/NoticeModal";

interface OtpScreenProps {
  machineId: string;
  machineName: string;
  printerState: string;
  masterCode?: string;
  onVerifySuccess: (jobDetails: any) => void;
  onOpenConfig: () => void;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>("");

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen || errorMessage || loading || isSuccess) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          const nextDigits = [...digits, e.key];
          setDigits(nextDigits);
          setHasError(false);
          if (nextDigits.length === 6) {
            setTimeout(() => handleSubmit(nextDigits.join("")), 60);
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
  }, [digits, isStaffModalOpen, errorMessage, loading, isSuccess]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6 && !loading && !isSuccess) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      setHasError(false);
      if (nextDigits.length === 6) {
        setTimeout(() => handleSubmit(nextDigits.join("")), 60);
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
    // Check if master code was entered (dynamic or default 998877)
    if (otpStr === masterCode || otpStr === "998877") {
      setDigits([]);
      onOpenConfig();
      return;
    }

    try {
      setLoading(true);
      setHasError(false);

      // Verify OTP via Electron API bridge if available
      const kioskApi = (window as any).kioskApi;
      let res: any;

      if (kioskApi?.verifyOtp) {
        res = await kioskApi.verifyOtp(otpStr);
      } else {
        // Direct API call to backend server
        const response = await fetch("http://localhost:3000/api/machine/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ machineId, otp: otpStr }),
        });
        res = await response.json();
      }

      if (res && res.success) {
        setIsSuccess(true);
        // Smooth transition to printing progress screen
        setTimeout(() => {
          onVerifySuccess(res);
        }, 700);
      } else {
        setHasError(true);
        setErrorMessage(
          res?.error || "Invalid OTP code. Please check your transaction receipt and re-enter."
        );
        setDigits([]);
      }
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(
        err.message || "Unable to reach vending server. Please verify network and try again."
      );
      setDigits([]);
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
      setErrorMessage("Incorrect Master PIN. Configured in Admin -> Settings.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none">
      {/* ── Signature Top Bar ── */}
      <KioskNavbar
        machineName={machineName}
        machineId={machineId}
        printerState={printerState}
        onOpenStaff={() => {
          setStaffPinInput("");
          setIsStaffModalOpen(true);
        }}
      />

      {/* ── Main Kiosk Center Workspace ── */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 z-10 relative flex flex-col justify-center items-center py-6 sm:py-10">
        
        {/* ═════════════════════════════════════════════════════════════
            PREMIUM IRIDESCENT OTP MODAL CARD
            Warm-white surface, curved pastel holographic rings (top-right
            and bottom-left), rounded corners, and tactile touchscreen keypad.
            ═════════════════════════════════════════════════════════════ */}
        <div className="animate-modal-entrance relative overflow-hidden w-full max-w-[420px] bg-[#fdfcf9] rounded-[28px] border border-neutral-200/70 shadow-[0_16px_50px_rgba(0,0,0,0.05)] p-6 sm:p-8 flex flex-col items-center">
          
          {/* ── Abstract Curved Iridescent Gradient Elements ── */}
          <div className="iridescent-mesh-container" aria-hidden="true">
            {/* Top-Right Iridescent Curved Ring (Lavender, Mint, Cyan, Yellow) */}
            <div className="iridescent-orb-top" />
            {/* Bottom-Left Iridescent Curved Ring (Pale Pink, Soft Cyan, Lavender) */}
            <div className="iridescent-orb-bottom" />
          </div>

          {/* ── Foreground Modal Content ── */}
          <div className="relative z-10 w-full flex flex-col items-center gap-5">
            
            {/* Modal Header: Lock Icon Badge + Title + Subtitle */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-2xl bg-white/90 border border-neutral-200/70 text-neutral-800 flex items-center justify-center shadow-2xs mb-3 backdrop-blur-xs">
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-[#0c831f] animate-in zoom-in-75 duration-200" />
                ) : (
                  <Lock className="w-5 h-5 text-neutral-800" />
                )}
              </div>

              <h1 className="text-2xl sm:text-[1.65rem] font-bold text-[#171717] tracking-tight leading-tight">
                Enter Verification Code
              </h1>

              <p className="text-xs sm:text-[13px] text-neutral-500 mt-1.5 font-normal max-w-xs leading-relaxed">
                Enter the 6-digit OTP provided on your phone upon payment confirmation to dispense your prints
              </p>
            </div>

            {/* ── Six-Digit OTP Input Interface ── */}
            <div className="flex gap-2 sm:gap-2.5 justify-center w-full py-1">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = digits[index];
                const isCurrent = index === digits.length;
                const isFilled = digit !== undefined;

                // State styles: default, focused, filled, error, success
                let cellClasses = "border border-neutral-200/80 bg-white/80 text-neutral-900";

                if (isSuccess) {
                  cellClasses = "border border-emerald-300 bg-emerald-50/90 text-[#0c831f] shadow-2xs";
                } else if (hasError) {
                  cellClasses = "border border-rose-300/80 bg-rose-50/80 text-rose-700";
                } else if (isFilled) {
                  cellClasses = "border border-neutral-300 bg-white text-neutral-900 shadow-2xs";
                } else if (isCurrent) {
                  cellClasses = "border-2 border-neutral-900 bg-white ring-4 ring-neutral-900/5 shadow-xs";
                }

                return (
                  <div
                    key={index}
                    className={`w-11 h-14 sm:w-12 sm:h-16 rounded-2xl flex items-center justify-center font-mono text-2xl font-bold transition-all duration-200 select-none ${cellClasses}`}
                  >
                    {isFilled ? (
                      <span className="animate-digit-pop">{digit}</span>
                    ) : isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 animate-pulse" />
                    ) : (
                      <span className="text-neutral-300 text-lg">·</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── 3x4 Touchscreen Numeric Keypad ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[320px] pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  disabled={loading || isSuccess}
                  className="h-12 sm:h-13 rounded-2xl bg-white/70 hover:bg-white active:bg-neutral-100/90 border border-neutral-200/70 text-neutral-900 font-bold text-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-center backdrop-blur-xs disabled:opacity-50"
                >
                  {num}
                </button>
              ))}

              {/* Clear Key */}
              <button
                type="button"
                onClick={handleClear}
                disabled={loading || isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-rose-50/60 hover:bg-rose-100/80 active:bg-rose-200/80 border border-rose-200/60 text-rose-700 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                Clear
              </button>

              {/* '0' Key */}
              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                disabled={loading || isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-white/70 hover:bg-white active:bg-neutral-100/90 border border-neutral-200/70 text-neutral-900 font-bold text-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-center backdrop-blur-xs disabled:opacity-50"
              >
                0
              </button>

              {/* Backspace Key */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading || isSuccess}
                className="h-12 sm:h-13 rounded-2xl bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300/80 border border-neutral-200/70 transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Backspace"
              >
                <Delete className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* ── Authorize & Dispense Button (Visible when 6 digits entered) ── */}
            {digits.length === 6 && (
              <button
                type="button"
                onClick={() => handleSubmit(digits.join(""))}
                disabled={loading || isSuccess}
                className="w-full max-w-[320px] py-3.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Code...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Code Verified!</span>
                  </>
                ) : (
                  <>
                    <span>Authorize & Dispense</span>
                    <ArrowRight className="w-4 h-4 text-neutral-300" />
                  </>
                )}
              </button>
            )}

            {/* Subtext Info */}
            <div className="pt-1 text-center">
              <p className="text-[11px] text-neutral-400 font-normal">
                Touch numeric keypad or use physical keyboard • Preloaded instant output
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* ── NOTICE MODAL FOR INCORRECT OTP / SYSTEM ERRORS ── */}
      <NoticeModal
        isOpen={!!errorMessage}
        type="error"
        title="Notice"
        message={errorMessage || ""}
        buttonText="Okay"
        onClose={() => setErrorMessage(null)}
      />

      {/* ── Staff PIN Maintenance Modal ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 text-center animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0c831f] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <KeyRound className="w-6 h-6 text-[#0c831f]" />
            </div>

            <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1">
              Staff Maintenance Login
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter Master PIN configured in Admin Settings to access hardware telemetry
            </p>

            <div className="space-y-3">
              <input
                type="password"
                maxLength={6}
                value={staffPinInput}
                onChange={(e) => setStaffPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyStaffPin();
                }}
                placeholder="Enter 6-digit Master PIN"
                autoFocus
                className="w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-[#0c831f] bg-white transition-all"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 font-semibold rounded-xl text-xs transition-all active:scale-98 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyStaffPin}
                  className="flex-1 py-2.5 px-4 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold rounded-xl text-xs transition-all active:scale-98 shadow-xs cursor-pointer"
                >
                  Unlock Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
