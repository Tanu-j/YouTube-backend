import http from "http";
import https from "https";

/*
 * CRITICAL:
 *
 * yt-dlp is told to extract using IPv4 (forceIpv4: true in yt.ts), which
 * bakes our IPv4 egress address into the signed googlevideo URL. If the
 * later playback request goes out over IPv6 instead (common on dual-stack
 * hosts like Railway), the IP no longer matches what was signed and
 * googlevideo responds with 403 -- every time, refresh or not.
 *
 * Forcing family: 4 here keeps every request on these agents on the same
 * IPv4 path that yt-dlp used, so the signed URL's IP always matches.
 */
export const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 64,
    maxFreeSockets: 16,
    family: 4,
});

export const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 64,
    maxFreeSockets: 16,
    family: 4,
});