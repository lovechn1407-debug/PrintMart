import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { adminDb } from "@/lib/firebaseAdmin";
import { getTelegramFileDownloadUrl } from "@/lib/telegram";

const CACHE_DIR = path.join(process.cwd(), ".uploads_cache");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
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

    const queryKey = documentId || fileId;

    ensureCacheDir();

    // 1. Check local server disk cache first (fastest, zero-latency)
    const localFiles = fs.readdirSync(CACHE_DIR);

    // Exact or prefix match on cached files
    let matchingFile: string | undefined;
    if (queryKey) {
      matchingFile = localFiles.find((f) => f.startsWith(queryKey));
    }
    if (!matchingFile && filename) {
      matchingFile = localFiles.find((f) => f.toLowerCase() === filename.toLowerCase() || f.toLowerCase().endsWith(filename.toLowerCase()));
    }

    if (matchingFile) {
      const filePath = path.join(CACHE_DIR, matchingFile);
      const fileBuffer = fs.readFileSync(filePath);
      const mime = getMimeType(matchingFile, fileBuffer);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Disposition": `inline; filename="${encodeURIComponent(matchingFile)}"`,
        },
      });
    }

    // 2. Query document metadata from Firebase Realtime Database
    let targetDoc: any = null;

    if (queryKey && !queryKey.startsWith("BQAC")) {
      const docSnap = await adminDb.ref(`documents/${queryKey}`).get();
      if (docSnap.exists()) {
        targetDoc = docSnap.val();
      }
    }

    // If queryKey wasn't found directly, search RTDB documents by filename or telegramFileId
    if (!targetDoc) {
      const allDocsSnap = await adminDb.ref("documents").get();
      const allDocs = allDocsSnap.val() || {};

      for (const [key, d] of Object.entries(allDocs)) {
        const item = d as any;
        if (queryKey && (key === queryKey || item.documentId === queryKey || item.telegramFileId === queryKey)) {
          targetDoc = item;
          break;
        }
        if (filename && item.originalFilename && item.originalFilename.toLowerCase() === filename.toLowerCase()) {
          targetDoc = item;
          // Keep iterating to find the most recent matching document
        }
      }
    }

    let resolvedTelegramFileId: string | null = null;
    let resolvedFilename = filename || "document.pdf";
    let resolvedMime = "application/pdf";

    if (targetDoc) {
      resolvedTelegramFileId = targetDoc.telegramFileId;
      resolvedFilename = targetDoc.originalFilename || resolvedFilename;
      resolvedMime = targetDoc.mimeType || getMimeType(resolvedFilename);
    } else if (queryKey && queryKey.startsWith("BQAC")) {
      // Direct Telegram file ID
      resolvedTelegramFileId = queryKey;
    }

    if (!resolvedTelegramFileId) {
      return NextResponse.json(
        { error: `Document not found for key: ${queryKey || filename}` },
        { status: 404 }
      );
    }

    // 3. Resolve direct download URL from Telegram vault
    const downloadUrl = await getTelegramFileDownloadUrl(resolvedTelegramFileId);
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file from Telegram: ${fileRes.statusText}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const finalMime = resolvedMime || getMimeType(resolvedFilename, buffer);

    // Save to local cache for rapid subsequent requests
    try {
      const ext = path.extname(resolvedFilename) || (finalMime.includes("pdf") ? ".pdf" : ".jpg");
      const cacheBaseName = queryKey ? `${queryKey}${ext}` : `${Date.now()}_${resolvedFilename}`;
      fs.writeFileSync(path.join(CACHE_DIR, cacheBaseName), buffer);
    } catch (writeErr) {
      console.warn("Failed to write to local uploads cache:", writeErr);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": finalMime,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
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
