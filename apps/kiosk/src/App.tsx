"use client";

import React, { useState, useEffect } from "react";
import { OtpScreen } from "./screens/OtpScreen";
import { PrintingProgressScreen } from "./screens/PrintingProgressScreen";
import { OverlayScreen } from "./screens/OverlayScreen";
import { ConfigPanelScreen } from "./screens/ConfigPanelScreen";
import { database, ref, onValue, get } from "./firebase";
import { MachineOverlay } from "@printmart/shared";

export default function App() {
  const [machineId, setMachineId] = useState<string>("");
  const [machineName, setMachineName] = useState<string>("PrintMart Kiosk Terminal");
  const [masterCode, setMasterCode] = useState<string>("998877");
  const [currentScreen, setCurrentScreen] = useState<"pairing" | "otp" | "printing" | "overlay" | "config">("pairing");
  const [activeJob, setActiveJob] = useState<any>(null);
  const [activeOverlay, setActiveOverlay] = useState<MachineOverlay | null>(null);
  const [printerState, setPrinterState] = useState<string>("READY");
  const [isCheckingStartup, setIsCheckingStartup] = useState<boolean>(true);
  const [isPaired, setIsPaired] = useState<boolean>(false);

  // 1. Strict Startup Pairing & Auto-Pair Check
  useEffect(() => {
    const checkStartupPairing = async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("pairCode") || params.get("code");
      const urlId = params.get("machineId") || params.get("id");
      const storedCode = localStorage.getItem("kiosk_pair_code");
      const storedId = localStorage.getItem("kiosk_machine_id");

      const targetCode = urlCode || storedCode;
      const targetId = urlId || storedId;

      if (!targetCode && !targetId) {
        setIsCheckingStartup(false);
        setIsPaired(false);
        setCurrentScreen("pairing");
        return;
      }

      try {
        const machinesSnap = await get(ref(database, "machines"));
        if (!machinesSnap.exists()) {
          setIsCheckingStartup(false);
          setIsPaired(false);
          setCurrentScreen("pairing");
          return;
        }

        const allMachines = machinesSnap.val();
        let matched: any = null;

        for (const [id, m] of Object.entries(allMachines)) {
          const mach = m as any;
          if (
            (targetCode && (mach.pairCode === targetCode || id === targetCode || mach.machineId === targetCode)) ||
            (targetId && (id === targetId || mach.machineId === targetId))
          ) {
            matched = { ...mach, machineId: mach.machineId || id };
            break;
          }
        }

        if (matched) {
          const autoPairAllowed = matched.autoPairEnabled !== false;

          if (autoPairAllowed) {
            // Auto-Pair Succeeded!
            setMachineId(matched.machineId);
            setMachineName(matched.name || "Kiosk Terminal");
            setIsPaired(true);
            setCurrentScreen("otp");
          } else {
            // Admin requires pair code on every startup!
            setMachineId(matched.machineId);
            setMachineName(matched.name || "Kiosk Terminal");
            setIsPaired(false);
            setCurrentScreen("pairing");
          }
        } else {
          setIsPaired(false);
          setCurrentScreen("pairing");
        }
      } catch {
        setIsPaired(false);
        setCurrentScreen("pairing");
      } finally {
        setIsCheckingStartup(false);
      }
    };

    checkStartupPairing();
  }, []);

  const handleTerminalPaired = (machine: {
    machineId: string;
    name: string;
    location: string;
    pairCode: string;
    autoPairEnabled?: boolean;
  }) => {
    setMachineId(machine.machineId);
    setMachineName(machine.name);
    setIsPaired(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("kiosk_pair_code", machine.pairCode);
      localStorage.setItem("kiosk_machine_id", machine.machineId);
      localStorage.setItem("kiosk_machine_name", machine.name);
    }

    setCurrentScreen(activeOverlay?.active ? "overlay" : "otp");
  };

  // 2. Listen to dynamic Master PIN from Firebase RTDB (configured in Admin -> Settings)
  useEffect(() => {
    const masterCodeRef = ref(database, "systemSettings/masterKioskCode");
    const unsub = onValue(masterCodeRef, (snap) => {
      if (snap.exists() && snap.val()) {
        setMasterCode(String(snap.val()).trim());
      }
    });
    return () => unsub();
  }, []);

  // 3. Listen to Machine record in Firebase RTDB to keep display name in sync
  useEffect(() => {
    if (!machineId) return;
    const machineRef = ref(database, `machines/${machineId}`);
    const unsubMachine = onValue(machineRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.name) {
          setMachineName(val.name);
          localStorage.setItem("kiosk_machine_name", val.name);
        }
        if (val.status === "DISABLED") {
          setActiveOverlay({
            active: true,
            type: "SERVICE_DISABLED",
            title: "Kiosk Temporarily Disabled",
            message: "This vending machine is paused by administrator.",
            updatedAt: Date.now(),
          });
          setCurrentScreen((prev) => (prev === "config" || prev === "printing" ? prev : "overlay"));
        } else if (activeOverlay?.title === "Kiosk Temporarily Disabled") {
          setActiveOverlay(null);
          setCurrentScreen((prev) => (prev === "overlay" ? "otp" : prev));
        }
      }
    });

    const printerRef = ref(database, `machinePrinterStatus/${machineId}`);
    const unsubPrinter = onValue(printerRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.printerState) setPrinterState(val.printerState);
      }
    });

    return () => {
      if (typeof unsubMachine === "function") unsubMachine();
      if (typeof unsubPrinter === "function") unsubPrinter();
    };
  }, [machineId]);

  // 4. Listen to remote overlays from Firebase RTDB
  useEffect(() => {
    if (!machineId) return;
    const machineOverlayRef = ref(database, `overlays/machines/${machineId}`);
    const globalOverlayRef = ref(database, "overlays/global");

    let unsubGlobal: (() => void) | null = null;
    const unsubMachine = onValue(machineOverlayRef, (snap) => {
      const mVal = snap.val() as MachineOverlay | null;
      if (snap.exists() && mVal?.active) {
        if (typeof unsubGlobal === "function") {
          unsubGlobal();
          unsubGlobal = null;
        }
        setActiveOverlay(mVal);
        setCurrentScreen((prev) => (prev === "config" || prev === "printing" ? prev : "overlay"));
      } else {
        // Fallback to check global
        if (typeof unsubGlobal === "function") unsubGlobal();
        unsubGlobal = onValue(globalOverlayRef, (gSnap) => {
          const gVal = gSnap.val() as MachineOverlay | null;
          if (gSnap.exists() && gVal?.active) {
            setActiveOverlay(gVal);
            setCurrentScreen((prev) => (prev === "config" || prev === "printing" ? prev : "overlay"));
          } else {
            setActiveOverlay(null);
            setCurrentScreen((prev) => (prev === "overlay" ? "otp" : prev));
          }
        });
      }
    });

    return () => {
      if (typeof unsubMachine === "function") unsubMachine();
      if (typeof unsubGlobal === "function") unsubGlobal();
    };
  }, [machineId]);

  if (isCheckingStartup) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#fbf9f3] text-neutral-800 font-sans">
        <div className="w-9 h-9 border-3 border-[#0c831f] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-neutral-600 tracking-wide uppercase">
          Initializing Terminal...
        </span>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#faf7ee] text-neutral-900 select-none overflow-hidden font-sans">
      {(currentScreen === "otp" || currentScreen === "pairing" || !isPaired) && (
        <OtpScreen
          machineId={machineId}
          machineName={machineName}
          printerState={printerState}
          masterCode={masterCode}
          isPaired={isPaired}
          onPairSuccess={handleTerminalPaired}
          onVerifySuccess={(jobDetails) => {
            setActiveJob(jobDetails);
            setCurrentScreen("printing");
          }}
          onOpenConfig={() => setCurrentScreen("config")}
        />
      )}

      {currentScreen === "printing" && activeJob && (
        <PrintingProgressScreen
          jobDetails={activeJob}
          onComplete={() => {
            setActiveJob(null);
            setCurrentScreen("otp");
          }}
        />
      )}

      {currentScreen === "overlay" && activeOverlay && (
        <OverlayScreen
          overlay={activeOverlay}
          machineName={machineName}
          onOpenConfig={() => setCurrentScreen("config")}
        />
      )}

      {currentScreen === "config" && (
        <ConfigPanelScreen
          machineId={machineId}
          machineName={machineName}
          onExit={() => setCurrentScreen(activeOverlay ? "overlay" : "otp")}
          onUpdateMachine={(newId, newName) => {
            setMachineId(newId);
            setMachineName(newName);
            localStorage.setItem("kiosk_machine_id", newId);
            localStorage.setItem("kiosk_machine_name", newName);
          }}
          onUnpair={() => {
            setIsPaired(false);
            setCurrentScreen("pairing");
          }}
        />
      )}
    </div>
  );
}
