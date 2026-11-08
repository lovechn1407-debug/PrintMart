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
} from "lucide-react";
import { KioskNavbar } from "../components/KioskNavbar";
import { GuillocheAura } from "../components/GuillocheAura";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>("");

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen || errorMessage) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          setDigits((prev) => {
            const next = [...prev, e.key];
            if (next.length === 6) {
              setTimeout(() => handleSubmit(next.join("")), 50);
            }
            return next;
          });
        }
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        if (digits.length === 6) {
          handleSubmit(digits.join(""));
        }
      } else if (e.key === "Escape") {
        setDigits([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [digits, isStaffModalOpen, errorMessage]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      if (nextDigits.length === 6) {
        setTimeout(() => handleSubmit(nextDigits.join("")), 50);
      }
    }
  };

  const handleBackspace = () => {
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDigits([]);
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
        setErrorMessage(res?.error || "Invalid OTP. Please check the 6-digit code provided upon payment.");
        setDigits([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to contact printing server. Please try again.");
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
      {/* ── Signature Honey-Golden Header (Matching AppNavbar) ── */}
      <KioskNavbar
        machineName={machineName}
        machineId={machineId}
        printerState={printerState}
        onOpenStaff={() => {
          setStaffPinInput("");
          setIsStaffModalOpen(true);
        }}
      />

      {/* ── Top Aura & Delicate SVG Guilloché Curves (Matching Homepage) ── */}
      <GuillocheAura />

      {/* ── Main Container (Centered, Breathing Room matching Homepage) ── */}
      <main className="flex-1 w-full max-w-md sm:max-w-xl mx-auto px-4 z-10 relative flex flex-col justify-center py-6 sm:py-10">
        
        {/* Header Title Section (Matching Homepage Hero) */}
        <div className="text-center pb-5 sm:pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#0c831f] text-xs font-semibold border border-emerald-200/80 mb-2.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0c831f]" />
            <span>Zero-Queue Instant Dispenser</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-[2.2rem] font-bold text-[#1c1c1c] tracking-tight leading-tight">
            Enter 6-Digit OTP
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5c6874] mt-1.5 font-normal tracking-wide">
            Provided on your phone upon payment confirmation
          </p>
        </div>

        {/* Card Box (Exact Print Studio / Homepage Card Structure) */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-5 max-w-sm w-full mx-auto">
          
          {/* 6 Digit Display Cells (Matching Print Studio OTP Display) */}
          <div className="flex gap-2 justify-center w-full">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = digits[index];
              const isCurrent = index === digits.length;
              return (
                <div
                  key={index}
                  className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl flex items-center justify-center font-mono text-2xl font-bold transition-all ${
                    digit
                      ? "border border-emerald-300 bg-emerald-50 text-[#0c831f] shadow-2xs"
                      : isCurrent
                      ? "border-2 border-[#0c831f] bg-white ring-2 ring-[#0c831f]/20"
                      : "border border-neutral-200 bg-neutral-50/70 text-neutral-300"
                  }`}
                >
                  {digit || (isCurrent ? <span className="w-2 h-2 rounded-full bg-[#0c831f] animate-pulse" /> : "·")}
                </div>
              );
            })}
          </div>

          {/* 3x4 Touch Numeric Keypad (Print Studio Clean Controls) */}
          <div className="grid grid-cols-3 gap-2 w-full pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="h-12 sm:h-13 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/80 text-neutral-900 font-bold text-xl transition-all active:scale-95 shadow-2xs cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 sm:h-13 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              Clear
            </button>

            {/* '0' Button */}
            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="h-12 sm:h-13 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 border border-neutral-200/80 text-neutral-900 font-bold text-xl transition-all active:scale-95 shadow-2xs cursor-pointer flex items-center justify-center"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 sm:h-13 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-200/80 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title="Backspace"
            >
              <Delete className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          {/* Authorize & Dispense Button (Matching Studio Primary Button) */}
          {digits.length === 6 && (
            <button
              type="button"
              onClick={() => handleSubmit(digits.join(""))}
              disabled={loading}
              className="w-full py-3 px-5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white" />
                  <span>Authorizing Dispenser...</span>
                </>
              ) : (
                <>
                  <span>Authorize & Dispense</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Subtext info */}
          <div className="pt-1 text-center">
            <p className="text-[11px] text-neutral-400 font-normal">
              Touch numeric keypad or use physical keyboard • Document preloads for instant output
            </p>
          </div>
        </div>
      </main>

      {/* ── ERROR POPUP MODAL (Exact Print Studio Notice Dialog) ── */}
      <NoticeModal
        isOpen={!!errorMessage}
        type="error"
        title="Notice"
        message={errorMessage || ""}
        buttonText="Okay"
        onClose={() => setErrorMessage(null)}
      />

      {/* ── Staff PIN Maintenance Modal (Matching Studio Modal Dialog) ── */}
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
