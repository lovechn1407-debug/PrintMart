import crypto from "crypto";
import { adminDb } from "./firebaseAdmin";
import { OTPRecord } from "@printmart/shared";

const PEPPER = process.env.MACHINE_PEPPER || "printmart_sec_pepper_2026_x7a9";

export interface GeneratedOTP {
  plainOtp: string;
  otpHash: string;
  expiresAt: number;
}

export function hashOTP(plainOtp: string): string {
  return crypto
    .createHash("sha256")
    .update(`${plainOtp.trim()}_${PEPPER}`)
    .digest("hex");
}

/**
 * Generates a random secure 6-digit OTP and its hash
 */
export async function generateAndStoreJobOTP(params: {
  jobId: string;
  machineId: string;
  userId: string;
}): Promise<GeneratedOTP> {
  const { jobId, machineId, userId } = params;

  // Generate 6-digit numeric OTP (100000 - 999999)
  const randomNum = crypto.randomInt(100000, 1000000);
  const plainOtp = randomNum.toString();
  const otpHash = hashOTP(plainOtp);
  const expiresAt = Date.now() + 60 * 60 * 1000; // 60 minutes TTL

  const otpRecord: OTPRecord = {
    jobId,
    machineId,
    userId,
    otpHash,
    expiresAt,
    failedAttempts: 0,
    consumed: false,
    createdAt: Date.now(),
  };

  // Atomically write OTP record and update job
  const updates: Record<string, any> = {};
  updates[`otpRecords/${otpHash}`] = otpRecord;
  updates[`printJobs/${jobId}/otp`] = plainOtp;
  updates[`printJobs/${jobId}/otpHash`] = otpHash;
  updates[`printJobs/${jobId}/otpExpiresAt`] = expiresAt;
  updates[`printJobs/${jobId}/otpConsumed`] = false;
  updates[`userHistory/${userId}/${jobId}/otp`] = plainOtp;
  updates[`printJobs/${jobId}/payment/status`] = "PAID";
  updates[`printJobs/${jobId}/payment/paidAt`] = Date.now();
  updates[`printJobs/${jobId}/preparation/status`] = "PRELOAD_QUEUED";
  updates[`printJobs/${jobId}/preparation/preloadStartedAt`] = Date.now();
  updates[`printJobs/${jobId}/updatedAt`] = Date.now();

  await adminDb.ref().update(updates);

  return { plainOtp, otpHash, expiresAt };
}

