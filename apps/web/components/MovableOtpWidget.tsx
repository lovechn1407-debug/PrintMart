"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { ref, onValue } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { PrintJob } from "@printmart/shared";

interface FloatingOtpData {
  otp: string;
  expiresAt: number;
}

export function MovableOtpWidget() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState<boolean>(false);
  const [otpData, setOtpData] = useState<FloatingOtpData | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Dragging coordinates: translate delta (dx, dy)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const loadLocalOtp = () => {
      try {
        const dismissed = localStorage.getItem("printmart_floating_otp_dismissed");
        if (dismissed === "true") {
          setIsDismissed(true);
          return;
        }
        setIsDismissed(false);

        const raw = localStorage.getItem("printmart_active_floating_otp");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.otp && parsed.expiresAt > Date.now()) {
            setOtpData(parsed);
          } else {
            setOtpData(null);
          }
        }
      } catch (e) {
        console.error("Error reading floating OTP:", e);
      }
    };

    loadLocalOtp();

    const handleUpdate = () => loadLocalOtp();
    window.addEventListener("printmart_otp_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("printmart_otp_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Sync with user's latest active print job from Firebase RTDB
  useEffect(() => {
    if (!user) return;

    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allJobs = Object.values(snapshot.val()) as PrintJob[];
        const userJobs = allJobs
          .filter((j) => j.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);

        // Find latest active unconsumed job with an OTP
        const activeJob = userJobs.find(
          (j) =>
            j.payment?.status === "PAID" &&
            !j.otpConsumed &&
            j.otp &&
            (!j.otpExpiresAt || j.otpExpiresAt > Date.now()) &&
            j.printing?.status !== "COMPLETED"
        );

        if (activeJob && activeJob.otp) {
          const newData = {
            otp: activeJob.otp,
            expiresAt: activeJob.otpExpiresAt || Date.now() + 3600000,
          };
          setOtpData(newData);
          const dismissed = localStorage.getItem("printmart_floating_otp_dismissed");
          if (dismissed !== "true") {
            setIsDismissed(false);
          }
        }
      }
    });

    return () => unsub();
  }, [user]);

  // Handle Dragging via Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore if clicking the close cross button
    if ((e.target as HTMLElement).closest("button")) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      setPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Handle Dragging via Touch (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.touches.length !== 1) return;

    isDraggingRef.current = true;
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current || moveEvent.touches.length !== 1) return;
      // Prevent screen scrolling while dragging the widget
      moveEvent.preventDefault();
      const currentTouch = moveEvent.touches[0];
      const dx = currentTouch.clientX - dragStartRef.current.startX;
      const dy = currentTouch.clientY - dragStartRef.current.startY;
      setPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem("printmart_floating_otp_dismissed", "true");
  };

  if (!mounted || !otpData || isDismissed) {
    return null;
  }

  // Render via portal directly into document.body to float across all panels without parent bounds
  return createPortal(
    <div
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        touchAction: "none",
      }}
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-[9990] select-none cursor-grab active:cursor-grabbing pointer-events-auto transition-shadow"
      title="Drag to move anywhere"
    >
      {/* ─────────────────────────────────────────────────────────────
          MOVABLE GREEN FLOATING OTP BOX
          bg-[#0c831f], zero border, reduced radius (rounded-xl),
          high-contrast white content, no copy button, only cross (X)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0c831f] text-white rounded-xl py-2 px-3 sm:py-2.5 sm:px-3.5 shadow-[0_8px_25px_rgba(12,131,31,0.38)] flex items-center gap-2.5 active:scale-98 transition-transform">
        {/* Printer Icon */}
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <Printer className="w-3.5 h-3.5 text-white" />
        </div>

        {/* OTP Digits */}
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold text-emerald-200 tracking-wider leading-none">
            Campus OTP
          </span>
          <span className="text-base sm:text-lg font-black font-mono tracking-widest text-white leading-tight">
            {otpData.otp}
          </span>
        </div>

        {/* Small Cross Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-5 h-5 rounded-full hover:bg-black/20 active:bg-black/30 text-white/80 hover:text-white flex items-center justify-center transition-colors ml-1 cursor-pointer"
          aria-label="Dismiss floating OTP"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>,
    document.body
  );
}
