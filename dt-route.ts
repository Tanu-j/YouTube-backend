
// // import express from "express";
// // import { downloadAudioStream, downloadAudioToFile, getMime } from "./yt-download";
// // import { getTempPath } from "./utils/temp-file";
// // import { writeMetadata } from "./services/id3-service";
// // import { downloadArtwork } from "./services/artwork-service";
// // import { v4 as uuid } from "uuid";
// // import fs from "fs";
// // import {
// //     downloadProgress,
// //     getDownloadProgress
// // } from "./services/download-progress";
// // const router = express.Router();


// // // router.get(
// // //     "/download/:videoId",
// // //     async (req, res) => {

// // //         try {

// // //             const stream =
// // //                 downloadAudioStream(
// // //                     req.params.videoId
// // //                 );


// // //             res.setHeader(
// // //                 "Content-Type",
// // //                 "audio/mpeg"
// // //             );


// // //             res.setHeader(
// // //                 "Content-Disposition",
// // //                 `attachment; filename="${req.params.videoId}.mp3"`
// // //             );


// // //             stream.on(
// // //                 "error",
// // //                 err => {

// // //                     console.error(err);

// // //                     if (!res.headersSent) {
// // //                         res.status(500).json({
// // //                             error: "download failed"
// // //                         });
// // //                     }

// // //                 }
// // //             );


// // //             res.setHeader(
// // //                 "Content-Type",
// // //                 "audio/mpeg"
// // //             );


// // //             res.setHeader(
// // //                 "Content-Disposition",
// // //                 `attachment; filename="${req.params.videoId}.mp3"`
// // //             );


// // //             stream.pipe(res);


// // //         } catch (error: any) {

// // //             console.error(error);

// // //             res.status(500).json({
// // //                 error: error.message
// // //             });

// // //         }

// // //     }
// // // );

// // router.get(
// //     "/test-download/:videoId",
// //     async (req, res) => {

// //         const mp3File =
// //             getTempPath("test.mp3");

// //         const artworkFile =
// //             getTempPath("test.jpg");

// //         await downloadAudioToFile(
// //             req.params.videoId,
// //             mp3File
// //         );

// //         await downloadArtwork(
// //             "https://i.ytimg.com/vi/ESORouDblNg/hqdefault.jpg",
// //             artworkFile
// //         );

// //         await writeMetadata(
// //             mp3File,
// //             "One Two",
// //             "Future",
// //             artworkFile
// //         );

// //         res.send("done");
// //     }
// // );

// // // router.get(
// // //     "/download/:videoId",
// // //     async (req, res) => {

// // //         console.log("DOWNLOAD REQUEST", {
// // //             title: req.query.title,
// // //             artist: req.query.artist,
// // //             artwork: req.query.artwork,
// // //           });

// // //         const {
// // //             format = "mp3",
// // //             quality = "0"
// // //         } = req.query;


// // //         const stream =
// // //             downloadAudioStream(
// // //                 req.params.videoId,
// // //                 String(format),
// // //                 String(quality)
// // //             );

// // //         const mime = getMime(String(format));

// // //         res.setHeader(
// // //             "Content-Type",
// // //             mime
// // //         );

// // //         res.setHeader(
// // //             "Accept-Ranges",
// // //             "bytes"
// // //         )

// // //         res.setHeader(
// // //             "Content-Disposition",
// // //             `attachment; filename="${req.params.videoId}.${format}"`
// // //         );


// // //         stream.pipe(res);

// // //     }


// // // );
// // router.get(
// //     "/download-progress/:videoId",
// //     (req, res) => {
// //         console.log(
// //             "PROGRESS MAP",
// //             Array.from(downloadProgress.entries())
// //         );
// //         const progress =
// //             getDownloadProgress(
// //                 req.params.videoId
// //             );

// //         res.json({
// //             progress
// //         });

// //     }
// // );
// // router.get(
// //     "/download/:videoId",
// //     async (req, res) => {

// //         try {

// //             const {
// //                 format = "mp3",
// //                 quality = "0",
// //                 title = "",
// //                 artist = "",
// //                 artwork = ""
// //             } = req.query;

// //             const id = uuid();

// //             const mp3File =
// //                 getTempPath(
// //                     `${id}.${format}`
// //                 );

// //             const artworkFile =
// //                 getTempPath(
// //                     `${id}.jpg`
// //                 );

// //             const cleanup = () => {

// //                 try {

// //                     if (fs.existsSync(mp3File)) {
// //                         fs.unlinkSync(mp3File);
// //                     }

// //                     if (fs.existsSync(artworkFile)) {
// //                         fs.unlinkSync(artworkFile);
// //                     }

// //                 } catch (e) {

// //                     console.error(
// //                         "Cleanup error",
// //                         e
// //                     );

// //                 }

// //             };

// //             await downloadAudioToFile(
// //                 req.params.videoId,
// //                 mp3File,
// //                 String(format),
// //                 String(quality)
// //             );

// //             // if (
// //             //     artwork &&
// //             //     typeof artwork === "string"
// //             // ) {

// //             //     await downloadArtwork(
// //             //         artwork,
// //             //         artworkFile
// //             //     );

// //             // }

// //             const artworkUrl =
// //                 artwork && typeof artwork === "string"
// //                     ? artwork
// //                     : `https://i.ytimg.com/vi/${req.params.videoId}/hqdefault.jpg`;

// //             await downloadArtwork(
// //                 artworkUrl,
// //                 artworkFile
// //             );

// //             await writeMetadata(
// //                 mp3File,
// //                 String(title),
// //                 String(artist),
// //                 fs.existsSync(artworkFile)
// //                     ? artworkFile
// //                     : undefined
// //             );

// //             const safeTitle =
// //                 String(title || req.params.videoId)
// //                     .replace(/[<>:"/\\|?*]/g, "")
// //                     .trim();


// //             res.download(
// //                 mp3File,
// //                 `${safeTitle}.${format}`,
// //                 (err) => {

// //                     try {

// //                         if (
// //                             fs.existsSync(
// //                                 mp3File
// //                             )
// //                         ) {

// //                             fs.unlinkSync(
// //                                 mp3File
// //                             );

// //                         }

// //                         if (
// //                             fs.existsSync(
// //                                 artworkFile
// //                             )
// //                         ) {

// //                             fs.unlinkSync(
// //                                 artworkFile
// //                             );

// //                         }

// //                     } catch (e) {

// //                         console.error(
// //                             "Cleanup error",
// //                             e
// //                         );

// //                     }

// //                     if (err) {

// //                         console.error(
// //                             err
// //                         );

// //                     }

// //                 }
// //             );

// //         } catch (error) {

// //             console.error(
// //                 error
// //             );

// //             res.status(500).json({
// //                 error:
// //                     "Failed to create download"
// //             });

// //         }

// //     }
// // );

// // export default router;

// import express from "express";
// import axios from "axios";
// import fs from "fs";
// import {
//     downloadAudioToFile,
//     downloadAudioStreamFromUrl,
//     getMime,
// } from "./yt-download";
// import { getStreamUrl } from "./services/stream-resolver";
// import { getCachedFilePath, safeUnlink } from "./utils/temp-file";
// import { writeMetadata } from "./services/id3-service";
// import { downloadArtwork } from "./services/artwork-service";
// import { getTempPath } from "./utils/temp-file";
// import { v4 as uuid } from "uuid";
// import {
//     downloadProgress,
//     getDownloadProgress,
// } from "./services/download-progress";

// const router = express.Router();

// const isValidVideoId = (id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id);
// const ALLOWED_FORMATS = new Set(["mp3", "m4a", "opus", "flac", "wav"]);

// function sanitizeFilename(name: string) {
//     return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim().slice(0, 150) || "track";
// }

// router.get("/download-progress/:videoId", (req, res) => {
//     if (!isValidVideoId(req.params.videoId)) {
//         return res.status(400).json({ success: false, error: "Invalid video id" });
//     }
//     const progress = getDownloadProgress(req.params.videoId);
//     res.json({ progress });
// });

// router.get("/download/:videoId", async (req, res) => {
//     const { videoId } = req.params;

//     if (!isValidVideoId(videoId)) {
//         return res.status(400).json({ success: false, error: "Invalid video id" });
//     }

//     const format = String(req.query.format || "mp3");
//     const quality = String(req.query.quality || "0");
//     const titleParam = String(req.query.title || "");
//     const artistParam = String(req.query.artist || "");
//     const artworkParam = String(req.query.artwork || "");

//     if (!ALLOWED_FORMATS.has(format)) {
//         return res.status(400).json({ success: false, error: "Unsupported format" });
//     }

//     // Reuse an already-built file for this exact videoId+format+quality
//     // combo — skips extraction, transcode, and metadata writing entirely.
//     const cachedFile = getCachedFilePath(videoId, format, quality);
//     if (fs.existsSync(cachedFile)) {
//         const safeTitle = sanitizeFilename(titleParam || videoId);
//         return res.download(cachedFile, `${safeTitle}.${format}`, (err) => {
//             if (err) console.error("res.download (cache) error:", err.message);
//         });
//     }

//     const id = uuid();
//     const workingFile = getTempPath(`${id}.${format}`);
//     const artworkFile = getTempPath(`${id}.jpg`);
//     let responded = false;

//     const cleanup = () => {
//         safeUnlink(workingFile);
//         safeUnlink(artworkFile);
//     };

//     // Hard ceiling so a hung yt-dlp/ffmpeg/axios call can't hold the
//     // request (and the client's connection) open indefinitely.
//     const timeoutMs = 5 * 60 * 1000;
//     const timeout = setTimeout(() => {
//         if (!responded) {
//             responded = true;
//             cleanup();
//             if (!res.headersSent) {
//                 res.status(504).json({ success: false, error: "Download timed out" });
//             }
//         }
//     }, timeoutMs);

//     req.on("close", () => {
//         // Client disconnected early — nothing more to do, but don't leak
//         // the temp file if the download never completed.
//         if (!responded) {
//             responded = true;
//             clearTimeout(timeout);
//             cleanup();
//         }
//     });

//     try {
//         const [downloadResult] = await Promise.all([
//             downloadAudioToFile(videoId, workingFile, format, quality),
//             (async () => {
//                 const artworkUrl =
//                     artworkParam && typeof artworkParam === "string"
//                         ? artworkParam
//                         : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
//                 try {
//                     await downloadArtwork(artworkUrl, artworkFile);
//                 } catch (err: any) {
//                     // Missing artwork shouldn't fail the whole download.
//                     console.error("Artwork download failed (continuing):", err.message);
//                 }
//             })(),
//         ]);

//         clearTimeout(timeout);
//         if (responded) return; // client already disconnected

//         const finalTitle = titleParam || downloadResult.title || videoId;
//         const finalArtist = artistParam || "";

//         try {
//             await writeMetadata(
//                 workingFile,
//                 finalTitle,
//                 finalArtist,
//                 fs.existsSync(artworkFile) ? artworkFile : undefined
//             );
//         } catch (err: any) {
//             // Tagging failure shouldn't lose the audio the user already waited for.
//             console.error("Metadata write failed (sending untagged file):", err.message);
//         }

//         // Promote to the deterministic cache path so future requests for
//         // the same videoId+format+quality are instant.
//         try {
//             fs.renameSync(workingFile, cachedFile);
//         } catch (err: any) {
//             console.error("Cache promotion failed, serving from temp path:", err.message);
//         }

//         const finalPath = fs.existsSync(cachedFile) ? cachedFile : workingFile;
//         const safeTitle = sanitizeFilename(finalTitle);

//         responded = true;
//         res.download(finalPath, `${safeTitle}.${format}`, (err) => {
//             if (err) console.error("res.download error:", err.message);
//             // Only clean up the non-cached path — the cache file should persist.
//             if (finalPath === workingFile) safeUnlink(workingFile);
//             safeUnlink(artworkFile);
//         });
//     } catch (error: any) {
//         clearTimeout(timeout);
//         console.error("Download pipeline error:", error.message);
//         cleanup();

//         if (!responded && !res.headersSent) {
//             responded = true;
//             const status = error.message === "NO_STREAM_URL" ? 404 : 500;
//             res.status(status).json({
//                 success: false,
//                 error: status === 404 ? "Audio not available for this video" : "Failed to create download",
//             });
//         }
//     }
// });

// // Direct-stream variant: no disk write, no ID3 tags, bytes reach the
// // client as soon as ffmpeg/axios produce them. Use when the client
// // doesn't need embedded metadata and wants the fastest possible start.
// router.get("/download-stream/:videoId", async (req, res) => {
//     const { videoId } = req.params;
//     if (!isValidVideoId(videoId)) {
//         return res.status(400).json({ success: false, error: "Invalid video id" });
//     }

//     const format = String(req.query.format || "m4a");
//     if (!ALLOWED_FORMATS.has(format)) {
//         return res.status(400).json({ success: false, error: "Unsupported format" });
//     }
//     const quality = String(req.query.quality || "0");

//     try {
//         const resolved = await getStreamUrl(videoId);

//         res.setHeader("Content-Type", getMime(format));
//         res.setHeader("Content-Disposition", `attachment; filename="${videoId}.${format}"`);

//         if (format === "m4a") {
//             // No transcode needed — pipe the CDN response straight through.
//             const upstream = await axios.get(resolved.url, { responseType: "stream", timeout: 15000 });
//             upstream.data.on("error", (err: Error) => {
//                 console.error("Upstream stream error:", err.message);
//                 if (!res.headersSent) res.status(502).end();
//             });
//             req.on("close", () => upstream.data.destroy());
//             upstream.data.pipe(res);
//             return;
//         }

//         const ffmpegProc = downloadAudioStreamFromUrl(resolved.url, format, quality);
//         if (!ffmpegProc) {
//             return res.status(500).json({ success: false, error: "Transcode setup failed" });
//         }

//         const upstream = await axios.get(resolved.url, { responseType: "stream", timeout: 15000 });
//         upstream.data.on("error", (err: Error) => {
//             console.error("Upstream stream error:", err.message);
//             ffmpegProc.kill("SIGKILL");
//         });

//         req.on("close", () => {
//             upstream.data.destroy();
//             ffmpegProc.kill("SIGKILL");
//         });

//         ffmpegProc.stdout.on("error", (err: Error) => console.error("ffmpeg stdout error:", err.message));
//         ffmpegProc.on("close", (code) => {
//             if (code !== 0 && !res.writableEnded) {
//                 console.error("ffmpeg exited", code);
//             }
//         });

//         upstream.data.pipe(ffmpegProc.stdin);
//         ffmpegProc.stdout.pipe(res);
//     } catch (error: any) {
//         console.error("Stream download error:", error.message);
//         if (!res.headersSent) {
//             const status = error.message === "NO_STREAM_URL" ? 404 : 500;
//             res.status(status).json({ success: false, error: "Failed to stream download" });
//         }
//     }
// });

// export default router;

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

        if (format === "m4a") {
            // No transcode needed — pipe the CDN response straight through.
            const upstream = await axios.get(resolved.url, { responseType: "stream", timeout: 15000 });
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

        const upstream = await axios.get(resolved.url, { responseType: "stream", timeout: 15000 });
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