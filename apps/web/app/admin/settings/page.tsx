"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Chip,
  Divider,
} from "@heroui/react";
import { Settings, ShieldCheck, Database, Save, KeyRound, CheckCircle2 } from "lucide-react";
import { database, ref, onValue, set, get } from "@/lib/firebase";

export default function AdminSettingsPage() {
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState<number>(25);
  const [masterKioskCode, setMasterKioskCode] = useState<string>("998877");
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load existing settings from Firebase RTDB
  useEffect(() => {
    const settingsRef = ref(database, "systemSettings");
    const unsub = onValue(settingsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.retentionDays) setRetentionDays(val.retentionDays);
        if (val.maxFileSizeBytes) setMaxFileSizeBytes(val.maxFileSizeBytes);
        if (val.masterKioskCode) setMasterKioskCode(val.masterKioskCode);
      }
    });

    return () => unsub();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const cleanCode = masterKioskCode.trim() || "998877";
      await set(ref(database, "systemSettings"), {
        masterKioskCode: cleanCode,
        retentionDays: Number(retentionDays) || 7,
        maxFileSizeBytes: Number(maxFileSizeBytes) || 25,
        updatedAt: Date.now(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save system settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">System & Vault Settings</h1>
        <p className="text-sm text-neutral-500">Configure global retention policies, kiosk master codes, and integration status</p>
      </div>

      {/* ── Kiosk Master Access Code Card ── */}
      <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
        <CardHeader className="flex gap-3 items-center pb-2">
          <div className="p-2 bg-emerald-100 text-[#0c831f] rounded-lg">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Vending Machine Kiosk Master PIN</h2>
            <p className="text-xs text-neutral-500">Universal access code to unlock settings and diagnostics on any kiosk</p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 py-4">
          <div className="max-w-md">
            <Input
              label="Kiosk Master Code (6 Digits)"
              type="text"
              maxLength={6}
              value={masterKioskCode}
              onChange={(e: any) => setMasterKioskCode(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 998877"
              className="font-mono text-lg font-bold"
              description="Type this code into any kiosk keypad or click 'Staff' to open the diagnostic & pairing settings."
            />
          </div>
        </CardBody>
      </Card>

      {/* ── Storage & Retention Card ── */}
      <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
        <CardHeader className="flex gap-3 items-center pb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Document Retention & Storage</h2>
            <p className="text-xs text-neutral-500">Configured Telegram private channel vault</p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Document Retention (Days)"
              type="number"
              value={String(retentionDays)}
              onChange={(e: any) => setRetentionDays(parseInt(e.target.value, 10) || 7)}
              description="Temporary spool files auto-shredded after expiry"
            />
            <Input
              label="Maximum Upload Size (MB)"
              type="number"
              value={String(maxFileSizeBytes)}
              onChange={(e: any) => setMaxFileSizeBytes(parseInt(e.target.value, 10) || 25)}
            />
          </div>

          <Divider className="my-2" />

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Connected Integration Status</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Telegram Document Vault</span>
                  <span className="text-neutral-500">Channel ID: -1004357170113 • Bot API Active</span>
                </div>
                <Chip size="sm" color="success" variant="flat">
                  CONNECTED
                </Chip>
              </div>

              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Cashfree Payment Gateway</span>
                  <span className="text-neutral-500">Mode: SANDBOX • Merchant App ID: TEST10342...</span>
                </div>
                <Chip size="sm" color="primary" variant="flat">
                  SANDBOX DEMO
                </Chip>
              </div>

              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Firebase Realtime Database</span>
                  <span className="text-neutral-500">Region: asia-southeast1 • Node: /systemSettings</span>
                </div>
                <Chip size="sm" color="success" variant="flat">
                  LIVE SYNC
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>

        <CardFooter className="border-t border-neutral-100 pt-4 flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Settings successfully saved to Cloud!
              </span>
            )}
          </div>
          <Button
            color="primary"
            isLoading={saving}
            onPress={handleSaveSettings}
            startContent={!saving && <Save className="w-4 h-4" />}
          >
            Save System Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
