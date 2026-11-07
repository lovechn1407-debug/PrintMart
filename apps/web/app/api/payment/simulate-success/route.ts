import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { generateAndStoreJobOTP } from "@/lib/otpService";

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.val();

    // Generate OTP & trigger PRELOAD_QUEUED in RTDB
    const otpResult = await generateAndStoreJobOTP({
      jobId,
      machineId: job.machineId,
      userId: job.userId,
    });

    // Record mock transaction
    await adminDb.ref(`printJobs/${jobId}/payment/cfPaymentId`).set(`DEMO_PAY_${Date.now()}`);

    return NextResponse.json({
      success: true,
      otp: otpResult.plainOtp,
      expiresAt: otpResult.expiresAt,
      jobId,
      machineId: job.machineId,
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to simulate payment" },
      { status: 500 }
    );
  }
}

