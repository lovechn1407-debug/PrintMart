import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchCashfreeOrderStatus } from "@/lib/cashfree";
import { generateAndStoreJobOTP } from "@/lib/otpService";
import { sendOtpAndInvoiceEmail } from "@/lib/emailService";

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

    const effectiveOrderId = orderId || `CF_${jobId}`;

    // Helper to send email once
    const triggerEmailIfPending = async (plainOtp: string) => {
      if (job.emailSent) return;
      try {
        const toEmail = job.customerEmail || "";
        if (!toEmail || !toEmail.includes("@")) return;

        const subtotalRupees = `₹${((job.pricing?.subtotalPaise || 0) / 100).toFixed(2)}`;
        const discountRupees = `-₹${((job.pricing?.discountPaise || 0) / 100).toFixed(2)}`;
        const taxRupees = `₹${((job.pricing?.taxPaise || 0) / 100).toFixed(2)}`;
        const totalAmountRupees = `₹${((job.pricing?.finalPayablePaise || 0) / 100).toFixed(2)}`;

        const sent = await sendOtpAndInvoiceEmail({
          toEmail,
          toName: job.customerName || "Customer",
          otpCode: plainOtp,
          orderId: effectiveOrderId,
          jobId,
          documentName: job.documentName || "document.pdf",
          pageCount: job.configuration?.totalPagesToPrint || 1,
          colorMode: job.configuration?.colorMode || "bw",
          copies: job.configuration?.copies || 1,
          subtotalRupees,
          discountRupees,
          taxRupees,
          totalAmountRupees,
        });

        if (sent) {
          await adminDb.ref(`printJobs/${jobId}/emailSent`).set(true);
        }
      } catch (e) {
        console.warn("Failed to trigger invoice email:", e);
      }
    };

    // 1. If already verified and marked as PAID (e.g. by Cashfree webhook)
    if (job.payment?.status === "PAID" && job.otp) {
      triggerEmailIfPending(job.otp).catch(() => {});
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
    const status = await fetchCashfreeOrderStatus(effectiveOrderId);

    if (status === "PAID") {
      const otpResult = await generateAndStoreJobOTP({
        jobId,
        machineId: job.machineId,
        userId: job.userId,
      });

      triggerEmailIfPending(otpResult.plainOtp).catch(() => {});

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
