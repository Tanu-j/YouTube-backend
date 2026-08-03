import express from "express";
import cors from "cors";
import ytdlp from "yt-dlp-exec";

const app = express();

app.use(cors());

app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;

const REQUEST_TIMEOUT = 25000;

const isValidVideoId = (id: string) =>
    /^[a-zA-Z0-9_-]{11}$/.test(id);

function getStatusCode(error: unknown) {
    const msg =
        error instanceof Error
            ? error.message.toLowerCase()
            : String(error).toLowerCase();

    if (
        msg.includes("429") ||
        msg.includes("too many requests") ||
        msg.includes("rate limit")
    ) {
        return 429;
    }

    if (
        msg.includes("private") ||
        msg.includes("sign in to confirm")
    ) {
        return 403;
    }

    if (
        msg.includes("video unavailable") ||
        msg.includes("not available") ||
        msg.includes("removed") ||
        msg.includes("404")
    ) {
        return 404;
    }

    if (
        msg.includes("timeout") ||
        msg.includes("timed out")
    ) {
        return 504;
    }

    return 500;
}

function getErrorMessage(error: unknown) {
    const msg =
        error instanceof Error
            ? error.message.toLowerCase()
            : String(error).toLowerCase();

    if (
        msg.includes("429") ||
        msg.includes("too many requests")
    ) {
        return "YouTube temporarily rate limited requests.";
    }

    if (msg.includes("private")) {
        return "This video is private.";
    }

    if (
        msg.includes("video unavailable") ||
        msg.includes("removed")
    ) {
        return "Video is unavailable.";
    }

    if (
        msg.includes("sign in to confirm")
    ) {
        return "YouTube blocked access temporarily.";
    }

    if (
        msg.includes("timeout")
    ) {
        return "Request timed out.";
    }

    return "Unable to fetch audio.";
}

app.get("/audio/:videoId", async (req, res) => {
    const start = Date.now();

    try {
        const { videoId } = req.params;

        // Validation
        if (!videoId || !isValidVideoId(videoId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid YouTube video ID",
            });
        }

        const url =
            `https://www.youtube.com/watch?v=${videoId}`;

        const info: any = await Promise.race([
            ytdlp(url, {
                dumpSingleJson: true,

                // safer extraction
                format: "bestaudio/best",

                noWarnings: true,
                // noCallHome: true,

                // retries
                retries: 3,
                // fragmentRetries: 3,

                socketTimeout: 15000,

                // avoid playlists
                noPlaylist: true,
            }),

            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("Timeout")),
                    REQUEST_TIMEOUT
                )
            ),
        ]);

        if (!info) {
            return res.status(502).json({
                success: false,
                error: "No data returned",
            });
        }

        const audioUrl =
            info.url ||
            info.requested_downloads?.[0]?.url ||
            info.formats?.find(
                (f: any) =>
                    f.acodec !== "none"
            )?.url;

        if (!audioUrl) {
            return res.status(404).json({
                success: false,
                error: "No playable audio found",
            });
        }

        return res.status(200).json({
            success: true,

            data: {
                videoId,
                title: info.title || null,
                duration: info.duration || null,
                thumbnail: info.thumbnail || null,
                url: audioUrl,
            },

            meta: {
                elapsedMs:
                    Date.now() - start,
            },
        });
    } catch (error) {
        const status =
            getStatusCode(error);

        console.error(
            `[audio] ${status}`,
            error
        );

        return res.status(status).json({
            success: false,

            error:
                getErrorMessage(error),

            retryable:
                status === 429 ||
                status === 504,

            timestamp:
                new Date().toISOString(),
        });
    }
});

// Global crash protection
process.on(
    "unhandledRejection",
    (err) => {
        console.error(
            "Unhandled Rejection",
            err
        );
    }
);

process.on(
    "uncaughtException",
    (err) => {
        console.error(
            "Uncaught Exception",
            err
        );
    }
);

app.listen(PORT, () => {
    console.log(
        `Server running on ${PORT}`
    );
});