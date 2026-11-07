"use client";

import React, { useState, useEffect } from "react";
import { Button, Card, CardBody, Chip, Alert } from "@heroui/react";
import { Printer, Delete, ArrowRight, ShieldCheck, X } from "lucide-react";

interface OtpScreenProps {
  machineId: string;
  machineName: string;
  printerState: string;
  onVerifySuccess: (jobDetails: any) => void;
  onOpenConfig: () => void;
}

const MASTER_DEBUG_CODE = "998877"; // Master bypass/debug code

export function OtpScreen({
  machineId,
  machineName,
  printerState,
  onVerifySuccess,
  onOpenConfig,
}: OtpScreenProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          setDigits((prev) => [...prev, e.key]);
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
  }, [digits]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
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
    // Check if master code was entered
    if (otpStr === MASTER_DEBUG_CODE) {
      setDigits([]);
      onOpenConfig();
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Verify OTP via Electron API bridge
      const kioskApi = (window as any).kioskApi;
      let res: any;

      if (kioskApi?.verifyOtp) {
        res = await kioskApi.verifyOtp(otpStr);
      } else {
        // Direct fallback fetch in browser preview
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

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-8 max-w-4xl mx-auto w-full">
      {/* Kiosk Header */}
      <header className="flex justify-between items-center w-full pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-white p-2.5 rounded-xl flex items-center justify-center">
            <Printer className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">PrintMart Kiosk</h1>
            <p className="text-xs text-neutral-500 font-medium">{machineName} • ID: {machineId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Chip
            size="md"
            variant="flat"
            color={printerState === "READY" ? "success" : "warning"}
            startContent={<span className="w-2 h-2 rounded-full bg-current ml-1" />}
          >
            Printer: {printerState}
          </Chip>
          <Button size="sm" variant="light" onPress={onOpenConfig} className="text-neutral-400">
            Staff
          </Button>
        </div>
      </header>

      {/* Center OTP Display & Touch Keypad */}
      <main className="flex flex-col items-center gap-6 my-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-neutral-900">Enter Your 6-Digit OTP</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Provided on your phone upon payment confirmation
          </p>
        </div>

        {errorMsg && (
          <Alert color="danger" className="max-w-md">
            {errorMsg}
          </Alert>
        )}

        {/* 6 Digit Display Boxes */}
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const digit = digits[index];
            return (
              <div
                key={index}
                className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center font-mono text-3xl font-extrabold transition-all bg-white ${
                  digit
                    ? "border-primary text-primary shadow-sm"
                    : index === digits.length
                    ? "border-neutral-400 ring-2 ring-primary/20"
                    : "border-neutral-200 text-neutral-400"
                }`}
              >
                {digit || ""}
              </div>
            );
          })}
        </div>

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-72 mt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <Button
              key={num}
              size="lg"
              variant="flat"
              className="h-16 text-2xl font-bold bg-white border border-neutral-200 hover:bg-neutral-100"
              onPress={() => handleKeyPress(num)}
            >
              {num}
            </Button>
          ))}
          <Button
            size="lg"
            variant="flat"
            color="danger"
            className="h-16 text-sm font-bold"
            onPress={handleClear}
          >
            Clear
          </Button>
          <Button
            size="lg"
            variant="flat"
            className="h-16 text-2xl font-bold bg-white border border-neutral-200 hover:bg-neutral-100"
            onPress={() => handleKeyPress("0")}
          >
            0
          </Button>
          <Button
            size="lg"
            variant="flat"
            className="h-16 text-sm font-bold"
            onPress={handleBackspace}
          >
            <Delete className="w-6 h-6" />
          </Button>
        </div>

        {digits.length === 6 && (
          <Button
            color="primary"
            size="lg"
            className="w-72 font-bold text-lg"
            isLoading={loading}
            onPress={() => handleSubmit(digits.join(""))}
            endContent={<ArrowRight className="w-5 h-5" />}
          >
            Authorize & Print
          </Button>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="text-center text-xs text-neutral-400 border-t border-neutral-200 pt-3 w-full">
        Touch numeric keypad or use physical keyboard • Document preloads before OTP entry for instant output
      </footer>
    </div>
  );
}

