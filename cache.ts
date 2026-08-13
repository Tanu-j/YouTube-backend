// import NodeCache from "node-cache";

// const CACHE_TTL =
//     Number(process.env.CACHE_TTL || 900);

// const STALE_CACHE_TTL =
//     Number(process.env.STALE_CACHE_TTL || 86400);

// export const audioCache =
//     new NodeCache({
//         stdTTL: CACHE_TTL,
//         checkperiod: 60,
//         useClones: false,
//     });

// export const staleCache =
//     new NodeCache({
//         stdTTL: STALE_CACHE_TTL,
//         checkperiod: 300,
//         useClones: false,
//     });

// export const cacheKey =
//     (videoId: string) =>
//         `audio:${videoId}`;

import NodeCache from "node-cache";

const CACHE_TTL =
    Number(process.env.CACHE_TTL || 900);

const STALE_CACHE_TTL =
    Number(process.env.STALE_CACHE_TTL || 86400);

export const audioCache =
    new NodeCache({
        stdTTL: CACHE_TTL,
        checkperiod: 60,
        useClones: false,
    });

export const staleCache =
    new NodeCache({
        stdTTL: STALE_CACHE_TTL,
        checkperiod: 300,
        useClones: false,
    });

export const cacheKey =
    (videoId: string, quality?: string) =>
        quality ? `audio:${videoId}:${quality}` : `audio:${videoId}`;