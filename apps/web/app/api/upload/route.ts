import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import {
  uploadDocumentToTelegram,
  uploadBufferInChunksToTelegram,
} from "@/lib/telegram";
import { adminDb } from "@/lib/firebaseAdmin";
import { DocumentMetadata, DocumentChunk, MAX_FILE_SIZE_BYTES } from "@printmart/shared";

function estimatePdfPageCount(buffer: Buffer): number {
  try {
    const text = buffer.toString("latin1");
    // Search for /Type /Page (excluding /Pages)
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
    // Fallback: look for /Count
    const countMatch = text.match(/\/Count\s+(\d+)/);
    if (countMatch && countMatch[1]) {
      return parseInt(countMatch[1], 10);
    }
  } catch (err) {
    console.warn("Failed to extract PDF page count:", err);
  }
  return 1;
}

async function getMaxAllowedFileSizeBytes(): Promise<{ maxBytes: number; maxMb: number }> {
  try {
    const snap = await adminDb.ref("systemSettings/maxFileSizeBytes").get();
    if (snap.exists()) {
      const mb = Number(snap.val());
      if (mb > 0) {
        return { maxBytes: mb * 1024 * 1024, maxMb: mb };
      }
    }
  } catch (err) {
    console.warn("Failed to read systemSettings/maxFileSizeBytes, using MAX_FILE_SIZE_BYTES:", err);
  }
  return { maxBytes: MAX_FILE_SIZE_BYTES, maxMb: Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024)) };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const { maxBytes, maxMb } = await getMaxAllowedFileSizeBytes();

    // ── CASE 1: DIRECT UPLOAD METADATA (Client uploaded chunks directly to Telegram) ──
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const {
        telegramFileId,
        telegramMessageId,
        chunks,
        originalFilename,
        mimeType,
        fileSizeBytes,
        pageCount,
        ownerUid = "anonymous",
        sha256 = "",
      } = body;

      const primaryFileId = telegramFileId || (Array.isArray(chunks) && chunks[0]?.telegramFileId);
      if (!primaryFileId || !originalFilename) {
        return NextResponse.json({ error: "Missing required document metadata or file identifier" }, { status: 400 });
      }

      const numFileSize = Number(fileSizeBytes) || 0;
      if (numFileSize > maxBytes) {
        return NextResponse.json(
          { error: `File exceeds maximum allowed size of ${maxMb}MB` },
          { status: 400 }
        );
      }

      const documentId = `DOC_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const retentionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const docMetadata: DocumentMetadata = {
        documentId,
        ownerUid,
        originalFilename,
        mimeType: mimeType || "application/octet-stream",
        fileSizeBytes: numFileSize,
        sha256: sha256 || crypto.randomBytes(16).toString("hex"),
        pageCount: Math.max(1, Number(pageCount) || 1),
        telegramMessageId: Number(telegramMessageId) || (Array.isArray(chunks) && chunks[0]?.telegramMessageId) || 0,
        telegramFileId: primaryFileId,
        chunks: Array.isArray(chunks) && chunks.length > 0 ? (chunks as DocumentChunk[]) : undefined,
        retentionExpiresAt,
        createdAt: Date.now(),
      };

      await adminDb.ref(`documents/${documentId}`).set(docMetadata);

      return NextResponse.json({
        success: true,
        document: {
          ...docMetadata,
          fileId: documentId,
          previewUrl: `/api/document/preview?documentId=${documentId}`,
        },
      });
    }

    // ── CASE 2: STANDARD MULTIPART FORMDATA UPLOAD ──
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ownerUid = (formData.get("ownerUid") as string) || "anonymous";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${maxMb}MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute SHA-256 Checksum
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Determine page count
    let pageCount = 1;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      pageCount = Math.max(1, estimatePdfPageCount(buffer));
    }

    const documentId = `DOC_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const retentionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // 1. Save copy to temporary local cache first for instant preview & fallback
    try {
      const tmpDir = path.join(os.tmpdir(), "printmart_cache");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(path.join(tmpDir, documentId), buffer);
    } catch (cacheErr) {
      console.warn("Could not cache file locally:", cacheErr);
    }

    // 2. Upload to Private Telegram Channel vault (in 20MB chunks if > 20MB)
    let tgResult = {
      messageId: 0,
      fileId: `LOCAL_${documentId}`,
      fileUniqueId: `UID_${documentId}`,
      fileSizeBytes: file.size,
      chunks: undefined as DocumentChunk[] | undefined,
    };

    try {
      if (file.size <= 20 * 1024 * 1024) {
        const uploaded = await uploadDocumentToTelegram({
          fileBuffer: buffer,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        tgResult = {
          messageId: uploaded.messageId,
          fileId: uploaded.fileId,
          fileUniqueId: uploaded.fileUniqueId,
          fileSizeBytes: uploaded.fileSizeBytes,
          chunks: undefined,
        };
      } else {
        // Multi-chunk upload for files > 20MB up to 100MB
        const chunkRes = await uploadBufferInChunksToTelegram({
          fileBuffer: buffer,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        tgResult = {
          messageId: chunkRes.primaryMessageId,
          fileId: chunkRes.primaryFileId,
          fileUniqueId: `UID_${chunkRes.primaryFileId}`,
          fileSizeBytes: file.size,
          chunks: chunkRes.chunks,
        };
      }
    } catch (tgErr) {
      console.warn("Telegram vault upload failed, stored in local cache fallback:", tgErr);
    }

    const docMetadata: DocumentMetadata = {
      documentId,
      ownerUid,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
      sha256,
      pageCount,
      telegramMessageId: tgResult.messageId,
      telegramFileId: tgResult.fileId,
      chunks: tgResult.chunks,
      retentionExpiresAt,
      createdAt: Date.now(),
    };

    // Save to Firebase RTDB
    await adminDb.ref(`documents/${documentId}`).set(docMetadata);

    return NextResponse.json({
      success: true,
      document: {
        ...docMetadata,
        fileId: documentId,
        previewUrl: `/api/document/preview?documentId=${documentId}`,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document upload" },
      { status: 500 }
    );
  }
}
