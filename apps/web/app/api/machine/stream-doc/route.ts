import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getTelegramFileDownloadUrl } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const machineId = searchParams.get("machineId");

    if (!jobId || !machineId) {
      return NextResponse.json({ error: "Missing jobId or machineId" }, { status: 400 });
    }

    // 1. Verify Job belongs to this machine and is paid
    const jobSnap = await adminDb.ref(`printJobs/${jobId}`).get();
    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.val();
    if (job.machineId !== machineId) {
      return NextResponse.json({ error: "Job machine assignment mismatch" }, { status: 403 });
    }

    if (job.payment?.status !== "PAID") {
      return NextResponse.json({ error: "Job payment not confirmed" }, { status: 402 });
    }

    // 2. Fetch Document metadata
    const docSnap = await adminDb.ref(`documents/${job.documentId}`).get();
    if (!docSnap.exists()) {
      return NextResponse.json({ error: "Document metadata not found" }, { status: 404 });
    }

    const doc = docSnap.val();
    if (!doc.telegramFileId) {
      return NextResponse.json({ error: "No Telegram file ID available" }, { status: 500 });
    }

    // 3. Resolve Telegram download URL on server side
    const downloadUrl = await getTelegramFileDownloadUrl(doc.telegramFileId);

    // 4. Fetch and stream document binary back to the authorized agent
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from Telegram storage: ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`,
        "X-Document-Sha256": doc.sha256,
        "X-Page-Count": String(doc.pageCount || 1),
      },
    });
  } catch (error: any) {
    console.error("Stream document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stream document" },
      { status: 500 }
    );
  }
}

