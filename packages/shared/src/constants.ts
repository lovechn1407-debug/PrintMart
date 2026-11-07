import { GlobalPricing } from "./types";

export const DEFAULT_GLOBAL_PRICING: GlobalPricing = {
  bwPerSidePaise: 150, // ₹1.50 per side
  colorPerSidePaise: 500, // ₹5.00 per side
  paperSizeMultipliers: {
    A4: 1.0,
    Letter: 1.0,
    A3: 2.0,
  },
  serviceChargePaise: 0,
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const OTP_TTL_MS = 60 * 60 * 1000; // 1 hour
export const MAX_OTP_FAILED_ATTEMPTS = 3;
