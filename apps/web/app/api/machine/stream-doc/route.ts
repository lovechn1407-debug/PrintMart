import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { adminDb } from "@/lib/firebaseAdmin";
import { downloadTelegramDocument } from "@/lib/telegram";

const TMP_CACHE_DIR = path.join(os.tmpdir(), "printmart_cache");

function tryReadFromCache(filename: string): Buffer | null {
  try {
    const safeName = path.basename(filename);
    const filePath = path.join(TMP_CACHE_DIR, safeName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && stat.size > 0) {
        return fs.readFileSync(filePath);
      }
    }
  } catch {
    // Disk cache is strictly optional
  }
  return null;
}

function trySaveToCache(filename: string, buffer: Buffer): void {
  try {
    const safeName = path.basename(filename);
    if (!fs.existsSync(TMP_CACHE_DIR)) {
      fs.mkdirSync(TMP_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TMP_CACHE_DIR, safeName), buffer);
  } catch {
    // Disk cache is strictly optional
  }
}

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
    if (!doc.telegramFileId && (!doc.chunks || doc.chunks.length === 0)) {
      return NextResponse.json({ error: "No Telegram file ID or chunks available" }, { status: 500 });
    }

    // 3. Try reading from local /tmp cache first
    let buffer = tryReadFromCache(job.documentId);

    // 4. If not cached, download and reassemble from Telegram (handles chunks automatically)
    if (!buffer) {
      buffer = await downloadTelegramDocument(doc);
      trySaveToCache(job.documentId, buffer);
    }

    return new NextResponse(new Uint8Array(buffer), {
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

