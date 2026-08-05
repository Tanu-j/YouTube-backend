import fs from "fs";
import ytdlp from "yt-dlp-exec";

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

type ClientName = "default" | "android" | "web" | "ios";

// Remember the client that most recently succeeded. This makes a Railway
// process converge on the working extractor instead of paying for the same
// failed client attempts on every new song.
let preferredClient: ClientName = "android";

const CLIENTS: ClientName[] = ["default", "android", "web", "ios"];

function orderedClients(): ClientName[] {
    return [
        preferredClient,
        ...CLIENTS.filter((client) => client !== preferredClient),
    ];
}

function clientArgs(client: ClientName): string | undefined {
    if (client === "default") return undefined;
    return `youtube:player_client=${client}`;
}

function chooseAudioFormat(formats: any[]) {
    return formats
        .filter((f: any) =>
            Boolean(f?.url) &&
            Boolean(f?.acodec) &&
            f.acodec !== "none" &&
            f?.vcodec === "none"
        )
        .sort((a: any, b: any) => {
            const aM4a = a.ext === "m4a" || String(a.acodec || "").includes("mp4a");
            const bM4a = b.ext === "m4a" || String(b.acodec || "").includes("mp4a");

            // Mobile-friendly AAC/M4A first; within the same codec family,
            // choose the highest bitrate.
            if (aM4a !== bM4a) return aM4a ? -1 : 1;
            return Number(b.abr || 0) - Number(a.abr || 0);
        })[0];
}

export async function fetchAudio(videoId: string): Promise<ExtractedAudio> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const cookies = process.env.YT_COOKIES;
    const hasCookies = Boolean(cookies && fs.existsSync(cookies));

    const cookieOption = hasCookies ? { cookies } : {};

    const baseOptions: any = {
        dumpSingleJson: true,
        noPlaylist: true,
        noWarnings: true,
        // This is metadata/URL extraction, not media downloading. Large
        // retry counts make every failed client painfully slow.
        retries: 2,
        fragmentRetries: 2,
        socketTimeout: 15000,
        skipDownload: true,
        ...cookieOption,
    };

    let lastError: any;

    for (const client of orderedClients()) {
        try {
            const extractorArgs = clientArgs(client);
            const options = extractorArgs
                ? { ...baseOptions, extractorArgs }
                : baseOptions;

            const info: any = await ytdlp(watchUrl, options);
            const formats = Array.isArray(info.formats) ? info.formats : [];
            const selected = chooseAudioFormat(formats);

            if (!selected) {
                lastError = new Error(`NO_AUDIO_FORMAT:${client}`);
                continue;
            }

            // Adapt to the working client for subsequent songs.
            preferredClient = client;

            return {
                title: info.title,
                duration: info.duration,
                thumbnail: info.thumbnail,
                url: selected.url,
                formatId: selected.format_id,
                ext: selected.ext,
                acodec: selected.acodec,
                vcodec: selected.vcodec,
                abr: selected.abr,
                httpHeaders: selected.http_headers,
            };
        } catch (error: any) {
            lastError = error;
            const message = String(error?.message || error);
            const lower = message.toLowerCase();

            const permanent =
                lower.includes("private video") ||
                lower.includes("video unavailable") ||
                lower.includes("this video is not available") ||
                lower.includes("copyright") ||
                lower.includes("account associated with this video has been terminated");

            if (permanent) break;
        }
    }

    throw new Error(lastError?.message || "EXTRACTION_FAILED");
}
