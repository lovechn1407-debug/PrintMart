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

export function getStoredDrafts(): PrintDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const rawList = localStorage.getItem(STORAGE_KEY_LIST);
    if (rawList) {
      const list = JSON.parse(rawList);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
    // Check legacy single draft
    const rawSingle = localStorage.getItem(STORAGE_KEY_SINGLE);
    if (rawSingle) {
      const s = JSON.parse(rawSingle);
      if (s && (s.documents || s.filename || s.originalFilename)) {
        const item: PrintDraftItem = {
          id: s.id || s.fileId || `draft_${s.timestamp || Date.now()}`,
          title: s.title || s.originalFilename || s.filename || "Print Draft",
          documents: s.documents || (s.fileId ? [{
            fileId: s.fileId,
            originalFilename: s.originalFilename || s.filename || "Document.pdf",
            fileSizeBytes: s.fileSizeBytes || 1024000,
            mimeType: s.mimeType || "application/pdf",
            pageCount: s.pageCount || 1,
            isColorDocument: s.isColorDocument || false,
            telegramFileId: s.telegramFileId || "tg_vault",
            previewUrl: s.previewUrl,
          }] : []),
          pageCount: s.pageCount || 1,
          previewUrl: s.previewUrl,
          mimeType: s.mimeType,
          createdAt: s.timestamp || Date.now(),
          config: s.config,
        };
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

export function saveOrUpdateDraft(draft: PrintDraftItem): PrintDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const drafts = getStoredDrafts();
    const existingIndex = drafts.findIndex((d) => d.id === draft.id);
    let updatedList: PrintDraftItem[];

    if (existingIndex >= 0) {
      updatedList = [...drafts];
      updatedList[existingIndex] = draft;
    } else {
      updatedList = [draft, ...drafts];
    }

    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updatedList));
    localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify(draft));
    window.dispatchEvent(new Event("printmart_drafts_updated"));
    return updatedList;
  } catch (err) {
    console.warn("Error saving draft:", err);
    return [];
  }
}

export function removeDraftById(id: string): PrintDraftItem[] {
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
    return updatedList;
  } catch (err) {
    console.warn("Error removing draft:", err);
    return [];
  }
}

export function clearAllDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LIST);
    localStorage.removeItem(STORAGE_KEY_SINGLE);
    window.dispatchEvent(new Event("printmart_drafts_updated"));
  } catch (err) {
    console.warn("Error clearing drafts:", err);
  }
}

