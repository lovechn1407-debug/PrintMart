import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { adminDb } from "@/lib/firebaseAdmin";
import { getTelegramFileDownloadUrl } from "@/lib/telegram";

function getCacheDirs(): string[] {
  const dirs = [
    path.join(process.cwd(), ".uploads_cache"),
    path.join(process.cwd(), "apps", "web", ".uploads_cache"),
    path.join(os.tmpdir(), "printmart_uploads_cache"),
  ];
  return dirs;
}

function ensurePrimaryCacheDir(): string {
  const primary = path.join(process.cwd(), ".uploads_cache");
  try {
    if (!fs.existsSync(primary)) {
      fs.mkdirSync(primary, { recursive: true });
    }
    return primary;
  } catch {
    const fallback = path.join(os.tmpdir(), "printmart_uploads_cache");
    try {
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    } catch {
      return primary;
    }
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

    const primaryCacheDir = ensurePrimaryCacheDir();
    const allCacheDirs = getCacheDirs();

    // 1. Check local server disk cache across all possible candidate directories
    for (const cacheDir of allCacheDirs) {
      try {
        if (!fs.existsSync(cacheDir)) continue;

        const localFiles = fs.readdirSync(cacheDir);

        let matchingFile: string | undefined;
        if (queryKey) {
          matchingFile = localFiles.find((f) => f.startsWith(queryKey));
        }
        if (!matchingFile && cleanFilename) {
          matchingFile = localFiles.find(
            (f) =>
              f.toLowerCase() === cleanFilename.toLowerCase() ||
              f.toLowerCase().endsWith(cleanFilename.toLowerCase())
          );
        }

        if (matchingFile) {
          const filePath = path.join(cacheDir, matchingFile);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isFile() && stat.size > 0) {
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
          }
        }
      } catch (cacheErr) {
        console.warn("Disk cache lookup warning (will continue to cloud vault):", cacheErr);
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

    // Save copy to local cache across candidate directories
    try {
      const ext = path.extname(resolvedFilename) || (finalMime.includes("pdf") ? ".pdf" : ".jpg");
      const safeBase = queryKey ? `${queryKey}${ext}` : `${Date.now()}_${resolvedFilename}`;
      for (const dir of allCacheDirs) {
        try {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, safeBase), buffer);
        } catch {}
      }
    } catch (writeErr) {
      console.warn("Failed to write to uploads cache:", writeErr);
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
