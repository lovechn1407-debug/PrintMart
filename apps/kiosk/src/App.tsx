"use client";

import React, { useState, useEffect } from "react";
import { OtpScreen } from "./screens/OtpScreen";
import { PrintingProgressScreen } from "./screens/PrintingProgressScreen";
import { OverlayScreen } from "./screens/OverlayScreen";
import { ConfigPanelScreen } from "./screens/ConfigPanelScreen";
import { database, ref, onValue } from "./firebase";
import { MachineOverlay, MachinePrinterStatus, PrintJob } from "@printmart/shared";

export default function App() {
  const [machineId, setMachineId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("machineId") || params.get("id");
      if (urlId) return urlId;
      return localStorage.getItem("kiosk_machine_id") || "MCH-CAMPUS-01";
    }
    return "MCH-CAMPUS-01";
  });

  const [machineName, setMachineName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kiosk_machine_name") || "Central Library Kiosk A";
    }
    return "Central Library Kiosk A";
  });

  const [masterCode, setMasterCode] = useState<string>("998877");
  const [currentScreen, setCurrentScreen] = useState<"otp" | "printing" | "overlay" | "config">("otp");
  const [activeJob, setActiveJob] = useState<any>(null);
  const [activeOverlay, setActiveOverlay] = useState<MachineOverlay | null>(null);
  const [printerState, setPrinterState] = useState<string>("READY");

  // 1. Listen to dynamic Master PIN from Firebase RTDB (configured in Admin -> Settings)
  useEffect(() => {
    const masterCodeRef = ref(database, "systemSettings/masterKioskCode");
    const unsub = onValue(masterCodeRef, (snap) => {
      if (snap.exists() && snap.val()) {
        setMasterCode(String(snap.val()).trim());
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to Machine record in Firebase RTDB to keep display name in sync
  useEffect(() => {
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

  // 3. Read terminal config from Electron main process if available
  useEffect(() => {
    const kioskApi = (window as any).kioskApi;
    if (kioskApi?.getConfig) {
      kioskApi.getConfig().then((cfg: any) => {
        if (cfg?.machineId) {
          setMachineId(cfg.machineId);
          localStorage.setItem("kiosk_machine_id", cfg.machineId);
        }
      });
    }
  }, []);

  // 4. Listen to remote overlays from Firebase RTDB
  useEffect(() => {
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

  return (
    <div className="w-screen h-screen flex flex-col bg-[#faf7ee] text-neutral-900 select-none overflow-hidden font-sans">
      {currentScreen === "otp" && (
        <OtpScreen
          machineId={machineId}
          machineName={machineName}
          printerState={printerState}
          masterCode={masterCode}
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
        />
      )}
    </div>
  );
}
