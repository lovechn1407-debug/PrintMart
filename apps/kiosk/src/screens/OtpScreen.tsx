"use client";

import React, { useState, useEffect } from "react";
import { Printer, Delete, ArrowRight, ShieldCheck, X, KeyRound, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { KioskNavbar } from "../components/KioskNavbar";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>("");
  const [staffPinError, setStaffPinError] = useState<string | null>(null);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          setDigits((prev) => [...prev, e.key]);
        }
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === "Enter") {
        if (digits.length === 6) {
          handleSubmit(digits.join(""));
        }
      } else if (e.key === "Escape") {
        setDigits([]);
        setErrorMsg(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [digits, isStaffModalOpen]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      setErrorMsg(null);
      if (nextDigits.length === 6) {
        handleSubmit(nextDigits.join(""));
      }
    }
  };

  const handleBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setDigits([]);
    setErrorMsg(null);
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
      setErrorMsg(null);

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
        onVerifySuccess(res);
      } else {
        setErrorMsg(res?.error || "Invalid OTP. Please check your order details.");
        setDigits([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact printing server");
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
      setStaffPinError(null);
      onOpenConfig();
    } else {
      setStaffPinError("Incorrect Master PIN. Configured in Admin -> Settings.");
      setStaffPinInput("");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf7ee]">
      {/* ── Signature Honey-Gold Kiosk Navbar ── */}
      <KioskNavbar
        machineName={machineName}
        machineId={machineId}
        printerState={printerState}
        onOpenStaff={() => {
          setStaffPinInput("");
          setStaffPinError(null);
          setIsStaffModalOpen(true);
        }}
      />

      {/* ── Main Interactive OTP Screen with Fine Guilloché Texture ── */}
      <main className="flex-1 guilloche-bg flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="kiosk-card max-w-[440px] w-full p-6 sm:p-8 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-neutral-200/90 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Pill & Title */}
          <div className="flex flex-col items-center text-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#0c831f] text-xs font-bold border border-emerald-200/80 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0c831f]" />
              Zero-Queue Instant Dispenser
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Enter 6-Digit OTP
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-xs">
              Enter the OTP received on your mobile after payment to collect prints
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold text-center animate-in shake">
              {errorMsg}
            </div>
          )}

          {/* 6 Digit Display Cells */}
          <div className="flex gap-2 sm:gap-2.5 justify-center w-full">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = digits[index];
              const isCurrent = index === digits.length;
              return (
                <div
                  key={index}
                  className={`w-12 h-16 sm:w-14 sm:h-18 rounded-2xl border-2 flex items-center justify-center font-mono text-2xl sm:text-3xl font-black transition-all bg-white shadow-2xs ${
                    digit
                      ? "border-[#0c831f] text-[#0c831f] bg-emerald-50/30 scale-102 shadow-xs"
                      : isCurrent
                      ? "border-[#0c831f] ring-4 ring-[#0c831f]/15"
                      : "border-neutral-200 text-neutral-300"
                  }`}
                >
                  {digit || (isCurrent ? <span className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" /> : "·")}
                </div>
              );
            })}
          </div>

          {/* 3x4 Touch Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[340px] pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="h-14 sm:h-16 text-2xl font-black rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/90 text-neutral-850 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 sm:h-16 text-xs sm:text-sm font-extrabold rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center uppercase tracking-wider"
            >
              Clear
            </button>

            {/* '0' Button */}
            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="h-14 sm:h-16 text-2xl font-black rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/90 text-neutral-850 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 sm:h-16 rounded-2xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-200 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Backspace"
            >
              <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Authorize & Print Dispense Button */}
          {digits.length === 6 && (
            <button
              type="button"
              onClick={() => handleSubmit(digits.join(""))}
              disabled={loading}
              className="w-full max-w-[340px] py-4 rounded-2xl bg-gradient-to-r from-[#0c831f] to-[#0a6c1a] text-white font-black text-base shadow-[0_6px_20px_rgba(12,131,31,0.35)] hover:shadow-[0_8px_25px_rgba(12,131,31,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Hardware...</span>
                </>
              ) : (
                <>
                  <span>Authorize & Dispense</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {/* Security & Instructions Note */}
          <div className="pt-2 text-center text-[11px] text-neutral-400 font-medium">
            Touch on-screen keypad or use physical keyboard • Document auto-deletes immediately after print
          </div>
        </div>
      </main>

      {/* ── Staff Authentication PIN Modal ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5 border border-neutral-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-[#0c831f] rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-neutral-900">Staff Authentication</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Enter the 6-digit Master PIN configured in the Admin Settings panel to access machine diagnostics and pairing.
            </p>

            <div className="flex flex-col gap-2">
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={staffPinInput}
                onChange={(e) => setStaffPinInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && staffPinInput.length > 0) {
                    handleVerifyStaffPin();
                  }
                }}
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 bg-neutral-50 border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
              />

              {staffPinError && (
                <span className="text-xs text-rose-600 font-semibold text-center">{staffPinError}</span>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyStaffPin}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#0c831f] hover:bg-[#0a6c1a] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Unlock Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
