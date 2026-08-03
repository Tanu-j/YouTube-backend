// import fs from "fs";
// import path from "path";

// const TEMP_DIR = path.join(process.cwd(), "temp");

// if (!fs.existsSync(TEMP_DIR)) {
//     fs.mkdirSync(TEMP_DIR, { recursive: true });
// }

// export function getTempPath(filename: string) {
//     return path.join(TEMP_DIR, filename);
// }

import path from "path";
import os from "os";
import fs from "fs";

const TEMP_DIR = path.join(os.tmpdir(), "yt-audio-cache");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export function getTempPath(name: string) {
    return path.join(TEMP_DIR, name);
}

// Deterministic path per (videoId, format, quality) so repeat downloads
// of the same track+settings hit an existing file instead of re-encoding.
export function getCachedFilePath(videoId: string, format: string, quality: string) {
    const safeVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
    return getTempPath(`${safeVideoId}-${format}-${quality}.${format}`);
}

// Best-effort cleanup, never throws.
export function safeUnlink(filePath: string) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Cleanup error:", filePath, e);
    }
}

// Files older than maxAgeMs get swept — prevents unbounded disk growth
// since the cache never expires entries on its own otherwise.
export function sweepOldCacheFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
        const now = Date.now();
        for (const file of fs.readdirSync(TEMP_DIR)) {
            const full = path.join(TEMP_DIR, file);
            const stat = fs.statSync(full);
            if (now - stat.mtimeMs > maxAgeMs) safeUnlink(full);
        }
    } catch (e) {
        console.error("Sweep error:", e);
    }
}