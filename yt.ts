// import fs from "fs";
// import ytdlp from "yt-dlp-exec";

// export interface ExtractedAudio {
//     title?: string;
//     duration?: number;
//     thumbnail?: string;
//     url: string;
//     formatId?: string;
//     ext?: string;
//     acodec?: string;
//     vcodec?: string;
//     abr?: number;
//     httpHeaders?: Record<string, string>;
// }

// type ClientName = "default" | "android" | "web" | "ios";

// // Remember the client that most recently succeeded. This makes a Railway
// // process converge on the working extractor instead of paying for the same
// // failed client attempts on every new song.
// let preferredClient: ClientName = "android";

// const CLIENTS: ClientName[] = ["default", "android", "web", "ios"];

// function orderedClients(): ClientName[] {
//     return [
//         preferredClient,
//         ...CLIENTS.filter((client) => client !== preferredClient),
//     ];
// }

// function clientArgs(client: ClientName): string | undefined {
//     if (client === "default") return undefined;
//     return `youtube:player_client=${client}`;
// }

// function chooseAudioFormat(formats: any[]) {
//     return formats
//         .filter((f: any) =>
//             Boolean(f?.url) &&
//             Boolean(f?.acodec) &&
//             f.acodec !== "none" &&
//             f?.vcodec === "none"
//         )
//         .sort((a: any, b: any) => {
//             const aM4a = a.ext === "m4a" || String(a.acodec || "").includes("mp4a");
//             const bM4a = b.ext === "m4a" || String(b.acodec || "").includes("mp4a");

//             // Mobile-friendly AAC/M4A first; within the same codec family,
//             // choose the highest bitrate.
//             if (aM4a !== bM4a) return aM4a ? -1 : 1;
//             return Number(b.abr || 0) - Number(a.abr || 0);
//         })[0];
// }

// export async function fetchAudio(videoId: string): Promise<ExtractedAudio> {
//     const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
//     const cookies = process.env.YT_COOKIES;
//     const hasCookies = Boolean(cookies && fs.existsSync(cookies));

//     const cookieOption = hasCookies ? { cookies } : {};

//     const baseOptions: any = {
//         dumpSingleJson: true,
//         noPlaylist: true,
//         noWarnings: true,
//         // This is metadata/URL extraction, not media downloading. Large
//         // retry counts make every failed client painfully slow.
//         retries: 2,
//         fragmentRetries: 2,
//         socketTimeout: 15000,
//         skipDownload: true,
//         ...cookieOption,
//     };

//     let lastError: any;

//     for (const client of orderedClients()) {
//         try {
//             const extractorArgs = clientArgs(client);
//             const options = extractorArgs
//                 ? { ...baseOptions, extractorArgs }
//                 : baseOptions;

//             const info: any = await ytdlp(watchUrl, options);
//             const formats = Array.isArray(info.formats) ? info.formats : [];
//             const selected = chooseAudioFormat(formats);

//             if (!selected) {
//                 lastError = new Error(`NO_AUDIO_FORMAT:${client}`);
//                 continue;
//             }

//             // Adapt to the working client for subsequent songs.
//             preferredClient = client;

//             return {
//                 title: info.title,
//                 duration: info.duration,
//                 thumbnail: info.thumbnail,
//                 url: selected.url,
//                 formatId: selected.format_id,
//                 ext: selected.ext,
//                 acodec: selected.acodec,
//                 vcodec: selected.vcodec,
//                 abr: selected.abr,
//                 httpHeaders: selected.http_headers,
//             };
//         } catch (error: any) {
//             lastError = error;
//             const message = String(error?.message || error);
//             const lower = message.toLowerCase();

//             const permanent =
//                 lower.includes("private video") ||
//                 lower.includes("video unavailable") ||
//                 lower.includes("this video is not available") ||
//                 lower.includes("copyright") ||
//                 lower.includes("account associated with this video has been terminated");

//             if (permanent) break;
//         }
//     }

//     throw new Error(lastError?.message || "EXTRACTION_FAILED");
// }


import fs from "fs";
import ytdlp from "yt-dlp-exec";

// --- Interfaces ---
// Align with the actual structure returned by ytdlp
interface YtFormat {
    url?: string;
    acodec?: string;
    vcodec?: string;
    ext?: string;
    abr?: number;
    format_id?: string;
    http_headers?: unknown; // `unknown` to match ytdlp's type
}

interface YtResponse {
    title?: string;
    duration?: number;
    thumbnail?: string;
    formats?: YtFormat[];
}

export interface ExtractedAudio {
    title?: string;
    duration?: number;
    thumbnail?: string;
    url: string;
    formatId?: string;
    ext?: string;
    acodec?: string;
    vcodec?: string;
    abr?: number;
    httpHeaders?: Record<string, string>;
}

// --- Constants ---
type ClientName = "default" | "android" | "web" | "ios";
const CLIENTS: ClientName[] = ["default", "android", "web", "ios"];
let preferredClient: ClientName = "android";

// --- Custom Errors ---
class YouTubeExtractionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "YouTubeExtractionError";
    }
}

class PermanentYouTubeError extends YouTubeExtractionError {
    constructor(message: string) {
        super(message);
        this.name = "PermanentYouTubeError";
    }
}

class NoAudioFormatError extends YouTubeExtractionError {
    constructor(client: ClientName) {
        super(`No audio format found for client: ${client}`);
        this.name = "NoAudioFormatError";
    }
}

// --- Helper Functions ---
function orderedClients(): ClientName[] {
    return [preferredClient, ...CLIENTS.filter((client) => client !== preferredClient)];
}

function clientArgs(client: ClientName): string | undefined {
    if (client === "default") return undefined;
    return `youtube:player_client=${client}`;
}

function isPermanentError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes("private video") ||
        lower.includes("video unavailable") ||
        lower.includes("this video is not available") ||
        lower.includes("copyright") ||
        lower.includes("account associated with this video has been terminated") ||
        lower.includes("age-restricted") ||
        lower.includes("sign in to confirm you're not a bot")
    );
}

// Type guard for YtFormat
function isYtFormat(f: unknown): f is YtFormat {
    if (typeof f !== "object" || f === null) return false;
    const obj = f as Record<string, unknown>;
    return (
        typeof obj.url === "string" ||
        typeof obj.acodec === "string" ||
        typeof obj.vcodec === "string" ||
        typeof obj.ext === "string" ||
        typeof obj.abr === "number" ||
        typeof obj.format_id === "string"
    );
}

// Type guard for YtResponse
function isYtResponse(info: unknown): info is YtResponse {
    if (typeof info !== "object" || info === null) return false;
    const obj = info as Record<string, unknown>;
    return (
        typeof obj.title === "string" ||
        typeof obj.duration === "number" ||
        typeof obj.thumbnail === "string" ||
        (Array.isArray(obj.formats) && obj.formats.every(isYtFormat))
    );
}

function chooseAudioFormat(formats: YtFormat[]): YtFormat | undefined {
    return formats
        .filter(
            (f) =>
                Boolean(f?.url) &&
                Boolean(f?.acodec) &&
                f.acodec !== "none" &&
                f?.vcodec === "none"
        )
        .sort((a, b) => {
            const aM4a = a.ext === "m4a" || String(a.acodec || "").includes("mp4a");
            const bM4a = b.ext === "m4a" || String(b.acodec || "").includes("mp4a");
            if (aM4a !== bM4a) return aM4a ? -1 : 1;
            return Number(b.abr || 0) - Number(a.abr || 0);
        })[0];
}

// --- Main Function ---
export async function fetchAudio(
    videoId: string,
    options: {
        retries?: number;
        fragmentRetries?: number;
        socketTimeout?: number;
        debug?: boolean;
    } = {}
): Promise<ExtractedAudio> {
    const {
        retries = 2,
        fragmentRetries = 2,
        socketTimeout = 15000,
        debug = false,
    } = options;

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cookies = process.env.YT_COOKIES;
    const hasCookies = Boolean(cookies && typeof cookies === "string" && fs.existsSync(cookies));
    const cookieOption = hasCookies ? { cookies } : {};

    const baseOptions = {
        dumpSingleJson: true,
        noPlaylist: true,
        noWarnings: true,
        retries,
        fragmentRetries,
        socketTimeout,
        skipDownload: true,
        // ...cookieOption,
    };

    let lastError: Error | undefined;

    for (const client of orderedClients()) {
        try {
            if (debug) console.log(`[DEBUG] Trying client: ${client}`);
            const extractorArgs = clientArgs(client);
            const ytdlpOptions = extractorArgs ? { ...baseOptions, extractorArgs } : baseOptions;

            const response = await ytdlp(watchUrl, ytdlpOptions);
            if (!isYtResponse(response)) {
                throw new YouTubeExtractionError("Invalid response format");
            }

            if (debug) console.log(`[DEBUG] Extracted info for ${videoId}:`, response);

            const formats = Array.isArray(response.formats) ? response.formats : [];
            const selected = chooseAudioFormat(formats);

            if (!selected) {
                lastError = new NoAudioFormatError(client);
                if (debug) console.error(`[DEBUG] ${lastError.message}`);
                continue;
            }

            preferredClient = client;
            if (debug) console.log(`[DEBUG] Selected format:`, selected);

            // Cast http_headers to Record<string, string> if it exists
            const httpHeaders =
                selected.http_headers && typeof selected.http_headers === "object"
                    ? (selected.http_headers as Record<string, string>)
                    : undefined;

            return {
                title: response.title,
                duration: response.duration,
                thumbnail: response.thumbnail,
                url: selected.url || "No URL",
                formatId: selected.format_id,
                ext: selected.ext,
                acodec: selected.acodec,
                vcodec: selected.vcodec,
                abr: selected.abr,
                httpHeaders,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (debug) console.error(`[DEBUG] Client ${client} failed:`, lastError.message);

            if (isPermanentError(lastError.message)) {
                throw new PermanentYouTubeError(lastError.message);
            }
        }
    }

    throw new YouTubeExtractionError(lastError?.message || "EXTRACTION_FAILED");
}

// // --- Example Usage ---
// (async () => {
//     try {
//         const audio = await fetchAudio("dQw4w9WgXcQ", { debug: true });
//         console.log("Extracted audio:", audio);
//     } catch (error) {
//         if (error instanceof PermanentYouTubeError) {
//             console.error("Permanent error:", error.message);
//         } else if (error instanceof YouTubeExtractionError) {
//             console.error("Extraction error:", error.message);
//         } else {
//             console.error("Unknown error:", error);
//         }
//     }
// })();