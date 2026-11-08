import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { createCashfreeOrder } from "@/lib/cashfree";
import {
  calculatePrintPrice,
  DEFAULT_GLOBAL_PRICING,
  GlobalPricing,
  Offer,
  PrintJob,
  PrintJobConfiguration,
} from "@printmart/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      documentId,
      machineId,
      configuration,
      offerCode,
      customerName,
      customerEmail,
      customerPhone,
    } = body as {
      userId: string;
      documentId: string;
      machineId?: string;
      configuration: PrintJobConfiguration;
      offerCode?: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
    };

    if (!userId || !documentId || !configuration) {
      return NextResponse.json({ error: "Missing required order parameters" }, { status: 400 });
    }

    // 1. Verify Document
    const docSnap = await adminDb.ref(`documents/${documentId}`).get();
    if (!docSnap.exists()) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    const docData = docSnap.val();

    // 2. Universal Campus Kiosk: Jobs are universal and can be dispensed at ANY campus kiosk
    const targetMachineId = machineId || "UNIVERSAL";
    let machineData: any = {};
    if (targetMachineId !== "UNIVERSAL") {
      const machineSnap = await adminDb.ref(`machines/${targetMachineId}`).get();
      if (machineSnap.exists()) {
        machineData = machineSnap.val() || {};
      }
    }

    // 3. Recalculate price independently on the server
    let pricing: GlobalPricing = DEFAULT_GLOBAL_PRICING;
    const globalSnap = await adminDb.ref("pricing/global").get();
    if (globalSnap.exists()) {
      pricing = { ...DEFAULT_GLOBAL_PRICING, ...globalSnap.val() };
    }

    let offer: Offer | null = null;
    if (offerCode) {
      const offersSnap = await adminDb.ref("offers").get();
      if (offersSnap.exists()) {
        const offersObj = offersSnap.val() as Record<string, Offer>;
        const matched = Object.values(offersObj).find(
          (o) => o.code.toUpperCase() === offerCode.trim().toUpperCase() && o.active
        );
        if (matched) offer = matched;
      }
    }

    const verifiedPricing = calculatePrintPrice({
      config: configuration,
      pricing,
      offer,
      machinePricingOverride: machineData?.pricingOverride,
    });

    // 4. Generate unique Job & Order IDs
    const now = Date.now();
    const randSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const jobId = `PRN-${now}-${randSuffix}`;
    const orderId = `CF_${jobId}`;

    // 5. Create Cashfree Order
    const cfOrder = await createCashfreeOrder({
      orderId,
      orderAmountPaise: verifiedPricing.finalPayablePaise,
      customerId: userId,
      customerEmail: customerEmail || "user@printmart.com",
      customerName: customerName || "PrintMart Customer",
      customerPhone,
    });

    // 6. Register PrintJob in Firebase RTDB
    const printJob: PrintJob = {
      jobId,
      userId,
      machineId: targetMachineId,
      documentId,
      documentName: docData.originalFilename || "document.pdf",
      orderId,
      configuration,
      pricing: verifiedPricing,
      payment: {
        status: "PENDING",
        cfOrderId: cfOrder.cfOrderId,
      },
      preparation: {
        status: "CREATED",
      },
      printing: {
        status: "QUEUED",
        printedPages: 0,
      },
      otp: "",
      otpHash: "",
      otpExpiresAt: now + 60 * 60 * 1000, // 1 hour
      otpConsumed: false,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.ref(`printJobs/${jobId}`).set(printJob);

    // Also link under user's print jobs index
    await adminDb.ref(`userHistory/${userId}/${jobId}`).set({
      jobId,
      createdAt: now,
      finalPayablePaise: verifiedPricing.finalPayablePaise,
      documentName: docData.originalFilename,
    });

    return NextResponse.json({
      success: true,
      jobId,
      orderId,
      paymentSessionId: cfOrder.paymentSessionId,
      pricing: verifiedPricing,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}

