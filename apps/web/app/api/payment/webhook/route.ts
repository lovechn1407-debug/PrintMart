import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyCashfreeSignature } from "@/lib/cashfree";
import { generateAndStoreJobOTP } from "@/lib/otpService";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    // Verify webhook signature
    const isValid = verifyCashfreeSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.warn("Cashfree webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const orderData = event.data?.order;
    const paymentData = event.data?.payment;

    if (!orderData || !orderData.order_id) {
      return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
    }

    const orderId = orderData.order_id;
    const jobId = orderId.replace(/^CF_/, "");

    // Idempotency check: Read existing job
    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Associated job not found" }, { status: 404 });
    }

    const job = jobSnap.val();
    if (job.payment?.status === "PAID") {
      // Already processed idempotently
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (paymentData?.payment_status === "SUCCESS") {
      // Generate OTP and trigger background preloading
      await generateAndStoreJobOTP({
        jobId,
        machineId: job.machineId,
        userId: job.userId,
      });

      // Update payment ID
      if (paymentData.cf_payment_id) {
        await adminDb.ref(`printJobs/${jobId}/payment/cfPaymentId`).set(String(paymentData.cf_payment_id));
      }
    } else {
      await adminDb.ref(`printJobs/${jobId}/payment/status`).set("FAILED");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}

