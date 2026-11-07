import { database, auth, ref, set, onValue } from "./firebase";

export interface UploadedDocumentRecord {
  fileId: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  pageCount: number;
  isColorDocument: boolean;
  telegramFileId: string;
  telegramMessageId?: number;
  previewUrl?: string;
  blobUrl?: string;
  documentId?: string;
}

export interface DraftConfig {
  colorMode: "bw" | "color";
  orientation: "portrait" | "landscape";
  copies: number;
  pageRangeType: "all" | "custom";
  customRange: string;
}

export interface PrintDraftItem {
  id: string;
  title: string;
  documents: UploadedDocumentRecord[];
  pageCount: number;
  previewUrl?: string;
  mimeType?: string;
  createdAt: number;
  config?: DraftConfig;
}

const STORAGE_KEY_LIST = "printmart_drafts";
const STORAGE_KEY_SINGLE = "printmart_draft";

/**
 * Sanitizes draft items so they never contain dead browser session blob: URLs
 * and always resolve to permanent server preview endpoints.
 */
function sanitizeDraftItem(d: any): PrintDraftItem {
  const draftId = d.id || d.fileId || `draft_${d.createdAt || Date.now()}`;
  const rawDocs: any[] = Array.isArray(d.documents)
    ? d.documents
    : d.fileId || d.originalFilename
    ? [d]
    : [];

  const sanitizedDocs: UploadedDocumentRecord[] = rawDocs.map((doc: any) => {
    const docId =
      doc.fileId ||
      doc.documentId ||
      (doc.id && !String(doc.id).startsWith("draft_") ? doc.id : undefined) ||
      (draftId.startsWith("DOC_") ? draftId : undefined);

    let permanentUrl = doc.previewUrl;
    if (!permanentUrl || permanentUrl.startsWith("blob:")) {
      if (docId) {
        permanentUrl = `/api/document/preview?documentId=${docId}`;
      } else if (doc.telegramFileId) {
        permanentUrl = `/api/document/preview?fileId=${doc.telegramFileId}`;
      } else if (doc.originalFilename) {
        permanentUrl = `/api/document/preview?filename=${encodeURIComponent(doc.originalFilename)}`;
      } else {
        permanentUrl = undefined;
      }
    }

    return {
      fileId: docId || doc.telegramFileId || draftId,
      documentId: docId,
      originalFilename: doc.originalFilename || doc.filename || "Document.pdf",
      fileSizeBytes: doc.fileSizeBytes || 1024,
      mimeType: doc.mimeType || "application/pdf",
      pageCount: doc.pageCount || 1,
      isColorDocument: Boolean(doc.isColorDocument),
      telegramFileId: doc.telegramFileId || "tg_vault",
      telegramMessageId: doc.telegramMessageId,
      previewUrl: permanentUrl,
      // Ephemeral blob URLs must never be saved in persistent drafts
      blobUrl: undefined,
    };
  });

  const firstDoc = sanitizedDocs[0];
  const draftPreview =
    firstDoc?.previewUrl ||
    (d.previewUrl && !d.previewUrl.startsWith("blob:") ? d.previewUrl : undefined);

  return {
    id: draftId,
    title: d.title || firstDoc?.originalFilename || "Print Draft",
    documents: sanitizedDocs,
    pageCount: d.pageCount || firstDoc?.pageCount || 1,
    previewUrl: draftPreview,
    mimeType: d.mimeType || firstDoc?.mimeType || "application/pdf",
    createdAt: d.createdAt || Date.now(),
    config: d.config,
  };
}

export function getStoredDrafts(): PrintDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const rawList = localStorage.getItem(STORAGE_KEY_LIST);
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(sanitizeDraftItem);
      }
    }

    // Check legacy single draft
    const rawSingle = localStorage.getItem(STORAGE_KEY_SINGLE);
    if (rawSingle) {
      const s = JSON.parse(rawSingle);
      if (s && (s.documents || s.filename || s.originalFilename || s.fileId)) {
        const item = sanitizeDraftItem(s);
        if (item.documents.length > 0) {
          localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify([item]));
          return [item];
        }
      }
    }
  } catch (err) {
    console.warn("Error reading stored drafts:", err);
  }
  return [];
}

export function getDraftById(id: string): PrintDraftItem | null {
  const drafts = getStoredDrafts();
  return drafts.find((d) => d.id === id) || null;
}

/**
 * Sync drafts directly to server API + Firebase RTDB
 */
async function pushDraftsToCloud(uid: string, drafts: PrintDraftItem[]): Promise<void> {
  try {
    // 1. Post to server REST API (uses adminDb - guaranteed write permission)
    await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, drafts }),
    }).catch((err) => console.warn("POST /api/drafts failed:", err));

    // 2. Also update client-side RTDB ref to fire websocket push to other listening devices
    if (database) {
      const draftsRef = ref(database, `users/${uid}/drafts`);
      await set(draftsRef, drafts.length > 0 ? drafts : null).catch(() => {});
    }
  } catch (e) {
    console.warn("pushDraftsToCloud error:", e);
  }
}

export function saveOrUpdateDraft(draft: PrintDraftItem, optionalUid?: string): PrintDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const sanitizedDraft = sanitizeDraftItem(draft);
    const drafts = getStoredDrafts();
    const existingIndex = drafts.findIndex((d) => d.id === sanitizedDraft.id);
    let updatedList: PrintDraftItem[];

    if (existingIndex >= 0) {
      updatedList = [...drafts];
      updatedList[existingIndex] = sanitizedDraft;
    } else {
      updatedList = [sanitizedDraft, ...drafts];
    }

    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updatedList));
    localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify(sanitizedDraft));
    window.dispatchEvent(new Event("printmart_drafts_updated"));

    // Sync to Cloud if user UID is available
    const uid = optionalUid || auth.currentUser?.uid;
    if (uid) {
      pushDraftsToCloud(uid, updatedList);
    }

    return updatedList;
  } catch (err) {
    console.warn("Error saving draft:", err);
    return [];
  }
}

export function removeDraftById(id: string, optionalUid?: string): PrintDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const drafts = getStoredDrafts();
    const updatedList = drafts.filter((d) => d.id !== id);

    if (updatedList.length > 0) {
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify(updatedList[0]));
    } else {
      localStorage.removeItem(STORAGE_KEY_LIST);
      localStorage.removeItem(STORAGE_KEY_SINGLE);
    }
    window.dispatchEvent(new Event("printmart_drafts_updated"));

    const uid = optionalUid || auth.currentUser?.uid;
    if (uid) {
      pushDraftsToCloud(uid, updatedList);
    }

    return updatedList;
  } catch (err) {
    console.warn("Error removing draft:", err);
    return [];
  }
}

export function clearAllDrafts(optionalUid?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LIST);
    localStorage.removeItem(STORAGE_KEY_SINGLE);
    window.dispatchEvent(new Event("printmart_drafts_updated"));

    const uid = optionalUid || auth.currentUser?.uid;
    if (uid) {
      pushDraftsToCloud(uid, []);
    }
  } catch (err) {
    console.warn("Error clearing drafts:", err);
  }
}

/**
 * Two-way real-time synchronization between Cloud (Firebase RTDB + /api/drafts) and local drafts.
 * Ensures drafts appear on other devices instantly whenever the user is logged in.
 */
export function syncDraftsWithCloud(uid: string): () => void {
  if (typeof window === "undefined" || !uid) return () => {};

  let isSubscribed = true;

  // 1. Initial fast sync via HTTP API
  fetch(`/api/drafts?uid=${encodeURIComponent(uid)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!isSubscribed || !data?.success) return;
      const cloudDrafts: PrintDraftItem[] = Array.isArray(data.drafts)
        ? data.drafts.map(sanitizeDraftItem)
        : [];

      const localDrafts = getStoredDrafts();
      const mergedMap = new Map<string, PrintDraftItem>();

      // Cloud drafts take precedence
      cloudDrafts.forEach((d) => mergedMap.set(d.id, d));

      // Merge local drafts that were created offline/before login
      let hasLocalOnly = false;
      localDrafts.forEach((d) => {
        if (!mergedMap.has(d.id)) {
          mergedMap.set(d.id, d);
          hasLocalOnly = true;
        }
      });

      const mergedList = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(mergedList));
      if (mergedList.length > 0) {
        localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify(mergedList[0]));
      }

      if (hasLocalOnly) {
        pushDraftsToCloud(uid, mergedList);
      }

      window.dispatchEvent(new Event("printmart_drafts_updated"));
    })
    .catch((err) => console.warn("Initial drafts fetch failed:", err));

  // 2. Real-time Firebase RTDB WebSocket listener for instant cross-device updates
  try {
    const draftsRef = ref(database, `users/${uid}/drafts`);
    const unsubscribeRtdb = onValue(
      draftsRef,
      (snapshot) => {
        if (!isSubscribed) return;
        const val = snapshot.val();
        let cloudList: PrintDraftItem[] = [];

        if (val) {
          if (Array.isArray(val)) {
            cloudList = val.filter(Boolean).map(sanitizeDraftItem);
          } else if (typeof val === "object") {
            cloudList = Object.values(val).map(sanitizeDraftItem);
          }
        }

        // Update local cache to match cloud state
        localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(cloudList));
        if (cloudList.length > 0) {
          localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify(cloudList[0]));
        } else {
          localStorage.removeItem(STORAGE_KEY_LIST);
          localStorage.removeItem(STORAGE_KEY_SINGLE);
        }

        window.dispatchEvent(new Event("printmart_drafts_updated"));
      },
      (err) => {
        console.warn("RTDB draft onValue subscription error:", err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribeRtdb();
    };
  } catch (err) {
    console.warn("Failed to subscribe to RTDB drafts:", err);
    return () => {
      isSubscribed = false;
    };
  }
}
