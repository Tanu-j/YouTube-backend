import fs from "fs";

// googlevideo.com CDN URLs are only reliably served back when the
// request "looks like" the client that originally resolved them —
// a bare axios/fetch call with no User-Agent (what every CDN fetch
// in this project was sending) gets a 403 even though the URL itself
// is valid and unexpired. This mirrors a real Android YouTube client,
// which is the most durable client for this across yt-dlp's extractor.
const CDN_USER_AGENT =
    "com.google.android.youtube/19.29.37 (Linux; U; Android 14; en_US) gzip";

// Best-effort: read the same cookies.txt used for extraction and turn
// it into a "Cookie" header for the CDN fetch too. Some formats are
// gated on the session being present at download time, not just at
// metadata-resolution time. Silently no-ops if cookies aren't set —
// this is additive, never required for the request to be attempted.
function buildCookieHeader(): string | undefined {
    const cookiesPath = process.env.YT_COOKIES;
    if (!cookiesPath || !fs.existsSync(cookiesPath)) return undefined;

    try {
        const lines = fs.readFileSync(cookiesPath, "utf-8").split("\n");
        const pairs: string[] = [];

        for (const line of lines) {
            if (!line || line.startsWith("#") || !line.includes("\t")) continue;
            const cols = line.split("\t");
            // Netscape cookie file format: domain, includeSubdomains, path,
            // secure, expiry, name, value
            const name = cols[5];
            const value = cols[6];
            if (name && value !== undefined) pairs.push(`${name}=${value}`);
        }

        return pairs.length ? pairs.join("; ") : undefined;
    } catch {
        return undefined;
    }
}

// Headers to attach to every request that fetches a resolved
// googlevideo.com stream URL (both the plain axios.get calls and the
// HEAD-based liveness check) — without these, Google's CDN can 403
// an otherwise valid, unexpired URL.
export function getCdnRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        "User-Agent": CDN_USER_AGENT,
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
    };

    const cookieHeader = buildCookieHeader();
    if (cookieHeader) headers["Cookie"] = cookieHeader;

    return headers;
}
