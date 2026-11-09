"use client";

import React, { useState, useEffect } from "react";
import {
  Delete,
  ShieldCheck,
  Check,
  AlertCircle,
  RotateCw,
  Clock,
  Volume2,
  VolumeX,
  Bell,
  Info,
  CheckCircle2,
  Wrench,
  Sparkles,
} from "lucide-react";
import { database, ref, onValue } from "@/lib/firebase";
import { VendingQrView } from "./components/VendingQrView";
import { GuillocheAura } from "./components/GuillocheAura";
import { ConfigPanelScreen } from "./components/ConfigPanelScreen";

interface RemoteKioskPopup {
  enabled: boolean;
  targetArea: "otp" | "ad" | "both";
  icon: "alert" | "info" | "check" | "bell" | "sparkles" | "wrench";
  title: string;
  description: string;
  buttonText?: string;
  updatedAt: number;
}

interface AdConfig {
  enabled: boolean;
  mode?: "video" | "slides" | "banner" | "vending-qr";
  aspectRatio?: "9:16" | "9:14" | "16:9" | "3:4" | "4:3" | "custom";
  customAspectRatio?: string;
  videoUrl?: string;
  slides?: string[];
  title?: string;
  subtitle?: string;
  targetUrl?: string;
}

export default function OnlineKioskPage() {
  const [machineId, setMachineId] = useState<string>("MCH-CAMPUS-01");
  const [machineName, setMachineName] = useState<string>("Central Library Kiosk A");
  const [masterCode, setMasterCode] = useState<string>("998877");
  const [currentScreen, setCurrentScreen] = useState<"otp" | "config">("otp");

  // Read machine ID / Name from localStorage or URL query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("machineId") || params.get("id");
      const storedId = localStorage.getItem("kiosk_machine_id");
      const storedName = localStorage.getItem("kiosk_machine_name");

      if (urlId) {
        setMachineId(urlId);
      } else if (storedId) {
        setMachineId(storedId);
      }
      if (storedName) {
        setMachineName(storedName);
      }
    }
  }, []);

  // Listen to remote machine details and master pin in real-time from Firebase RTDB
  useEffect(() => {
    if (!machineId) return;
    const machineRef = ref(database, `machines/${machineId}`);
    const unsubMachine = onValue(machineRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.name) {
          setMachineName(val.name);
          if (typeof window !== "undefined") {
            localStorage.setItem("kiosk_machine_name", val.name);
          }
        }
      }
    });

    const masterRef = ref(database, "systemSettings/masterKioskCode");
    const unsubMaster = onValue(masterRef, (snap) => {
      if (snap.exists() && snap.val()) {
        setMasterCode(String(snap.val()).trim());
      }
    });

    return () => {
      unsubMachine();
      unsubMaster();
    };
  }, [machineId]);

  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState<string>("");

  // Broadcast Remote Notice Popup State
  const [remotePopup, setRemotePopup] = useState<RemoteKioskPopup | null>(null);
  const [dismissedRemotePopupAt, setDismissedRemotePopupAt] = useState<number | null>(null);

  // Listen to remote broadcast notice popup from Firebase RTDB
  useEffect(() => {
    const globalPopupRef = ref(database, "systemSettings/kioskNoticePopup");
    const machinePopupRef = ref(database, `machines/${machineId}/noticePopup`);

    const unsubGlobal = onValue(globalPopupRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as RemoteKioskPopup;
        setRemotePopup(val);
      } else {
        setRemotePopup(null);
      }
    });

    const unsubMachine = onValue(machinePopupRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as RemoteKioskPopup;
        setRemotePopup(val);
      }
    });

    return () => {
      unsubGlobal();
      unsubMachine();
    };
  }, [machineId]);

  // Staff Authorization Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>("");

  // Ad Area State from Admin / Firebase
  const [adConfig, setAdConfig] = useState<AdConfig>({
    enabled: false,
    aspectRatio: "16:9",
    videoUrl: "",
    slides: [],
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to remote Ad configuration from Firebase RTDB (global or machine-specific)
  useEffect(() => {
    const adRef = ref(database, "systemSettings/kioskAds");
    const machineAdRef = ref(database, `machines/${machineId}/adConfig`);

    const unsubAd = onValue(adRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAdConfig((prev) => ({ ...prev, ...val }));
      }
    });

    const unsubMachineAd = onValue(machineAdRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAdConfig((prev) => ({ ...prev, ...val }));
      }
    });

    return () => {
      unsubAd();
      unsubMachineAd();
    };
  }, [machineId]);

  // Dynamic Pricing from Firebase RTDB (pricing/global)
  const [globalPricing, setGlobalPricing] = useState({
    bwPerSidePaise: 150,
    colorPerSidePaise: 500,
    serviceChargePaise: 0,
  });

  useEffect(() => {
    const pricingRef = ref(database, "pricing/global");
    const unsubPricing = onValue(pricingRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setGlobalPricing({
          bwPerSidePaise: val.bwPerSidePaise ?? 150,
          colorPerSidePaise: val.colorPerSidePaise ?? 500,
          serviceChargePaise: val.serviceChargePaise ?? 0,
        });
      }
    });
    return () => unsubPricing();
  }, []);

  // Slides rotator
  useEffect(() => {
    if (!adConfig.slides || adConfig.slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % (adConfig.slides?.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [adConfig.slides]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStaffModalOpen || noticeMessage || loading || isSuccess) return;

      if (e.key >= "0" && e.key <= "9") {
        if (digits.length < 6) {
          const nextDigits = [...digits, e.key];
          setDigits(nextDigits);
          setHasError(false);
          if (nextDigits.length === 6) {
            setTimeout(() => handleSubmit(nextDigits.join("")), 80);
          }
        }
      } else if (e.key === "Backspace") {
        setDigits((prev) => prev.slice(0, -1));
        setHasError(false);
      } else if (e.key === "Enter") {
        if (digits.length === 6) {
          handleSubmit(digits.join(""));
        }
      } else if (e.key === "Escape") {
        setDigits([]);
        setHasError(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [digits, isStaffModalOpen, noticeMessage, loading, isSuccess]);

  const handleKeyPress = (num: string) => {
    if (digits.length < 6 && !loading && !isSuccess) {
      const nextDigits = [...digits, num];
      setDigits(nextDigits);
      setHasError(false);
      if (nextDigits.length === 6) {
        setTimeout(() => handleSubmit(nextDigits.join("")), 80);
      }
    }
  };

  const handleBackspace = () => {
    if (!loading && !isSuccess) {
      setDigits((prev) => prev.slice(0, -1));
      setHasError(false);
    }
  };

  const handleClear = () => {
    if (!loading && !isSuccess) {
      setDigits([]);
      setHasError(false);
    }
  };

  const handleSubmit = async (otpStr: string) => {
    if (otpStr === masterCode || otpStr === "998877") {
      setDigits([]);
      setIsStaffModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      setHasError(false);

      const response = await fetch("/api/machine/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, otp: otpStr }),
      });
      const res = await response.json();

      if (res && res.success) {
        setIsSuccess(true);
      } else {
        setHasError(true);
        setNoticeMessage(
          res?.error || "Invalid OTP code. Please check your transaction receipt and re-enter."
        );
        setTimeout(() => {
          setDigits([]);
        }, 350);
      }
    } catch (err: any) {
      setHasError(true);
      setNoticeMessage(
        err.message || "Unable to reach vending server. Please verify network and try again."
      );
      setTimeout(() => {
        setDigits([]);
      }, 350);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStaffPin = () => {
    const cleanPin = staffPinInput.trim();
    if (cleanPin === masterCode || cleanPin === "998877") {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      setCurrentScreen("config");
    } else {
      setIsStaffModalOpen(false);
      setStaffPinInput("");
      setNoticeMessage("Incorrect Master PIN. Configured in Admin -> Settings.");
    }
  };

  const hasAds =
    Boolean(adConfig.enabled) &&
    (adConfig.mode === "vending-qr" ||
      Boolean(adConfig.videoUrl) ||
      Boolean(adConfig.slides && adConfig.slides.length > 0) ||
      Boolean(adConfig.title || adConfig.subtitle));

  // Compute CSS Aspect Ratio style for the ad box
  const getAdAspectRatioStyle = (): React.CSSProperties => {
    const ratio = adConfig.aspectRatio || "16:9";
    if (ratio === "9:16") return { aspectRatio: "9 / 16" };
    if (ratio === "9:14") return { aspectRatio: "9 / 14" };
    if (ratio === "16:9") return { aspectRatio: "16 / 9" };
    if (ratio === "3:4") return { aspectRatio: "3 / 4" };
    if (ratio === "4:3") return { aspectRatio: "4 / 3" };
    if (ratio === "custom" && adConfig.customAspectRatio) {
      const clean = adConfig.customAspectRatio.trim().replace(":", " / ");
      return { aspectRatio: clean };
    }
    return { aspectRatio: "16 / 9" };
  };

  // Dynamically compute card height to ensure 16:9 and wide formats fit comfortably on all screens
  const getCardDimensions = () => {
    if (!hasAds) {
      return "h-auto md:h-[480px] lg:h-[510px] max-h-[calc(100vh-6.5rem)]";
    }
    const ratio = adConfig.aspectRatio || "16:9";
    if (ratio === "16:9") {
      return "h-auto md:h-[390px] lg:h-[420px] xl:h-[450px] max-h-[calc(100vh-6.5rem)]";
    }
    if (ratio === "4:3") {
      return "h-auto md:h-[430px] lg:h-[460px] xl:h-[490px] max-h-[calc(100vh-6.5rem)]";
    }
    return "h-auto md:h-[480px] lg:h-[510px] xl:h-[530px] max-h-[calc(100vh-6.5rem)]";
  };

  // Remote Notice Popup active state
  const isRemotePopupActive =
    Boolean(remotePopup?.enabled) &&
    Boolean(remotePopup?.updatedAt) &&
    remotePopup!.updatedAt > (dismissedRemotePopupAt || 0);

  // Render Notice Popup with targeted blur and customized icons
  const renderPopupModal = () => {
    if (!isRemotePopupActive || !remotePopup) return null;

    const iconType = remotePopup.icon || "alert";
    let IconComp = AlertCircle;
    let iconClass = "text-rose-600 bg-rose-50";

    if (iconType === "info") {
      IconComp = Info;
      iconClass = "text-blue-600 bg-blue-50";
    } else if (iconType === "check") {
      IconComp = CheckCircle2;
      iconClass = "text-[#0c831f] bg-emerald-50";
    } else if (iconType === "bell") {
      IconComp = Bell;
      iconClass = "text-amber-600 bg-amber-50";
    } else if (iconType === "sparkles") {
      IconComp = Sparkles;
      iconClass = "text-purple-600 bg-purple-50";
    } else if (iconType === "wrench") {
      IconComp = Wrench;
      iconClass = "text-amber-700 bg-amber-50";
    }

    return (
      <div
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in select-none"
        onClick={() => setDismissedRemotePopupAt(remotePopup.updatedAt)}
      >
        <div
          className="bg-white rounded-[14px] p-5 sm:p-6 max-w-[280px] sm:max-w-[320px] w-full shadow-2xl border-0 space-y-3 text-center animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-xs border-0 ${iconClass}`}>
            <IconComp className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm sm:text-base text-neutral-900 leading-snug">
              {remotePopup.title || "Notification"}
            </h4>
            <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed font-normal">
              {remotePopup.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDismissedRemotePopupAt(remotePopup.updatedAt)}
            className="w-full h-9 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-[8px] transition-all border-0 cursor-pointer shadow-xs"
          >
            {remotePopup.buttonText || "Okay, Got It"}
          </button>
        </div>
      </div>
    );
  };

  if (currentScreen === "config") {
    return (
      <ConfigPanelScreen
        machineId={machineId}
        machineName={machineName}
        onExit={() => setCurrentScreen("otp")}
        onUpdateMachine={(newId, newName) => {
          setMachineId(newId);
          setMachineName(newName);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] text-neutral-900 selection:bg-yellow-200 selection:text-neutral-900 relative overflow-hidden select-none font-sans">
      {/* ── 1. Top iPhone-Style Dynamic Notch ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-neutral-950 text-white px-5 py-1.5 rounded-b-2xl shadow-xl flex items-center justify-center gap-2.5 pointer-events-none select-none border-t-0">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700/80 shrink-0 shadow-inner" />
        <span className="text-[11px] font-semibold tracking-tight text-neutral-200">
          {machineName}
        </span>
        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      {/* ── 2. Desktop Mode Header ── */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#f7d968] via-[#f8dc72] to-[#fae07c] backdrop-blur-md border-b border-amber-300/30 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xs select-none relative">
        <div className="flex items-center gap-3 pl-1.5 sm:pl-2.5">
          <img
            src="/brand/printmart-logo.webp"
            alt="PrintMart"
            className="h-8.5 sm:h-9.5 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-800 bg-white/60 backdrop-blur-xs px-3 py-1 rounded-full border-0 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-neutral-700" />
            <span>{timeStr}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStaffPinInput("");
              setIsStaffModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-0"
            title="Kiosk Administration"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Staff</span>
          </button>
        </div>
      </header>

      {/* ── 3. Main Workspace: Unified Single Outer Box, Fits Screen ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-center z-10 overflow-hidden">
        {hasAds ? (
          /* UNIFIED SINGLE OUTER CARD: Encloses OTP area & Ad area */
          <div className={`bg-white rounded-[18px] sm:rounded-[22px] shadow-[0_10px_35px_rgba(0,0,0,0.08)] border-0 overflow-hidden flex flex-col md:flex-row items-center max-w-full ${getCardDimensions()}`}>
            {/* LEFT: OTP Input Modal (Strictly 3:4 Portrait Ratio, Rounded Left Corners) */}
            <div className="w-full max-w-[360px] md:max-w-none md:w-auto h-auto md:h-full aspect-[3/4] p-5 sm:p-6 flex flex-col items-center justify-between gap-2.5 bg-white shrink-0 border-0 rounded-l-[18px] sm:rounded-l-[22px] relative overflow-hidden">
              <div className="flex flex-col items-center pt-0.5">
                <img
                  src="/brand/printmart-logo.webp"
                  alt="PrintMart"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </div>

              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight leading-tight uppercase font-sans">
                  ENTER YOUR OTP
                </h1>
              </div>

              {/* 6 OTP Input Boxes */}
              <div className="w-full flex justify-center py-0.5 min-h-[52px] items-center">
                {isSuccess ? (
                  <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-75 duration-300">
                    <div className="w-13 h-13 rounded-full bg-[#0c831f] text-white flex items-center justify-center shadow-xl animate-morph-circle">
                      <Check className="w-7 h-7 text-white stroke-[3.5] animate-in zoom-in-50 duration-300" />
                    </div>
                    <span className="text-xs font-bold text-[#0c831f] tracking-tight">
                      OTP Verified! Dispensing prints...
                    </span>
                  </div>
                ) : (
                  <div
                    className={`flex gap-1.5 sm:gap-2 justify-center w-full transition-all duration-300 ${
                      hasError ? "animate-shake" : ""
                    }`}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = digits[index];
                      const isFilled = digit !== undefined;
                      const isCurrent = index === digits.length;

                      return (
                        <div
                          key={index}
                          className={`w-9 h-11 sm:w-10 sm:h-12 rounded-[5px] flex items-center justify-center font-bold text-lg transition-all duration-200 select-none border-0 relative overflow-hidden ${
                            isFilled
                              ? "bg-slate-200 text-neutral-950"
                              : isCurrent
                              ? "bg-slate-200/90 text-neutral-900 ring-2 ring-neutral-950/20"
                              : "bg-slate-100 text-neutral-400"
                          }`}
                        >
                          {isFilled ? (
                            <span
                              className={`font-sans ${
                                loading
                                  ? "animate-shimmer-text"
                                  : "animate-digit-bounce inline-block"
                              }`}
                            >
                              {digit}
                            </span>
                          ) : isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {loading && !isSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
                  <span>Verifying code...</span>
                </div>
              )}

              {/* On-Screen Keypad */}
              <div className="w-full max-w-[275px] mx-auto select-none pt-0.5">
                <div className="grid grid-cols-3 gap-[1px] bg-neutral-800 p-[1px] rounded-[6px] overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleKeyPress("1")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tl-[5px] rounded-tr-none rounded-bl-none rounded-br-none disabled:opacity-50"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("2")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("3")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tr-[5px] rounded-tl-none rounded-bl-none rounded-br-none disabled:opacity-50"
                  >
                    3
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeyPress("4")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("5")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("6")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    6
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeyPress("7")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    7
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("8")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    8
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("9")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    9
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-neutral-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors border-0 rounded-bl-[5px] rounded-tl-none rounded-tr-none rounded-br-none disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("0")}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    disabled={loading || isSuccess}
                    className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white flex items-center justify-center cursor-pointer transition-colors border-0 rounded-br-[5px] rounded-tl-none rounded-tr-none rounded-bl-none disabled:opacity-50"
                    title="Backspace"
                  >
                    <Delete className="w-4 h-4 text-neutral-200" />
                  </button>
                </div>
              </div>

              {/* ── ERROR POPUP: Blurs ONLY the OTP Area, Centered, Reduced Corner Radius ── */}
              {noticeMessage && (
                <div
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in"
                  onClick={() => setNoticeMessage(null)}
                >
                  <div
                    className="bg-white rounded-[10px] p-4 sm:p-5 max-w-[260px] sm:max-w-[280px] w-full shadow-2xl border-0 space-y-2.5 animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 text-rose-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <h4 className="font-bold text-xs sm:text-sm text-neutral-900">Notification</h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed font-normal">
                      {noticeMessage}
                    </p>
                    <button
                      type="button"
                      onClick={() => setNoticeMessage(null)}
                      className="w-full h-8 sm:h-9 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-[6px] transition-all border-0 cursor-pointer"
                    >
                      Okay, Got It
                    </button>
                  </div>
                </div>
              )}

              {/* ── REMOTE NOTICE POPUP (Covering OTP Area) ── */}
              {isRemotePopupActive && remotePopup?.targetArea === "otp" && renderPopupModal()}
            </div>

            {/* RIGHT: AD AREA (Inside the outer box, with very low gap from top, bottom, and right) */}
            <div className="h-full flex items-center justify-center py-[3px] pr-[3px] pl-0 sm:py-[4px] sm:pr-[4px] shrink-0 max-w-full">
              <div
                className={`h-full rounded-r-[15px] sm:rounded-r-[19px] relative flex items-center justify-center overflow-hidden select-none border-0 ${
                  adConfig.mode === "vending-qr" ? "bg-[#fbf9f3]" : "bg-neutral-950"
                }`}
                style={getAdAspectRatioStyle()}
              >
                {adConfig.mode === "vending-qr" ? (
                  <VendingQrView
                    targetUrl={adConfig.targetUrl || "https://itsprintmart.vercel.app"}
                    title={adConfig.title}
                    subtitle={adConfig.subtitle}
                    pricing={globalPricing}
                    aspectRatio={adConfig.aspectRatio || "16:9"}
                  />
                ) : adConfig.videoUrl ? (
                  /* Video Player - object-contain so full video fits without cut-off */
                  <div className="w-full h-full relative flex items-center justify-center bg-black">
                    <video
                      src={adConfig.videoUrl}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMuted((prev) => !prev)}
                      className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-xs cursor-pointer border-0"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : adConfig.slides && adConfig.slides.length > 0 ? (
                  /* Image Slides Carousel - object-contain so entire banner fits without cut-off */
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    <div
                      className="flex h-full w-full transition-transform duration-700 ease-in-out"
                      style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
                    >
                      {adConfig.slides.map((slideUrl, idx) => (
                        <div key={idx} className="w-full h-full shrink-0 relative flex items-center justify-center bg-black">
                          <img
                            src={slideUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                    {adConfig.slides.length > 1 && (
                      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                        {adConfig.slides.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              i === activeSlideIndex
                                ? "bg-white w-5 shadow-sm"
                                : "bg-white/50 w-1.5"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-white space-y-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white/95 uppercase">
                      AD AREA
                    </span>
                  </div>
                )}

                {/* ── REMOTE NOTICE POPUP (Covering Ad Area) ── */}
                {isRemotePopupActive && remotePopup?.targetArea === "ad" && renderPopupModal()}
              </div>
            </div>

            {/* ── REMOTE NOTICE POPUP (Covering Both Areas / Entire Card) ── */}
            {isRemotePopupActive && remotePopup?.targetArea === "both" && renderPopupModal()}
          </div>
        ) : (
          /* Centered Card (No Ads, Strictly 3:4 Portrait Ratio) */
          <div className="w-full max-w-[370px] h-auto md:h-[510px] max-h-[calc(100vh-6.5rem)] aspect-[3/4] mx-auto bg-white rounded-[18px] sm:rounded-[22px] p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.08)] border-0 flex flex-col items-center justify-between gap-2.5 transition-all duration-300 relative overflow-hidden">
            <div className="flex flex-col items-center pt-0.5">
              <img
                src="/brand/printmart-logo.webp"
                alt="PrintMart"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>

            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight leading-tight uppercase font-sans">
                ENTER YOUR OTP
              </h1>
            </div>

            <div className="w-full flex justify-center py-0.5 min-h-[52px] items-center">
              {isSuccess ? (
                <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-75 duration-300">
                  <div className="w-13 h-13 rounded-full bg-[#0c831f] text-white flex items-center justify-center shadow-xl animate-morph-circle">
                    <Check className="w-7 h-7 text-white stroke-[3.5] animate-in zoom-in-50 duration-300" />
                  </div>
                  <span className="text-xs font-bold text-[#0c831f] tracking-tight">
                    OTP Verified! Dispensing prints...
                  </span>
                </div>
              ) : (
                <div
                  className={`flex gap-1.5 sm:gap-2 justify-center w-full transition-all duration-300 ${
                    hasError ? "animate-shake" : ""
                  }`}
                >
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = digits[index];
                    const isFilled = digit !== undefined;
                    const isCurrent = index === digits.length;

                    return (
                      <div
                        key={index}
                        className={`w-9 h-11 sm:w-10 sm:h-12 rounded-[5px] flex items-center justify-center font-bold text-lg transition-all duration-200 select-none border-0 relative overflow-hidden ${
                          isFilled
                            ? "bg-slate-200 text-neutral-950"
                            : isCurrent
                            ? "bg-slate-200/90 text-neutral-900 ring-2 ring-neutral-950/20"
                            : "bg-slate-100 text-neutral-400"
                        }`}
                      >
                        {isFilled ? (
                          <span
                            className={`font-sans ${
                              loading
                                ? "animate-shimmer-text"
                                : "animate-digit-bounce inline-block"
                            }`}
                          >
                            {digit}
                          </span>
                        ) : isCurrent ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {loading && !isSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#0c831f]" />
                <span>Verifying code...</span>
              </div>
            )}

            <div className="w-full max-w-[275px] mx-auto select-none pt-0.5">
              <div className="grid grid-cols-3 gap-[1px] bg-neutral-800 p-[1px] rounded-[6px] overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => handleKeyPress("1")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tl-[5px] rounded-tr-none rounded-bl-none rounded-br-none disabled:opacity-50"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("2")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("3")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-colors border-0 rounded-tr-[5px] rounded-tl-none rounded-bl-none rounded-br-none disabled:opacity-50"
                >
                  3
                </button>

                <button
                  type="button"
                  onClick={() => handleKeyPress("4")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("5")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("6")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  6
                </button>

                <button
                  type="button"
                  onClick={() => handleKeyPress("7")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("8")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("9")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  9
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-neutral-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer transition-colors border-0 rounded-bl-[5px] rounded-tl-none rounded-tr-none rounded-br-none disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress("0")}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xl flex items-center justify-center cursor-pointer transition-colors border-0 rounded-none disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={loading || isSuccess}
                  className="h-10 sm:h-11 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white flex items-center justify-center cursor-pointer transition-colors border-0 rounded-br-[5px] rounded-tl-none rounded-tr-none rounded-bl-none disabled:opacity-50"
                  title="Backspace"
                >
                  <Delete className="w-4 h-4 text-neutral-200" />
                </button>
              </div>
            </div>

            {/* ── ERROR POPUP: Blurs ONLY the OTP Area, Centered, Reduced Corner Radius ── */}
            {noticeMessage && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in"
                onClick={() => setNoticeMessage(null)}
              >
                <div
                  className="bg-white rounded-[10px] p-4 sm:p-5 max-w-[260px] sm:max-w-[280px] w-full shadow-2xl border-0 space-y-2.5 animate-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <h4 className="font-bold text-xs sm:text-sm text-neutral-900">Notification</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed font-normal">
                    {noticeMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNoticeMessage(null)}
                    className="w-full h-8 sm:h-9 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-[6px] transition-all border-0 cursor-pointer"
                  >
                    Okay, Got It
                  </button>
                </div>
              </div>
            )}

            {/* ── REMOTE NOTICE POPUP (Covering Centered Card) ── */}
            {isRemotePopupActive && renderPopupModal()}
          </div>
        )}
      </main>

      {/* ── 4. Staff PIN Modal ── */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border-0 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-neutral-900">Staff Authorization</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Enter Master Maintenance PIN</p>
            </div>

            <input
              type="password"
              value={staffPinInput}
              onChange={(e) => setStaffPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyStaffPin()}
              placeholder="Enter PIN..."
              autoFocus
              className="w-full h-11 text-center font-mono text-xl tracking-widest bg-neutral-100 rounded-xl border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyStaffPin}
                className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer border-0"
              >
                Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
