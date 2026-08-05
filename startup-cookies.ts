// startup-cookies.ts
import fs from "fs";
import path from "path";

const COOKIES_PATH = path.join(
    process.cwd(),
    "cookies.txt"
);

export function writeCookiesFromEnv() {
    const content =
        process.env.YT_COOKIES_CONTENT;

    /*
     * Local development can point directly at an existing cookies.txt.
     * Railway can provide the same file through YT_COOKIES_CONTENT.
     * Don't warn about missing CONTENT when the configured file already
     * exists — that is a valid setup.
     */
    if (!content) {
        const configuredPath =
            process.env.YT_COOKIES;

        if (
            configuredPath &&
            fs.existsSync(configuredPath)
        ) {
            console.log(
                "Using YouTube cookies file:",
                configuredPath
            );
            return;
        }

        console.warn(
            "YT_COOKIES_CONTENT not set and no valid YT_COOKIES file found — " +
            "yt-dlp may hit YouTube's bot-check on Railway's IPs."
        );
        return;
    }

    try {
        // Railway variables are sometimes pasted with literal "\\n"\n        // sequences instead of real newline characters. Convert only when
        // the content looks like a Netscape cookie file stored that way.
        const normalizedContent = content.includes("\\n")
            ? content.replace(/\\r?\\n/g, "\n")
            : content;

        fs.writeFileSync(
            COOKIES_PATH,
            normalizedContent,
            "utf-8"
        );

        process.env.YT_COOKIES =
            COOKIES_PATH;

        // Diagnostic only — never print cookie values.
        const written = fs.readFileSync(
            COOKIES_PATH,
            "utf-8"
        );
        const lineCount = written
            .split("\n")
            .filter(Boolean)
            .length;

        console.log(
            "YouTube cookies written to",
            COOKIES_PATH,
            "| bytes:",
            written.length,
            "| lines:",
            lineCount
        );
    } catch (err: any) {
        console.error(
            "Failed to write cookies file:",
            err?.message || err
        );
    }
}
