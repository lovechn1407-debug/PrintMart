const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "9146606886:AAGGou_zK4EUwvDAZi6vp2cchjGZhcKO-B8";
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "-1004357170113";

export interface TelegramUploadResult {
  messageId: number;
  fileId: string;
  fileUniqueId: string;
  fileSizeBytes: number;
}

/**
 * Uploads a document to the private Telegram vault channel using Telegram Bot API
 */
export async function uploadDocumentToTelegram(params: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<TelegramUploadResult> {
  const { fileBuffer, filename, mimeType } = params;

  const formData = new FormData();
  formData.append("chat_id", TELEGRAM_CHANNEL_ID);
  formData.append("caption", `PrintMart Document Vault: ${filename}\nTimestamp: ${new Date().toISOString()}`);

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

