"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  Check,
  AlertCircle,
  Delete,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { database, ref, get } from "../firebase";
import { GuillocheAura } from "../components/GuillocheAura";

interface PairingCodeScreenProps {
  onPaired: (machine: {
    machineId: string;
    name: string;
    location: string;
    pairCode: string;
    autoPairEnabled?: boolean;
  }) => void;
  lastMachineName?: string;
}

export function PairingCodeScreen({ onPaired, lastMachineName }: PairingCodeScreenProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || successName) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          const nextDigits = [...digits, e.key];
          setDigits(nextDigits);
          setHasError(false);
          setErrorMessage(null);
          if (nextDigits.length === 6) {
            setTimeout(() => verifyPairCode(nextDigits.join("")), 80);
          }
        }
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1));
        setHasError(false);
        setErrorMessage(null);
      } else if (e.key === "Escape") {
        setDigits([]);
        setHasError(false);
        setErrorMessage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [digits, loading, successName]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6 && !loading && !successName) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      setHasError(false);
      setErrorMessage(null);
      if (nextDigits.length === 6) {
        setTimeout(() => verifyPairCode(nextDigits.join("")), 80);
      }
    }
  };

  const handleBackspace = () => {
    if (!loading && !successName) {
      setDigits((prev) => prev.slice(0, -1));
      setHasError(false);
      setErrorMessage(null);
    }
  };

  const handleClear = () => {
    if (!loading && !successName) {
      setDigits([]);
      setHasError(false);
      setErrorMessage(null);
    }
  };

  // Verify pair code against Firebase RTDB machines registry
  const verifyPairCode = async (code: string) => {
    setLoading(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const machinesRef = ref(database, "machines");
      const snap = await get(machinesRef);

      if (!snap.exists()) {
        setHasError(true);
        setErrorMessage("No vending machines registered in system. Please contact Admin.");
        setLoading(false);
        return;
      }

      const allMachines = snap.val();
      let matched: any = null;

      for (const [id, m] of Object.entries(allMachines)) {
        const mach = m as any;
        if (
          mach.pairCode === code ||
          id === code ||
          mach.machineId === code ||
          (mach.pairCode && String(mach.pairCode).trim() === code.trim())
        ) {
          matched = { ...mach, machineId: mach.machineId || id };
          break;
        }
      }

      if (matched) {
        setSuccessName(matched.name || "Kiosk Terminal");
        setTimeout(() => {
          onPaired({
            machineId: matched.machineId,
            name: matched.name || "Kiosk Terminal",
            location: matched.location || "Campus",
            pairCode: code,
            autoPairEnabled: matched.autoPairEnabled !== false,
          });
        }, 800);
      } else {
        setHasError(true);
        setErrorMessage("Invalid Pair Code. Verify code in Admin > Vending Machines.");
        setDigits([]);
      }
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.message || "Failed to connect to cloud registry.");
      setDigits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 select-none overflow-x-hidden font-sans relative selection:bg-yellow-200 selection:text-neutral-900">
      {/* ── Top Header with Dynamic Notch ── */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="font-extrabold text-lg text-neutral-950 tracking-tight flex items-center gap-1">
            <span>Print</span>
            <span className="text-[#0c831f]">Mart</span>
          </div>
        </div>

        {/* Dynamic Island Notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 sm:top-2 flex items-center gap-2 px-3 py-1 bg-black/90 backdrop-blur-md rounded-full shadow-md border border-white/10 z-50">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white tracking-wide">
            Terminal Setup • Pairing Required
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-800 bg-white/70 px-2.5 py-1 rounded-full shadow-2xs">
            Security Gate
          </span>
        </div>
      </header>

      {/* ── Background Waves ── */}
      <GuillocheAura />

      {/* ── Main Pairing Content ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[420px] bg-white rounded-[22px] sm:rounded-[26px] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border-0 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
          {/* Key Icon Badge */}
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs border border-amber-200/60">
            {successName ? (
              <Check className="w-6 h-6 text-[#0c831f] animate-in zoom-in" />
            ) : (
              <KeyRound className="w-6 h-6" />
            )}
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              {successName ? `Paired Successfully!` : "Enter Kiosk Pair Code"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium max-w-[320px]">
              {successName ? (
                <span className="text-[#0c831f] font-bold">
                  Mapped to &ldquo;{successName}&rdquo;
                </span>
              ) : (
                "Type the 6-digit pair code from Admin > Vending Machines to activate this kiosk."
              )}
            </p>
          </div>

          {/* 6 Digit Display Boxes */}
          <div
            className={`flex items-center justify-center gap-2 sm:gap-2.5 my-1 ${
              hasError ? "animate-shake" : ""
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const val = digits[idx];
              const isFilled = Boolean(val);
              const isCurrent = idx === digits.length;
              return (
                <div
                  key={idx}
                  className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black transition-all ${
                    hasError
                      ? "bg-rose-50 text-rose-600 border-2 border-rose-400"
                      : isFilled
                      ? "bg-neutral-100 text-neutral-950 border-2 border-[#0c831f]"
                      : isCurrent
                      ? "bg-neutral-50 border-2 border-neutral-400 animate-pulse"
                      : "bg-neutral-100 text-neutral-400 border-2 border-transparent"
                  }`}
                >
                  {isFilled ? val : isCurrent ? "•" : ""}
                </div>
              );
            })}
          </div>

          {/* Feedback messages */}
          {hasError && errorMessage && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 animate-pulse">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
              <span>Verifying cloud registry...</span>
            </div>
          )}

          {/* Touch Keypad */}
          <div className="w-full max-w-[320px] grid grid-cols-3 gap-2.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(String(num))}
                disabled={loading || Boolean(successName)}
                className="h-12 sm:h-13 bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-extrabold text-lg sm:text-xl rounded-xl transition-all cursor-pointer border-0 shadow-xs flex items-center justify-center disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={loading || Boolean(successName)}
              className="h-12 sm:h-13 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center disabled:opacity-50"
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              disabled={loading || Boolean(successName)}
              className="h-12 sm:h-13 bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-extrabold text-lg sm:text-xl rounded-xl transition-all cursor-pointer border-0 shadow-xs flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={loading || Boolean(successName)}
              className="h-12 sm:h-13 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-bold text-lg rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center disabled:opacity-50"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {lastMachineName && (
            <p className="text-[11px] text-neutral-400 font-medium text-center pt-1">
              Previously paired with: <strong className="text-neutral-600">{lastMachineName}</strong>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
