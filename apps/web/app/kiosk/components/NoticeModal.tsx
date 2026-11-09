"use client";

import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface NoticeModalProps {
  isOpen: boolean;
  type?: "error" | "success" | "info";
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function NoticeModal({
  isOpen,
  type = "error",
  title = "Notice",
  message,
  buttonText = "Okay",
  onClose,
}: NoticeModalProps) {
  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-0 text-center animate-in zoom-in-95 duration-150">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs ${
            isSuccess
              ? "bg-emerald-50 text-[#0c831f]"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-6 h-6 text-[#0c831f]" />
          ) : (
            <AlertCircle className="w-6 h-6 text-rose-600" />
          )}
        </div>

        <h3 className="font-bold text-base sm:text-lg text-neutral-900 mb-1.5">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-5">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all active:scale-98 shadow-xs cursor-pointer border-0"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
