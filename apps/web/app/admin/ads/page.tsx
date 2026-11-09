"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Tv,
  Film,
  Images,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Play,
  RotateCw,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  QrCode,
  Zap,
  Smartphone,
  Coins,
  Bell,
  AlertCircle,
  Info,
  Wrench,
  MessageSquare,
  Layers,
} from "lucide-react";
import { database, ref, onValue, set, get } from "@/lib/firebase";
import { MachineRecord, DEFAULT_GLOBAL_PRICING, GlobalPricing } from "@printmart/shared";

interface AdSettings {
  enabled: boolean;
  mode: "video" | "slides" | "banner" | "vending-qr";
  aspectRatio?: "9:16" | "9:14" | "16:9" | "3:4" | "4:3" | "custom";
  customAspectRatio?: string;
  videoUrl?: string;
  slides?: string[];
  slideDuration?: number;
  title?: string;
  subtitle?: string;
  targetUrl?: string;
  updatedAt?: number;
}

export interface KioskPopupSettings {
  enabled: boolean;
  targetArea: "otp" | "ad" | "both";
  icon: "alert" | "info" | "check" | "bell" | "sparkles" | "wrench";
  title: string;
  description: string;
  buttonText: string;
  buttonEnabled?: boolean;
  updatedAt: number;
}

export default function AdminAdsPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("global");

  // Ad Settings State
  const [enabled, setEnabled] = useState<boolean>(true);
  const [mode, setMode] = useState<"video" | "slides" | "banner" | "vending-qr">("vending-qr");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "9:14" | "16:9" | "3:4" | "4:3" | "custom">("16:9");
  const [customAspectRatio, setCustomAspectRatio] = useState<string>("16:9");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [slides, setSlides] = useState<string[]>([]);
  const [slideDuration, setSlideDuration] = useState<number>(5);
  const [title, setTitle] = useState<string>("Print from Your Phone in 30 Seconds");
  const [subtitle, setSubtitle] = useState<string>(
    "Scan the QR code with your camera, upload your document, and enter the OTP on this screen to dispense."
  );
  const [targetUrl, setTargetUrl] = useState<string>("https://itsprintmart.vercel.app");

  // Notice Popup State
  const [popupEnabled, setPopupEnabled] = useState<boolean>(false);
  const [popupTargetArea, setPopupTargetArea] = useState<"otp" | "ad" | "both">("otp");
  const [popupIcon, setPopupIcon] = useState<"alert" | "info" | "check" | "bell" | "sparkles" | "wrench">("alert");
  const [popupTitle, setPopupTitle] = useState<string>("Notice");
  const [popupDescription, setPopupDescription] = useState<string>("Please note this announcement on the kiosk.");
  const [popupButtonText, setPopupButtonText] = useState<string>("Okay, Got It");
  const [popupButtonEnabled, setPopupButtonEnabled] = useState<boolean>(true);
  const [popupSaving, setPopupSaving] = useState<boolean>(false);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing>(DEFAULT_GLOBAL_PRICING);
  const adminQrPreview = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    targetUrl.trim() || "https://itsprintmart.vercel.app"
  )}`;

  // Upload & Save State
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [slideInput, setSlideInput] = useState<string>("");
  const videoInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  // Listen to Global Pricing from Firebase RTDB (pricing/global)
  useEffect(() => {
    const pricingRef = ref(database, "pricing/global");
    const unsub = onValue(pricingRef, (snap) => {
      if (snap.exists()) {
        setGlobalPricing(snap.val() as GlobalPricing);
      }
    });
    return () => unsub();
  }, []);

  // Listen to Machines list
  useEffect(() => {
    const machinesRef = ref(database, "machines");
    const unsub = onValue(machinesRef, (snap) => {
      if (snap.exists()) {
        setMachines(Object.values(snap.val()));
      }
    });
    return () => unsub();
  }, []);

  // Listen to Ad Config based on selected scope
  useEffect(() => {
    const adPath =
      selectedScope === "global"
        ? "systemSettings/kioskAds"
        : `machines/${selectedScope}/adConfig`;

    const adRef = ref(database, adPath);
    const unsub = onValue(adRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as AdSettings;
        setEnabled(val.enabled ?? true);
        setMode(val.mode || "vending-qr");
        setAspectRatio(val.aspectRatio || "16:9");
        setCustomAspectRatio(val.customAspectRatio || "16:9");
        setVideoUrl(val.videoUrl || "");
        setSlides(val.slides || []);
        setSlideDuration(val.slideDuration || 5);
        setTitle(val.title || "Print from Your Phone in 30 Seconds");
        setSubtitle(
          val.subtitle ||
            "Scan the QR code with your camera, upload your document, and enter the OTP on this screen to dispense."
        );
        setTargetUrl(val.targetUrl || "https://itsprintmart.vercel.app");
      } else {
        // Defaults
        setEnabled(false);
        setVideoUrl("");
        setSlides([]);
        setTargetUrl("https://itsprintmart.vercel.app");
      }
    });

    return () => unsub();
  }, [selectedScope]);

  // Listen to Notice Popup Config based on selected scope
  useEffect(() => {
    const popupPath =
      selectedScope === "global"
        ? "systemSettings/kioskNoticePopup"
        : `machines/${selectedScope}/noticePopup`;

    const popupRef = ref(database, popupPath);
    const unsub = onValue(popupRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as KioskPopupSettings;
        setPopupEnabled(val.enabled ?? false);
        setPopupTargetArea(val.targetArea || "otp");
        setPopupIcon(val.icon || "alert");
        setPopupTitle(val.title || "Notice");
        setPopupDescription(val.description || "");
        setPopupButtonText(val.buttonText || "Okay, Got It");
        setPopupButtonEnabled(val.buttonEnabled !== false);
      } else {
        setPopupEnabled(false);
        setPopupTargetArea("otp");
        setPopupIcon("alert");
        setPopupTitle("Notice");
        setPopupDescription("");
        setPopupButtonText("Okay, Got It");
        setPopupButtonEnabled(true);
      }
    });

    return () => unsub();
  }, [selectedScope]);

  // Save / Toggle Notice Popup
  const handleSavePopup = async (enableState: boolean = popupEnabled) => {
    setPopupSaving(true);
    try {
      const popupPath =
        selectedScope === "global"
          ? "systemSettings/kioskNoticePopup"
          : `machines/${selectedScope}/noticePopup`;

      const payload: KioskPopupSettings = {
        enabled: enableState,
        targetArea: popupTargetArea,
        icon: popupIcon,
        title: popupTitle.trim() || "Notice",
        description: popupDescription.trim(),
        buttonText: popupButtonText.trim() || "Okay, Got It",
        buttonEnabled: popupButtonEnabled,
        updatedAt: Date.now(),
      };

      await set(ref(database, popupPath), payload);
      setPopupEnabled(enableState);
      setSuccessMsg(
        enableState
          ? `Notice popup published to ${selectedScope === "global" ? "All Kiosks" : selectedScope}!`
          : `Notice popup dismissed from ${selectedScope === "global" ? "All Kiosks" : selectedScope}!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update popup");
    } finally {
      setPopupSaving(false);
    }
  };

  // Handle Video File Upload via /api/upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerUid", "admin_ads");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Video upload failed");
      const data = await res.json();
      const uploadedDoc = data.document;
      const previewUrl =
        uploadedDoc.previewUrl || `/api/document/preview?documentId=${uploadedDoc.documentId}`;
      setVideoUrl(previewUrl);
      setMode("video");
      setSuccessMsg("Video uploaded successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  // Handle Slide Image Upload
  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerUid", "admin_ads");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Slide upload failed");
      const data = await res.json();
      const uploadedDoc = data.document;
      const previewUrl =
        uploadedDoc.previewUrl || `/api/document/preview?documentId=${uploadedDoc.documentId}`;
      setSlides((prev) => [...prev, previewUrl]);
      setMode("slides");
      setSuccessMsg("Slide added successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to upload slide image");
    } finally {
      setUploading(false);
    }
  };

  // Add Slide URL manually
  const handleAddSlideUrl = () => {
    if (!slideInput.trim()) return;
    setSlides((prev) => [...prev, slideInput.trim()]);
    setSlideInput("");
  };

  // Remove Slide
  const handleRemoveSlide = (idx: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Settings to Realtime Database
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const adPath =
        selectedScope === "global"
          ? "systemSettings/kioskAds"
          : `machines/${selectedScope}/adConfig`;

      const payload: AdSettings = {
        enabled,
        mode,
        aspectRatio,
        customAspectRatio: customAspectRatio.trim(),
        videoUrl: videoUrl.trim(),
        slides: slides || [],
        slideDuration: Number(slideDuration) || 5,
        title: title.trim(),
        subtitle: subtitle.trim(),
        targetUrl: targetUrl.trim(),
        updatedAt: Date.now(),
      };

      await set(ref(database, adPath), payload);
      setSuccessMsg(
        `Ad settings updated successfully for ${
          selectedScope === "global" ? "All Kiosks" : selectedScope
        }!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-[#0c831f]" />
            <h1 className="text-xl font-bold text-neutral-900">Kiosk Ads & Media Management</h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Upload promotional videos, image slides, or banners displayed on the Kiosk terminal screen.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-neutral-200"
          >
            <span>Preview Kiosk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2 bg-[#0c831f] hover:bg-[#0a701a] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Save & Publish</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0c831f] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Target Scope Selection & Master Toggle Card */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Kiosk Scope */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Target Kiosk Terminal
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
            >
              <option value="global">Global (All Campus Kiosks)</option>
              {machines.map((m) => (
                <option key={m.machineId} value={m.machineId}>
                  {m.name || m.machineId} ({m.machineId})
                </option>
              ))}
            </select>
          </div>

          {/* Master Toggle */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">
                  Enable Kiosk Ad Area
                </span>
                <span className="text-[11px] text-neutral-500">
                  {enabled
                    ? "Active: Shows Ad Area on the right"
                    : "Disabled: Kiosk centers the OTP panel"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((prev) => !prev)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  enabled ? "bg-[#0c831f]" : "bg-neutral-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                    enabled ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Mode & Content Configuration */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Ad Format & Media</h2>
          <p className="text-[11px] text-neutral-500">
            Choose what type of media to display on the Kiosk right-hand screen.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl max-w-xl">
          <button
            type="button"
            onClick={() => setMode("vending-qr")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "vending-qr" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-600 hover:text-black"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#0c831f]" />
            <span>Vending QR</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("video")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "video" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-600 hover:text-black"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video Ad</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("slides")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "slides" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-600 hover:text-black"
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Image Slides</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("banner")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "banner" ? "bg-white text-neutral-950 shadow-xs" : "text-neutral-600 hover:text-black"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Promo Banner</span>
          </button>
        </div>

        {/* Aspect Ratio Area Selector [9:16, 16:9, 3:4, 4:3, custom] */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-neutral-900 block">
                Ad Area Aspect Ratio
              </label>
              <span className="text-[11px] text-neutral-500">
                Choose the display proportion for the ad space on the kiosk terminal.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#0c831f] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {aspectRatio === "custom" ? customAspectRatio : aspectRatio}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["9:16", "9:14", "16:9", "3:4", "4:3", "custom"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  aspectRatio === ratio
                    ? "bg-[#0c831f] text-white border-[#0c831f] shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          {aspectRatio === "custom" && (
            <div className="flex items-center gap-2 pt-1 max-w-sm animate-in fade-in">
              <input
                type="text"
                value={customAspectRatio}
                onChange={(e) => setCustomAspectRatio(e.target.value)}
                placeholder="e.g. 1:1, 21:9, 1080/1920"
                className="flex-1 h-9 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
              />
              <span className="text-[11px] text-neutral-500 font-mono">Custom Ratio</span>
            </div>
          )}
        </div>

        {/* 0. Vending QR Section */}
        {mode === "vending-qr" && (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <QrCode className="w-4 h-4 text-[#0c831f]" />
                  <span>Interactive Mobile Vending QR Mode Active</span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Displays an interactive website promo banner with a scannable QR code directing students to the website homescreen, along with live dynamic print rates.
                </p>
              </div>
              <a
                href="/admin/pricing"
                className="px-3 py-1.5 bg-[#0c831f] hover:bg-[#0a701a] text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Configure Live Pricing</span>
              </a>
            </div>

            {/* Target Website URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                Website Homescreen URL (QR Code Destination)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://itsprintmart.vercel.app"
                  className="flex-1 h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
                />
                <button
                  type="button"
                  onClick={() => setTargetUrl("https://itsprintmart.vercel.app")}
                  className="px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl border border-neutral-200 cursor-pointer"
                >
                  Default Vercel
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                When students scan this QR code with their mobile phone camera, they will be redirected to this site to upload documents and order prints.
              </p>
            </div>

            {/* Live Dynamic Pricing Info Cards */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dynamic Print Pricing (Synced Live from Firebase)</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ● Real-time Sync
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Black & White</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-neutral-900">
                      ₹{((globalPricing.bwPerSidePaise ?? 150) / 100).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-neutral-500">/ side</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Vibrant Color</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-emerald-700">
                      ₹{((globalPricing.colorPerSidePaise ?? 500) / 100).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-neutral-500">/ side</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Convenience Fee</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-neutral-900">
                      ₹{(((globalPricing.serviceChargePaise || 0)) / 100).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-neutral-500">/ order</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview of the Vending QR Ad */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-neutral-700 block">
                Live Vending QR Ad Display Preview
              </span>
              <div className="p-4 bg-[#fbf9f3] rounded-2xl text-[#1c1c1c] flex flex-col sm:flex-row items-center justify-between gap-4 border border-neutral-200 shadow-xs font-sans">
                <div className="space-y-2 flex-1">
                  <h3 className="text-base font-bold text-[#1c1c1c] tracking-tight">
                    {title || "Print from Your Phone"}
                  </h3>
                  <p className="text-xs text-neutral-600 max-w-sm leading-relaxed">
                    {subtitle || "Scan the QR code with your camera, upload your document, and enter the OTP on this screen to dispense."}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="px-2.5 py-1 rounded-[6px] bg-white shadow-xs font-bold text-[#1c1c1c]">
                      B&W: ₹{((globalPricing.bwPerSidePaise ?? 150) / 100).toFixed(2)}/page
                    </span>
                    <span className="px-2.5 py-1 rounded-[6px] bg-white shadow-xs font-bold text-[#0c831f]">
                      Color: ₹{((globalPricing.colorPerSidePaise ?? 500) / 100).toFixed(2)}/page
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-1 bg-white p-3 rounded-none text-neutral-900 shadow-sm border-0">
                  {adminQrPreview ? (
                    <img src={adminQrPreview} alt="QR Preview" className="w-28 h-28 object-contain rounded-none" />
                  ) : (
                    <div className="w-28 h-28 bg-neutral-100 flex items-center justify-center rounded-none text-[10px] text-neutral-400">
                      Generating...
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-[#0c831f] tracking-tight flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Scan to Print</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Video Ad Section */}
        {mode === "video" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 block">
                Video URL or File Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/promo.mp4 or /api/document/preview?..."
                  className="flex-1 h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {uploading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Upload MP4</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                Videos will play muted in a continuous loop on the terminal screen.
              </p>
            </div>

            {/* Video Preview */}
            {videoUrl && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-700">Live Video Preview</span>
                <div className="w-full max-w-md h-56 rounded-2xl overflow-hidden bg-black shadow-inner relative">
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Image Slides Section */}
        {mode === "slides" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-neutral-800 block">
                  Add Slide Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slideInput}
                    onChange={(e) => setSlideInput(e.target.value)}
                    placeholder="https://example.com/slide1.png"
                    className="flex-1 h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSlideUrl}
                    className="px-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl border border-neutral-200 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-1 shrink-0">
                <label className="text-xs font-bold text-neutral-800 block">
                  Or Upload Image
                </label>
                <input
                  ref={slideFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSlideImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => slideFileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-10 px-4 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>

            {/* Slide Rotation Duration */}
            <div className="max-w-xs space-y-1">
              <label className="text-xs font-bold text-neutral-800 block">
                Slide Rotation Speed (Seconds)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                value={slideDuration}
                onChange={(e) => setSlideDuration(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900"
              />
            </div>

            {/* Slides Preview Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-800 block">
                Configured Slides ({slides.length})
              </span>
              {slides.length === 0 ? (
                <p className="text-xs text-neutral-400 py-3">No slides uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {slides.map((url, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden border border-neutral-200 aspect-video group bg-neutral-100"
                    >
                      <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveSlide(i)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Promo Banner Fallback */}
        <div className="pt-4 border-t border-neutral-100 space-y-3">
          <span className="text-xs font-bold text-neutral-800 block">
            Promotional Headline & Subtitle
          </span>
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Print Anywhere Across Campus in 30 Seconds"
              className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
            />
            <textarea
              rows={2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Upload docs from your phone at printmart.in and enter the OTP."
              className="w-full p-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          KIOSK NOTICE POPUP BROADCAST CONTROLLER
          Allows broadcasting notice popups to Kiosk with customizable icon,
          title, description, and target area: [otp, ad, both]
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-amber-300" />
              </div>
              <h2 className="text-base font-bold text-neutral-900">
                Live Kiosk Notice Popup Controller
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Broadcast an instant modal popup over the Kiosk screen. Choose which area to blur: OTP keypad, Ad area, or both.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                popupEnabled
                  ? "bg-emerald-50 text-[#0c831f] border border-emerald-200"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {popupEnabled ? "● Popup Active" : "○ Popup Off"}
            </span>

            <button
              type="button"
              onClick={() => handleSavePopup(!popupEnabled)}
              disabled={popupSaving}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                popupEnabled
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-[#0c831f] text-white border-[#0c831f] hover:bg-[#0a6e1a]"
              }`}
            >
              {popupEnabled ? "Disable Popup" : "Enable Popup"}
            </button>
          </div>
        </div>

        {/* 1. Target Coverage Area Selector [OTP Area, Ad Area, Both Areas] */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-800 block">
            Target Area to Blur & Cover
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPopupTargetArea("otp")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                popupTargetArea === "otp"
                  ? "border-[#0c831f] bg-emerald-50/40 ring-1 ring-[#0c831f]"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    popupTargetArea === "otp" ? "border-[#0c831f] bg-[#0c831f]" : "border-neutral-400"
                  }`}
                >
                  {popupTargetArea === "otp" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-900">OTP Area Only</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-5.5">
                Blurs only the left OTP keypad and centers the popup over the OTP box.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPopupTargetArea("ad")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                popupTargetArea === "ad"
                  ? "border-[#0c831f] bg-emerald-50/40 ring-1 ring-[#0c831f]"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    popupTargetArea === "ad" ? "border-[#0c831f] bg-[#0c831f]" : "border-neutral-400"
                  }`}
                >
                  {popupTargetArea === "ad" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-900">Ad Area Only</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-5.5">
                Blurs only the right Ad media area and centers the popup over the Ad box.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPopupTargetArea("both")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                popupTargetArea === "both"
                  ? "border-[#0c831f] bg-emerald-50/40 ring-1 ring-[#0c831f]"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    popupTargetArea === "both" ? "border-[#0c831f] bg-[#0c831f]" : "border-neutral-400"
                  }`}
                >
                  {popupTargetArea === "both" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-900">Both Areas (Full Card)</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-5.5">
                Blurs the entire kiosk card and centers the popup right in the middle.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Icon Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-800 block">
            Popup Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "alert", label: "Alert", icon: AlertCircle, color: "text-rose-600 bg-rose-50" },
              { id: "info", label: "Info", icon: Info, color: "text-blue-600 bg-blue-50" },
              { id: "check", label: "Success", icon: CheckCircle2, color: "text-[#0c831f] bg-emerald-50" },
              { id: "bell", label: "Notice", icon: Bell, color: "text-amber-600 bg-amber-50" },
              { id: "sparkles", label: "Promo", icon: Sparkles, color: "text-purple-600 bg-purple-50" },
              { id: "wrench", label: "Maintenance", icon: Wrench, color: "text-amber-700 bg-amber-50" },
            ].map((item) => {
              const IconItem = item.icon;
              const isSelected = popupIcon === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPopupIcon(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#0c831f] bg-emerald-50 text-emerald-900 ring-1 ring-[#0c831f]"
                      : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <IconItem className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Modal Action Button (Enable / Disable Button) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-800 block">
              Modal Action Button (Enable / Disable Button)
            </label>
            <span className="text-[11px] font-semibold text-neutral-500">
              {popupButtonEnabled ? "Dismiss button visible to user" : "No button (Sticky Notice)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPopupButtonEnabled(true)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                popupButtonEnabled
                  ? "border-[#0c831f] bg-emerald-50/40 ring-1 ring-[#0c831f]"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    popupButtonEnabled ? "border-[#0c831f] bg-[#0c831f]" : "border-neutral-400"
                  }`}
                >
                  {popupButtonEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-900">Enable Button</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-5.5">
                Displays the action button so kiosk users can tap to dismiss the popup.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPopupButtonEnabled(false)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                !popupButtonEnabled
                  ? "border-[#0c831f] bg-emerald-50/40 ring-1 ring-[#0c831f]"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    !popupButtonEnabled ? "border-[#0c831f] bg-[#0c831f]" : "border-neutral-400"
                  }`}
                >
                  {!popupButtonEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-bold text-neutral-900">Disable Button</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-5.5">
                Hides the button entirely. Turns the popup into a sticky notice screen.
              </p>
            </button>
          </div>
        </div>

        {/* 4. Title, Description, and Button Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Popup Title
            </label>
            <input
              type="text"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="e.g. Printer Service Notice"
              className="w-full h-10 px-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 block">
                Button Text
              </label>
              {!popupButtonEnabled && (
                <span className="text-[10px] font-semibold text-neutral-400">
                  (Disabled)
                </span>
              )}
            </div>
            <input
              type="text"
              value={popupButtonText}
              onChange={(e) => setPopupButtonText(e.target.value)}
              disabled={!popupButtonEnabled}
              placeholder={popupButtonEnabled ? "e.g. Okay, Got It" : "Button is disabled"}
              className={`w-full h-10 px-3 text-xs rounded-xl border border-neutral-200 transition-all ${
                popupButtonEnabled
                  ? "bg-neutral-50 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              }`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-800 block">
            Popup Description / Message
          </label>
          <textarea
            rows={2}
            value={popupDescription}
            onChange={(e) => setPopupDescription(e.target.value)}
            placeholder="e.g. Kiosk paper tray is being restocked. Dispensing will resume shortly."
            className="w-full p-3 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-900 focus:ring-2 focus:ring-[#0c831f]"
          />
        </div>

        {/* 5. Interactive Live Preview */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-neutral-800 block">
            Popup Live Visual Simulation (Where it appears on Kiosk)
          </label>
          <div className="p-4 bg-neutral-100 rounded-2xl flex items-center justify-center">
            {/* Simulated Kiosk Card */}
            <div className="w-full max-w-lg bg-white rounded-xl shadow-md overflow-hidden flex relative h-48 border border-neutral-200">
              {/* Left: Simulated OTP Area */}
              <div
                className={`w-2/5 p-3 flex flex-col justify-between items-center text-center relative ${
                  popupTargetArea === "otp" ? "bg-slate-100/70" : "bg-white"
                }`}
              >
                <span className="text-[10px] font-bold text-neutral-400 uppercase">OTP Area</span>
                <div className="w-16 h-8 bg-neutral-200 rounded-sm" />
                <div className="w-20 h-14 bg-neutral-900 rounded-sm" />

                {/* Overlaid Popup if target is OTP */}
                {popupTargetArea === "otp" && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-2 z-10 animate-in fade-in">
                    <div className="bg-white rounded-lg p-2.5 shadow-xl text-center space-y-1 w-full max-w-[130px]">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-bold text-neutral-900 block truncate">{popupTitle}</span>
                      <span className="text-[8px] text-neutral-500 block line-clamp-1">{popupDescription || "Notice message..."}</span>
                      {popupButtonEnabled ? (
                        <div className="text-[8px] font-bold py-0.5 px-1 bg-black text-white rounded">
                          {popupButtonText}
                        </div>
                      ) : (
                        <div className="text-[7px] font-semibold py-0.5 px-1 bg-neutral-100 text-neutral-500 rounded">
                          (Sticky • No Button)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Simulated Ad Area */}
              <div
                className={`w-3/5 p-3 flex flex-col justify-center items-center text-center relative border-l border-neutral-100 ${
                  popupTargetArea === "ad" ? "bg-slate-100/70" : "bg-[#fbf9f3]"
                }`}
              >
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Ad Area</span>
                <span className="text-[9px] text-neutral-400 mt-1">Simulated Ad Content</span>

                {/* Overlaid Popup if target is Ad */}
                {popupTargetArea === "ad" && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-2 z-10 animate-in fade-in">
                    <div className="bg-white rounded-lg p-2.5 shadow-xl text-center space-y-1 w-full max-w-[150px]">
                      <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-neutral-900 block truncate">{popupTitle}</span>
                      <span className="text-[8px] text-neutral-500 block line-clamp-2">{popupDescription || "Notice message..."}</span>
                      {popupButtonEnabled ? (
                        <div className="text-[8px] font-bold py-0.5 px-2 bg-black text-white rounded inline-block">
                          {popupButtonText}
                        </div>
                      ) : (
                        <div className="text-[7px] font-semibold py-0.5 px-1.5 bg-neutral-100 text-neutral-500 rounded inline-block">
                          (Sticky • No Button)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Overlaid Popup if target is Both */}
              {popupTargetArea === "both" && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-20 animate-in fade-in">
                  <div className="bg-white rounded-xl p-3.5 shadow-2xl text-center space-y-1.5 w-full max-w-[200px]">
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 block">{popupTitle}</span>
                    <span className="text-[9px] text-neutral-600 block line-clamp-2">{popupDescription || "Notice message..."}</span>
                    {popupButtonEnabled ? (
                      <div className="text-[9px] font-bold py-1 px-3 bg-black text-white rounded-md inline-block">
                        {popupButtonText}
                      </div>
                    ) : (
                      <div className="text-[8px] font-semibold py-0.5 px-2 bg-neutral-100 text-neutral-500 rounded-md inline-block">
                        (Sticky • No Button)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Action Buttons: Publish or Dismiss */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => handleSavePopup(false)}
            disabled={popupSaving || !popupEnabled}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 border-0"
          >
            Dismiss / Turn Off Popup
          </button>

          <button
            type="button"
            onClick={() => handleSavePopup(true)}
            disabled={popupSaving}
            className="px-5 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border-0"
          >
            {popupSaving ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Publish Notice Popup to Kiosks</span>
          </button>
        </div>
      </div>
    </div>
  );
}

