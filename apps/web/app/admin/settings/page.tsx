"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Save,
  Copy,
  Check,
  HardDrive,
  Clock,
  Sparkles,
} from "lucide-react";
import { database, ref, onValue, set } from "@/lib/firebase";

export default function AdminSettingsPage() {
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState<number>(100);
  const [masterKioskCode, setMasterKioskCode] = useState<string>("998877");
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Load existing settings from Firebase RTDB
  useEffect(() => {
    const settingsRef = ref(database, "systemSettings");
    const unsub = onValue(settingsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.retentionDays) setRetentionDays(val.retentionDays);
        if (val.maxFileSizeBytes) setMaxFileSizeBytes(Number(val.maxFileSizeBytes) || 100);
        if (val.masterKioskCode) setMasterKioskCode(val.masterKioskCode);
      }
    });

    return () => unsub();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(masterKioskCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const cleanCode = masterKioskCode.trim() || "998877";
      const clampedMaxMb = Math.min(100, Math.max(5, Number(maxFileSizeBytes) || 100));
      await set(ref(database, "systemSettings"), {
        masterKioskCode: cleanCode,
        retentionDays: Number(retentionDays) || 7,
        maxFileSizeBytes: clampedMaxMb,
        updatedAt: Date.now(),
      });
      setMaxFileSizeBytes(clampedMaxMb);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            System & Master Vault Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure universal kiosk master PINs, encrypted document retention windows, and upload parameters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-0 shrink-0 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>

      {/* Success Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs sm:text-sm">System Policies Saved!</h4>
            <p className="text-xs text-emerald-700">
              Master kiosk PIN and document retention limits updated in Firebase RTDB.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Kiosk Master Maintenance PIN ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Vending Machine Kiosk Master PIN
            </h2>
            <p className="text-xs text-neutral-500">
              Universal bypass code to unlock diagnostics and pairing options on any physical kiosk
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <label className="text-xs font-bold text-neutral-800 block">
            6-Digit Master Maintenance PIN
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              value={masterKioskCode}
              onChange={(e) => setMasterKioskCode(e.target.value.replace(/\D/g, ""))}
              placeholder="998877"
              className="w-48 h-12 px-4 text-center font-mono text-xl font-black tracking-widest bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border-0"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
            Typing this code on any kiosk touch keypad, or clicking the header <strong>&quot;Staff&quot;</strong> button, instantly authenticates the operator into hardware diagnostics and unpairing controls.
          </p>
        </div>
      </div>

      {/* ── 2. Storage & Vault Retention ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Document Vault Retention Policies
            </h2>
            <p className="text-xs text-neutral-500">
              Automatic deletion schedules for uploaded PDF and DOCX files
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Auto-Purge Window (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full h-11 px-3.5 bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 font-bold text-sm text-neutral-900 outline-none transition-all"
            />
            <span className="text-[11px] text-neutral-400 block">
              Customer print files are permanently deleted after this duration.
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 block">
                Maximum File Size Limit (MB)
              </label>
              <span className="text-[10px] font-bold text-[#0c831f] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Max 100 MB
              </span>
            </div>
            <input
              type="number"
              min="5"
              max="100"
              value={maxFileSizeBytes}
              onChange={(e) => setMaxFileSizeBytes(Number(e.target.value))}
              className="w-full h-11 px-3.5 bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 font-bold text-sm text-neutral-900 outline-none transition-all"
            />
            <div className="flex items-center gap-1.5 pt-1">
              {[25, 50, 75, 100].map((mb) => (
                <button
                  key={mb}
                  type="button"
                  onClick={() => setMaxFileSizeBytes(mb)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                    maxFileSizeBytes === mb
                      ? "bg-[#0c831f] text-white border-[#0c831f]"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
            <span className="text-[11px] text-neutral-400 block pt-0.5">
              Configurable up to 100 MB. Files larger than 20 MB are automatically chunked into 20 MB slices and securely vaulted in Telegram.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
