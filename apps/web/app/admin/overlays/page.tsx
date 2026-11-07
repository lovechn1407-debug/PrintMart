"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Select,
  SelectItem,
  Switch,
  Alert,
} from "@heroui/react";
import { MonitorPlay, ShieldAlert, CheckCircle } from "lucide-react";
import { ref, onValue, set } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { MachineOverlay, MachineRecord, OverlayType } from "@printmart/shared";

export default function AdminOverlaysPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [targetScope, setTargetScope] = useState<string>("global");
  const [overlayActive, setOverlayActive] = useState<boolean>(false);
  const [overlayType, setOverlayType] = useState<OverlayType>("MAINTENANCE");
  const [title, setTitle] = useState<string>("Under Scheduled Maintenance");
  const [message, setMessage] = useState<string>(
    "This printing station is undergoing routine paper tray and ink maintenance. It will be back online shortly."
  );
  const [countdownMinutes, setCountdownMinutes] = useState<number>(15);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Listen to machines
    const machinesRef = ref(database, "machines");
    const unsub = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        setMachines(Object.values(snap.val()));
      }
    });

    // Listen to current global overlay
    const overlayRef = ref(database, "overlays/global");
    const unsubOverlay = onValue(overlayRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as MachineOverlay;
        setOverlayActive(val.active);
        setOverlayType(val.type || "MAINTENANCE");
        setTitle(val.title || "Under Scheduled Maintenance");
        setMessage(val.message || "");
      }
    });

    return () => {
      unsub();
      unsubOverlay();
    };
  }, []);

  const handleApplyOverlay = async () => {
    try {
      setSaving(true);
      const newOverlay: MachineOverlay = {
        active: overlayActive,
        type: overlayType,
        title,
        message,
        countdownSeconds: countdownMinutes > 0 ? countdownMinutes * 60 : null,
        updatedAt: Date.now(),
      };

      if (targetScope === "global") {
        await set(ref(database, "overlays/global"), newOverlay);
      } else {
        await set(ref(database, `overlays/machines/${targetScope}`), newOverlay);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Overlay save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Remote Kiosk Overlays & Maintenance</h1>
        <p className="text-sm text-neutral-500">
          Display full-screen service alerts, countdown timers, and maintenance screens on kiosks
        </p>
      </div>

      {savedSuccess && (
        <Alert color="success" className="mb-2">
          Overlay configuration dispatched to target kiosks in realtime!
        </Alert>
      )}

      <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
        <CardHeader className="flex gap-3 items-center pb-2">
          <div className="p-2 bg-warning/10 text-warning rounded-lg">
            <MonitorPlay className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Configure Kiosk Display Overlay</h2>
            <p className="text-xs text-neutral-500">Pushes immediately to the physical Electron screen</p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span className="font-semibold text-sm text-neutral-900 block">Active Status</span>
              <span className="text-xs text-neutral-500">
                When enabled, the kiosk OTP screen is replaced with this overlay
              </span>
            </div>
            <Switch isSelected={overlayActive} onValueChange={setOverlayActive} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Target Scope</label>
              <select
                className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white"
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
              >
                <option value="global">All Kiosks (Global Fleet)</option>
                {machines.map((m) => (
                  <option key={m.machineId} value={m.machineId}>
                    {m.name} ({m.machineId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Overlay Type</label>
              <select
                className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white"
                value={overlayType}
                onChange={(e) => setOverlayType(e.target.value as OverlayType)}
              >
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="SERVICE_DISABLED">Service Temporarily Disabled</option>
                <option value="PAPER_OUT">Paper Tray Reload Required</option>
                <option value="NETWORK_MAINTENANCE">Network Maintenance</option>
                <option value="CUSTOM">Custom Notice</option>
              </select>
            </div>
          </div>

          <Input label="Overlay Title" value={title} onValueChange={setTitle} />

          <Input
            label="Message Details"
            value={message}
            onValueChange={setMessage}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Countdown Timer (Minutes)"
              type="number"
              value={String(countdownMinutes)}
              onValueChange={(val) => setCountdownMinutes(parseInt(val, 10) || 0)}
            />
          </div>
        </CardBody>

        <CardFooter className="border-t border-neutral-100 pt-4 flex justify-end">
          <Button
            color="primary"
            isLoading={saving}
            onPress={handleApplyOverlay}
          >
            Dispatch Overlay Update
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

