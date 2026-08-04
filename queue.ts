import PQueue from "p-queue";

export const extractionQueue =
    new PQueue({
        concurrency:
            Number(
                process.env
                    .MAX_CONCURRENT || 2
            ),

        timeout: 120000,

        // throwOnTimeout: true,
    });