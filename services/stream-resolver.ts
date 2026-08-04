import { audioCache, staleCache, cacheKey } from "../cache";
import { extractionQueue } from "../queue";
import { fetchAudio } from "../yt";
import { getCdnRequestHeaders } from "./cdn-headers";

export interface ResolvedStream {
    url: string;
    title: string;
    duration?: number;
    thumbnail: string;
}

async function isUrlAlive(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        // Same header requirement as the actual download fetch — without
        // these, a perfectly valid cached URL can come back non-ok here
        // and trigger an unnecessary re-extraction.
        const res = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            headers: getCdnRequestHeaders(),
        });
        clearTimeout(timeout);
        return res.ok;
    } catch {
        return false;
    }
}

function withFallbackThumbnail(videoId: string, thumbnail?: string): string {
    return thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// Single source of truth for "give me a playable URL for this videoId" —
// used by both /audio (playback) and /download, so they share the exact
// same cache entries and the exact same concurrency-limited extraction.
export async function getStreamUrl(videoId: string, forceRefresh = false): Promise<ResolvedStream> {
    const key = cacheKey(videoId);
    const cached = audioCache.get(key) as ResolvedStream | undefined;

    if (!forceRefresh && cached?.url && (await isUrlAlive(cached.url))) {
        return cached;
    }

    const result = await extractionQueue.add(async () => {
        const r = await fetchAudio(videoId);
        if (!r?.url) throw new Error("NO_STREAM_URL");
        return r;
    }) as any;

    const resolved: ResolvedStream = {
        url: result.url,
        title: result.title || videoId,
        duration: result.duration,
        thumbnail: withFallbackThumbnail(videoId, result.thumbnail),
    };

    audioCache.set(key, resolved);
    staleCache.set(key, resolved);
    return resolved;
}