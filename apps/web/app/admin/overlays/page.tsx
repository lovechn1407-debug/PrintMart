"use client";

import React, { useEffect, useState } from "react";
import {
  MonitorPlay,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  Wrench,
  PowerOff,
  Sparkles,
  Layers,
  RotateCw,
  XCircle,
  Eye,
  Tv,
  Check,
  Radio,
} from "lucide-react";
import { ref, onValue, set, remove, get } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { MachineOverlay, MachineRecord, OverlayType } from "@printmart/shared";

interface ActiveOverlayItem {
  scopeKey: string;
  scopeLabel: string;
  overlay: MachineOverlay;
}

export default function AdminOverlaysPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [targetScope, setTargetScope] = useState<string>("global");
  const [overlayActive, setOverlayActive] = useState<boolean>(true);
  const [overlayType, setOverlayType] = useState<OverlayType>("MAINTENANCE");
  const [title, setTitle] = useState<string>("Kiosk Under Maintenance");
  const [message, setMessage] = useState<string>(
    "This self-service terminal is undergoing routine service. Please visit another campus kiosk."
  );
  const [countdownMinutes, setCountdownMinutes] = useState<number>(15);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Overlays Fleet Tracker
  const [activeOverlaysList, setActiveOverlaysList] = useState<ActiveOverlayItem[]>([]);

  // 1. Listen to machines fleet
  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsub = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        setMachines(Object.values(snap.val()));
      } else {
        setMachines([]);
      }
    });

    return () => unsub();
  }, []);

  // 2. Listen to all active overlays across global and individual machines
  useEffect(() => {
    const overlaysRef = ref(database, "overlays");
    const unsub = onValue(overlaysRef, (snap) => {
      const activeList: ActiveOverlayItem[] = [];
      if (snap.exists()) {
        const val = snap.val();

        // Check global overlay
        if (val.global && val.global.active) {
          activeList.push({
            scopeKey: "global",
            scopeLabel: "All Kiosks (Global Fleet)",
            overlay: val.global,
          });
        }

        // Check per-machine overlays
        if (val.machines && typeof val.machines === "object") {
          for (const [mId, mOverlay] of Object.entries(val.machines)) {
            const ov = mOverlay as MachineOverlay;
            if (ov && ov.active) {
              const matchedMachine = machines.find((m) => m.machineId === mId);
              activeList.push({
                scopeKey: mId,
                scopeLabel: matchedMachine ? `${matchedMachine.name} (${mId})` : `Kiosk (${mId})`,
                overlay: ov,
              });
            }
          }
        }
      }
      setActiveOverlaysList(activeList);
    });

    return () => unsub();
  }, [machines]);

  // 3. Listen to current targetScope overlay configuration
  useEffect(() => {
    const currentPath =
      targetScope === "global"
        ? "overlays/global"
        : `overlays/machines/${targetScope}`;

    const currentRef = ref(database, currentPath);
    const unsub = onValue(currentRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as MachineOverlay;
        setOverlayActive(val.active ?? true);
        setOverlayType(val.type || "MAINTENANCE");
        setTitle(val.title || "Kiosk Under Maintenance");
        setMessage(val.message || "");
        setCountdownMinutes(val.countdownSeconds ? Math.round(val.countdownSeconds / 60) : 15);
      } else {
        setOverlayActive(true);
        setOverlayType("MAINTENANCE");
        setTitle("Kiosk Under Maintenance");
        setMessage("This self-service terminal is undergoing routine service. Please visit another campus kiosk.");
        setCountdownMinutes(15);
      }
    });

    return () => unsub();
  }, [targetScope]);

  // Apply or Update Overlay
  const handleApplyOverlay = async (activate: boolean = overlayActive) => {
    setSaving(true);
    try {
      const payload: MachineOverlay = {
        active: activate,
        type: overlayType,
        title: title.trim() || "Kiosk Under Maintenance",
        message: message.trim(),
        countdownSeconds: countdownMinutes > 0 ? countdownMinutes * 60 : null,
        updatedAt: Date.now(),
      };

      const targetPath =
        targetScope === "global"
          ? "overlays/global"
          : `overlays/machines/${targetScope}`;

      await set(ref(database, targetPath), payload);

      setOverlayActive(activate);
      setSuccessMsg(
        activate
          ? `Overlay activated successfully on ${targetScope === "global" ? "All Kiosks" : targetScope}!`
          : `Overlay removed successfully from ${targetScope === "global" ? "All Kiosks" : targetScope}!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to save overlay: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Remove specific overlay directly
  const handleRemoveSpecificOverlay = async (scopeKey: string) => {
    try {
      const targetPath =
        scopeKey === "global"
          ? "overlays/global"
          : `overlays/machines/${scopeKey}`;

      await set(ref(database, targetPath), {
        active: false,
        updatedAt: Date.now(),
      });

      setSuccessMsg(`Overlay removed from ${scopeKey === "global" ? "All Kiosks" : scopeKey}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to remove overlay: ${err.message}`);
    }
  };

  // Fleet-wide Emergency Clear: Remove all active overlays
  const handleRemoveAllOverlays = async () => {
    if (!confirm("Are you sure you want to remove ALL active overlays across every kiosk in the fleet?")) {
      return;
    }
    setSaving(true);
    try {
      // Clear global
      await set(ref(database, "overlays/global"), {
        active: false,
        updatedAt: Date.now(),
      });

      // Clear all machines
      const snap = await get(ref(database, "overlays/machines"));
      if (snap.exists()) {
        const machOverlays = snap.val();
        const updates: Record<string, any> = {};
        for (const mId of Object.keys(machOverlays)) {
          updates[`overlays/machines/${mId}/active`] = false;
          updates[`overlays/machines/${mId}/updatedAt`] = Date.now();
        }
        for (const [path, val] of Object.entries(updates)) {
          await set(ref(database, path), val);
        }
      }

      setOverlayActive(false);
      setSuccessMsg("All overlays removed fleet-wide! All kiosks restored to OTP screen.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error clearing overlays: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl font-sans">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border-0">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Remote Kiosk Overlays & Maintenance
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Display full-screen service alerts, countdown timers, or maintenance screens on kiosks in realtime.
              </p>
            </div>
          </div>
        </div>

        {/* Global Emergency Clear Button */}
        {activeOverlaysList.length > 0 && (
          <button
            type="button"
            onClick={handleRemoveAllOverlays}
            disabled={saving}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-0 shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove All Active Overlays ({activeOverlaysList.length})</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-[#0c831f] rounded-xl flex items-center gap-2.5 text-xs font-bold border-0 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 2. Live Active Overlays Dashboard Banner ── */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-neutral-500 animate-pulse" />
            <h2 className="font-bold text-sm text-neutral-900">
              Fleet Status & Live Overlays
            </h2>
          </div>
          {activeOverlaysList.length === 0 ? (
            <span className="text-xs font-bold text-[#0c831f] bg-emerald-50 px-3 py-1 rounded-full border-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0c831f]" />
              All Kiosks Operational (No Active Overlays)
            </span>
          ) : (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              {activeOverlaysList.length} Active Overlay{activeOverlaysList.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {activeOverlaysList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {activeOverlaysList.map((item) => (
              <div
                key={item.scopeKey}
                className="p-3.5 bg-amber-50/60 rounded-xl flex items-center justify-between gap-3 border-0 shadow-2xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {item.scopeLabel}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border-0">
                      {item.overlay.type || "MAINTENANCE"}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-700 truncate">
                    {item.overlay.title}
                  </p>
                  {item.overlay.countdownSeconds && (
                    <span className="text-[10px] text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{Math.round(item.overlay.countdownSeconds / 60)} min countdown
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSpecificOverlay(item.scopeKey)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer border-0 shrink-0 shadow-2xs flex items-center gap-1.5 active:scale-95"
                  title="Remove this overlay and return kiosk to OTP screen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 pt-0.5">
            No kiosk is currently displaying an overlay. All kiosks are running normal customer OTP screens.
          </p>
        )}
      </div>

      {/* ── 3. Configure & Dispatch / Remove Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Controls (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div>
              <h2 className="font-bold text-base text-neutral-900">
                Configure Kiosk Display Overlay
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pushes immediately to the selected kiosk or entire fleet in realtime
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">
              Target Kiosk Scope
            </label>
            <select
              value={targetScope}
              onChange={(e) => setTargetScope(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all"
            >
              <option value="global">All Kiosks (Global Fleet)</option>
              {machines.map((m) => (
                <option key={m.machineId} value={m.machineId}>
                  {m.name} ({m.machineId})
                </option>
              ))}
            </select>
          </div>

          {/* Overlay Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">
              Overlay Alert Type
            </label>
            <select
              value={overlayType}
              onChange={(e) => setOverlayType(e.target.value as OverlayType)}
              className="w-full text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all"
            >
              <option value="MAINTENANCE">Under Maintenance (Technician Servicing)</option>
              <option value="SERVICE_DISABLED">Service Temporarily Disabled (Admin Paused)</option>
              <option value="PAPER_OUT">Paper Tray Reload Required (Hardware Attention)</option>
              <option value="NETWORK_MAINTENANCE">Network Maintenance (Offline Connectivity)</option>
              <option value="CUSTOM">Custom Service Notice</option>
            </select>
          </div>

          {/* Overlay Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">
              Overlay Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kiosk Under Maintenance"
              className="w-full text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all"
            />
          </div>

          {/* Message Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">
              Message Details
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain to users why the kiosk is paused and when it will be back..."
              className="w-full text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Countdown Timer */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">
              Estimated Return Countdown (Minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={180}
                value={countdownMinutes}
                onChange={(e) => setCountdownMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-32 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-neutral-100 border-0 focus:outline-none focus:ring-2 focus:ring-[#0c831f] focus:bg-white transition-all"
              />
              <span className="text-xs text-neutral-500">
                {countdownMinutes > 0 ? `(~${countdownMinutes} minutes countdown)` : "(No countdown timer)"}
              </span>
            </div>
          </div>

          {/* Action Buttons: Remove Overlay vs Dispatch Overlay */}
          <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
            {/* Remove / Deactivate Overlay Button */}
            <button
              type="button"
              onClick={() => handleApplyOverlay(false)}
              disabled={saving}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-0 flex items-center gap-2 disabled:opacity-50"
              title="Remove overlay and return this kiosk to normal OTP screen"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Remove / Deactivate Overlay</span>
            </button>

            {/* Dispatch / Activate Overlay Button */}
            <button
              type="button"
              onClick={() => handleApplyOverlay(true)}
              disabled={saving}
              className="px-5 py-2.5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer border-0 disabled:opacity-50"
            >
              {saving ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Dispatch Overlay to {targetScope === "global" ? "All Kiosks" : "Selected Kiosk"}</span>
            </button>
          </div>
        </div>

        {/* Live Preview (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-0 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <Eye className="w-4 h-4 text-neutral-500" />
              <h3 className="font-bold text-sm text-neutral-900">
                Live Kiosk Preview
              </h3>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1 mb-4">
              Realtime visual simulation of what appears on the kiosk terminal:
            </p>

            {/* Simulated Kiosk Screen Frame */}
            <div className="w-full bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] rounded-2xl p-4 shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
              {/* iPhone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-neutral-950 text-white px-3 py-0.5 rounded-b-lg flex items-center gap-1.5 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                <span className="text-[9px] font-semibold text-neutral-200">
                  {targetScope === "global" ? "Central Library Kiosk A" : targetScope}
                </span>
                <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              </div>

              {/* Simulated Overlay Card (Zero Borders, Clean Soft Shadow) */}
              <div className="bg-white rounded-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 text-center space-y-3 w-full max-w-[260px] animate-in zoom-in-95 mt-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                  {overlayType === "SERVICE_DISABLED" ? (
                    <PowerOff className="w-5 h-5" />
                  ) : overlayType === "PAPER_OUT" ? (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <Wrench className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 inline-block">
                    {overlayType}
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-neutral-900 leading-tight">
                    {title || "Kiosk Under Maintenance"}
                  </h4>
                  <p className="text-[10px] text-neutral-600 line-clamp-3 leading-relaxed">
                    {message || "Routine maintenance in progress..."}
                  </p>
                </div>

                {countdownMinutes > 0 && (
                  <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-50/80 rounded-lg text-[10px] font-semibold text-amber-900">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Estimated Return in ~{countdownMinutes} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-500 space-y-1 border-0">
            <span className="font-bold text-neutral-700 block">Fast Kiosk Recovery:</span>
            <span>
              Clicking <strong>Remove / Deactivate Overlay</strong> immediately commands the target kiosk to dismiss the overlay and resume the customer OTP interface.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
