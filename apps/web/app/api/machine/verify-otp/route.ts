import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashOTP } from "@/lib/otpService";

export async function POST(req: NextRequest) {
  try {
    const { machineId, otp } = await req.json();

    if (!machineId || !otp) {
      return NextResponse.json({ error: "Machine ID and OTP are required" }, { status: 400 });
    }

    const cleanOtp = String(otp).trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json({ error: "Invalid OTP format. Must be 6 digits." }, { status: 400 });
    }

    // Compute cryptographic hash
    const otpHash = hashOTP(cleanOtp);

    // Read OTP record
    const otpSnap = await adminDb.ref(`otpRecords/${otpHash}`).get();
    if (!otpSnap.exists()) {
      return NextResponse.json(
        { error: "Invalid OTP or job not found." },
        { status: 404 }
      );
    }

    const otpRecord = otpSnap.val();

    // Check machine match
    if (otpRecord.machineId !== machineId) {
      return NextResponse.json(
        { error: `This OTP is assigned to vending machine ${otpRecord.machineId}, not this machine.` },
        { status: 403 }
      );
    }

    // Check expiration
    if (Date.now() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "This OTP has expired. Please contact support." }, { status: 410 });
    }

    // Check already consumed
    if (otpRecord.consumed) {
      return NextResponse.json({ error: "This OTP has already been used." }, { status: 409 });
    }

    // Check failed attempts
    if (otpRecord.failedAttempts >= 3) {
      return NextResponse.json(
        { error: "Too many failed attempts. OTP has been locked for security." },
        { status: 429 }
      );
    }

    const jobId = otpRecord.jobId;
    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Print job record missing" }, { status: 404 });
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

    return NextResponse.json({
      success: true,
      message: "Print job authorized successfully",
      jobId,
      documentName: job.documentName,
      configuration: job.configuration,
      preparationStatus: job.preparation?.status,
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

