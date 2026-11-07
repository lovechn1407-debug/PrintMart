import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { machineId, commandId, status, result } = await req.json();

    if (!machineId || !commandId || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    updates[`machineCommands/${machineId}/${commandId}/status`] = status;
    updates[`machineCommands/${machineId}/${commandId}/executedAt`] = Date.now();
    if (result) {
      updates[`machineCommands/${machineId}/${commandId}/result`] = result;
    }

    await adminDb.ref().update(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Command ack error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge command" },
      { status: 500 }
    );
  }
}

