import fs from "fs";
import ytdlp from "yt-dlp-exec";

export async function fetchAudio(videoId: string) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const cookies = process.env.YT_COOKIES;
    const cookieOption = cookies && fs.existsSync(cookies) ? { cookies } : {};

    if (!cookies) {
        console.warn("YT_COOKIES not set — bot-check errors are likely on hosted IPs.");
    } else if (!fs.existsSync(cookies)) {
        console.warn(`YT_COOKIES points to "${cookies}" but that file doesn't exist.`);
    }

    const baseOptions: any = {
        dumpSingleJson: true,
        format: "bestaudio/best",
        noPlaylist: true,
        noWarnings: true,
        retries: 5,
        fragmentRetries: 5,
        socketTimeout: 30000,
        preferFreeFormats: true,
        skipDownload: true,
        ...cookieOption,
    };

    // Try a few different player clients — YouTube's bot-detection doesn't
    // treat them equally, and which one currently works shifts over time.
    // Cookies (if present) are applied on every attempt via baseOptions.
    const attempts = [
        { ...baseOptions, extractorArgs: "youtube:player_client=android" },
        { ...baseOptions, extractorArgs: "youtube:player_client=web" },
        { ...baseOptions, extractorArgs: "youtube:player_client=ios" },
        { ...baseOptions }, // no forced client — let yt-dlp pick its default
    ];

    let lastError: any;

    for (const options of attempts) {
        try {
            const info: any = await ytdlp(url, options);

            // Select only audio-only formats
            const audioFormats = (info.formats || [])
                .filter(
                    (f: any) =>
                        f.url &&
                        f.acodec &&
                        f.acodec !== "none" &&
                        f.vcodec === "none"
                )
                .sort((a: any, b: any) => {
                    const abrA = Number(a.abr || 0);
                    const abrB = Number(b.abr || 0);
                    return abrB - abrA;
                });

            const selected = audioFormats[0];

            if (!selected) {
                console.log("NO AUDIO FORMAT FOUND");
                console.log(JSON.stringify(info).slice(0, 2000));
                lastError = new Error("NO_AUDIO");
                continue;
            }

            console.log("Selected format:", {
                itag: selected.format_id,
                ext: selected.ext,
                mime: selected.mime_type,
                abr: selected.abr,
                acodec: selected.acodec,
                vcodec: selected.vcodec,
            });

            return {
                title: info.title,
                duration: info.duration,
                thumbnail: info.thumbnail,
                url: selected.url,
            };
        } catch (error: any) {
            lastError = error;
            console.error("fetchAudio attempt failed:", error.message);

            const msg = String(error.message || "").toLowerCase();

            // Truly permanent: no client/cookie combination will fix these,
            // so stop retrying immediately.
            const permanent =
                msg.includes("private video") ||
                msg.includes("video unavailable") ||
                msg.includes("copyright") ||
                msg.includes("this video is not available") ||
                msg.includes("account associated with this video has been terminated");

            // Bot-check ("Sign in to confirm you're not a bot") is NOT
            // permanent — it's IP/client-reputation based, so a different
            // player_client (or cookies, if not already applied) might
            // succeed on the next attempt. Let the loop continue.
            if (permanent) break;
        }
    }

    throw new Error(lastError?.message || "EXTRACTION_FAILED");
}