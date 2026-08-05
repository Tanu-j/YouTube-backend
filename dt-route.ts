import express, {
    Request,
    Response,
} from "express";

import axios from "axios";
import rateLimit from "express-rate-limit";
import fs from "fs";
import { v4 as uuid } from "uuid";

import {
    httpsAgent,
} from "./services/http-agents";

import {
    downloadAudioToFile,
    downloadAudioStreamFromUrl,
    getMime,
} from "./yt-download";

import {
    getStreamUrl,
} from "./services/stream-resolver";

import {
    getCachedFilePath,
    getTempPath,
    safeUnlink,
} from "./utils/temp-file";

import {
    writeMetadata,
} from "./services/id3-service";

import {
    downloadArtwork,
} from "./services/artwork-service";

import {
    getDownloadRecord,
} from "./services/download-progress";

import {
    getCdnRequestHeaders,
} from "./services/cdn-headers";

const router =
    express.Router();

const ALLOWED_FORMATS =
    new Set([
        "mp3",
        "m4a",
        "opus",
        "flac",
        "wav",
    ]);

/**
 * Progress polling is read-only and needs to be checked frequently
 * (e.g. every second) per active download, so it gets a much higher
 * ceiling than the rest of the API instead of sharing the global limiter.
 */
const progressLimiter =
    rateLimit({
        windowMs: 60 * 1000,
        max: 600,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: "Too many requests",
        },
    });

function isValidVideoId(
    id: string
): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(
        id
    );
}
function getParamString(
    value: string | string[] | undefined
): string {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return value[0] ?? "";
    }

    return "";
}
/**
 * Express query parameters can be:
 *
 * string
 * string[]
 * ParsedQs
 * ParsedQs[]
 *
 * Never pass req.query values directly
 * into functions requiring string.
 */
function queryString(
    value: unknown,
    fallback = ""
): string {
    if (
        typeof value === "string"
    ) {
        return value;
    }

    if (
        Array.isArray(value)
    ) {
        const first =
            value[0];

        return typeof first ===
            "string"
            ? first
            : fallback;
    }

    return fallback;
}

function sanitizeFilename(
    name: string
): string {
    return (
        name
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                ""
            )
            .trim()
            .slice(0, 150) ||
        "track"
    );
}

/**
 * Open CDN stream using the same headers
 * that are required for Railway/YouTube CDN.
 *
 * If the cached URL returns 403/410,
 * force one fresh yt-dlp extraction.
 */
async function fetchCdnStream(
    videoId: string
) {
    const headers =
        getCdnRequestHeaders();

    let resolved =
        await getStreamUrl(
            videoId,
            false
        );

    let response =
        await axios.get(
            resolved.url,
            {
                responseType:
                    "stream",

                timeout: 15_000,

                validateStatus:
                    () => true,

                headers,

                httpsAgent,
            }
        );

    if (
        response.status ===
        403 ||
        response.status ===
        410
    ) {
        console.warn(
            `CDN returned ${response.status} for ${videoId}; refreshing`
        );

        response.data?.destroy?.();

        resolved =
            await getStreamUrl(
                videoId,
                true
            );

        response =
            await axios.get(
                resolved.url,
                {
                    responseType:
                        "stream",

                    timeout: 15_000,

                    validateStatus:
                        () => true,

                    headers,

                    httpsAgent,
                }
            );
    }

    if (
        response.status < 200 ||
        response.status >= 300
    ) {
        response.data?.destroy?.();

        throw new Error(
            `CDN_STREAM_${response.status}`
        );
    }

    return {
        resolved,
        response,
    };
}

/**
 * Download progress endpoint.
 */
router.get(
    "/download-progress/:videoId",
    progressLimiter,
    (
        req: Request,
        res: Response
    ) => {
        const videoId =
            queryString(
                req.params.videoId
            );

        if (
            !isValidVideoId(videoId)
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid video id",
                });
        }

        const record =
            getDownloadRecord(
                videoId
            );

        if (!record) {
            return res.json({
                progress: 0,
                status:
                    "downloading",
            });
        }

        return res.json({
            progress:
                record.progress,

            status:
                record.status,

            ...(record.error
                ? {
                    error:
                        record.error,
                }
                : {}),
        });
    }
);

/**
 * Full cached download.
 *
 * This is the endpoint your existing
 * download manager can continue using.
 */
router.get(
    "/download/:videoId",
    async (
        req: Request,
        res: Response
    ) => {
        const videoId =
            queryString(
                req.params.videoId
            );

        if (
            !isValidVideoId(videoId)
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid video id",
                });
        }

        const format =
            queryString(
                req.query.format,
                "mp3"
            );

        const quality =
            queryString(
                req.query.quality,
                "0"
            );

        const titleParam =
            queryString(
                req.query.title
            );

        const artistParam =
            queryString(
                req.query.artist
            );

        const artworkParam =
            queryString(
                req.query.artwork
            );

        if (
            !ALLOWED_FORMATS.has(
                format
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Unsupported format",
                });
        }

        /**
         * Fastest possible path:
         *
         * already-created file →
         * send it immediately.
         */
        const cachedFile =
            getCachedFilePath(
                videoId,
                format,
                quality
            );

        if (
            fs.existsSync(
                cachedFile
            )
        ) {
            const safeTitle =
                sanitizeFilename(
                    titleParam ||
                    videoId
                );

            return res.download(
                cachedFile,
                `${safeTitle}.${format}`,
                (error) => {
                    if (error) {
                        console.error(
                            "Cached download error:",
                            error.message
                        );
                    }
                }
            );
        }

        const id =
            uuid();

        const workingFile =
            getTempPath(
                `${id}.${format}`
            );

        const artworkFile =
            getTempPath(
                `${id}.jpg`
            );

        let responded = false;

        const cleanup =
            () => {
                safeUnlink(
                    workingFile
                );

                safeUnlink(
                    artworkFile
                );
            };

        /**
         * Five-minute safety timeout.
         */
        const timeoutMs =
            5 * 60 * 1000;

        const timeout =
            setTimeout(() => {
                if (
                    responded
                ) {
                    return;
                }

                responded =
                    true;

                cleanup();

                if (
                    !res.headersSent
                ) {
                    res.status(504).json({
                        success:
                            false,
                        error:
                            "Download timed out",
                    });
                }
            }, timeoutMs);

        req.once(
            "close",
            () => {
                if (
                    responded
                ) {
                    return;
                }

                responded =
                    true;

                clearTimeout(
                    timeout
                );

                cleanup();
            }
        );

        try {
            /**
             * Resolve/download audio and artwork
             * concurrently.
             */
            const artworkPromise =
                (async () => {
                    /**
                     * Try the highest-res static thumbnail tiers first.
                     * maxresdefault isn't guaranteed to exist for every
                     * video, so fall back down the chain until one
                     * actually downloads instead of always settling
                     * for the 480x360 hqdefault image.
                     */
                    const candidates =
                        artworkParam
                            ? [artworkParam]
                            : [
                                `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                                `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
                                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                            ];

                    for (const artworkUrl of candidates) {
                        try {
                            await downloadArtwork(
                                artworkUrl,
                                artworkFile
                            );
                            return;
                        } catch (
                        error: any
                        ) {
                            // Try the next, lower-res candidate.
                        }
                    }

                    console.error(
                        "Artwork download failed for all candidates:",
                        videoId
                    );
                })();

            const audioPromise =
                downloadAudioToFile(
                    videoId,
                    workingFile,
                    format,
                    quality
                );

            const [
                downloadResult,
            ] =
                await Promise.all([
                    audioPromise,
                    artworkPromise,
                ]);

            clearTimeout(
                timeout
            );

            if (
                responded
            ) {
                return;
            }

            const finalTitle =
                titleParam ||
                downloadResult.title ||
                videoId;

            const finalArtist =
                artistParam;

            /**
             * Metadata is kept exactly as
             * before.
             */
            try {
                await writeMetadata(
                    workingFile,
                    finalTitle,
                    finalArtist,
                    fs.existsSync(
                        artworkFile
                    )
                        ? artworkFile
                        : undefined
                );
            } catch (
            error: any
            ) {
                console.error(
                    "Metadata write failed:",
                    error?.message ||
                    error
                );
            }

            /**
             * Atomic cache promotion.
             */
            try {
                fs.renameSync(
                    workingFile,
                    cachedFile
                );
            } catch (
            error: any
            ) {
                console.error(
                    "Cache promotion failed:",
                    error?.message ||
                    error
                );
            }

            const finalPath =
                fs.existsSync(
                    cachedFile
                )
                    ? cachedFile
                    : workingFile;

            const safeTitle =
                sanitizeFilename(
                    finalTitle
                );

            responded =
                true;

            return res.download(
                finalPath,
                `${safeTitle}.${format}`,
                (error) => {
                    if (error) {
                        console.error(
                            "Download response error:",
                            error.message
                        );
                    }

                    if (
                        finalPath ===
                        workingFile
                    ) {
                        safeUnlink(
                            workingFile
                        );
                    }

                    safeUnlink(
                        artworkFile
                    );
                }
            );
        } catch (
        error: any
        ) {
            clearTimeout(
                timeout
            );

            console.error(
                "Download pipeline error:",
                error?.message ||
                error
            );

            cleanup();

            if (
                !responded &&
                !res.headersSent
            ) {
                responded =
                    true;

                const isUnavailable =
                    error?.message ===
                    "NO_STREAM_URL" ||
                    String(
                        error?.message ||
                        ""
                    ).startsWith(
                        "CDN_STREAM_"
                    );

                return res
                    .status(
                        isUnavailable
                            ? 404
                            : 500
                    )
                    .json({
                        success: false,
                        error:
                            isUnavailable
                                ? "Audio not available for this video"
                                : "Failed to create download",
                    });
            }
        }
    }
);

/**
 * Low-latency download stream.
 *
 * Useful when the client doesn't need
 * persistent server-side caching or
 * ID3 metadata.
 */
router.get(
    "/download-stream/:videoId",
    async (
        req: Request,
        res: Response
    ) => {
        const videoId =
            queryString(
                req.params.videoId
            );

        if (
            !isValidVideoId(videoId)
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid video id",
                });
        }

        const format =
            queryString(
                req.query.format,
                "mp3"
            );

        const quality =
            queryString(
                req.query.quality,
                "0"
            );

        if (
            !ALLOWED_FORMATS.has(
                format
            )
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Unsupported format",
                });
        }

        try {
            const {
                resolved,
                response,
            } =
                await fetchCdnStream(
                    videoId
                );

            res.setHeader(
                "Content-Type",
                getMime(format)
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${videoId}.${format}"`
            );

            /**
             * M4A source is already AAC/M4A.
             *
             * Never waste CPU transcoding it.
             */
            if (
                format === "m4a" &&
                (
                    resolved.ext ===
                    "m4a" ||
                    resolved.acodec?.includes(
                        "mp4a"
                    )
                )
            ) {
                response.data.once(
                    "error",
                    (
                        error: Error
                    ) => {
                        console.error(
                            "M4A stream error:",
                            error.message
                        );

                        if (
                            !res.writableEnded
                        ) {
                            res.end();
                        }
                    }
                );

                req.once(
                    "close",
                    () => {
                        if (
                            !res.writableEnded
                        ) {
                            response.data.destroy();
                        }
                    }
                );

                response.data.pipe(
                    res
                );

                return;
            }

            /**
             * Transcoded stream.
             */
            const ffmpeg =
                downloadAudioStreamFromUrl(
                    resolved.url,
                    format,
                    quality,
                    resolved.acodec
                );

            if (!ffmpeg) {
                response.data.destroy();

                return res
                    .status(500)
                    .json({
                        success: false,
                        error:
                            "Transcode setup failed",
                    });
            }

            response.data.once(
                "error",
                (
                    error: Error
                ) => {
                    console.error(
                        "Source stream error:",
                        error.message
                    );

                    ffmpeg.kill(
                        "SIGKILL"
                    );
                }
            );

            ffmpeg.stdout.once(
                "error",
                (
                    error: Error
                ) => {
                    console.error(
                        "ffmpeg stdout error:",
                        error.message
                    );
                }
            );

            ffmpeg.once(
                "close",
                (
                    code
                ) => {
                    if (
                        code !== 0 &&
                        !res.writableEnded
                    ) {
                        console.error(
                            "ffmpeg exited:",
                            code
                        );
                    }
                }
            );

            req.once(
                "close",
                () => {
                    response.data.destroy();

                    if (
                        !ffmpeg.killed
                    ) {
                        ffmpeg.kill(
                            "SIGKILL"
                        );
                    }
                }
            );

            response.data.pipe(
                ffmpeg.stdin
            );

            ffmpeg.stdout.pipe(
                res
            );
        } catch (
        error: any
        ) {
            console.error(
                "Stream download error:",
                error?.message ||
                error
            );

            if (
                !res.headersSent
            ) {
                const status =
                    error?.message ===
                        "NO_STREAM_URL" ||
                        String(
                            error?.message ||
                            ""
                        ).startsWith(
                            "CDN_STREAM_"
                        )
                        ? 404
                        : 500;

                return res
                    .status(status)
                    .json({
                        success: false,
                        error:
                            status === 404
                                ? "Audio not available for this video"
                                : "Failed to stream download",
                    });
            }
        }
    }
);

export default router;