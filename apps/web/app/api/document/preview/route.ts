import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { adminDb } from "@/lib/firebaseAdmin";
import { getTelegramFileDownloadUrl } from "@/lib/telegram";

// On Vercel / AWS Lambda, only /tmp is writable. NEVER write to process.cwd()!
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
    // Disk cache is strictly optional; never throw
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
    // Disk cache is strictly optional; never throw
  }
}

function getMimeType(filename: string, buffer?: Buffer): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || (buffer && buffer.slice(0, 4).toString() === "%PDF")) {
    return "application/pdf";
  }
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const fileId = searchParams.get("fileId");
    const filename = searchParams.get("filename");

    const queryKey = (documentId || fileId || "").trim();
    const cleanFilename = filename ? path.basename(filename.trim()) : "";

    // 1. Try reading from temporary cache (optional, zero-latency)
    if (queryKey) {
      const cached = tryReadFromCache(queryKey);
      if (cached) {
        const mime = getMimeType(cleanFilename || queryKey, cached);
        return new NextResponse(new Uint8Array(cached), {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
            "Content-Disposition": `inline; filename="${encodeURIComponent(cleanFilename || queryKey)}"`,
          },
        });
      }
    }

    // 2. Query document metadata from Firebase Realtime Database
    let targetDoc: any = null;

    if (queryKey && !queryKey.startsWith("BQAC")) {
      try {
        const docSnap = await adminDb.ref(`documents/${queryKey}`).get();
        if (docSnap.exists()) {
          targetDoc = docSnap.val();
        }
      } catch (dbErr) {
        console.warn("RTDB direct lookup error:", dbErr);
      }
    }

    // If queryKey wasn't found directly, search RTDB documents by filename or telegramFileId
    if (!targetDoc) {
      try {
        const allDocsSnap = await adminDb.ref("documents").get();
        const allDocs = allDocsSnap.val() || {};

        for (const [key, d] of Object.entries(allDocs)) {
          const item = d as any;
          if (queryKey && (key === queryKey || item.documentId === queryKey || item.telegramFileId === queryKey)) {
            targetDoc = item;
            break;
          }
          if (cleanFilename && item.originalFilename && item.originalFilename.toLowerCase() === cleanFilename.toLowerCase()) {
            targetDoc = item;
          }
        }
      } catch (dbErr) {
        console.warn("RTDB collection scan warning:", dbErr);
      }
    }

    let resolvedTelegramFileId: string | null = null;
    let resolvedFilename = cleanFilename || "document.pdf";
    let resolvedMime = "application/pdf";

    if (targetDoc) {
      resolvedTelegramFileId = targetDoc.telegramFileId;
      resolvedFilename = path.basename(targetDoc.originalFilename || resolvedFilename);
      resolvedMime = targetDoc.mimeType || getMimeType(resolvedFilename);
    } else if (queryKey && queryKey.startsWith("BQAC")) {
      resolvedTelegramFileId = queryKey;
    }

    if (!resolvedTelegramFileId) {
      return NextResponse.json(
        { error: `Document not found for key: ${queryKey || cleanFilename}` },
        { status: 404 }
      );
    }

    // 3. Resolve direct download URL from Telegram vault
    const downloadUrl = await getTelegramFileDownloadUrl(resolvedTelegramFileId);
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file from Telegram storage: ${fileRes.statusText}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const finalMime = resolvedMime || getMimeType(resolvedFilename, buffer);

    // Cache in /tmp for subsequent requests within the same lambda instance
    if (queryKey) {
      trySaveToCache(queryKey, buffer);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": finalMime,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Disposition": `inline; filename="${encodeURIComponent(resolvedFilename)}"`,
      },
    });
  } catch (error: any) {
    console.error("Preview document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve document preview" },
      { status: 500 }
    );
  }
}
