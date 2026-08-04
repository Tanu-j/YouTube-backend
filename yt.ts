// // // // // // // import fs from "fs";
// // // // // // // import ytdlp from "yt-dlp-exec";

// // // // // // // export async function fetchAudio(
// // // // // // //     videoId: string
// // // // // // // ) {
// // // // // // //     const url =
// // // // // // //         `https://www.youtube.com/watch?v=${videoId}`;

// // // // // // //     const cookies =
// // // // // // //         process.env.YT_COOKIES;

// // // // // // //     const proxy =
// // // // // // //         process.env.YT_PROXY;

// // // // // // //     const options: any = {
// // // // // // //         dumpSingleJson: true,

// // // // // // //         format:
// // // // // // //             "bestaudio/best",

// // // // // // //         retries: 5,

// // // // // // //         fragmentRetries: 5,

// // // // // // //         socketTimeout:
// // // // // // //             15000,

// // // // // // //         noPlaylist: true,

// // // // // // //         noWarnings: true,

// // // // // // //         noCallHome: true,
// // // // // // //     };

// // // // // // //     if (
// // // // // // //         cookies &&
// // // // // // //         fs.existsSync(cookies)
// // // // // // //     ) {
// // // // // // //         options.cookies =
// // // // // // //             cookies;
// // // // // // //     }

// // // // // // //     if (proxy) {
// // // // // // //         options.proxy =
// // // // // // //             proxy;
// // // // // // //     }

// // // // // // //     const info: any =
// // // // // // //         await ytdlp(
// // // // // // //             url,
// // // // // // //             options
// // // // // // //         );

// // // // // // //     const stream =
// // // // // // //         info.url ||
// // // // // // //         info
// // // // // // //             .requested_downloads?.[0]
// // // // // // //             ?.url ||
// // // // // // //         info.formats?.find(
// // // // // // //             (f: any) =>
// // // // // // //                 f.acodec !==
// // // // // // //                 "none"
// // // // // // //         )?.url;

// // // // // // //     if (!stream) {
// // // // // // //         throw new Error(
// // // // // // //             "NO_AUDIO"
// // // // // // //         );
// // // // // // //     }

// // // // // // //     return {
// // // // // // //         title:
// // // // // // //             info.title,

// // // // // // //         duration:
// // // // // // //             info.duration,

// // // // // // //         thumbnail:
// // // // // // //             info.thumbnail,

// // // // // // //         url: stream,
// // // // // // //     };
// // // // // // // }


// // // // // import fs from "fs";
// // // // // import ytdlp from "yt-dlp-exec";


// // // // // export async function fetchAudio(
// // // // //     videoId: string
// // // // // ) {


// // // // //     const url =
// // // // //         `https://www.youtube.com/watch?v=${videoId}`;



// // // // //     const options: any = {


// // // // //         dumpSingleJson: true,



// // // // //         format:
// // // // //             "bestaudio[ext=m4a]/bestaudio/best",


// // // // //         noPlaylist: true,


// // // // //         retries: 3,


// // // // //         fragmentRetries: 3,


// // // // //         socketTimeout: 15000,


// // // // //         noWarnings: true,




// // // // //         preferFreeFormats: true,

// // // // //         // noCallHome: true,

// // // // //         // youtubeSkipDashManifest: true,

// // // // //     };



// // // // //     const cookies =
// // // // //         process.env.YT_COOKIES;



// // // // //     if (
// // // // //         cookies &&
// // // // //         fs.existsSync(cookies)
// // // // //     ) {

// // // // //         options.cookies =
// // // // //             cookies;

// // // // //     }



// // // // //     try {


// // // // //         const info: any =
// // // // //             await ytdlp(
// // // // //                 url,
// // // // //                 options
// // // // //             );



// // // // //         const audioFormat =
// // // // //             info.formats?.find(
// // // // //                 (f: any) =>

// // // // //                     f.acodec &&
// // // // //                     f.acodec !== "none" &&
// // // // //                     f.url

// // // // //             );



// // // // //         const stream =
// // // // //             audioFormat?.url ||
// // // // //             info.url;



// // // // //         if (!stream) {


// // // // //             console.log(
// // // // //                 "YT-DLP RESPONSE:",
// // // // //                 info
// // // // //             );


// // // // //             throw new Error(
// // // // //                 "NO_AUDIO"
// // // // //             );


// // // // //         }



// // // // //         return {


// // // // //             title:
// // // // //                 info.title,


// // // // //             duration:
// // // // //                 info.duration,


// // // // //             thumbnail:
// // // // //                 info.thumbnail,


// // // // //             url:
// // // // //                 stream


// // // // //         };



// // // // //     } catch (error: any) {


// // // // //         console.log(
// // // // //             "YT-DLP FAILED:",
// // // // //             error.message
// // // // //         );


// // // // //         throw error;

// // // // //     }

// // // // // }

// // // // import fs from "fs";
// // // // import ytdlp from "yt-dlp-exec";

// // // // export async function fetchAudio(
// // // //     videoId: string
// // // // ) {

// // // //     const url =
// // // //         `https://www.youtube.com/watch?v=${videoId}`;


// // // //     const options: any = {

// // // //         dumpSingleJson: true,

// // // //         format:
// // // //             "bestaudio[ext=m4a]/bestaudio",

// // // //         noPlaylist: true,

// // // //         noWarnings: true,

// // // //         noCallHome: true,

// // // //         retries: 5,

// // // //         fragmentRetries: 5,

// // // //         socketTimeout: 30000,

// // // //         preferFreeFormats: true,

// // // //         skipDownload: true,

// // // //     };


// // // //     const cookies =
// // // //         process.env.YT_COOKIES;


// // // //     if (
// // // //         cookies &&
// // // //         fs.existsSync(cookies)
// // // //     ) {

// // // //         options.cookies =
// // // //             cookies;

// // // //     }


// // // //     try {

// // // //         const info: any =
// // // //             await ytdlp(
// // // //                 url,
// // // //                 options
// // // //             );


// // // //         const stream =
// // // //             info.url ||
// // // //             info.formats?.find(
// // // //                 (f: any) =>
// // // //                     f.acodec &&
// // // //                     f.acodec !== "none" &&
// // // //                     f.url
// // // //             )?.url;


// // // //         if (!stream) {

// // // //             console.log(
// // // //                 "NO STREAM:",
// // // //                 JSON.stringify(info).slice(0, 1000)
// // // //             );

// // // //             throw new Error(
// // // //                 "NO_AUDIO"
// // // //             );

// // // //         }


// // // //         return {

// // // //             title:
// // // //                 info.title,

// // // //             duration:
// // // //                 info.duration,

// // // //             thumbnail:
// // // //                 info.thumbnail,

// // // //             url:
// // // //                 stream

// // // //         };


// // // //     } catch (error: any) {


// // // //         console.log(
// // // //             "YT-DLP FAILED:",
// // // //             error.message
// // // //         );


// // // //         throw error;

// // // //     }

// // // // }

// // // import fs from "fs";
// // // import ytdlp from "yt-dlp-exec";

// // // const MAX_ATTEMPTS = 2;

// // // export async function fetchAudio(videoId: string) {
// // //     const url = `https://www.youtube.com/watch?v=${videoId}`;

// // //     const baseOptions: any = {
// // //         getUrl: true, // -g : resolve the URL only, skip full metadata dump
// // //         format: "bestaudio[ext=m4a]/bestaudio",
// // //         noPlaylist: true,
// // //         noWarnings: true,
// // //         noCallHome: true,
// // //         retries: 5,
// // //         fragmentRetries: 5,
// // //         socketTimeout: 30000,
// // //         preferFreeFormats: true,
// // //         skipDownload: true,
// // //         extractorArgs: "youtube:player_client=android",
// // //     };

// // //     const cookies = process.env.YT_COOKIES;
// // //     if (cookies && fs.existsSync(cookies)) {
// // //         baseOptions.cookies = cookies;
// // //     }

// // //     let lastError: any;

// // //     for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
// // //         try {
// // //             // getUrl mode returns a plain string (or multi-line string for
// // //             // separate video/audio) rather than JSON, so we ask separately
// // //             // for the small bits of metadata we need.
// // //             const [streamUrl, info]: [string, any] = await Promise.all([
// // //                 ytdlp(url, baseOptions) as unknown as Promise<string>,
// // //                 ytdlp(url, {
// // //                     ...baseOptions,
// // //                     getUrl: false,
// // //                     dumpSingleJson: true,
// // //                     // don't re-resolve formats we don't need for metadata
// // //                 }),
// // //             ]);

// // //             const resolvedUrl = String(streamUrl).trim().split("\n")[0];

// // //             if (!resolvedUrl || !resolvedUrl.startsWith("http")) {
// // //                 throw new Error("NO_AUDIO");
// // //             }

// // //             return {
// // //                 title: info?.title,
// // //                 duration: info?.duration,
// // //                 thumbnail: info?.thumbnail,
// // //                 url: resolvedUrl,
// // //             };
// // //         } catch (error: any) {
// // //             lastError = error;
// // //             console.error(`fetchAudio attempt ${attempt} failed:`, error.message);

// // //             // Retry once on transient network errors; don't retry on
// // //             // clearly permanent failures (private/deleted video etc).
// // //             const msg = String(error.message || "").toLowerCase();
// // //             const permanent =
// // //                 msg.includes("private video") ||
// // //                 msg.includes("video unavailable") ||
// // //                 msg.includes("sign in") ||
// // //                 msg.includes("copyright");

// // //             if (permanent || attempt === MAX_ATTEMPTS) break;
// // //         }
// // //     }

// // //     throw new Error(lastError?.message || "EXTRACTION_FAILED");
// // // }
// // import fs from "fs";
// // import ytdlp from "yt-dlp-exec";

// // export async function fetchAudio(videoId: string) {
// //     const url = `https://www.youtube.com/watch?v=${videoId}`;

// //     const cookies = process.env.YT_COOKIES;
// //     const cookieOption = cookies && fs.existsSync(cookies) ? { cookies } : {};

// //     const baseOptions: any = {
// //         dumpSingleJson: true,
// //         format: "bestaudio/best",
// //         noPlaylist: true,
// //         noWarnings: true,
// //         retries: 5,
// //         fragmentRetries: 5,
// //         socketTimeout: 30000,
// //         preferFreeFormats: true,
// //         skipDownload: true,
// //         ...cookieOption,
// //     };

// //     // Try fastest path first (android client skips signature deciphering),
// //     // fall back to yt-dlp's default client resolution if that format set
// //     // doesn't have what we need for this particular video.
// //     const attempts = [
// //         { ...baseOptions, extractorArgs: "youtube:player_client=android" },
// //         { ...baseOptions }, // no forced client — default web-based resolution
// //     ];

// //     let lastError: any;

// //     for (const options of attempts) {
// //         try {
// //             const info: any = await ytdlp(url, options);

// //             const stream =
// //                 info.url ||
// //                 info.formats?.find((f: any) => f.acodec && f.acodec !== "none" && f.url)?.url;

// //             if (!stream) {
// //                 console.log("NO STREAM:", JSON.stringify(info).slice(0, 1000));
// //                 lastError = new Error("NO_AUDIO");
// //                 continue;
// //             }

// //             return {
// //                 title: info.title,
// //                 duration: info.duration,
// //                 thumbnail: info.thumbnail,
// //                 url: stream,
// //             };
// //         } catch (error: any) {
// //             lastError = error;
// //             console.error("fetchAudio attempt failed:", error.message);

// //             const msg = String(error.message || "").toLowerCase();
// //             const permanent =
// //                 msg.includes("private video") ||
// //                 msg.includes("video unavailable") ||
// //                 msg.includes("sign in") ||
// //                 msg.includes("copyright");

// //             if (permanent) break; // no point trying the fallback client for these
// //         }
// //     }

// //     throw new Error(lastError?.message || "EXTRACTION_FAILED");
// // }

// import fs from "fs";
// import ytdlp from "yt-dlp-exec";

// export async function fetchAudio(videoId: string) {
//     const url = `https://www.youtube.com/watch?v=${videoId}`;

//     const cookies = process.env.YT_COOKIES;
//     const cookieOption = cookies && fs.existsSync(cookies) ? { cookies } : {};

//     const baseOptions: any = {
//         dumpSingleJson: true,
//         format: "bestaudio/best",
//         noPlaylist: true,
//         noWarnings: true,
//         retries: 5,
//         fragmentRetries: 5,
//         socketTimeout: 30000,
//         preferFreeFormats: true,
//         skipDownload: true,
//         ...cookieOption,
//     };

//     const attempts = [
//         { ...baseOptions, extractorArgs: "youtube:player_client=android" },
//         { ...baseOptions },
//     ];

//     let lastError: any;

//     for (const options of attempts) {
//         try {
//             const info: any = await ytdlp(url, options);

//             // Select only audio-only formats
//             const audioFormats = (info.formats || [])
//                 .filter(
//                     (f: any) =>
//                         f.url &&
//                         f.acodec &&
//                         f.acodec !== "none" &&
//                         f.vcodec === "none"
//                 )
//                 .sort((a: any, b: any) => {
//                     const abrA = Number(a.abr || 0);
//                     const abrB = Number(b.abr || 0);
//                     return abrB - abrA;
//                 });

//             const selected = audioFormats[0];

//             if (!selected) {
//                 console.log("NO AUDIO FORMAT FOUND");
//                 console.log(JSON.stringify(info).slice(0, 2000));
//                 lastError = new Error("NO_AUDIO");
//                 continue;
//             }

//             console.log("Selected format:", {
//                 itag: selected.format_id,
//                 ext: selected.ext,
//                 mime: selected.mime_type,
//                 abr: selected.abr,
//                 acodec: selected.acodec,
//                 vcodec: selected.vcodec,
//             });

//             return {
//                 title: info.title,
//                 duration: info.duration,
//                 thumbnail: info.thumbnail,
//                 url: selected.url,
//             };
//         } catch (error: any) {
//             lastError = error;
//             console.error("fetchAudio attempt failed:", error.message);

//             const msg = String(error.message || "").toLowerCase();
//             const permanent =
//                 msg.includes("private video") ||
//                 msg.includes("video unavailable") ||
//                 msg.includes("sign in") ||
//                 msg.includes("copyright");

//             if (permanent) break;
//         }
//     }

//     throw new Error(lastError?.message || "EXTRACTION_FAILED");
// }

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