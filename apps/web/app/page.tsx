"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import {
  Printer,
  Zap,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  FileText,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { useAuth } from "@/lib/authContext";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { MachineRecord } from "@printmart/shared";

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();
  const [machines, setMachines] = useState<MachineRecord[]>([]);

  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsubscribe = onValue(machinesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMachines(Object.values(data));
      } else {
        setMachines([
          {
            machineId: "MCH-CAMPUS-01",
            name: "Central Library Kiosk A",
            location: "Academic Block - Floor 1",
            status: "ONLINE",
            pairedAt: Date.now(),
            pairingStatus: "paired",
            lastHeartbeat: Date.now(),
            agentVersion: "1.0.0",
          },
          {
            machineId: "MCH-CAMPUS-02",
            name: "Student Center Kiosk B",
            location: "Student Union Hall - Ground Floor",
            status: "ONLINE",
            pairedAt: Date.now(),
            pairingStatus: "paired",
            lastHeartbeat: Date.now(),
            agentVersion: "1.0.0",
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  const onlineCount = machines.filter((m) => m.status === "ONLINE").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 pb-20 sm:pb-0">
      <AppNavbar />

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16">
        <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
          {/* Subtle Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zero-Wait Smart Printing Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Self-Service Document Printing at Campus Kiosks
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Upload documents from your phone or laptop, customize duplex & color modes in paise, and print instantly at any campus kiosk using a secure 6-digit OTP.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 justify-center">
            <Button
              as={Link}
              href="/user/print"
              size="md"
              color="primary"
              className="font-semibold text-xs sm:text-sm px-6 h-10 rounded-md shadow-xs"
              endContent={<ArrowRight className="w-4 h-4" />}
            >
              Start Printing
            </Button>

            {!user && (
              <Button
                size="md"
                variant="bordered"
                className="font-medium text-xs sm:text-sm px-5 h-10 rounded-md border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                onPress={() => signInWithGoogle()}
              >
                Sign In with Google
              </Button>
            )}
          </div>
        </div>

        {/* 3-Step Process Flow (Single Flat Clean Surface) */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-slate-200/80">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">How It Works</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">Ready to print in under 60 seconds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="font-semibold text-sm text-slate-900">Upload & Configure</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload PDF, Word, or images. Choose B&W or color, single or duplex with real-time paise price previews.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="font-semibold text-sm text-slate-900">Zero-Wait Preload</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upon sandbox checkout, encrypted file pages preload directly into the selected kiosk's local cache.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="font-semibold text-sm text-slate-900">Tap OTP & Print</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Approach the kiosk touchscreen, enter your 6-digit OTP, and collect your fresh prints immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Vending Stations */}
        <div className="mt-14 sm:mt-16">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Campus Printing Stations</h2>
              <p className="text-xs text-slate-500">Live availability across campus</p>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              {onlineCount} Online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {machines.map((machine) => (
              <div
                key={machine.machineId}
                className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <h4 className="font-semibold text-sm text-slate-900 truncate">{machine.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{machine.location}</span>
                  </div>
                </div>

                <Button
                  as={Link}
                  href={`/user/print?machine=${machine.machineId}`}
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="font-semibold text-xs rounded-md h-8 shrink-0"
                >
                  Print Here
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Features / Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-slate-200/80">
          <div className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Background Preloading</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Documents stream directly to kiosk memory before you arrive.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Cashfree Protected</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Bank-grade checkout with automatic refund on hardware errors.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Paise Precision</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Transparent billing starting at ₹1.50 per page with offer support.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-5 text-center text-xs text-slate-400">
        <p>© 2026 PrintMart. Campus Smart Printing Network.</p>
      </footer>
    </div>
  );
}
