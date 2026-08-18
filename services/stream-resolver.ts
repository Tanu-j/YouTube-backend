import {
    audioCache,
    staleCache,
    cacheKey,
} from "../cache";

import { extractionQueue } from "../queue";
import { fetchAudio } from "../yt";
import { withInflightDedup } from "./inflight";

export interface ResolvedStream {
    url: string;
    title: string;
    duration?: number;
    thumbnail: string;
    formatId?: string;
    ext?: string;
    acodec?: string;
    vcodec?: string;
    abr?: number;
}

function withFallbackThumbnail(
    videoId: string,
    thumbnail?: string
): string {
    return (
        thumbnail ||
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    );
}

/**
 * Extract a fresh YouTube stream.
 *
 * Queueing happens here so every consumer uses the same extraction limit.
 */
async function extractFresh(
    videoId: string
): Promise<ResolvedStream> {
    const result = await extractionQueue.add(
        async () => {
            const audio = await fetchAudio(videoId);

            if (!audio?.url) {
                throw new Error("NO_STREAM_URL");
            }

            return audio;
        }
    );

    const resolved: ResolvedStream = {
        url: result.url,
        title: result.title || videoId,
        duration: result.duration,
        thumbnail: withFallbackThumbnail(
            videoId,
            result.thumbnail
        ),
        formatId: result.formatId,
        ext: result.ext,
        acodec: result.acodec,
        vcodec: result.vcodec,
        abr: result.abr,
    };

    const key = cacheKey(videoId);

    audioCache.set(key, resolved);
    staleCache.set(key, resolved);

    return resolved;
}

/**
 * Single source of truth for obtaining a playable stream.
 *
 * Fast path:
 *   memory cache
 *
 * Fallback:
 *   stale cache
 *
 * Fresh path:
 *   yt-dlp
 *
 * Concurrent calls for the same video share the same extraction.
 */
export async function getStreamUrl(
    videoId: string,
    forceRefresh = false
): Promise<ResolvedStream> {
    const key = cacheKey(videoId);

    if (!forceRefresh) {
        const cached =
            audioCache.get<ResolvedStream>(key);

        if (cached?.url) {
            return cached;
        }

        const stale =
            staleCache.get<ResolvedStream>(key);

        if (stale?.url) {
            return stale;
        }
    }

    const inflightKey =
        `extract:${videoId}`;

    return withInflightDedup(
        inflightKey,
        () => extractFresh(videoId)
    );
}