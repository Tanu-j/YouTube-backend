// // import express, {
// //     Request,
// //     Response,
// // } from "express";

// // import axios, {
// //     AxiosResponse,
// // } from "axios";

// // import {
// //     getStreamUrl,
// // } from "./services/stream-resolver";

// // import {
// //     getCdnRequestHeaders,
// // } from "./services/cdn-headers";

// // import {
// //     httpsAgent,
// // } from "./services/http-agents";

// // const router = express.Router();
// // function getParamString(
// //     value: unknown
// // ): string {
// //     if (typeof value === "string") {
// //         return value;
// //     }

// //     if (Array.isArray(value)) {
// //         return typeof value[0] === "string"
// //             ? value[0]
// //             : "";
// //     }

// //     return "";
// // }
// // function getRangeHeader(
// //     req: Request
// // ): string | undefined {
// //     const range = req.headers.range;

// //     if (!range) {
// //         return undefined;
// //     }

// //     return Array.isArray(range)
// //         ? range[0]
// //         : range;
// // }

// // function headerValue(
// //     value: unknown
// // ): string | number | undefined {
// //     if (
// //         typeof value === "string" ||
// //         typeof value === "number"
// //     ) {
// //         return value;
// //     }

// //     if (Array.isArray(value)) {
// //         const values = value.filter(
// //             (
// //                 item
// //             ): item is string | number =>
// //                 typeof item === "string" ||
// //                 typeof item === "number"
// //         );

// //         return values.length
// //             ? values.join(", ")
// //             : undefined;
// //     }

// //     return undefined;
// // }

// // async function proxyStream(
// //     videoId: string,
// //     range?: string,
// //     forceRefresh = false
// // ): Promise<AxiosResponse> {
// //     const resolved =
// //         await getStreamUrl(
// //             videoId,
// //             forceRefresh
// //         );

// //     if (!resolved?.url) {
// //         throw new Error(
// //             "NO_AUDIO_DATA"
// //         );
// //     }

// //     const headers: Record<
// //         string,
// //         string
// //     > = {
// //         ...getCdnRequestHeaders(),
// //     };

// //     if (range) {
// //         headers.Range = range;
// //     }

// //     return axios.get(
// //         resolved.url,
// //         {
// //             headers,
// //             responseType: "stream",

// //             // This is the connection/response timeout.
// //             // Once the stream starts, axios does not buffer
// //             // the whole file.
// //             timeout: 20_000,

// //             // We need the status so that 403 can trigger
// //             // the fresh-URL recovery path.
// //             validateStatus: () => true,

// //             // Reuse a warm TCP/TLS connection to the CDN instead of
// //             // paying a fresh handshake on every single play request.
// //             httpsAgent,
// //         }
// //     );
// // }

// // router.get(
// //     "/play/:videoId",
// //     async (
// //         req: Request,
// //         res: Response
// //     ) => {
// //         const videoId =
// //             getParamString(
// //                 req.params.videoId
// //             );

// //         if (
// //             !/^[a-zA-Z0-9_-]{11}$/.test(
// //                 videoId
// //             )
// //         ) {
// //             return res.status(400).send(
// //                 "Invalid video id"
// //             );
// //         }

// //         const range =
// //             getRangeHeader(req);

// //         try {
// //             /**
// //              * FAST PATH
// //              *
// //              * Cached URL is used immediately.
// //              * No HEAD request.
// //              * No CDN liveness probe.
// //              */
// //             let upstream =
// //                 await proxyStream(
// //                     videoId,
// //                     range,
// //                     false
// //                 );

// //             /**
// //              * RAILWAY / CDN 403 RECOVERY
// //              *
// //              * Only refresh when the actual
// //              * playback request fails.
// //              */
// //             if (
// //                 upstream.status === 403 ||
// //                 upstream.status === 410
// //             ) {
// //                 console.warn(
// //                     `/play ${upstream.status}; refreshing ${videoId}`
// //                 );

// //                 upstream.data?.destroy?.();

// //                 upstream =
// //                     await proxyStream(
// //                         videoId,
// //                         range,
// //                         true
// //                     );
// //             }

// //             if (
// //                 upstream.status < 200 ||
// //                 upstream.status >= 300
// //             ) {
// //                 upstream.data?.destroy?.();

// //                 return res
// //                     .status(
// //                         upstream.status
// //                     )
// //                     .send(
// //                         `Upstream audio request failed: ${upstream.status}`
// //                     );
// //             }

// //             res.status(
// //                 upstream.status
// //             );

// //             const contentType =
// //                 headerValue(
// //                     upstream.headers[
// //                     "content-type"
// //                     ]
// //                 );

// //             const contentRange =
// //                 headerValue(
// //                     upstream.headers[
// //                     "content-range"
// //                     ]
// //                 );

// //             const contentLength =
// //                 headerValue(
// //                     upstream.headers[
// //                     "content-length"
// //                     ]
// //                 );

// //             res.setHeader(
// //                 "Content-Type",
// //                 contentType ||
// //                 "audio/mp4"
// //             );

// //             res.setHeader(
// //                 "Accept-Ranges",
// //                 "bytes"
// //             );

// //             if (
// //                 contentRange !==
// //                 undefined
// //             ) {
// //                 res.setHeader(
// //                     "Content-Range",
// //                     contentRange
// //                 );
// //             }

// //             if (
// //                 contentLength !==
// //                 undefined
// //             ) {
// //                 res.setHeader(
// //                     "Content-Length",
// //                     contentLength
// //                 );
// //             }

// //             const stream =
// //                 upstream.data;

// //             stream.once(
// //                 "error",
// //                 (error: Error) => {
// //                     console.error(
// //                         "Play stream error:",
// //                         error.message
// //                     );

// //                     if (
// //                         !res.writableEnded
// //                     ) {
// //                         res.end();
// //                     }
// //                 }
// //             );

// //             req.once(
// //                 "close",
// //                 () => {
// //                     if (
// //                         !res.writableEnded
// //                     ) {
// //                         stream.destroy();
// //                     }
// //                 }
// //             );

// //             stream.pipe(res);
// //         } catch (error: unknown) {
// //             const message =
// //                 error instanceof Error
// //                     ? error.message
// //                     : String(error);

// //             console.error(
// //                 "Error in /play/:videoId:",
// //                 message
// //             );

// //             if (
// //                 !res.headersSent
// //             ) {
// //                 const status =
// //                     message ===
// //                         "NO_STREAM_URL" ||
// //                         message ===
// //                         "NO_AUDIO_DATA"
// //                         ? 404
// //                         : 500;

// //                 return res
// //                     .status(status)
// //                     .send(
// //                         status === 404
// //                             ? "Audio not available for this video"
// //                             : "Error streaming audio"
// //                     );
// //             }
// //         }
// //     }
// // );

// // export default router;

// import express, {
//     Request,
//     Response,
// } from "express";

// import axios, {
//     AxiosResponse,
// } from "axios";

// import {
//     getStreamUrl,
// } from "./services/stream-resolver";

// import { isAudioQuality } from "./yt";
// import type { AudioQuality } from "./yt";

// import {
//     getCdnRequestHeaders,
// } from "./services/cdn-headers";

// import {
//     httpsAgent,
// } from "./services/http-agents";

// const router = express.Router();
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
// }
// function getRangeHeader(
//     req: Request
// ): string | undefined {
//     const range = req.headers.range;

//     if (!range) {
//         return undefined;
//     }

//     return Array.isArray(range)
//         ? range[0]
//         : range;
// }

// function headerValue(
//     value: unknown
// ): string | number | undefined {
//     if (
//         typeof value === "string" ||
//         typeof value === "number"
//     ) {
//         return value;
//     }

//     if (Array.isArray(value)) {
//         const values = value.filter(
//             (
//                 item
//             ): item is string | number =>
//                 typeof item === "string" ||
//                 typeof item === "number"
//         );

//         return values.length
//             ? values.join(", ")
//             : undefined;
//     }

//     return undefined;
// }

// async function proxyStream(
//     videoId: string,
//     range?: string,
//     forceRefresh = false,
//     quality?: AudioQuality
// ): Promise<AxiosResponse> {
//     const resolved =
//         await getStreamUrl(
//             videoId,
//             forceRefresh,
//             quality
//         );

//     if (!resolved?.url) {
//         throw new Error(
//             "NO_AUDIO_DATA"
//         );
//     }

//     const headers: Record<
//         string,
//         string
//     > = {
//         ...getCdnRequestHeaders(),
//     };

//     if (range) {
//         headers.Range = range;
//     }

//     return axios.get(
//         resolved.url,
//         {
//             headers,
//             responseType: "stream",

//             // This is the connection/response timeout.
//             // Once the stream starts, axios does not buffer
//             // the whole file.
//             timeout: 20_000,

//             // We need the status so that 403 can trigger
//             // the fresh-URL recovery path.
//             validateStatus: () => true,

//             // Reuse a warm TCP/TLS connection to the CDN instead of
//             // paying a fresh handshake on every single play request.
//             httpsAgent,
//         }
//     );
// }

// router.get(
//     "/play/:videoId",
//     async (
//         req: Request,
//         res: Response
//     ) => {
//         const videoId =
//             getParamString(
//                 req.params.videoId
//             );

//         if (
//             !/^[a-zA-Z0-9_-]{11}$/.test(
//                 videoId
//             )
//         ) {
//             return res.status(400).send(
//                 "Invalid video id"
//             );
//         }

//         const range =
//             getRangeHeader(req);

//         // Optional "Audio Quality" setting, forwarded from the /audio
//         // lookup as ?quality=. Unknown/missing values fall back to
//         // undefined, which is the exact pre-existing behavior (highest
//         // available bitrate).
//         const rawQuality =
//             getParamString(req.query.quality);

//         const quality =
//             isAudioQuality(rawQuality) ? rawQuality : undefined;

//         try {
//             /**
//              * FAST PATH
//              *
//              * Cached URL is used immediately.
//              * No HEAD request.
//              * No CDN liveness probe.
//              */
//             let upstream =
//                 await proxyStream(
//                     videoId,
//                     range,
//                     false,
//                     quality
//                 );

//             /**
//              * RAILWAY / CDN 403 RECOVERY
//              *
//              * Only refresh when the actual
//              * playback request fails.
//              */
//             if (
//                 upstream.status === 403 ||
//                 upstream.status === 410
//             ) {
//                 console.warn(
//                     `/play ${upstream.status}; refreshing ${videoId}`
//                 );

//                 upstream.data?.destroy?.();

//                 upstream =
//                     await proxyStream(
//                         videoId,
//                         range,
//                         true,
//                         quality
//                     );
//             }

//             if (
//                 upstream.status < 200 ||
//                 upstream.status >= 300
//             ) {
//                 upstream.data?.destroy?.();

//                 return res
//                     .status(
//                         upstream.status
//                     )
//                     .send(
//                         `Upstream audio request failed: ${upstream.status}`
//                     );
//             }

//             res.status(
//                 upstream.status
//             );

//             const contentType =
//                 headerValue(
//                     upstream.headers[
//                     "content-type"
//                     ]
//                 );

//             const contentRange =
//                 headerValue(
//                     upstream.headers[
//                     "content-range"
//                     ]
//                 );

//             const contentLength =
//                 headerValue(
//                     upstream.headers[
//                     "content-length"
//                     ]
//                 );

//             res.setHeader(
//                 "Content-Type",
//                 contentType ||
//                 "audio/mp4"
//             );

//             res.setHeader(
//                 "Accept-Ranges",
//                 "bytes"
//             );

//             if (
//                 contentRange !==
//                 undefined
//             ) {
//                 res.setHeader(
//                     "Content-Range",
//                     contentRange
//                 );
//             }

//             if (
//                 contentLength !==
//                 undefined
//             ) {
//                 res.setHeader(
//                     "Content-Length",
//                     contentLength
//                 );
//             }

//             const stream =
//                 upstream.data;

//             stream.once(
//                 "error",
//                 (error: Error) => {
//                     console.error(
//                         "Play stream error:",
//                         error.message
//                     );

//                     if (
//                         !res.writableEnded
//                     ) {
//                         res.end();
//                     }
//                 }
//             );

//             req.once(
//                 "close",
//                 () => {
//                     if (
//                         !res.writableEnded
//                     ) {
//                         stream.destroy();
//                     }
//                 }
//             );

//             stream.pipe(res);
//         } catch (error: unknown) {
//             const message =
//                 error instanceof Error
//                     ? error.message
//                     : String(error);

//             console.error(
//                 "Error in /play/:videoId:",
//                 message
//             );

//             if (
//                 !res.headersSent
//             ) {
//                 const status =
//                     message ===
//                         "NO_STREAM_URL" ||
//                         message ===
//                         "NO_AUDIO_DATA"
//                         ? 404
//                         : 500;

//                 return res
//                     .status(status)
//                     .send(
//                         status === 404
//                             ? "Audio not available for this video"
//                             : "Error streaming audio"
//                     );
//             }
//         }
//     }
// );

// export default router;

import express, {
    Request,
    Response,
} from "express";

import axios, {
    AxiosResponse,
} from "axios";

import {
    getStreamUrl,
} from "./services/stream-resolver";

import {
    isAudioQuality,
    markClientBlocked,
} from "./yt";

import type {
    AudioQuality,
} from "./yt";

import {
    getCdnRequestHeaders,
} from "./services/cdn-headers";

import {
    httpsAgent,
} from "./services/http-agents";

const router =
    express.Router();

function getParamString(
    value: unknown
): string {
    if (
        typeof value === "string"
    ) {
        return value;
    }

    if (
        Array.isArray(value)
    ) {
        return typeof value[0] === "string"
            ? value[0]
            : "";
    }

    return "";
}

function getRangeHeader(
    req: Request
): string | undefined {
    const range =
        req.headers.range;

    if (!range) {
        return undefined;
    }

    return Array.isArray(range)
        ? range[0]
        : range;
}

function headerValue(
    value: unknown
): string | number | undefined {
    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return value;
    }

    if (
        Array.isArray(value)
    ) {
        return value.join(", ");
    }

    return undefined;
}

async function proxyStream(
    videoId: string,
    range?: string,
    forceRefresh = false,
    quality?: AudioQuality
) {
    const resolved =
        await getStreamUrl(
            videoId,
            forceRefresh,
            quality
        );

    if (!resolved?.url) {
        throw new Error(
            "NO_AUDIO_DATA"
        );
    }

    const headers: Record<string, string> = {
        ...(resolved.httpHeaders ?? {}),
        Accept: "*/*",
        "Accept-Encoding": "identity",
    }
    if (range) {
        headers.Range =
            range;
    }

    return {
        resolved,

        response:
            await axios.get(
                resolved.url,
                {
                    headers,

                    responseType:
                        "stream",

                    timeout:
                        30000,

                    maxRedirects:
                        5,

                    validateStatus:
                        () => true,

                    httpsAgent,
                }
            ),
    };
}

router.get(
    "/play/:videoId",
    async (
        req: Request,
        res: Response
    ) => {
        const videoId =
            getParamString(
                req.params.videoId
            );

        if (
            !/^[a-zA-Z0-9_-]{11}$/.test(
                videoId
            )
        ) {
            return res
                .status(400)
                .send(
                    "Invalid video id"
                );
        }

        const range =
            getRangeHeader(req);

        const rawQuality =
            getParamString(
                req.query.quality
            );

        const quality =
            isAudioQuality(
                rawQuality
            )
                ? rawQuality
                : undefined;

        try {
            let result =
                await proxyStream(
                    videoId,
                    range,
                    false,
                    quality
                );

            /*
             * Only refresh ONCE.
             */
            if (
                result.response.status === 403 ||
                result.response.status === 410
            ) {
                console.warn(
                    `/play ${new Date().toLocaleString()} ${result.response.status}; refreshing ${videoId}`
                );

                result.response
                    .data
                    ?.destroy?.();

                /*
                 * A 403/410 here almost always means the client that
                 * produced this URL isn't usable right now (e.g. it
                 * needs a PO Token we don't have) -- not that the URL
                 * merely expired. Blacklist it so the forced refresh
                 * below actually picks a different client instead of
                 * handing back the same broken one.
                 */
                if (
                    result.resolved.client
                ) {
                    markClientBlocked(
                        result.resolved.client
                    );
                }

                result =
                    await proxyStream(
                        videoId,
                        range,
                        true,
                        quality
                    );
            }

            const upstream =
                result.response;

            if (
                upstream.status < 200 ||
                upstream.status >= 300
            ) {
                upstream.data
                    ?.destroy?.();

                console.error(
                    `/play ${new Date().toLocaleString()} ${videoId}: upstream ${upstream.status} `
                );

                return res
                    .status(
                        upstream.status
                    )
                    .send(
                        `Upstream audio request failed: ${upstream.status}`
                    );
            }

            res.status(
                upstream.status
            );

            const contentType =
                headerValue(
                    upstream.headers[
                    "content-type"
                    ]
                );

            const contentRange =
                headerValue(
                    upstream.headers[
                    "content-range"
                    ]
                );

            const contentLength =
                headerValue(
                    upstream.headers[
                    "content-length"
                    ]
                );

            res.setHeader(
                "Content-Type",
                contentType ||
                (
                    result.resolved.ext ===
                        "m4a"
                        ? "audio/mp4"
                        : "audio/webm"
                )
            );

            res.setHeader(
                "Accept-Ranges",
                "bytes"
            );

            if (
                contentRange !==
                undefined
            ) {
                res.setHeader(
                    "Content-Range",
                    contentRange
                );
            }

            if (
                contentLength !==
                undefined
            ) {
                res.setHeader(
                    "Content-Length",
                    contentLength
                );
            }

            res.setHeader(
                "Cache-Control",
                "no-store"
            );

            const stream =
                upstream.data;

            stream.once(
                "error",
                (
                    error: Error
                ) => {
                    console.error(
                        "Play stream error:",
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
                        stream.destroy();
                    }
                }
            );

            stream.pipe(res);
        } catch (
        error: unknown
        ) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                "Error in /play/:videoId:",
                message
            );

            if (
                !res.headersSent
            ) {
                return res
                    .status(500)
                    .send(
                        `Error streaming audio  Date ${new Date().toLocaleString()} ${res}`
                    );
            }
        }
    }
);

export default router;