import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { uploadDocumentToTelegram } from "@/lib/telegram";
import { adminDb } from "@/lib/firebaseAdmin";
import { DocumentMetadata, MAX_FILE_SIZE_BYTES } from "@printmart/shared";

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ownerUid = (formData.get("ownerUid") as string) || "anonymous";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of 25MB` },
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

    // Upload to Private Telegram Channel vault
    const tgResult = await uploadDocumentToTelegram({
      fileBuffer: buffer,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
    });

    const documentId = `DOC_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const retentionExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

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
      retentionExpiresAt,
      createdAt: Date.now(),
    };

    // Save to Firebase RTDB
    await adminDb.ref(`documents/${documentId}`).set(docMetadata);

    return NextResponse.json({
      success: true,
      document: docMetadata,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document upload" },
      { status: 500 }
    );
  }
}

