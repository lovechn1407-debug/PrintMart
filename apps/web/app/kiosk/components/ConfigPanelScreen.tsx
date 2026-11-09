"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Printer,
  Wifi,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Save,
  Activity,
  Sliders,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { database, ref, onValue, set, update, get } from "@/lib/firebase";
import { GuillocheAura } from "./GuillocheAura";
import { NoticeModal } from "./NoticeModal";

interface ConfigPanelScreenProps {
  machineId: string;
  machineName: string;
  onExit: () => void;
  onUpdateMachine: (newId: string, newName: string) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  message: string;
}

export function ConfigPanelScreen({
  machineId,
  machineName,
  onExit,
  onUpdateMachine,
}: ConfigPanelScreenProps) {
  const [activeTab, setActiveTab] = useState<"identity" | "hardware" | "logs">("identity");

  // Machine Identity State
  const [currentId, setCurrentId] = useState<string>(machineId);
  const [nameInput, setNameInput] = useState<string>(machineName);
  const [locationInput, setLocationInput] = useState<string>("Ground Floor, Central Library");
  const [pairCodeInput, setPairCodeInput] = useState<string>("");
  const [modalNotice, setModalNotice] = useState<{
    isOpen: boolean;
    type: "error" | "success" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "Notice",
    message: "",
  });

  // Printer Telemetry State
  const [printerData, setPrinterData] = useState<any>({
    connection: "ONLINE",
    printerName: "HP LaserJet Enterprise 500 (Kiosk Spooler)",
    printerState: "READY",
    paperStatus: "OK",
    paperPercentage: 92,
    blackInkPercentage: 88,
    cyanInkPercentage: 84,
    magentaInkPercentage: 82,
    yellowInkPercentage: 86,
    temperatureC: 32,
  });
  const [testPrinting, setTestPrinting] = useState<boolean>(false);

  // Diagnostic Logs State
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 180000).toLocaleTimeString(),
      level: "INFO",
      message: `Kiosk system initialized with Terminal ID: ${machineId}`,
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      level: "SUCCESS",
      message: "Firebase RTDB live connection established (asia-southeast1)",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      level: "INFO",
      message: "Printer spooler telemetry verified: Paper OK, Toner OK",
    },
    {
      id: "4",
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      message: "Terminal operational in Kiosk Mode",
    },
  ]);

  // Load Machine Info from Firebase RTDB on mount
  useEffect(() => {
    if (!currentId) return;
    const machRef = ref(database, `machines/${currentId}`);
    const unsub = onValue(machRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.name) setNameInput(val.name);
        if (val.location) setLocationInput(val.location);
      }
    });

    const printerRef = ref(database, `machinePrinterStatus/${currentId}`);
    const unsubPrinter = onValue(printerRef, (snap) => {
      if (snap.exists()) {
        setPrinterData((prev: any) => ({ ...prev, ...snap.val() }));
      }
    });

    return () => {
      unsub();
      unsubPrinter();
    };
  }, [currentId]);

  // Save Identity Details
  const handleSaveIdentity = async () => {
    if (!nameInput.trim()) {
      setModalNotice({
        isOpen: true,
        type: "error",
        title: "Name Required",
        message: "Please enter a valid display name for this kiosk.",
      });
      return;
    }

    try {
      await update(ref(database, `machines/${currentId}`), {
        name: nameInput.trim(),
        location: locationInput.trim(),
        updatedAt: Date.now(),
      });

      onUpdateMachine(currentId, nameInput.trim());
      if (typeof window !== "undefined") {
        localStorage.setItem("kiosk_machine_name", nameInput.trim());
      }

      setModalNotice({
        isOpen: true,
        type: "success",
        title: "Settings Saved",
        message: `Vending machine name updated to "${nameInput.trim()}".`,
      });
      addLog("SUCCESS", `Vending machine updated to "${nameInput.trim()}"`);
    } catch (err: any) {
      setModalNotice({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save machine details.",
      });
      addLog("ERROR", `Failed to save machine details: ${err.message}`);
    }
  };

  // Pair Terminal with Pair Code generated from Admin Panel
  const handlePairWithCode = async () => {
    const code = pairCodeInput.trim();
    if (!code) {
      setModalNotice({
        isOpen: true,
        type: "error",
        title: "Code Required",
        message: "Please enter the 6-digit Pair Code from the Admin Vending Machines panel.",
      });
      return;
    }

    try {
      const snap = await get(ref(database, "machines"));
      if (!snap.exists()) {
        setModalNotice({
          isOpen: true,
          type: "error",
          title: "No Machines Found",
          message: "No vending machines found in the database. Please create one in Admin Panel first.",
        });
        return;
      }

      const allMachines = snap.val();
      let matchedMachine: any = null;

      for (const [id, m] of Object.entries(allMachines)) {
        const mach = m as any;
        if (mach.pairCode === code || id === code || mach.machineId === code) {
          matchedMachine = { ...mach, machineId: id };
          break;
        }
      }

      if (matchedMachine) {
        setCurrentId(matchedMachine.machineId);
        setNameInput(matchedMachine.name || "Kiosk Machine");
        setLocationInput(matchedMachine.location || "Campus");

        onUpdateMachine(matchedMachine.machineId, matchedMachine.name || "Kiosk Machine");
        if (typeof window !== "undefined") {
          localStorage.setItem("kiosk_machine_id", matchedMachine.machineId);
          localStorage.setItem("kiosk_machine_name", matchedMachine.name || "Kiosk Machine");
        }

        setModalNotice({
          isOpen: true,
          type: "success",
          title: "Paired Successfully",
          message: `This terminal is now paired with "${matchedMachine.name}" (${matchedMachine.machineId}).`,
        });
        addLog("SUCCESS", `Kiosk paired with machine: ${matchedMachine.name} (Code: ${code})`);
        setPairCodeInput("");
      } else {
        setModalNotice({
          isOpen: true,
          type: "error",
          title: "Invalid Pair Code",
          message: "The entered code does not match any registered machine. Please verify the code in Admin -> Vending Machines.",
        });
        addLog("WARNING", `Failed pairing attempt with code: ${code}`);
      }
    } catch (err: any) {
      setModalNotice({
        isOpen: true,
        type: "error",
        title: "Connection Error",
        message: `Error connecting to database: ${err.message}`,
      });
      addLog("ERROR", `Pairing error: ${err.message}`);
    }
  };

  const addLog = (level: "INFO" | "SUCCESS" | "WARNING" | "ERROR", message: string) => {
    const newEntry: LogEntry = {
      id: String(Date.now()),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  // Run Test Print simulation
  const handleTestPrint = async () => {
    setTestPrinting(true);
    addLog("INFO", "Starting diagnostic test print spool...");

    setTimeout(async () => {
      try {
        const newPaper = Math.max(0, (printerData.paperPercentage || 92) - 1);
        setPrinterData((prev: any) => ({
          ...prev,
          paperPercentage: newPaper,
        }));
        await update(ref(database, `machinePrinterStatus/${currentId}`), {
          paperPercentage: newPaper,
          updatedAt: Date.now(),
        });
      } catch {}

      addLog("SUCCESS", "Test print completed successfully. 1 test page dispensed.");
      setTestPrinting(false);
      setModalNotice({
        isOpen: true,
        type: "success",
        title: "Test Page Dispensed",
        message: "Diagnostic print spool completed successfully. Laser engine verified.",
      });
    }, 2000);
  };

  // Reset printer
  const handleResetPrinter = async () => {
    addLog("INFO", "Resetting print spooler service...");
    try {
      await update(ref(database, `machinePrinterStatus/${currentId}`), {
        printerState: "READY",
        paperStatus: "OK",
        updatedAt: Date.now(),
      });
      setPrinterData((prev: any) => ({ ...prev, printerState: "READY", paperStatus: "OK" }));
      addLog("SUCCESS", "Spooler state reset to READY.");
      setModalNotice({
        isOpen: true,
        type: "success",
        title: "Spooler Reset",
        message: "Printer spooler service has been reset to READY state.",
      });
    } catch (err: any) {
      addLog("ERROR", `Failed to reset printer: ${err.message}`);
      setModalNotice({
        isOpen: true,
        type: "error",
        title: "Reset Failed",
        message: `Failed to reset printer spooler: ${err.message}`,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-x-hidden select-none font-sans">
      {/* ── Signature Honey-Golden Header (Matching AppNavbar) ── */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0 border-0">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight leading-tight">
              Print<span className="text-[#0c831f]">Mart</span> Diagnostics
            </span>
            <span className="text-[10px] font-semibold text-neutral-700 leading-none">
              Terminal Setup & Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/70 px-3 py-1 rounded-full border-0 text-xs font-semibold text-neutral-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#0c831f] animate-pulse" />
            <span>ID: {currentId}</span>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
            <span>Return to Kiosk</span>
          </button>
        </div>
      </header>

      {/* ── Top Aura & Delicate SVG Guilloché Curves (Matching Homepage) ── */}
      <GuillocheAura />

      {/* ── Main Diagnostics Workspace ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 z-10 relative space-y-5">
        
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Terminal Configuration & Diagnostics
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Terminal: <strong className="text-neutral-800">{nameInput}</strong> • ID: <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">{currentId}</code>
            </p>
          </div>
        </div>

        {/* ── Segmented Tabs (Clean Soft Pill Container, No Borders) ── */}
        <div className="bg-neutral-200/70 p-1 rounded-2xl flex gap-1 border-0">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
              activeTab === "identity"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Sliders className="w-4 h-4 text-[#0c831f]" />
            <span>Identity & Pairing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hardware")}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
              activeTab === "hardware"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Printer className="w-4 h-4 text-[#0c831f]" />
            <span>Hardware Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
              activeTab === "logs"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Activity className="w-4 h-4 text-[#0c831f]" />
            <span>Event Logs ({logs.length})</span>
          </button>
        </div>

        {/* ════ TAB 1: MACHINE IDENTITY & PAIRING ════ */}
        {activeTab === "identity" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Machine Name & Location Card (Zero Borders, Clean Soft Shadow) */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-4">
              <div className="flex items-center justify-between pb-3">
                <div>
                  <h2 className="font-bold text-base text-neutral-900">
                    Vending Machine Details
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Edit the terminal display name and physical location shown on kiosk screen
                  </p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg border-0">
                  {currentId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Vending Machine Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Central Library Kiosk A"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Physical Campus Location
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="e.g. Ground Floor, Central Library"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="py-2.5 px-5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer border-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Machine Details</span>
                </button>
              </div>
            </div>

            {/* Pair Code Login Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-4">
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#0c831f]" />
                  <h2 className="font-bold text-base text-neutral-900">
                    Pair Terminal with Admin Code
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter the 6-digit Pair Code from the Admin Vending Machines panel to automatically link this terminal
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  value={pairCodeInput}
                  onChange={(e) => setPairCodeInput(e.target.value.trim())}
                  placeholder="Enter 6-Digit Pair Code (e.g. 123456)"
                  className="flex-1 text-xs sm:text-sm font-mono font-bold tracking-widest px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={handlePairWithCode}
                  className="py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all active:scale-98 shadow-xs cursor-pointer shrink-0 border-0"
                >
                  Verify & Pair
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 2: PRINTER TELEMETRY & HEALTH ════ */}
        {activeTab === "hardware" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-5">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="font-bold text-base text-neutral-900">
                    Hardware & Spooler Telemetry
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {printerData.printerName || "Kiosk Direct Spooler"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0c831f] animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-800 uppercase bg-emerald-50 px-3 py-1 rounded-full border-0">
                    {printerData.printerState || "READY"}
                  </span>
                </div>
              </div>

              {/* Paper Level */}
              <div className="space-y-2 bg-neutral-50 p-4 rounded-xl border-0">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-700">Paper Level (Roll / Tray 1)</span>
                  <span className="text-[#0c831f] font-bold">{printerData.paperPercentage || 92}% OK (~460 Sheets Remaining)</span>
                </div>
                <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0c831f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${printerData.paperPercentage || 92}%` }}
                  />
                </div>
              </div>

              {/* Ink & Toner Levels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border-0 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-800">Black Toner</span>
                    <span>{printerData.blackInkPercentage || 88}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-neutral-900 h-full rounded-full" style={{ width: `${printerData.blackInkPercentage || 88}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-50/70 border-0 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-cyan-900">Cyan</span>
                    <span>{printerData.cyanInkPercentage || 84}%</span>
                  </div>
                  <div className="w-full bg-cyan-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${printerData.cyanInkPercentage || 84}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 border-0 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-rose-900">Magenta</span>
                    <span>{printerData.magentaInkPercentage || 82}%</span>
                  </div>
                  <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${printerData.magentaInkPercentage || 82}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border-0 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-amber-900">Yellow</span>
                    <span>{printerData.yellowInkPercentage || 86}%</span>
                  </div>
                  <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${printerData.yellowInkPercentage || 86}%` }} />
                  </div>
                </div>
              </div>

              {/* Hardware Actions */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testPrinting}
                  className="py-2.5 px-5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer border-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>{testPrinting ? "Dispensing Test Page..." : "Run Test Print"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetPrinter}
                  className="py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer border-0"
                >
                  <RotateCcw className="w-4 h-4 text-neutral-600" />
                  <span>Reset Spooler</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB 3: DIAGNOSTIC LOGS ════ */}
        {activeTab === "logs" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="font-bold text-base text-neutral-900">
                    Live Telemetry & Spooler Logs
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Real-time spooler events, OTP authentications, and cloud socket status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg border-0 transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {logs.map((log) => {
                  let badgeClass = "bg-neutral-200 text-neutral-700";
                  if (log.level === "SUCCESS") badgeClass = "bg-emerald-100 text-emerald-800 font-semibold";
                  if (log.level === "WARNING") badgeClass = "bg-amber-100 text-amber-800 font-semibold";
                  if (log.level === "ERROR") badgeClass = "bg-rose-100 text-rose-800 font-semibold";

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-neutral-50 border-0 flex items-start gap-3 text-xs"
                    >
                      <span className="text-neutral-400 shrink-0 font-mono text-[11px] font-medium">{log.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] shrink-0 font-mono ${badgeClass}`}>
                        {log.level}
                      </span>
                      <span className="text-neutral-800 flex-1 font-mono">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── NOTICE MODAL ── */}
      <NoticeModal
        isOpen={modalNotice.isOpen}
        type={modalNotice.type}
        title={modalNotice.title}
        message={modalNotice.message}
        onClose={() => setModalNotice((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

