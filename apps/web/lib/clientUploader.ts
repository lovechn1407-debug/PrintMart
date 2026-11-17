import { DocumentChunk, TELEGRAM_MAX_CHUNK_BYTES } from "@printmart/shared";

const TELEGRAM_BOT_TOKEN =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "9146606886:AAGGou_zK4EUwvDAZi6vp2cchjGZhcKO-B8";
const TELEGRAM_CHANNEL_ID =
  process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID || "-1004357170113";

export interface UploadProgressEvent {
  percent: number;
  statusText: string;
  loadedBytes: number;
  totalBytes: number;
  currentChunk: number;
  totalChunks: number;
}

/**
 * Computes SHA-256 hash using the Web Crypto API
 */
export async function computeFileSha256(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.warn("SHA-256 calculation fallback:", err);
    return "";
  }
}

/**
 * Client-side PDF page count estimation
 */
export async function estimatePdfPageCount(file: File): Promise<number> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return 1;
  }

  // 1. Try PDF.js if available on window
  try {
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib) {
      const sliceBuffer = await file.slice(0, Math.min(file.size, 15 * 1024 * 1024)).arrayBuffer();
      const p = await pdfjsLib.getDocument({ data: sliceBuffer }).promise;
      if (p?.numPages > 0) {
        return p.numPages;
      }
    }
  } catch {
    // Fallback to byte scanning
  }

  // 2. Scan header & trailer for page markers
  try {
    const headSlice = await file.slice(0, 300000).arrayBuffer();
    const tailSlice = await file.slice(Math.max(0, file.size - 300000)).arrayBuffer();
    const text =
      new TextDecoder("latin1").decode(headSlice) + " " + new TextDecoder("latin1").decode(tailSlice);

    const countMatch = text.match(/\/Count\s+(\d+)/);
    if (countMatch && countMatch[1]) {
      const count = parseInt(countMatch[1], 10);
      if (count > 0 && count < 5000) return count;
    }

    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  } catch {
    // Fallback default
  }

  return 1;
}

/**
 * Uploads a single chunk Blob to the Telegram Bot API via XMLHttpRequest for real-time progress
 */
function uploadChunkViaXhr(params: {
  chunkBlob: Blob;
  chunkFilename: string;
  caption: string;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<{ fileId: string; messageId: number; fileSizeBytes: number }> {
  const { chunkBlob, chunkFilename, caption, onProgress } = params;

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHANNEL_ID);
    formData.append("caption", caption);
    formData.append("document", chunkBlob, chunkFilename);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(evt.loaded, evt.total);
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.ok && res.result?.document) {
          resolve({
            fileId: res.result.document.file_id,
            messageId: res.result.message_id,
            fileSizeBytes: res.result.document.file_size || chunkBlob.size,
          });
        } else {
          reject(new Error(res.description || `Telegram upload failed with status ${xhr.status}`));
        }
      } catch {
        reject(new Error(`Invalid response from Telegram (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error during file upload to Telegram vault"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Telegram upload timed out. Please check your internet connection."));
    };

    xhr.send(formData);
  });
}

export interface UploadDocumentOptions {
  file: File;
  ownerUid?: string;
  maxFileSizeMb?: number;
  onProgress?: (event: UploadProgressEvent) => void;
}

/**
 * Uploads a document (up to 100MB) to the Telegram cloud vault in 20MB chunks,
 * tracking real-time progress across chunks, and registers metadata in /api/upload.
 */
export async function uploadDocumentInChunks(options: UploadDocumentOptions): Promise<any> {
  const { file, ownerUid = "anonymous", maxFileSizeMb = 100, onProgress } = options;

  const maxAllowedBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxAllowedBytes) {
    throw new Error(
      `"${file.name}" exceeds the maximum allowed limit of ${maxFileSizeMb}MB (${(
        file.size /
        (1024 * 1024)
      ).toFixed(1)}MB). Please select a file under ${maxFileSizeMb}MB.`
    );
  }

  // 1. Initial progress & parallel metadata analysis
  onProgress?.({
    percent: 3,
    statusText: `Preparing "${file.name}" for encrypted upload...`,
    loadedBytes: 0,
    totalBytes: file.size,
    currentChunk: 1,
    totalChunks: 1,
  });

  const [sha256Hex, estPages] = await Promise.all([
    computeFileSha256(file),
    estimatePdfPageCount(file),
  ]);

  const chunkSize = TELEGRAM_MAX_CHUNK_BYTES;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const chunksData: DocumentChunk[] = [];
  let bytesFromCompletedChunks = 0;

  // 2. Upload chunks to Telegram in order
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkBlob = file.slice(start, end, file.type || "application/octet-stream");
    const chunkName = totalChunks > 1 ? `${file.name}.part${i + 1}of${totalChunks}` : file.name;

    const caption =
      totalChunks > 1
        ? `PrintMart Vault: ${file.name} [Part ${i + 1}/${totalChunks}]\nSize: ${(
            chunkBlob.size /
            (1024 * 1024)
          ).toFixed(1)}MB\nTimestamp: ${new Date().toISOString()}`
        : `PrintMart Document Vault: ${file.name}\nTimestamp: ${new Date().toISOString()}`;

    const uploadedChunk = await uploadChunkViaXhr({
      chunkBlob,
      chunkFilename: chunkName,
      caption,
      onProgress: (chunkLoaded, chunkTotal) => {
        const currentTotalLoaded = bytesFromCompletedChunks + chunkLoaded;
        // Allocate 5% to 92% for byte upload
        const percent = Math.min(92, Math.max(5, Math.round((currentTotalLoaded / file.size) * 92)));
        const statusText =
          totalChunks > 1
            ? `Uploading ${file.name} (Part ${i + 1}/${totalChunks}) — ${percent}%`
            : `Uploading ${file.name} — ${percent}%`;

        onProgress?.({
          percent,
          statusText,
          loadedBytes: currentTotalLoaded,
          totalBytes: file.size,
          currentChunk: i + 1,
          totalChunks,
        });
      },
    });

    bytesFromCompletedChunks += chunkBlob.size;

    chunksData.push({
      chunkIndex: i,
      totalChunks,
      telegramFileId: uploadedChunk.fileId,
      telegramMessageId: uploadedChunk.messageId,
      fileSizeBytes: chunkBlob.size,
    });
  }

  // 3. Register document metadata with /api/upload
  onProgress?.({
    percent: 95,
    statusText: `Securing document in vault registry...`,
    loadedBytes: file.size,
    totalBytes: file.size,
    currentChunk: totalChunks,
    totalChunks,
  });

  const metaRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directUpload: true,
      telegramFileId: chunksData[0].telegramFileId,
      telegramMessageId: chunksData[0].telegramMessageId,
      chunks: chunksData.length > 1 ? chunksData : undefined,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
      pageCount: estPages,
      ownerUid,
      sha256: sha256Hex,
    }),
  });

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to register ${file.name}`);
  }

  const metaData = await metaRes.json();

  onProgress?.({
    percent: 100,
    statusText: `Ready for printing!`,
    loadedBytes: file.size,
    totalBytes: file.size,
    currentChunk: totalChunks,
    totalChunks,
  });

  return {
    ...metaData.document,
    pageCount: Math.max(metaData.document?.pageCount || 1, estPages),
  };
}
