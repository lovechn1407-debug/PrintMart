"use client";

import React, { useState, useEffect } from "react";
import { OtpScreen } from "./screens/OtpScreen";
import { PrintingProgressScreen } from "./screens/PrintingProgressScreen";
import { OverlayScreen } from "./screens/OverlayScreen";
import { ConfigPanelScreen } from "./screens/ConfigPanelScreen";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import { MachineOverlay, MachinePrinterStatus, PrintJob } from "@printmart/shared";

const firebaseConfig = {
  apiKey: "AIzaSyAaAIzYHlQ9Xmho4oMA7sSDz7aEJmI8Avc",
  authDomain: "printmart-bd9da.firebaseapp.com",
  projectId: "printmart-bd9da",
  storageBucket: "printmart-bd9da.firebasestorage.app",
  messagingSenderId: "112273507268",
  appId: "1:112273507268:web:8119878aa05597c963da91",
  measurementId: "G-1PWQHK6307",
  databaseURL: "https://printmart-bd9da-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

export default function App() {
  const [machineId, setMachineId] = useState<string>("MCH-CAMPUS-01");
  const [machineName, setMachineName] = useState<string>("Central Library Kiosk A");
  const [currentScreen, setCurrentScreen] = useState<"otp" | "printing" | "overlay" | "config">("otp");
  const [activeJob, setActiveJob] = useState<any>(null);
  const [activeOverlay, setActiveOverlay] = useState<MachineOverlay | null>(null);
  const [printerState, setPrinterState] = useState<string>("READY");

  // Read terminal config from Electron main process
  useEffect(() => {
    const kioskApi = (window as any).kioskApi;
    if (kioskApi?.getConfig) {
      kioskApi.getConfig().then((cfg: any) => {
        if (cfg?.machineId) setMachineId(cfg.machineId);
      });
    }
  }, []);

  // Listen to remote overlays from Firebase RTDB
  useEffect(() => {
    const machineOverlayRef = ref(database, `overlays/machines/${machineId}`);
    const globalOverlayRef = ref(database, "overlays/global");

    const unsubMachine = onValue(machineOverlayRef, (snap) => {
      if (snap.exists() && snap.val()?.active) {
        setActiveOverlay(snap.val());
        if (currentScreen !== "printing" && currentScreen !== "config") {
          setCurrentScreen("overlay");
        }
      } else {
        // Fallback to check global
        onValue(globalOverlayRef, (gSnap) => {
          if (gSnap.exists() && gSnap.val()?.active) {
            setActiveOverlay(gSnap.val());
            if (currentScreen !== "printing" && currentScreen !== "config") {
              setCurrentScreen("overlay");
            }
          } else {
            setActiveOverlay(null);
            if (currentScreen === "overlay") setCurrentScreen("otp");
          }
        });
      }
    });

    return () => unsubMachine();
  }, [machineId, currentScreen]);

  // Background Preload Engine: Listen for PRELOAD_QUEUED jobs assigned to this machine
  useEffect(() => {
    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allJobs = Object.values(snapshot.val()) as PrintJob[];
        const queuedForThisMachine = allJobs.filter(
          (j) => j.machineId === machineId && j.preparation?.status === "PRELOAD_QUEUED"
        );

        queuedForThisMachine.forEach((job) => {
          const kioskApi = (window as any).kioskApi;
          if (kioskApi?.preloadJob) {
            // Trigger background download & checksum verification
            kioskApi.preloadJob(job.jobId).then((res: any) => {
              if (res.success) {
                // Update Firebase RTDB preparation status to READY
                fetch("http://localhost:3000/api/machine/status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    machineId,
                    agentVersion: "1.0.0",
                  }),
                }).catch(() => {});
              }
            });
          }
        });
      }
    });

    return () => unsub();
  }, [machineId]);

  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-50 text-neutral-900 select-none overflow-hidden">
      {currentScreen === "otp" && (
        <OtpScreen
          machineId={machineId}
          machineName={machineName}
          printerState={printerState}
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
          onOpenConfig={() => setCurrentScreen("config")}
        />
      )}

      {currentScreen === "config" && (
        <ConfigPanelScreen
          machineId={machineId}
          onExit={() => setCurrentScreen(activeOverlay ? "overlay" : "otp")}
          onUpdateMachineId={(newId) => setMachineId(newId)}
        />
      )}
    </div>
  );
}

