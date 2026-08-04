import express from "express";
import axios from "axios";
import fs from "fs";
import {
    downloadAudioToFile,
    downloadAudioStreamFromUrl,
    getMime,
} from "./yt-download";
import { getStreamUrl } from "./services/stream-resolver";
import { getCachedFilePath, safeUnlink } from "./utils/temp-file";
import { writeMetadata } from "./services/id3-service";
import { downloadArtwork } from "./services/artwork-service";
import { getTempPath } from "./utils/temp-file";
import { v4 as uuid } from "uuid";
import { getDownloadRecord } from "./services/download-progress";
import { getCdnRequestHeaders } from "./services/cdn-headers";

const router = express.Router();

const isValidVideoId = (id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id);
const ALLOWED_FORMATS = new Set(["mp3", "m4a", "opus", "flac", "wav"]);

function sanitizeFilename(name: string) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim().slice(0, 150) || "track";
}

router.get("/download-progress/:videoId", (req, res) => {
    if (!isValidVideoId(req.params.videoId)) {
        return res.status(400).json({ success: false, error: "Invalid video id" });
    }

    // Read progress and status together from the same atomic record —
    // never two separate lookups that could observe different points
    // in time (that mismatch was the root cause of progress:0 showing
    // up alongside status:"completed" on the client).
    const record = getDownloadRecord(req.params.videoId);

    if (!record) {
        // No record yet (not started) or already pruned after TTL —
        // treat as "not currently tracked" rather than assuming failure.
        return res.json({ progress: 0, status: "downloading" });
    }

    res.json({
        progress: record.progress,
        status: record.status,
        ...(record.error ? { error: record.error } : {}),
    });
});

router.get("/download/:videoId", async (req, res) => {
    const { videoId } = req.params;

    if (!isValidVideoId(videoId)) {
        return res.status(400).json({ success: false, error: "Invalid video id" });
    }

    const format = String(req.query.format || "mp3");
    const quality = String(req.query.quality || "0");
    const titleParam = String(req.query.title || "");
    const artistParam = String(req.query.artist || "");
    const artworkParam = String(req.query.artwork || "");

    if (!ALLOWED_FORMATS.has(format)) {
        return res.status(400).json({ success: false, error: "Unsupported format" });
    }

    // Reuse an already-built file for this exact videoId+format+quality
    // combo — skips extraction, transcode, and metadata writing entirely.
    const cachedFile = getCachedFilePath(videoId, format, quality);
    if (fs.existsSync(cachedFile)) {
        const safeTitle = sanitizeFilename(titleParam || videoId);
        return res.download(cachedFile, `${safeTitle}.${format}`, (err) => {
            if (err) console.error("res.download (cache) error:", err.message);
        });
    }

    const id = uuid();
    const workingFile = getTempPath(`${id}.${format}`);
    const artworkFile = getTempPath(`${id}.jpg`);
    let responded = false;

    const cleanup = () => {
        safeUnlink(workingFile);
        safeUnlink(artworkFile);
    };

    // Hard ceiling so a hung yt-dlp/ffmpeg/axios call can't hold the
    // request (and the client's connection) open indefinitely.
    const timeoutMs = 5 * 60 * 1000;
    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            cleanup();
            if (!res.headersSent) {
                res.status(504).json({ success: false, error: "Download timed out" });
            }
        }
    }, timeoutMs);

    req.on("close", () => {
        // Client disconnected early — nothing more to do, but don't leak
        // the temp file if the download never completed.
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            cleanup();
        }
    });

    try {
        const [downloadResult] = await Promise.all([
            downloadAudioToFile(videoId, workingFile, format, quality),
            (async () => {
                const artworkUrl =
                    artworkParam && typeof artworkParam === "string"
                        ? artworkParam
                        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                try {
                    await downloadArtwork(artworkUrl, artworkFile);
                } catch (err: any) {
                    // Missing artwork shouldn't fail the whole download.
                    console.error("Artwork download failed (continuing):", err.message);
                }
            })(),
        ]);

        clearTimeout(timeout);
        if (responded) return; // client already disconnected

        const finalTitle = titleParam || downloadResult.title || videoId;
        const finalArtist = artistParam || "";

        try {
            await writeMetadata(
                workingFile,
                finalTitle,
                finalArtist,
                fs.existsSync(artworkFile) ? artworkFile : undefined
            );
        } catch (err: any) {
            // Tagging failure shouldn't lose the audio the user already waited for.
            console.error("Metadata write failed (sending untagged file):", err.message);
        }

        // Promote to the deterministic cache path so future requests for
        // the same videoId+format+quality are instant.
        try {
            fs.renameSync(workingFile, cachedFile);
        } catch (err: any) {
            console.error("Cache promotion failed, serving from temp path:", err.message);
        }

        const finalPath = fs.existsSync(cachedFile) ? cachedFile : workingFile;
        const safeTitle = sanitizeFilename(finalTitle);

        responded = true;
        res.download(finalPath, `${safeTitle}.${format}`, (err) => {
            if (err) console.error("res.download error:", err.message);
            // Only clean up the non-cached path — the cache file should persist.
            if (finalPath === workingFile) safeUnlink(workingFile);
            safeUnlink(artworkFile);
        });
    } catch (error: any) {
        clearTimeout(timeout);
        console.error("Download pipeline error:", error.message);
        cleanup();

        if (!responded && !res.headersSent) {
            responded = true;
            const status = error.message === "NO_STREAM_URL" ? 404 : 500;
            res.status(status).json({
                success: false,
                error: status === 404 ? "Audio not available for this video" : "Failed to create download",
            });
        }
    }
});

// Direct-stream variant: no disk write, no ID3 tags, bytes reach the
// client as soon as ffmpeg/axios produce them. Use when the client
// doesn't need embedded metadata and wants the fastest possible start.
router.get("/download-stream/:videoId", async (req, res) => {
    const { videoId } = req.params;
    if (!isValidVideoId(videoId)) {
        return res.status(400).json({ success: false, error: "Invalid video id" });
    }

    const format = String(req.query.format || "m4a");
    if (!ALLOWED_FORMATS.has(format)) {
        return res.status(400).json({ success: false, error: "Unsupported format" });
    }
    const quality = String(req.query.quality || "0");

    try {
        const resolved = await getStreamUrl(videoId);

        res.setHeader("Content-Type", getMime(format));
        res.setHeader("Content-Disposition", `attachment; filename="${videoId}.${format}"`);

        // googlevideo.com CDN URLs 403 on a bare request with no
        // headers — attach the same client-matching headers used for
        // downloadAudioToFile so this route doesn't regress the same way.
        const cdnHeaders = getCdnRequestHeaders();

        if (format === "m4a") {
            // No transcode needed — pipe the CDN response straight through.
            const upstream = await axios.get(resolved.url, {
                responseType: "stream",
                timeout: 15000,
                headers: cdnHeaders,
            });
            upstream.data.on("error", (err: Error) => {
                console.error("Upstream stream error:", err.message);
                if (!res.headersSent) res.status(502).end();
            });
            req.on("close", () => upstream.data.destroy());
            upstream.data.pipe(res);
            return;
        }

        const ffmpegProc = downloadAudioStreamFromUrl(resolved.url, format, quality);
        if (!ffmpegProc) {
            return res.status(500).json({ success: false, error: "Transcode setup failed" });
        }

        const upstream = await axios.get(resolved.url, {
            responseType: "stream",
            timeout: 15000,
            headers: cdnHeaders,
        });
        upstream.data.on("error", (err: Error) => {
            console.error("Upstream stream error:", err.message);
            ffmpegProc.kill("SIGKILL");
        });

        req.on("close", () => {
            upstream.data.destroy();
            ffmpegProc.kill("SIGKILL");
        });

        ffmpegProc.stdout.on("error", (err: Error) => console.error("ffmpeg stdout error:", err.message));
        ffmpegProc.on("close", (code) => {
            if (code !== 0 && !res.writableEnded) {
                console.error("ffmpeg exited", code);
            }
        });

        upstream.data.pipe(ffmpegProc.stdin);
        ffmpegProc.stdout.pipe(res);
    } catch (error: any) {
        console.error("Stream download error:", error.message);
        if (!res.headersSent) {
            const status = error.message === "NO_STREAM_URL" ? 404 : 500;
            res.status(status).json({ success: false, error: "Failed to stream download" });
        }
    }
});

export default router;
