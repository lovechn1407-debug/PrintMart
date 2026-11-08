import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashOTP } from "@/lib/otpService";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { machineId, otp } = await req.json();

    if (!machineId || !otp) {
      return jsonResponse({ error: "Machine ID and OTP are required" }, 400);
    }

    const cleanOtp = String(otp).trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return jsonResponse({ error: "Invalid OTP format. Must be 6 digits." }, 400);
    }

    // Compute cryptographic hash
    const otpHash = hashOTP(cleanOtp);

    // Read OTP record
    const otpSnap = await adminDb.ref(`otpRecords/${otpHash}`).get();
    if (!otpSnap.exists()) {
      return jsonResponse({ error: "Invalid OTP or job not found." }, 404);
    }

    const otpRecord = otpSnap.val();

    // Check machine match (Universal Campus Kiosk Dispense)
    if (otpRecord.machineId && otpRecord.machineId !== machineId && otpRecord.machineId !== "ALL") {
      const currentMachineSnap = await adminDb.ref(`machines/${machineId}`).get();
      if (currentMachineSnap.exists() && currentMachineSnap.val().status !== "DISABLED") {
        // Allow release at any valid campus kiosk
        await adminDb.ref(`otpRecords/${otpHash}/machineId`).set(machineId);
        await adminDb.ref(`printJobs/${otpRecord.jobId}/machineId`).set(machineId);
      } else {
        return jsonResponse(
          { error: `This OTP is assigned to vending machine ${otpRecord.machineId}, not this machine.` },
          403
        );
      }
    }

    // Check expiration
    if (Date.now() > otpRecord.expiresAt) {
      return jsonResponse({ error: "This OTP has expired. Please contact support." }, 410);
    }

    // Check already consumed
    if (otpRecord.consumed) {
      return jsonResponse({ error: "This OTP has already been used." }, 409);
    }

    // Check failed attempts
    if (otpRecord.failedAttempts >= 3) {
      return jsonResponse(
        { error: "Too many failed attempts. OTP has been locked for security." },
        429
      );
    }

    const jobId = otpRecord.jobId;
    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return jsonResponse({ error: "Print job record missing" }, 404);
    }
    const job = jobSnap.val();

    // Check preparation status - MUST be READY (or preloaded)
    if (job.preparation?.status !== "READY") {
      console.warn(`Job ${jobId} preparation status is ${job.preparation?.status}, expected READY`);
    }

    // Atomically consume OTP and authorize printing
    const updates: Record<string, any> = {};
    updates[`otpRecords/${otpHash}/consumed`] = true;
    updates[`printJobs/${jobId}/otpConsumed`] = true;
    updates[`printJobs/${jobId}/printing/status`] = "AUTHORIZED";
    updates[`printJobs/${jobId}/printing/startedAt`] = Date.now();
    updates[`printJobs/${jobId}/updatedAt`] = Date.now();

    await adminDb.ref().update(updates);

    return jsonResponse({
      success: true,
      message: "Print job authorized successfully",
      jobId,
      documentName: job.documentName,
      configuration: job.configuration,
      preparationStatus: job.preparation?.status,
    }, 200);
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return jsonResponse(
      { error: error.message || "Failed to verify OTP" },
      500
    );
  }
}
