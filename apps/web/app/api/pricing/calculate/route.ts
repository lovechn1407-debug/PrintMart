import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  calculatePrintPrice,
  DEFAULT_GLOBAL_PRICING,
  GlobalPricing,
  Offer,
  PrintJobConfiguration,
} from "@printmart/shared";

async function fetchDbWithTimeout<T>(refPath: string, ms = 1500): Promise<T | null> {
  try {
    const promise = adminDb.ref(refPath).get().then((snap) => (snap.exists() ? (snap.val() as T) : null));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
    return await Promise.race([promise, timeout]);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, machineId, offerCode } = body as {
      config: PrintJobConfiguration;
      machineId?: string;
      offerCode?: string;
    };

    if (!config) {
      return NextResponse.json({ error: "Missing print job configuration" }, { status: 400 });
    }

    // Fetch Global Pricing with fallback
    let pricing: GlobalPricing = DEFAULT_GLOBAL_PRICING;
    const globalData = await fetchDbWithTimeout<GlobalPricing>("pricing/global");
    if (globalData) {
      pricing = { ...DEFAULT_GLOBAL_PRICING, ...globalData };
    }

    // Fetch machine pricing override if applicable
    let machinePricingOverride = null;
    if (machineId && machineId !== "UNIVERSAL") {
      machinePricingOverride = await fetchDbWithTimeout<any>(`machines/${machineId}/pricingOverride`);
    }

    // Fetch Offer if provided
    let offer: Offer | null = null;
    if (offerCode) {
      const offersObj = await fetchDbWithTimeout<Record<string, Offer>>("offers");
      if (offersObj) {
        const matched = Object.values(offersObj).find(
          (o) => o.code.toUpperCase() === offerCode.trim().toUpperCase() && o.active
        );
        if (matched) {
          offer = matched;
        }
      }
    }

    const breakdown = calculatePrintPrice({
      config,
      pricing,
      offer,
      machinePricingOverride,
    });

    return NextResponse.json({
      success: true,
      pricing: breakdown,
    });
  } catch (err: any) {
    console.error("Pricing API error:", err);
    return NextResponse.json(
      { error: "Pricing calculation failed", details: err.message },
      { status: 500 }
    );
  }
}
