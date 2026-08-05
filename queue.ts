import PQueue from "p-queue";

/**
 * Central yt-dlp extraction queue.
 *
 * Keep extraction concurrency limited because yt-dlp is CPU/network
 * intensive and spawning too many processes makes everything slower.
 *
 * MAX_CONCURRENT can be configured through the environment.
 */
const configuredConcurrency = Number(
    process.env.MAX_CONCURRENT
);

const concurrency =
    Number.isFinite(configuredConcurrency) &&
        configuredConcurrency > 0
        ? Math.floor(configuredConcurrency)
        : 2;

export const extractionQueue = new PQueue({
    concurrency,
    timeout: 120_000,
});