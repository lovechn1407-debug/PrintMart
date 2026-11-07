import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export interface UploadedDocumentRecord {
  fileId?: string;
  documentId?: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  pageCount: number;
  isColorDocument?: boolean;
  telegramFileId?: string;
  telegramMessageId?: number;
  previewUrl?: string;
  blobUrl?: string;
}

export interface PrintDraftItem {
  id: string;
  title: string;
  documents: UploadedDocumentRecord[];
  pageCount: number;
  previewUrl?: string;
  mimeType?: string;
  createdAt: number;
  config?: any;
}

function sanitizeDrafts(drafts: PrintDraftItem[]): PrintDraftItem[] {
  if (!Array.isArray(drafts)) return [];

  return drafts.filter(Boolean).map((draft) => {
    const sanitizedDocs = (draft.documents || []).map((doc) => {
      const docId = doc.fileId || doc.documentId;
      const previewUrl = docId
        ? `/api/document/preview?documentId=${docId}`
        : doc.telegramFileId
        ? `/api/document/preview?fileId=${doc.telegramFileId}`
        : doc.originalFilename
        ? `/api/document/preview?filename=${encodeURIComponent(doc.originalFilename)}`
        : doc.previewUrl?.startsWith("blob:")
        ? ""
        : doc.previewUrl;

      return {
        ...doc,
        fileId: doc.fileId || doc.documentId || docId,
        previewUrl: previewUrl || undefined,
        // Strip ephemeral session blob URLs from server storage
        blobUrl: undefined,
      };
    });

    const firstDoc = sanitizedDocs[0];
    const draftPreview =
      firstDoc?.previewUrl ||
      (draft.previewUrl && !draft.previewUrl.startsWith("blob:") ? draft.previewUrl : undefined);

    return {
      ...draft,
      previewUrl: draftPreview,
      documents: sanitizedDocs,
    };
  });
}

// GET /api/drafts?uid=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const snap = await adminDb.ref(`users/${uid}/drafts`).get();
    const rawDrafts = snap.val();

    let drafts: PrintDraftItem[] = [];
    if (rawDrafts) {
      if (Array.isArray(rawDrafts)) {
        drafts = rawDrafts.filter(Boolean);
      } else if (typeof rawDrafts === "object") {
        drafts = Object.values(rawDrafts);
      }
    }

    const sanitized = sanitizeDrafts(drafts);
    return NextResponse.json({ success: true, drafts: sanitized });
  } catch (error: any) {
    console.error("GET /api/drafts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch cloud drafts" },
      { status: 500 }
    );
  }
}

// POST /api/drafts { uid: string, drafts: PrintDraftItem[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, drafts } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const sanitized = sanitizeDrafts(drafts || []);

    if (sanitized.length > 0) {
      await adminDb.ref(`users/${uid}/drafts`).set(sanitized);
    } else {
      await adminDb.ref(`users/${uid}/drafts`).remove();
    }

    return NextResponse.json({ success: true, drafts: sanitized });
  } catch (error: any) {
    console.error("POST /api/drafts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync drafts to cloud" },
      { status: 500 }
    );
  }
}
