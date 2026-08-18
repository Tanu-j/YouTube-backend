import fs from "fs";

const CDN_USER_AGENT =
    "com.google.android.youtube/19.29.37 (Linux; U; Android 14; en_US) gzip";

let cachedCookiePath: string | undefined;
let cachedCookieMtime = -1;
let cachedCookieHeader: string | undefined;

function buildCookieHeader(): string | undefined {
    const cookiesPath = process.env.YT_COOKIES;
    if (!cookiesPath || !fs.existsSync(cookiesPath)) return undefined;

    try {
        const stat = fs.statSync(cookiesPath);
        if (cookiesPath === cachedCookiePath && stat.mtimeMs === cachedCookieMtime) {
            return cachedCookieHeader;
        }

        const pairs: string[] = [];
        const lines = fs.readFileSync(cookiesPath, "utf8").split("\n");

        for (const line of lines) {
            if (!line || line.startsWith("#") || !line.includes("\t")) continue;
            const cols = line.split("\t");
            const name = cols[5];
            const value = cols[6];
            if (name && value !== undefined) pairs.push(`${name}=${value}`);
        }

        cachedCookiePath = cookiesPath;
        cachedCookieMtime = stat.mtimeMs;
        cachedCookieHeader = pairs.length ? pairs.join("; ") : undefined;
        return cachedCookieHeader;
    } catch {
        return undefined;
    }
}

export function getCdnRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        "User-Agent": CDN_USER_AGENT,
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
    };

    const cookieHeader = buildCookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    return headers;
}
