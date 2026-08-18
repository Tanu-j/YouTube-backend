// import dotenv from "dotenv";

// // Load the correct environment before application startup.
// const envFile =
//     process.env.NODE_ENV === "production"
//         ? ".env.production"
//         : ".env.development";

// dotenv.config({
//     path: envFile,
// });

// console.log(
//     `Loaded ${envFile}`
// );

// import express, {
//     Request,
//     Response,
// } from "express";

// import cors from "cors";

// import rateLimit from "express-rate-limit";

// import {
//     audioCache,
//     staleCache,
//     cacheKey,
// } from "./cache";

// import {
//     extractionQueue,
// } from "./queue";

// import {
//     getStreamUrl,
// } from "./services/stream-resolver";

// import {
//     writeCookiesFromEnv,
// } from "./startup-cookies";

// import {
//     sweepOldCacheFiles,
// } from "./utils/temp-file";

// import {
//     withInflightDedup,
// } from "./services/inflight";

// import playRouter from "./play";

// import downloadRoute from "./dt-route";

// const app =
//     express();
// function getParamString(
//     value: unknown
// ): string {
//     if (typeof value === "string") {
//         return value;
//     }

//     if (Array.isArray(value)) {
//         return typeof value[0] === "string"
//             ? value[0]
//             : "";
//     }

//     return "";
//     }
// /**
//  * Railway / reverse proxy support.
//  */
// if (
//     process.env.TRUST_PROXY ===
//     "true"
// ) {
//     app.set(
//         "trust proxy",
//         1
//     );
// }

// app.use(
//     cors()
// );

// app.disable(
//     "x-powered-by"
// );

// /**
//  * Global request limiter.
//  */
// const limiter =
//     rateLimit({
//         windowMs:
//             60 * 1000,

//         max: 60,

//         standardHeaders:
//             true,

//         legacyHeaders:
//             false,

//         // Progress polling is high-frequency and read-only; it gets its
//         // own dedicated limiter in dt-route.ts instead of sharing this
//         // one, so it can't get starved by other API traffic.
//         skip: (req) =>
//             req.path.startsWith("/download-progress"),

//         message: {
//             success: false,
//             error:
//                 "Too many requests",
//         },
//     });

// app.use(
//     limiter
// );

// /**
//  * YouTube video ID validation.
//  */
// function isValidVideoId(
//     id: string
// ): boolean {
//     return /^[a-zA-Z0-9_-]{11}$/.test(
//         id
//     );
// }

// /**
//  * Never expose the real YouTube CDN URL
//  * to the React Native application.
//  *
//  * RNTP receives:
//  *
//  * /play/:videoId
//  */
// function sanitizeCacheData(
//     data: any
// ) {
//     if (!data) {
//         return data;
//     }

//     const {
//         url: _url,
//         ...rest
//     } = data;

//     return rest;
// }

// /**
//  * Convert any backend URL into a
//  * client-visible playback URL.
//  */
// function getBackendUrl(
//     req: Request
// ): string {
//     /**
//      * Explicit BACKEND_URL takes priority.
//      *
//      * Local physical-device testing:
//      *
//      * BACKEND_URL=http://192.168.x.x:3000
//      *
//      * Railway:
//      *
//      * BACKEND_URL=https://your-app.up.railway.app
//      */
//     if (
//         process.env.BACKEND_URL
//     ) {
//         return process.env.BACKEND_URL.replace(
//             /\/+$/,
//             ""
//         );
//     }

//     /**
//      * Fallback for local development.
//      */
//     const protocol =
//         req.headers["x-forwarded-proto"] ||
//         req.protocol;

//     const host =
//         req.get("host") ||
//         "localhost:3000";

//     const protocolString =
//         Array.isArray(protocol)
//             ? protocol[0]
//             : protocol;

//     return `${protocolString}://${host}`;
// }

// /**
//  * Resolve audio metadata / playback
//  * endpoint.
//  *
//  * The actual YouTube CDN URL never
//  * leaves the backend.
//  */
// app.get(
//     "/audio/:videoId",
//     async (
//         req: Request,
//         res: Response
//     ) => {
//         const videoId =
//             getParamString(
//                 req.params.videoId
//         );

//         if (
//             !isValidVideoId(videoId)
//         ) {
//             return res
//                 .status(400)
//                 .json({
//                     success: false,
//                     error:
//                         "Invalid video id",
//                 });
//         }

//         const key =
//             cacheKey(videoId);

//         const backendUrl =
//             getBackendUrl(req);

//         try {
//             /**
//              * The resolver itself handles:
//              *
//              * cache
//              * stale cache
//              * extraction queue
//              * concurrent extraction dedup
//              */
//             const resolved =
//                 await withInflightDedup(
//                     `audio:${videoId}`,
//                     () =>
//                         getStreamUrl(
//                             videoId
//                         )
//                 );

//             const cacheData =
//                 sanitizeCacheData(
//                     resolved
//                 );

//             const playbackUrl =
//                 `${backendUrl}/play/${videoId}`;

//             /**
//              * Tell the client whether
//              * the data came from the fast
//              * memory cache or fresh resolution.
//              */
//             const cacheHit =
//                 Boolean(
//                     audioCache.get(
//                         key
//                     )
//                 );

//             return res
//                 .status(200)
//                 .json({
//                     success: true,

//                     source:
//                         cacheHit
//                             ? "cache"
//                             : "live",

//                     data: {
//                         ...cacheData,
//                         url:
//                             playbackUrl,
//                     },
//                 });
//         } catch (
//         error: unknown
//         ) {
//             const message =
//                 error instanceof Error
//                     ? error.message
//                     : String(error);

//             console.error(
//                 "AUDIO EXTRACTION ERROR:",
//                 message
//             );

//             /**
//              * Stale metadata is better than
//              * failing playback resolution
//              * completely.
//              */
//             const stale =
//                 staleCache.get(
//                     key
//                 );

//             if (stale) {
//                 return res
//                     .status(200)
//                     .json({
//                         success: true,

//                         source:
//                             "stale-cache",

//                         warning:
//                             message,

//                         data: {
//                             ...sanitizeCacheData(
//                                 stale
//                             ),

//                             url:
//                                 `${backendUrl}/play/${videoId}`,
//                         },
//                     });
//             }

//             return res
//                 .status(503)
//                 .json({
//                     success: false,
//                     error:
//                         message ||
//                         "Extraction failed",
//                 });
//         }
//     }
// );

// /**
//  * Artist image endpoint.
//  */
// app.get(
//     "/artist-image/:name",
//     async (
//         req: Request,
//         res: Response
//     ) => {
//         const name =
//             getParamString(
//                 req.params.name
//             ).trim();

//         if (
//             !name ||
//             name.length > 100
//         ) {
//             return res
//                 .status(400)
//                 .json({
//                     success: false,
//                     error:
//                         "Invalid artist name",
//                 });
//         }

//         const key =
//             `artist:${name.toLowerCase()}`;

//         const cached =
//             audioCache.get(
//                 key
//             );

//         if (cached) {
//             return res
//                 .status(200)
//                 .json({
//                     success: true,
//                     source:
//                         "cache",
//                     data:
//                         cached,
//                 });
//         }

//         const controller =
//             new AbortController();

//         const timeout =
//             setTimeout(
//                 () =>
//                     controller.abort(),
//                 10_000
//             );

//         try {
//             const response =
//                 await fetch(
//                     `https://theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(
//                         name
//                     )}`,
//                     {
//                         signal:
//                             controller.signal,
//                     }
//                 );

//             clearTimeout(
//                 timeout
//             );

//             if (
//                 !response.ok
//             ) {
//                 throw new Error(
//                     `API returned ${response.status}`
//                 );
//             }

//             const result =
//                 await response.json();

//             const artist =
//                 result?.artists?.[0];

//             if (!artist) {
//                 return res
//                     .status(404)
//                     .json({
//                         success: false,
//                         error:
//                             "Artist not found",
//                     });
//             }

//             const data = {
//                 name:
//                     artist.strArtist,

//                 image:
//                     artist.strArtistThumb,

//                 logo:
//                     artist.strArtistLogo,

//                 banner:
//                     artist.strArtistBanner,

//                 fanart:
//                     artist.strArtistFanart,
//             };

//             audioCache.set(
//                 key,
//                 data
//             );

//             staleCache.set(
//                 key,
//                 data
//             );

//             return res
//                 .status(200)
//                 .json({
//                     success: true,
//                     source:
//                         "live",
//                     data,
//                 });
//         } catch (
//         error
//         ) {
//             clearTimeout(
//                 timeout
//             );

//             console.error(
//                 "Artist lookup error:",
//                 error
//             );

//             const stale =
//                 staleCache.get(
//                     key
//                 );

//             if (stale) {
//                 return res
//                     .status(200)
//                     .json({
//                         success: true,

//                         source:
//                             "stale-cache",

//                         warning:
//                             "Live lookup failed",

//                         data:
//                             stale,
//                     });
//             }

//             return res
//                 .status(503)
//                 .json({
//                     success: false,
//                     error:
//                         "Artist lookup failed",
//                 });
//         }
//     }
// );

// /**
//  * Playback proxy.
//  *
//  * RNTP uses:
//  *
//  * /play/:videoId
//  */
// app.use(
//     "/",
//     playRouter
// );

// /**
//  * Downloads:
//  *
//  * /download/:videoId
//  * /download-stream/:videoId
//  * /download-progress/:videoId
//  */
// app.use(
//     downloadRoute
// );

// /**
//  * Make sure cookies exist before
//  * yt-dlp can be invoked.
//  */
// writeCookiesFromEnv();

// /**
//  * Remove old temporary/cache files.
//  */
// sweepOldCacheFiles();

// const cacheSweepTimer =
//     setInterval(
//         () =>
//             sweepOldCacheFiles(),
//         60 * 60 * 1000
//     );

// /**
//  * Graceful shutdown.
//  */
// async function shutdown(
//     signal: string
// ) {
//     console.log(
//         `${signal}: shutting down`
//     );

//     clearInterval(
//         cacheSweepTimer
//     );

//     try {
//         /**
//          * Don't kill yt-dlp processes
//          * in the middle of extraction.
//          */
//         await extractionQueue.onIdle();
//     } catch (
//     error
//     ) {
//         console.error(
//             "Queue shutdown error:",
//             error
//         );
//     }

//     process.exit(0);
// }

// process.once(
//     "SIGTERM",
//     () =>
//         void shutdown(
//             "SIGTERM"
//         )
// );

// process.once(
//     "SIGINT",
//     () =>
//         void shutdown(
//             "SIGINT"
//         )
// );

// /**
//  * Railway and physical Android
//  * devices both need the server
//  * reachable externally.
//  */
// const port =
//     Number(
//         process.env.PORT ||
//         3000
//     );

// app.listen(
//     port,
//     "0.0.0.0",
//     () => {
//         console.log(
//             `Server started at ${port}`
//         );

//         console.log(
//             `Backend URL: ${process.env.BACKEND_URL ||
//             `http://localhost:${port}`
//             }`
//         );
//     }
// );
import dotenv from "dotenv";

// Load the correct environment before application startup.
const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.production"
        : ".env.development";

dotenv.config({
    path: envFile,
});

console.log(
    `Loaded ${envFile}`
);

import express, {
    Request,
    Response,
} from "express";

import cors from "cors";

import rateLimit from "express-rate-limit";

import {
    audioCache,
    staleCache,
    cacheKey,
    isDefaultQuality,
} from "./cache";

import {
    extractionQueue,
} from "./queue";

import {
    getStreamUrl,
} from "./services/stream-resolver";

import { isAudioQuality } from "./yt";
import {
    writeCookiesFromEnv,
} from "./startup-cookies";

import {
    sweepOldCacheFiles,
} from "./utils/temp-file";

import {
    withInflightDedup,
} from "./services/inflight";

import playRouter from "./play";

import downloadRoute from "./dt-route";

const app =
    express();
function getParamString(
    value: unknown
): string {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return typeof value[0] === "string"
            ? value[0]
            : "";
    }

    return "";
}
/**
 * Railway / reverse proxy support.
 */
if (
    process.env.TRUST_PROXY ===
    "true"
) {
    app.set(
        "trust proxy",
        1
    );
}

app.use(
    cors()
);

app.disable(
    "x-powered-by"
);

/**
 * Global request limiter.
 */
const limiter =
    rateLimit({
        windowMs:
            60 * 1000,

        max: 60,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        // Progress polling is high-frequency and read-only; it gets its
        // own dedicated limiter in dt-route.ts instead of sharing this
        // one, so it can't get starved by other API traffic.
        skip: (req) =>
            req.path.startsWith("/download-progress"),

        message: {
            success: false,
            error:
                "Too many requests",
        },
    });

app.use(
    limiter
);

/**
 * YouTube video ID validation.
 */
function isValidVideoId(
    id: string
): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(
        id
    );
}

/**
 * Never expose the real YouTube CDN URL
 * to the React Native application.
 *
 * RNTP receives:
 *
 * /play/:videoId
 */
function sanitizeCacheData(
    data: any
) {
    if (!data) {
        return data;
    }

    const {
        url: _url,
        ...rest
    } = data;

    return rest;
}

/**
 * Convert any backend URL into a
 * client-visible playback URL.
 */
function getBackendUrl(
    req: Request
): string {
    /**
     * Explicit BACKEND_URL takes priority.
     *
     * Local physical-device testing:
     *
     * BACKEND_URL=http://192.168.x.x:3000
     *
     * Railway:
     *
     * BACKEND_URL=https://your-app.up.railway.app
     */
    if (
        process.env.BACKEND_URL
    ) {
        return process.env.BACKEND_URL.replace(
            /\/+$/,
            ""
        );
    }

    /**
     * Fallback for local development.
     */
    const protocol =
        req.headers["x-forwarded-proto"] ||
        req.protocol;

    const host =
        req.get("host") ||
        "localhost:3000";

    const protocolString =
        Array.isArray(protocol)
            ? protocol[0]
            : protocol;

    return `${protocolString}://${host}`;
}

/**
 * Resolve audio metadata / playback
 * endpoint.
 *
 * The actual YouTube CDN URL never
 * leaves the backend.
 */
app.get(
    "/audio/:videoId",
    async (
        req: Request,
        res: Response
    ) => {
        const videoId =
            getParamString(
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

        // Optional "Audio Quality" setting from the app. Unknown or
        // missing values are ignored (undefined), which preserves the
        // exact original behavior — highest available bitrate.
        const rawQuality =
            getParamString(req.query.quality);

        const quality =
            isAudioQuality(rawQuality) ? rawQuality : undefined;

        const key =
            cacheKey(videoId, quality);

        const backendUrl =
            getBackendUrl(req);

        try {
            /**
             * The resolver itself handles:
             *
             * cache
             * stale cache
             * extraction queue
             * concurrent extraction dedup
             */
            const resolved =
                await withInflightDedup(
                    isDefaultQuality(quality) ? `audio:${videoId}` : `audio:${videoId}:${quality}`,
                    () =>
                        getStreamUrl(
                            videoId,
                            false,
                            quality
                        )
                );

            const cacheData =
                sanitizeCacheData(
                    resolved
                );

            const playbackUrl =
                quality
                    ? `${backendUrl}/play/${videoId}?quality=${quality}`
                    : `${backendUrl}/play/${videoId}`;

            /**
             * Tell the client whether
             * the data came from the fast
             * memory cache or fresh resolution.
             */
            const cacheHit =
                Boolean(
                    audioCache.get(
                        key
                    )
                );

            return res
                .status(200)
                .json({
                    success: true,

                    source:
                        cacheHit
                            ? "cache"
                            : "live",

                    data: {
                        ...cacheData,
                        url:
                            playbackUrl,
                    },
                });
        } catch (
        error: unknown
        ) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                "AUDIO EXTRACTION ERROR:",
                message
            );

            /**
             * Stale metadata is better than
             * failing playback resolution
             * completely.
             */
            const stale =
                staleCache.get(
                    key
                );

            if (stale) {
                return res
                    .status(200)
                    .json({
                        success: true,

                        source:
                            "stale-cache",

                        warning:
                            message,

                        data: {
                            ...sanitizeCacheData(
                                stale
                            ),

                            url:
                                `${backendUrl}/play/${videoId}`,
                        },
                    });
            }

            return res
                .status(503)
                .json({
                    success: false,
                    error:
                        message ||
                        "Extraction failed",
                });
        }
    }
);

/**
 * Artist image endpoint.
 */
app.get(
    "/artist-image/:name",
    async (
        req: Request,
        res: Response
    ) => {
        const name =
            getParamString(
                req.params.name
            ).trim();

        if (
            !name ||
            name.length > 100
        ) {
            return res
                .status(400)
                .json({
                    success: false,
                    error:
                        "Invalid artist name",
                });
        }

        const key =
            `artist:${name.toLowerCase()}`;

        const cached =
            audioCache.get(
                key
            );

        if (cached) {
            return res
                .status(200)
                .json({
                    success: true,
                    source:
                        "cache",
                    data:
                        cached,
                });
        }

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
                10_000
            );

        try {
            const response =
                await fetch(
                    `https://theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(
                        name
                    )}`,
                    {
                        signal:
                            controller.signal,
                    }
                );

            clearTimeout(
                timeout
            );

            if (
                !response.ok
            ) {
                throw new Error(
                    `API returned ${response.status}`
                );
            }

            const result =
                await response.json();

            const artist =
                result?.artists?.[0];

            if (!artist) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            "Artist not found",
                    });
            }

            const data = {
                name:
                    artist.strArtist,

                image:
                    artist.strArtistThumb,

                logo:
                    artist.strArtistLogo,

                banner:
                    artist.strArtistBanner,

                fanart:
                    artist.strArtistFanart,
            };

            audioCache.set(
                key,
                data
            );

            staleCache.set(
                key,
                data
            );

            return res
                .status(200)
                .json({
                    success: true,
                    source:
                        "live",
                    data,
                });
        } catch (
        error
        ) {
            clearTimeout(
                timeout
            );

            console.error(
                "Artist lookup error:",
                error
            );

            const stale =
                staleCache.get(
                    key
                );

            if (stale) {
                return res
                    .status(200)
                    .json({
                        success: true,

                        source:
                            "stale-cache",

                        warning:
                            "Live lookup failed",

                        data:
                            stale,
                    });
            }

            return res
                .status(503)
                .json({
                    success: false,
                    error:
                        "Artist lookup failed",
                });
        }
    }
);

/**
 * Playback proxy.
 *
 * RNTP uses:
 *
 * /play/:videoId
 */
app.use(
    "/",
    playRouter
);

/**
 * Downloads:
 *
 * /download/:videoId
 * /download-stream/:videoId
 * /download-progress/:videoId
 */
app.use(
    downloadRoute
);

/**
 * Make sure cookies exist before
 * yt-dlp can be invoked.
 */
writeCookiesFromEnv();

/**
 * Remove old temporary/cache files.
 */
sweepOldCacheFiles();

const cacheSweepTimer =
    setInterval(
        () =>
            sweepOldCacheFiles(),
        60 * 60 * 1000
    );

/**
 * Graceful shutdown.
 */
async function shutdown(
    signal: string
) {
    console.log(
        `${signal}: shutting down`
    );

    clearInterval(
        cacheSweepTimer
    );

    try {
        /**
         * Don't kill yt-dlp processes
         * in the middle of extraction.
         */
        await extractionQueue.onIdle();
    } catch (
    error
    ) {
        console.error(
            "Queue shutdown error:",
            error
        );
    }

    process.exit(0);
}

process.once(
    "SIGTERM",
    () =>
        void shutdown(
            "SIGTERM"
        )
);

process.once(
    "SIGINT",
    () =>
        void shutdown(
            "SIGINT"
        )
);

/**
 * Railway and physical Android
 * devices both need the server
 * reachable externally.
 */
const port =
    Number(
        process.env.PORT ||
        3000
    );

app.listen(
    port,
    "0.0.0.0",
    () => {
        console.log(
            `Server started at ${port}`
        );

        console.log(
            `Backend URL: ${process.env.BACKEND_URL ||
            `http://localhost:${port}`
            }`
        );
    }
);