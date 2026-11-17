"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_OTP_FAILED_ATTEMPTS = exports.OTP_TTL_MS = exports.SUPPORTED_MIME_TYPES = exports.TELEGRAM_MAX_CHUNK_BYTES = exports.MAX_FILE_SIZE_BYTES = exports.DEFAULT_GLOBAL_PRICING = void 0;
exports.DEFAULT_GLOBAL_PRICING = {
    bwPerSidePaise: 150, // ₹1.50 per side
    colorPerSidePaise: 500, // ₹5.00 per side
    paperSizeMultipliers: {
        A4: 1.0,
        Letter: 1.0,
        A3: 2.0,
    },
    serviceChargePaise: 0,
};
exports.MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB max allowed file size
exports.TELEGRAM_MAX_CHUNK_BYTES = 19.5 * 1024 * 1024; // 19.5 MB per chunk (safe under Telegram Bot API 20MB limit)
exports.SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
exports.OTP_TTL_MS = 60 * 60 * 1000; // 1 hour
exports.MAX_OTP_FAILED_ATTEMPTS = 3;
