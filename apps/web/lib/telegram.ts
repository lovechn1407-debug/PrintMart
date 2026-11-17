import { DocumentChunk, TELEGRAM_MAX_CHUNK_BYTES } from "@printmart/shared";

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "9146606886:AAGGou_zK4EUwvDAZi6vp2cchjGZhcKO-B8";
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "-1004357170113";

export interface TelegramUploadResult {
  messageId: number;
  fileId: string;
  fileUniqueId: string;
  fileSizeBytes: number;
  chunkIndex?: number;
  totalChunks?: number;
}

/**
 * Uploads a document or chunk buffer to the private Telegram vault channel using Telegram Bot API
 */
export async function uploadDocumentToTelegram(params: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  caption?: string;
}): Promise<TelegramUploadResult> {
  const { fileBuffer, filename, mimeType, caption } = params;

  const formData = new FormData();
  formData.append("chat_id", TELEGRAM_CHANNEL_ID);
  formData.append(
    "caption",
    caption || `PrintMart Document Vault: ${filename}\nTimestamp: ${new Date().toISOString()}`
  );

  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append("document", blob, filename);

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Telegram returned non-JSON response (${response.status}): ${text.slice(0, 150)}`
    );
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram upload failed: ${data.description || response.statusText || "Unknown error"}`
    );
  }

  const doc = data.result.document;
  return {
    messageId: data.result.message_id,
    fileId: doc.file_id,
    fileUniqueId: doc.file_unique_id,
    fileSizeBytes: doc.file_size,
  };
}

/**
 * Uploads a large buffer in 20MB chunks to Telegram
 */
export async function uploadBufferInChunksToTelegram(params: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<{
  chunks: DocumentChunk[];
  primaryFileId: string;
  primaryMessageId: number;
}> {
  const { fileBuffer, filename, mimeType } = params;
  const chunkSize = TELEGRAM_MAX_CHUNK_BYTES;
  const totalChunks = Math.max(1, Math.ceil(fileBuffer.length / chunkSize));
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(fileBuffer.length, start + chunkSize);
    const chunkSlice = fileBuffer.subarray(start, end);
    const chunkName = totalChunks > 1 ? `${filename}.part${i + 1}of${totalChunks}` : filename;
    const caption = totalChunks > 1
      ? `PrintMart Vault: ${filename} [Part ${i + 1}/${totalChunks}]\nSize: ${(chunkSlice.length / (1024 * 1024)).toFixed(1)}MB\nTimestamp: ${new Date().toISOString()}`
      : `PrintMart Document Vault: ${filename}\nTimestamp: ${new Date().toISOString()}`;

    const uploaded = await uploadDocumentToTelegram({
      fileBuffer: chunkSlice,
      filename: chunkName,
      mimeType,
      caption,
    });

    chunks.push({
      chunkIndex: i,
      totalChunks,
      telegramFileId: uploaded.fileId,
      telegramMessageId: uploaded.messageId,
      fileSizeBytes: chunkSlice.length,
    });
  }

  return {
    chunks,
    primaryFileId: chunks[0].telegramFileId,
    primaryMessageId: chunks[0].telegramMessageId || 0,
  };
}

/**
 * Resolves a Telegram fileId to its direct file path for download
 */
export async function getTelegramFileDownloadUrl(fileId: string): Promise<string> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const response = await fetch(url);
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Telegram getFile returned non-JSON (${response.status}): ${text.slice(0, 150)}`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram getFile failed: ${data.description || "Unknown error"}`);
  }

  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
}

/**
 * Downloads and reassembles a document (handles both single-file and chunked documents)
 */
export async function downloadTelegramDocument(doc: {
  telegramFileId?: string;
  chunks?: DocumentChunk[];
}): Promise<Buffer> {
  // If multi-chunk document, download chunks in parallel and concatenate
  if (doc.chunks && doc.chunks.length > 1) {
    const sortedChunks = [...doc.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const downloadedChunks = await Promise.all(
      sortedChunks.map(async (chunk) => {
        const downloadUrl = await getTelegramFileDownloadUrl(chunk.telegramFileId);
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          throw new Error(
            `Failed to download chunk ${chunk.chunkIndex + 1}/${sortedChunks.length}: ${res.statusText}`
          );
        }
        const ab = await res.arrayBuffer();
        return {
          chunkIndex: chunk.chunkIndex,
          buffer: Buffer.from(ab),
        };
      })
    );

    // Re-verify ordering by chunkIndex before concatenation
    downloadedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    return Buffer.concat(downloadedChunks.map((c) => c.buffer));
  }

  // Single chunk or legacy document
  const fileId = doc.telegramFileId || (doc.chunks && doc.chunks[0]?.telegramFileId);
  if (!fileId) {
    throw new Error("No Telegram fileId found for document");
  }

  const downloadUrl = await getTelegramFileDownloadUrl(fileId);
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to download file from Telegram storage: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
