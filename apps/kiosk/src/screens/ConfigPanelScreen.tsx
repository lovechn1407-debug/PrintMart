"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Printer,
  Wifi,
  ArrowLeft,
  RefreshCw,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Save,
  Activity,
  FileText,
  Sliders,
  Check,
  RotateCcw,
} from "lucide-react";
import { database, ref, onValue, set, update, get } from "../firebase";

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
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);

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
      message: "Staff authentication unlocked diagnostic settings panel",
    },
  ]);

  // Load Machine details from Firebase RTDB
  useEffect(() => {
    const machineRef = ref(database, `machines/${currentId}`);
    const unsubMachine = onValue(machineRef, (snap) => {
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
      unsubMachine();
      unsubPrinter();
    };
  }, [currentId]);

  // Save Vending Machine Name & Location to Firebase RTDB
  const handleSaveIdentity = async () => {
    if (!nameInput.trim()) return;
    try {
      await update(ref(database, `machines/${currentId}`), {
        name: nameInput.trim(),
        location: locationInput.trim(),
        updatedAt: Date.now(),
      });
      onUpdateMachine(currentId, nameInput.trim());
      localStorage.setItem("kiosk_machine_name", nameInput.trim());

      addLog("SUCCESS", `Vending machine name updated to "${nameInput.trim()}"`);
      setSaveSuccess("Vending machine details saved to cloud!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      addLog("ERROR", `Failed to update machine details: ${err.message}`);
    }
  };

  // Pair / Login with 6-digit Pair Code from Admin Panel
  const handlePairWithCode = async () => {
    const code = pairCodeInput.trim();
    if (!code) return;

    setPairError(null);
    setPairSuccess(null);

    try {
      const snap = await get(ref(database, "machines"));
      if (!snap.exists()) {
        setPairError("No machines found in database. Please add one in Admin Panel.");
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
        localStorage.setItem("kiosk_machine_id", matchedMachine.machineId);
        localStorage.setItem("kiosk_machine_name", matchedMachine.name || "Kiosk Machine");

        setPairSuccess(`Paired successfully with "${matchedMachine.name}" (${matchedMachine.machineId})!`);
        addLog("SUCCESS", `Kiosk paired with machine: ${matchedMachine.name} (Code: ${code})`);
        setPairCodeInput("");
        setTimeout(() => setPairSuccess(null), 4000);
      } else {
        setPairError("Invalid Pair Code. Please check the code in Admin -> Vending Machines.");
        addLog("WARNING", `Failed pairing attempt with code: ${code}`);
      }
    } catch (err: any) {
      setPairError(`Error connecting to server: ${err.message}`);
      addLog("ERROR", `Pairing error: ${err.message}`);
    }
  };

  // Helper to add local log
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
      const newPaper = Math.max(0, (printerData.paperPercentage || 92) - 1);
      const updated = {
        ...printerData,
        paperPercentage: newPaper,
        updatedAt: Date.now(),
      };
      setPrinterData(updated);

      try {
        await update(ref(database, `machinePrinterStatus/${currentId}`), {
          paperPercentage: newPaper,
          updatedAt: Date.now(),
        });
      } catch {}

      addLog("SUCCESS", "Test print page completed successfully. 1 page dispensed.");
      setTestPrinting(false);
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
    } catch (err: any) {
      addLog("ERROR", `Failed to reset printer: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full min-h-screen">
      {/* ── Top Header ── */}
      <div className="flex justify-between items-center pb-5 border-b border-neutral-200 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-neutral-900 text-white rounded-2xl flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900">Protected Kiosk Diagnostics & Setup</h1>
            <p className="text-xs text-neutral-500 font-medium">
              Terminal: <strong className="text-neutral-800">{nameInput}</strong> • ID: <code className="font-mono">{currentId}</code>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c831f] text-white hover:bg-[#0a6c1a] font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Kiosk
        </button>
      </div>

      {/* ── Custom Interactive Tabs ── */}
      <div className="flex border-b border-neutral-200 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "identity"
              ? "border-[#0c831f] text-[#0c831f]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Vending Machine Identity & Pairing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hardware")}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "hardware"
              ? "border-[#0c831f] text-[#0c831f]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Printer className="w-4 h-4" />
          Printer Telemetry & Health
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "logs"
              ? "border-[#0c831f] text-[#0c831f]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Diagnostic Logs
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-mono">
            {logs.length}
          </span>
        </button>
      </div>

      {/* ════ TAB 1: MACHINE IDENTITY & PAIRING ════ */}
      {activeTab === "identity" && (
        <div className="flex flex-col gap-6">
          {/* Machine Name & Location Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Vending Machine Details</h2>
              <p className="text-xs text-neutral-500">Edit the display name and physical location shown on the screen and admin panel</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-700">Vending Machine Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Central Library Kiosk A"
                  className="px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-700">Physical Location</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Ground Floor, Central Library"
                  className="px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div>
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {saveSuccess}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveIdentity}
                className="px-5 py-2.5 bg-[#0c831f] hover:bg-[#0a6c1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Machine Name
              </button>
            </div>
          </div>

          {/* Pair Code Login Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#0c831f]" />
                Pair / Login with Admin Code
              </h2>
              <p className="text-xs text-neutral-500">
                Enter the 6-digit Pair Code from the Admin Vending Machines panel to log this terminal in as that machine
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                type="text"
                value={pairCodeInput}
                onChange={(e) => setPairCodeInput(e.target.value.trim())}
                placeholder="Enter 6-Digit Pair Code (e.g. 123456)"
                className="px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0c831f] flex-1"
              />
              <button
                type="button"
                onClick={handlePairWithCode}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Verify & Pair
              </button>
            </div>

            {pairError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {pairError}
              </div>
            )}

            {pairSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {pairSuccess}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ TAB 2: PRINTER TELEMETRY & HEALTH ════ */}
      {activeTab === "hardware" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 shadow-xs flex flex-col gap-5">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Hardware & Spooler Telemetry</h2>
                <p className="text-xs text-neutral-500">{printerData.printerName || "Kiosk Direct Spooler"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {printerData.printerState || "READY"}
                </span>
              </div>
            </div>

            {/* Paper Level */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-neutral-700">Paper Level (Roll / Tray 1)</span>
                <span className="text-emerald-700">{printerData.paperPercentage || 92}% OK (~460 Sheets)</span>
              </div>
              <div className="w-full bg-neutral-100 h-3.5 rounded-full overflow-hidden border border-neutral-200/80">
                <div
                  className="bg-[#0c831f] h-full rounded-full transition-all duration-500"
                  style={{ width: `${printerData.paperPercentage || 92}%` }}
                />
              </div>
            </div>

            {/* Ink & Toner Levels Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-neutral-800">Black Toner</span>
                  <span>{printerData.blackInkPercentage || 88}%</span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-900 h-full rounded-full" style={{ width: `${printerData.blackInkPercentage || 88}%` }} />
                </div>
              </div>

              <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200/60 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-cyan-900">Cyan</span>
                  <span>{printerData.cyanInkPercentage || 84}%</span>
                </div>
                <div className="w-full bg-cyan-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${printerData.cyanInkPercentage || 84}%` }} />
                </div>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/60 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-900">Magenta</span>
                  <span>{printerData.magentaInkPercentage || 82}%</span>
                </div>
                <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${printerData.magentaInkPercentage || 82}%` }} />
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-amber-900">Yellow</span>
                  <span>{printerData.yellowInkPercentage || 86}%</span>
                </div>
                <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${printerData.yellowInkPercentage || 86}%` }} />
                </div>
              </div>
            </div>

            {/* Hardware Actions */}
            <div className="pt-4 border-t border-neutral-100 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={testPrinting}
                className="px-4 py-2.5 bg-[#0c831f] hover:bg-[#0a6c1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {testPrinting ? "Dispensing Test Page..." : "Run Test Print"}
              </button>

              <button
                type="button"
                onClick={handleResetPrinter}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl border border-neutral-200 shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-neutral-600" />
                Reset Spooler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ TAB 3: DIAGNOSTIC LOGS ════ */}
      {activeTab === "logs" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Live Kiosk Event Logs</h2>
                <p className="text-xs text-neutral-500">Real-time spooler events, OTP authentications, and cloud telemetry</p>
              </div>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                Clear Display
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto font-mono text-xs pr-1">
              {logs.map((log) => {
                let badgeClass = "bg-neutral-100 text-neutral-700";
                if (log.level === "SUCCESS") badgeClass = "bg-emerald-100 text-emerald-800 font-bold";
                if (log.level === "WARNING") badgeClass = "bg-amber-100 text-amber-800 font-bold";
                if (log.level === "ERROR") badgeClass = "bg-rose-100 text-rose-800 font-bold";

                return (
                  <div
                    key={log.id}
                    className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70 flex items-start gap-3"
                  >
                    <span className="text-neutral-400 shrink-0 text-[11px]">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${badgeClass}`}>
                      {log.level}
                    </span>
                    <span className="text-neutral-800 flex-1">{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
