import fs from "fs";
import path from "path";
import crypto from "crypto";
import { app } from "electron";

export interface PreloadResult {
  jobId: string;
  cachedFilePath: string;
  success: boolean;
  error?: string;
}

export class PreloadAgent {
  private cacheDir: string;
  private serverUrl: string;
  private machineId: string;

  constructor(serverUrl: string, machineId: string) {
    this.serverUrl = serverUrl;
    this.machineId = machineId;

    // Local secure cache directory
    const userDataPath = app ? app.getPath("userData") : path.join(process.cwd(), ".cache");
    this.cacheDir = path.join(userDataPath, "spool_cache");
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Preloads document from server into secure local spool cache before OTP entry
   */
  async preloadJobDocument(jobId: string): Promise<PreloadResult> {
    const targetPath = path.join(this.cacheDir, `${jobId}.pdf`);

    // If already preloaded and cached, return immediately
    if (fs.existsSync(targetPath)) {
      return { jobId, cachedFilePath: targetPath, success: true };
    }

    try {
      const streamUrl = `${this.serverUrl}/api/machine/stream-doc?jobId=${encodeURIComponent(
        jobId
      )}&machineId=${encodeURIComponent(this.machineId)}`;

      const res = await fetch(streamUrl);
      if (!res.ok) {
        throw new Error(`Server rejected document stream: ${res.statusText}`);
      }

      const expectedSha256 = res.headers.get("x-document-sha256");
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Verify SHA-256 hash if provided
      if (expectedSha256) {
        const computedHash = crypto.createHash("sha256").update(buffer).digest("hex");
        if (computedHash.toLowerCase() !== expectedSha256.toLowerCase()) {
          throw new Error("Checksum mismatch on preloaded document");
        }
      }

      // Write to local temporary cache
      fs.writeFileSync(targetPath, buffer);

      return {
        jobId,
        cachedFilePath: targetPath,
        success: true,
      };
    } catch (err: any) {
      console.error(`Preload failed for job ${jobId}:`, err);
      return {
        jobId,
        cachedFilePath: targetPath,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Securely removes temporary cached PDF after print completion
   */
  cleanupJobFile(jobId: string): void {
    const targetPath = path.join(this.cacheDir, `${jobId}.pdf`);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (err) {
        console.warn("Cleanup file error:", err);
      }
    }
  }

  getCachedFilePath(jobId: string): string | null {
    const targetPath = path.join(this.cacheDir, `${jobId}.pdf`);
    return fs.existsSync(targetPath) ? targetPath : null;
  }
}

