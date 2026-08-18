import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import axios from "axios";
import fs from "fs";
import { httpsAgent } from "./services/http-agents";
import { getStreamUrl } from "./services/stream-resolver";
import { getCdnRequestHeaders } from "./services/cdn-headers";
import { setDownloadProgress, markDownloadCompleted, markDownloadFailed } from "./services/download-progress";

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

export interface DownloadResult {
    title: string;
    thumbnail: string;
    duration?: number;
}

/**
 * Pick ffmpeg's audio-codec arguments for a given target format.
 *
 * If the source is already encoded with the requested codec (e.g. the
 * source YouTube format is Opus and the requested output is "opus"),
 * stream-copy ("-codec:a copy") instead of decoding and re-encoding.
 * Same audio data, same output format, just far less CPU/time spent.
 */
function pickAudioCodecArgs(
    format: string,
    quality: string,
    sourceAcodec?: string
): string[] {
    const sourceIsOpus =
        Boolean(sourceAcodec?.includes("opus"));

    if (format === "opus" && sourceIsOpus) {
        return ["-codec:a", "copy"];
    }

    const audioCodec =
        format === "mp3"
            ? "libmp3lame"
            : format === "flac"
                ? "flac"
                : format === "wav"
                    ? "pcm_s16le"
                    : "libopus";

    const bitrateArgs =
        format === "mp3" || format === "opus"
            ? [
                "-b:a",
                quality === "0"
                    ? format === "mp3"
                        ? "320k"
                        : "160k"
                    : `${quality}k`,
            ]
            : [];

    return ["-codec:a", audioCodec, ...bitrateArgs];
}


// async function openCdn(videoId: string) {
//     let resolved = await getStreamUrl(videoId, false);
//     let response = await axios.get(resolved.url, {
//         responseType: "stream",
//         timeout: 20000,
//         maxRedirects: 5,
//         validateStatus: () => true,
//         headers: getCdnRequestHeaders(),
//         httpsAgent,
//     });

//     if (response.status === 403 || response.status === 410) {
//         response.data?.destroy?.();
//         resolved = await getStreamUrl(videoId, true);
//         response = await axios.get(resolved.url, {
//             responseType: "stream",
//             timeout: 20000,
//             maxRedirects: 5,
//             validateStatus: () => true,
//             headers: getCdnRequestHeaders(),
//             httpsAgent,
//         });
//     }

//     if (response.status < 200 || response.status >= 300) {
//         response.data?.destroy?.();
//         throw new Error(`CDN_STREAM_${response.status}`);
//     }

//     return { resolved, response };
// }
async function openCdn(
    videoId: string
) {
    let resolved =
        await getStreamUrl(
            videoId,
            false
        );

    let response =
        await axios.get(
            resolved.url,
            {
                responseType: "stream",

                timeout: 20_000,

                maxRedirects: 5,

                validateStatus:
                    () => true,

                headers:
                    getCdnRequestHeaders(
                        resolved.httpHeaders
                    ),

                httpsAgent,
            }
        );

    if (
        response.status === 403 ||
        response.status === 410
    ) {
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

                    timeout:
                        20_000,

                    maxRedirects:
                        5,

                    validateStatus:
                        () => true,

                    headers:
                        getCdnRequestHeaders(
                            resolved.httpHeaders
                        ),

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
 * Legacy disk-building API retained for callers that need a completed file.
 * It now avoids all unnecessary work for m4a and uses the same 403-safe
 * connection logic as the streaming route.
 */
export async function downloadAudioToFile(
    videoId: string,
    outputPath: string,
    format = "mp3",
    quality = "0"
): Promise<DownloadResult> {

    setDownloadProgress(videoId, 0);

    const { resolved, response } = await openCdn(videoId);
    const source = response.data;

    return new Promise<DownloadResult>((resolve, reject) => {
        let ffmpeg: ChildProcessWithoutNullStreams | null = null;
        let settled = false;
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
        };

        source.once("error", (err: Error) => {
            markDownloadFailed(videoId, err.message);
            finish(() => reject(err));
        });

        if (
            format === "m4a" &&
            (
                resolved.ext === "m4a" ||
                resolved.acodec?.includes("mp4a")
            )
        ) {
            const output =
                fs.createWriteStream(
                    outputPath
                );

            let received = 0;
            let lastProgress = -1;

            const total =
                Number(
                    response.headers[
                    "content-length"
                    ] || 0
                );

            source.on(
                "data",
                (chunk: Buffer) => {
                    received += chunk.length;

                    if (total <= 0) {
                        return;
                    }

                    const progress =
                        Math.min(
                            99,
                            Math.floor(
                                (received / total) *
                                100
                            )
                        );

                    if (
                        progress !==
                        lastProgress
                    ) {
                        lastProgress =
                            progress;

                        setDownloadProgress(
                            videoId,
                            progress
                        );
                    }
                }
            );

            output.once(
                "error",
                (err: Error) => {
                    markDownloadFailed(
                        videoId,
                        err.message
                    );

                    finish(() =>
                        reject(err)
                    );
                }
            );

            output.once(
                "finish",
                () => {
                    markDownloadCompleted(
                        videoId
                    );

                    finish(() =>
                        resolve({
                            title:
                                resolved.title,
                            thumbnail:
                                resolved.thumbnail,
                            duration:
                                resolved.duration,
                        })
                    );
                }
            );

            source.pipe(output);

            return;
        }

        const args = [
            "-hide_banner",
            "-loglevel", "error",

            // Machine-readable progress.
            "-progress", "pipe:2",
            "-nostats",

            "-i", "pipe:0",
            "-vn",
            ...pickAudioCodecArgs(format, quality, resolved.acodec),

            "-y",
            outputPath,
        ];
        ffmpeg = spawn("ffmpeg", args);

        let progressBuffer = "";
        let lastProgress = -1;

        ffmpeg.stderr.on(
            "data",
            (chunk: Buffer) => {
                progressBuffer +=
                    chunk.toString();

                const lines =
                    progressBuffer.split("\n");

                progressBuffer =
                    lines.pop() || "";

                for (const line of lines) {
                    const trimmed =
                        line.trim();

                    if (
                        !trimmed.startsWith(
                            "out_time_ms="
                        )
                    ) {
                        continue;
                    }

                    const outTimeMs =
                        Number(
                            trimmed.slice(
                                "out_time_ms=".length
                            )
                        );

                    if (
                        !Number.isFinite(
                            outTimeMs
                        ) ||
                        !resolved.duration ||
                        resolved.duration <= 0
                    ) {
                        continue;
                    }

                    const seconds =
                        outTimeMs /
                        1_000_000;

                    const progress =
                        Math.min(
                            99,
                            Math.max(
                                0,
                                Math.floor(
                                    (
                                        seconds /
                                        resolved.duration
                                    ) *
                                    100
                                )
                            )
                        );

                    if (
                        progress !==
                        lastProgress
                    ) {
                        lastProgress =
                            progress;

                        setDownloadProgress(
                            videoId,
                            progress
                        );
                    }
                }
            }
        );
        ffmpeg.once("error", (err: Error) => {
            markDownloadFailed(videoId, err.message);
            finish(() => reject(err));
        });
        ffmpeg.once("close", (code: number | null) => {
            if (code === 0) {
                markDownloadCompleted(videoId);
                finish(() => resolve({ title: resolved.title, thumbnail: resolved.thumbnail, duration: resolved.duration }));
            } else {
                const err = new Error(`ffmpeg exited ${code}`);
                markDownloadFailed(videoId, err.message);
                finish(() => reject(err));
            }
        });
        source.pipe(ffmpeg.stdin);
    });
}

export function downloadAudioStreamFromUrl(
    streamUrl: string,
    format = "mp3",
    quality = "0",
    sourceAcodec?: string
) {
    if (format === "m4a") return null;

    const args = [
        "-hide_banner", "-loglevel", "error",
        "-i", "pipe:0",
        "-vn",
        ...pickAudioCodecArgs(format, quality, sourceAcodec),
        "-f", format === "mp3" ? "mp3" : format,
        "pipe:1",
    ];

    return spawn("ffmpeg", args);
}

export { openCdn };
