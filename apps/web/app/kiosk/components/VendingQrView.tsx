import React from "react";
import { Smartphone } from "lucide-react";

interface GlobalPricingData {
  bwPerSidePaise: number;
  colorPerSidePaise: number;
  serviceChargePaise?: number;
}

interface VendingQrViewProps {
  targetUrl?: string;
  title?: string;
  subtitle?: string;
  pricing: GlobalPricingData;
  aspectRatio?: string;
}

export function VendingQrView({
  targetUrl = "https://itsprintmart.vercel.app",
  title,
  subtitle,
  pricing,
  aspectRatio = "16:9",
}: VendingQrViewProps) {
  const cleanUrl = targetUrl?.trim() || "https://itsprintmart.vercel.app";
  const displayHost = cleanUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(cleanUrl)}`;

  const bwRate = ((pricing.bwPerSidePaise ?? 150) / 100).toFixed(2);
  const colorRate = ((pricing.colorPerSidePaise ?? 500) / 100).toFixed(2);
  const isPortrait = ["9:16", "9:14", "3:4"].includes(aspectRatio);

  const displayTitle = title?.trim() || "Print from Your Phone";
  const displaySubtitle =
    subtitle?.trim() || "Scan the QR code to upload your documents & print instantly.";

  /* ══════════════════════════════════════════════════════════════════════
     PORTRAIT LAYOUT (9:16, 9:14, 3:4)
     - Self-service kiosk pill removed
     - Price boxes have reduced corner radius (rounded-[6px])
     - QR box has NO radius (rounded-none)
     - Clean warm background matching homepage
     ══════════════════════════════════════════════════════════════════════ */
  if (isPortrait) {
    return (
      <div className="w-full h-full bg-[#fbf9f3] text-[#1c1c1c] p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none font-sans">
        {/* Header (No pill) */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-1">
          <h2 className="text-base sm:text-lg font-bold text-[#1c1c1c] tracking-tight leading-snug">
            {displayTitle}
          </h2>
          <p className="text-[11px] sm:text-xs text-neutral-600 max-w-[240px] leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* QR Code Card (NO RADIUS: rounded-none) */}
        <div className="flex flex-col items-center gap-2 my-auto py-1">
          <div className="p-3 bg-white rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col items-center border-0">
            <img
              src={qrImageUrl}
              alt="Scan QR to Print"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#0c831f] font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Point camera to open website</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-medium">
            {displayHost}
          </span>
        </div>

        {/* Dynamic Pricing Cards (Reduced corner radius: rounded-[6px]) */}
        <div className="space-y-2 pb-1">
          <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] mx-auto">
            {/* B&W Card */}
            <div className="bg-white rounded-[6px] p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col items-center text-center border-0">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                B&W Print
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#1c1c1c]">₹{bwRate}</span>
                <span className="text-[10px] text-neutral-500">/page</span>
              </div>
              <span className="text-[9px] text-neutral-500 mt-0.5">Single / Double</span>
            </div>

            {/* Color Card */}
            <div className="bg-white rounded-[6px] p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col items-center text-center border-0">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                Color Print
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-[#0c831f]">₹{colorRate}</span>
                <span className="text-[10px] text-neutral-500">/page</span>
              </div>
              <span className="text-[9px] text-neutral-500 mt-0.5">Vibrant Ink</span>
            </div>
          </div>

          {/* 3 Steps */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-600 font-medium pt-1">
            <span className="px-2 py-0.5 rounded-[4px] bg-white shadow-xs">1. Scan</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-[4px] bg-white shadow-xs">2. Upload</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#0c831f] text-white font-semibold shadow-xs">
              3. Enter OTP
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     LANDSCAPE LAYOUT (16:9, 4:3, custom)
     - Self-service kiosk pill removed
     - Price boxes have reduced corner radius (rounded-[6px])
     - QR box has NO radius (rounded-none)
     - Clean warm background matching homepage
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full h-full bg-[#fbf9f3] text-[#1c1c1c] p-4 sm:p-5 flex items-center justify-between gap-4 overflow-hidden select-none font-sans">
      {/* LEFT COLUMN: Info, Pricing Cards, Steps */}
      <div className="flex-1 flex flex-col justify-between h-full py-0.5 min-w-0">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#1c1c1c] tracking-tight leading-snug">
            {displayTitle}
          </h2>
          <p className="text-xs text-neutral-600 max-w-sm leading-relaxed line-clamp-2">
            {displaySubtitle}
          </p>
        </div>

        {/* Dynamic Pricing Cards (Reduced corner radius: rounded-[6px]) */}
        <div className="space-y-1.5 my-auto py-1">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            Live Print Pricing
          </div>

          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {/* B&W Card */}
            <div className="bg-white rounded-[6px] p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col border-0">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                Black & White
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#1c1c1c]">₹{bwRate}</span>
                <span className="text-[11px] text-neutral-500">/page</span>
              </div>
              <span className="text-[9px] text-neutral-500 mt-0.5">70 GSM Crisp Paper</span>
            </div>

            {/* Color Card */}
            <div className="bg-white rounded-[6px] p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col border-0">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                Color Print
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-[#0c831f]">₹{colorRate}</span>
                <span className="text-[11px] text-neutral-500">/page</span>
              </div>
              <span className="text-[9px] text-neutral-500 mt-0.5">High Quality Finish</span>
            </div>
          </div>
        </div>

        {/* 3 Steps */}
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-medium pt-1">
          <span className="px-2 py-0.5 rounded-[4px] bg-white shadow-xs">1. Scan QR</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-white shadow-xs">2. Upload Files</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#0c831f] text-white font-semibold shadow-xs">
            3. Enter OTP
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: QR Code Card (NO RADIUS: rounded-none) */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-1.5 pl-1">
        <div className="p-3 bg-white rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col items-center border-0">
          <img
            src={qrImageUrl}
            alt="Scan QR to Print"
            className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 object-contain rounded-none"
          />
        </div>

        <div className="text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1 text-xs font-semibold text-[#0c831f]">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Scan with phone camera</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-medium block">
            {displayHost}
          </span>
        </div>
      </div>
    </div>
  );
}
