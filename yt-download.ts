import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import axios from "axios";
import fs from "fs";
import { getStreamUrl } from "./services/stream-resolver";
import { getCdnRequestHeaders } from "./services/cdn-headers";
import {
    setDownloadProgress,
    markDownloadCompleted,
    markDownloadFailed,
} from "./services/download-progress";

export function getMime(format: string) {
    const types: Record<string, string> = {
        mp3: "audio/mpeg",
        opus: "audio/opus",
        m4a: "audio/mp4",
        flac: "audio/flac",
        wav: "audio/wav",
    };
    return types[format] || "application/octet-stream";
}

interface DownloadResult {
    title: string;
    thumbnail: string;
    duration?: number;
}

// Core: resolve the stream URL once (cache-aware), pull it via HTTP,
// pipe through ffmpeg only if a transcode is actually needed, write
// to outputPath. Cleans up on any failure so no partial files linger.
export async function downloadAudioToFile(
    videoId: string,
    outputPath: string,
    format = "mp3",
    quality = "0"
): Promise<DownloadResult> {
    const resolved = await getStreamUrl(videoId);

    // Source is already m4a/aac from yt-dlp's format selection.
    // If the caller wants m4a too, skip transcoding entirely — just
    // remux/copy, which is dramatically cheaper than re-encoding.
    const needsTranscode = format !== "m4a";

    // googlevideo.com CDN URLs get rejected with a 403 if the request
    // doesn't carry headers matching a real client — a bare axios.get
    // with no User-Agent fails even on a fresh, unexpired URL.
    const cdnHeaders = getCdnRequestHeaders();

    let response;
    try {
        response = await axios.get(resolved.url, {
            responseType: "stream",
            timeout: 15000, // connect/response timeout
            validateStatus: (s) => s === 200 || s === 206,
            headers: cdnHeaders,
        });
    } catch (err: any) {
        // Most likely cause: the resolved URL expired between resolution
        // and use. Force a fresh extraction once and retry.
        console.error("Stream fetch failed, refreshing URL:", err.message);
        const fresh = await getStreamUrl(videoId); // will re-extract since HEAD check failed
        response = await axios.get(fresh.url, {
            responseType: "stream",
            timeout: 15000,
            validateStatus: (s) => s === 200 || s === 206,
            headers: cdnHeaders,
        });
    }

    return new Promise<DownloadResult>((resolve, reject) => {
        let ffmpeg: ChildProcessWithoutNullStreams | null = null;
        let settled = false;

        // finish() no longer touches progress state directly — each
        // outcome path (success/failure) calls the matching atomic
        // mark* function itself, right before resolving/rejecting, so
        // status and progress always land together, never separately.
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        const sourceStream = response.data;

        sourceStream.on("error", (err: Error) => {
            console.error("Source stream error:", err.message);
            markDownloadFailed(videoId, err.message);
            finish(() => reject(err));
        });

        if (!needsTranscode) {
            // Pure remux — write bytes straight through, no CPU-bound encode.
            const writeStream = fs.createWriteStream(outputPath);
            let received = 0;

            sourceStream.on("data", (chunk: Buffer) => {
                received += chunk.length;
                // We don't have total size reliably from a range-less GET;
                // report indeterminate progress as a heartbeat instead.
                setDownloadProgress(videoId, Math.min(95, Math.floor(received / 1024 / 50)));
            });

            writeStream.on("error", (err) => {
                markDownloadFailed(videoId, err.message);
                finish(() => reject(err));
            });
            writeStream.on("finish", () => {
                // Atomic: progress:100 + status:"completed" written together.
                markDownloadCompleted(videoId);
                finish(() => resolve({ title: resolved.title, thumbnail: resolved.thumbnail }));
            });

            sourceStream.pipe(writeStream);
            return;
        }

        // Transcode path (e.g. mp3 output).
        ffmpeg = spawn("ffmpeg", [
            "-i", "pipe:0",
            "-vn",
            "-codec:a", format === "mp3" ? "libmp3lame" : "copy",
            "-b:a", quality === "0" ? "320k" : `${quality}k`,
            "-y",
            outputPath,
        ]);

        let ffmpegStderr = "";
        ffmpeg.stderr.on("data", (d: Buffer) => {
            const text = d.toString();
            ffmpegStderr += text.slice(-2000); // keep buffer bounded
            const match = text.match(/time=(\d{2}):(\d{2}):(\d{2})/);
            if (match && resolved.duration) {
                const seconds = +match[1] * 3600 + +match[2] * 60 + +match[3];
                const pct = Math.min(99, Math.floor((seconds / resolved.duration) * 100));
                setDownloadProgress(videoId, pct);
            }
        });

        ffmpeg.on("error", (err) => {
            console.error("ffmpeg spawn error:", err.message);
            markDownloadFailed(videoId, err.message);
            finish(() => reject(err));
        });

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                // Atomic: progress:100 + status:"completed" written together.
                markDownloadCompleted(videoId);
                finish(() => resolve({ title: resolved.title, thumbnail: resolved.thumbnail }));
            } else {
                console.error("ffmpeg failed:", ffmpegStderr.slice(-500));
                markDownloadFailed(videoId, `ffmpeg exited ${code}`);
                finish(() => reject(new Error(`ffmpeg exited ${code}`)));
            }
        });

        ffmpeg.stdin.on("error", (err: Error) => {
            // EPIPE etc. — usually harmless if the process already errored,
            // but log it in case it's the real cause.
            console.error("ffmpeg stdin error:", err.message);
        });

        sourceStream.pipe(ffmpeg.stdin);
    });
}

// Streaming variant for direct HTTP passthrough (no disk write, no
// progress-file cache) — use when you want bytes to reach the client
// as early as possible and don't need embedded ID3 tags.
export function downloadAudioStream(
    videoId: string,
    format: string = "mp3",
    quality: string = "0"
) {
    // Kept simple/synchronous-looking for the route: the route awaits
    // getStreamUrl itself and passes the resolved URL in here via a
    // wrapping async function — see dt-route.ts.
    throw new Error("Use downloadAudioStreamFromUrl(streamUrl, format, quality) instead");
}

export function downloadAudioStreamFromUrl(
    streamUrl: string,
    format: string = "mp3",
    quality: string = "0"
) {
    if (format === "m4a") {
        // No ffmpeg needed — caller should pipe the HTTP response directly.
        return null;
    }

    const ffmpeg = spawn("ffmpeg", [
        "-i", "pipe:0",
        "-f", format,
        "-vn",
        "-codec:a", format === "mp3" ? "libmp3lame" : "copy",
        "-b:a", quality === "0" ? "320k" : `${quality}k`,
        "pipe:1",
    ]);

    ffmpeg.stderr.on("data", (d: Buffer) => {
        // Keep for debugging but don't spam logs at info level.
        if (process.env.DEBUG_FFMPEG) console.log("FFMPEG:", d.toString());
    });

    ffmpeg.on("error", (err) => console.error("ffmpeg spawn error:", err.message));

    return ffmpeg;
}
