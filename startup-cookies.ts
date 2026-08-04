// startup-cookies.ts
import fs from "fs";
import path from "path";

const COOKIES_PATH = path.join(process.cwd(), "cookies.txt");

export function writeCookiesFromEnv() {
    const content = process.env.YT_COOKIES_CONTENT;

    if (!content) {
        console.warn(
            "YT_COOKIES_CONTENT not set — yt-dlp will run without cookies " +
            "and may hit YouTube's bot-check on Railway's IPs."
        );
        return;
    }

    try {
        fs.writeFileSync(COOKIES_PATH, content, "utf-8");
        process.env.YT_COOKIES = COOKIES_PATH;
        console.log("YouTube cookies written to", COOKIES_PATH);
    } catch (err: any) {
        console.error("Failed to write cookies file:", err.message);
    }
}