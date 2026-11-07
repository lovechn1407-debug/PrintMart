"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreloadAgent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const electron_1 = require("electron");
class PreloadAgent {
    cacheDir;
    serverUrl;
    machineId;
    constructor(serverUrl, machineId) {
        this.serverUrl = serverUrl;
        this.machineId = machineId;
        // Local secure cache directory
        const userDataPath = electron_1.app ? electron_1.app.getPath("userData") : path_1.default.join(process.cwd(), ".cache");
        this.cacheDir = path_1.default.join(userDataPath, "spool_cache");
        if (!fs_1.default.existsSync(this.cacheDir)) {
            fs_1.default.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    /**
     * Preloads document from server into secure local spool cache before OTP entry
     */
    async preloadJobDocument(jobId) {
        const targetPath = path_1.default.join(this.cacheDir, `${jobId}.pdf`);
        // If already preloaded and cached, return immediately
        if (fs_1.default.existsSync(targetPath)) {
            return { jobId, cachedFilePath: targetPath, success: true };
        }
        try {
            const streamUrl = `${this.serverUrl}/api/machine/stream-doc?jobId=${encodeURIComponent(jobId)}&machineId=${encodeURIComponent(this.machineId)}`;
            const res = await fetch(streamUrl);
            if (!res.ok) {
                throw new Error(`Server rejected document stream: ${res.statusText}`);
            }
            const expectedSha256 = res.headers.get("x-document-sha256");
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Verify SHA-256 hash if provided
            if (expectedSha256) {
                const computedHash = crypto_1.default.createHash("sha256").update(buffer).digest("hex");
                if (computedHash.toLowerCase() !== expectedSha256.toLowerCase()) {
                    throw new Error("Checksum mismatch on preloaded document");
                }
            }
            // Write to local temporary cache
            fs_1.default.writeFileSync(targetPath, buffer);
            return {
                jobId,
                cachedFilePath: targetPath,
                success: true,
            };
        }
        catch (err) {
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
    cleanupJobFile(jobId) {
        const targetPath = path_1.default.join(this.cacheDir, `${jobId}.pdf`);
        if (fs_1.default.existsSync(targetPath)) {
            try {
                fs_1.default.unlinkSync(targetPath);
            }
            catch (err) {
                console.warn("Cleanup file error:", err);
            }
        }
    }
    getCachedFilePath(jobId) {
        const targetPath = path_1.default.join(this.cacheDir, `${jobId}.pdf`);
        return fs_1.default.existsSync(targetPath) ? targetPath : null;
    }
}
exports.PreloadAgent = PreloadAgent;
