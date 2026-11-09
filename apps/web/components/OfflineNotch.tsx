"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function OfflineNotch() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [hasChanged, setHasChanged] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setHasChanged(true);
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Offline Notification Notch (Rectangle with very small corner radius, no blinker)
  if (!isOnline) {
    return (
      <div className="fixed top-2.5 inset-x-0 z-[10000] flex justify-center pointer-events-none px-4 animate-in slide-in-from-top duration-300">
        <div className="bg-neutral-900/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-sm shadow-xl flex items-center gap-2 border border-white/10 text-xs font-medium pointer-events-auto">
          <WifiOff className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
          <span className="tracking-tight">No internet connection</span>
        </div>
      </div>
    );
  }

  // Reconnected Notification (Rectangle with very small corner radius)
  if (showReconnected && hasChanged) {
    return (
      <div className="fixed top-2.5 inset-x-0 z-[10000] flex justify-center pointer-events-none px-4 animate-in slide-in-from-top duration-300">
        <div className="bg-[#0c831f]/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-sm shadow-xl flex items-center gap-2 border border-white/10 text-xs font-medium pointer-events-auto animate-in zoom-in-95">
          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="tracking-tight">Back online</span>
        </div>
      </div>
    );
  }

  return null;
}

