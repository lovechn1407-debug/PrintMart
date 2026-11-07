import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { MachinePrinterStatus } from "@printmart/shared";

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
    const body = await req.json();
    const { machineId, agentVersion, ipAddress, printerStatus, errorLog } = body as {
      machineId: string;
      agentVersion: string;
      ipAddress?: string;
      printerStatus?: MachinePrinterStatus;
      errorLog?: {
        errorCode: string;
        severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
        description: string;
        diagnosticData?: any;
      };
    };

    if (!machineId) {
      return jsonResponse({ error: "Missing machineId" }, 400);
    }

    const now = Date.now();
    const updates: Record<string, any> = {};

    updates[`machines/${machineId}/lastHeartbeat`] = now;
    updates[`machines/${machineId}/status`] = "ONLINE";
    if (agentVersion) updates[`machines/${machineId}/agentVersion`] = agentVersion;
    if (ipAddress) updates[`machines/${machineId}/ipAddress`] = ipAddress;

    if (printerStatus) {
      updates[`machinePrinterStatus/${machineId}`] = {
        ...printerStatus,
        updatedAt: now,
      };
    }

    if (errorLog) {
      const errorId = `ERR_${now}_${Math.random().toString(36).substring(7)}`;
      updates[`errorLogs/${machineId}/${errorId}`] = {
        errorId,
        machineId,
        errorCode: errorLog.errorCode,
        severity: errorLog.severity,
        description: errorLog.description,
        diagnosticData: errorLog.diagnosticData || {},
        timestamp: now,
        resolved: false,
        bypassed: false,
      };
    }

    try {
      await Promise.race([
        adminDb.ref().update(updates),
        new Promise((r) => setTimeout(r, 1000))
      ]);
    } catch (e) {
      console.warn("RTDB update fallback:", e);
    }

    let activeOverlay = null;
    try {
      const overlaySnap = await Promise.race([
        adminDb.ref(`overlays/machines/${machineId}`).get(),
        new Promise<null>((r) => setTimeout(() => r(null), 1000))
      ]);
      const globalOverlaySnap = await Promise.race([
        adminDb.ref("overlays/global").get(),
        new Promise<null>((r) => setTimeout(() => r(null), 1000))
      ]);

      activeOverlay =
        overlaySnap && (overlaySnap as any).val()?.active
          ? (overlaySnap as any).val()
          : globalOverlaySnap && (globalOverlaySnap as any).val()?.active
          ? (globalOverlaySnap as any).val()
          : null;
    } catch {}

    return jsonResponse({
      success: true,
      serverTime: now,
      activeOverlay,
    });
  } catch (error: any) {
    console.error("Machine status update error:", error);
    return jsonResponse(
      { error: error.message || "Failed to update machine status" },
      500
    );
  }
}
