import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchCashfreeOrderStatus } from "@/lib/cashfree";
import { generateAndStoreJobOTP } from "@/lib/otpService";

export async function POST(req: NextRequest) {
  try {
    const { jobId, orderId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.val();

    // 1. If already verified and marked as PAID (e.g. by Cashfree webhook)
    if (job.payment?.status === "PAID" && job.otp) {
      return NextResponse.json({
        success: true,
        paid: true,
        otp: job.otp,
        expiresAt: job.otpExpiresAt,
        jobId,
        machineId: job.machineId,
      });
    }

    // 2. Query Cashfree API directly for live status
    const effectiveOrderId = orderId || `CF_${jobId}`;
    const status = await fetchCashfreeOrderStatus(effectiveOrderId);

    if (status === "PAID") {
      const otpResult = await generateAndStoreJobOTP({
        jobId,
        machineId: job.machineId,
        userId: job.userId,
      });

      return NextResponse.json({
        success: true,
        paid: true,
        otp: otpResult.plainOtp,
        expiresAt: otpResult.expiresAt,
        jobId,
        machineId: job.machineId,
      });
    }

    return NextResponse.json({
      success: true,
      paid: false,
      status,
      jobId,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment status" },
      { status: 500 }
    );
  }
}
