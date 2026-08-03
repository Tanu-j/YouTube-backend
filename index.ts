import express from "express";
import cors from "cors";

import rateLimit from "express-rate-limit";

import {
    audioCache,
    staleCache,
    cacheKey,
} from "./cache";

import {
    extractionQueue,
} from "./queue";

import {
    fetchAudio,
} from "./yt";
import downloadRoute from "./dt-route";

const app = express();

if (
    process.env
        .TRUST_PROXY ===
    "true"
) {
    app.set(
        "trust proxy",
        1
    );
}



app.use(
    cors()
);

app.disable(
    "x-powered-by"
);

const limiter =
    rateLimit({
        windowMs:
            60 * 1000,

        max: 60,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {
            success:
                false,

            error:
                "Too many requests",
        },
    });

app.use(

    limiter
);

const isValid =
    (
        id: string
    ) =>
        /^[a-zA-Z0-9_-]{11}$/.test(
            id
        );

app.get(
    "/audio/:videoId",
    async (
        req,
        res
    ) => {

        const {
            videoId,
        } = req.params;



        if (
            !isValid(videoId)
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    error:
                        "Invalid video id"

                });

        }



        const key =
            cacheKey(videoId);



        const cached =
            audioCache.get(key);



        if (cached) {

            return res
                .status(200)
                .json({

                    success: true,

                    source:
                        "cache",

                    data:
                        cached

                });

        }




        try {


            // const data =
            //     await Promise.race([


            //         extractionQueue.add(
            //             async () => {

            //                 const result =
            //                     await fetchAudio(
            //                         videoId
            //                     );


            //                 if (
            //                     !result?.url
            //                 ) {

            //                     throw new Error(
            //                         "NO_STREAM_URL"
            //                     );

            //                 }


            //                 return result;

            //             }
            //         ),



            //         new Promise((_, reject) => {

            //             setTimeout(() => {

            //                 reject(
            //                     new Error(
            //                         "YT-DLP TIMEOUT"
            //                     )
            //                 );


            //             }, 20000);


            //         })


            //     ]);


            const timeout =
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(
                            new Error(
                                "YT-DLP TIMEOUT"
                            )
                        );
                    }, 120000);
                });


            const data =
                await Promise.race([

                    extractionQueue.add(
                        async () => {

                            const result =
                                await fetchAudio(
                                    videoId
                                );


                            if (!result?.url) {
                                throw new Error(
                                    "NO_STREAM_URL"
                                );
                            }


                            return result;

                        }
                    ),

                    timeout

                ]);


            audioCache.set(
                key,
                data
            );


            staleCache.set(
                key,
                data
            );




            return res
                .status(200)
                .json({

                    success: true,

                    source:
                        "live",

                    data

                });




        } catch (err: any) {


            console.error(
                "AUDIO EXTRACTION ERROR:",
                err.message
            );



            const stale =
                staleCache.get(key);



            if (stale) {


                return res
                    .status(200)
                    .json({

                        success: true,

                        source:
                            "stale-cache",


                        warning:
                            err.message,


                        data:
                            stale

                    });


            }





            return res
                .status(503)
                .json({

                    success: false,


                    error:
                        err.message ||
                        "Extraction failed"

                });


        }

    }
);

app.get(
    "/artist-image/:name",
    async (
        req,
        res
    ) => {
        const name =
            req.params.name?.trim();

        if (
            !name ||
            name.length >
            100
        ) {
            return res
                .status(
                    400
                )
                .json({
                    success:
                        false,

                    error:
                        "Invalid artist name",
                });
        }

        const key =
            `artist:${name.toLowerCase()}`;

        const cached =
            audioCache.get(
                key
            );

        if (
            cached
        ) {
            return res
                .status(
                    200
                )
                .json({
                    success:
                        true,

                    source:
                        "cache",

                    data:
                        cached,
                });
        }

        try {
            const controller =
                new AbortController();

            const timeout =
                setTimeout(
                    () =>
                        controller.abort(),
                    10000
                );

            const response =
                await fetch(
                    `https://theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(
                        name
                    )}`,
                    {
                        signal:
                            controller.signal,
                    }
                );

            clearTimeout(
                timeout
            );

            if (
                !response.ok
            ) {
                throw new Error(
                    `API returned ${response.status}`
                );
            }

            const result =
                await response.json();

            const artist =
                result
                    ?.artists?.[0];

            if (
                !artist
            ) {
                return res
                    .status(
                        404
                    )
                    .json({
                        success:
                            false,

                        error:
                            "Artist not found",
                    });
            }

            const data = {
                name:
                    artist.strArtist,

                image:
                    artist.strArtistThumb,

                logo:
                    artist.strArtistLogo,

                banner:
                    artist.strArtistBanner,

                fanart:
                    artist.strArtistFanart,
            };

            audioCache.set(
                key,
                data
            );

            staleCache.set(
                key,
                data
            );

            return res
                .status(
                    200
                )
                .json({
                    success:
                        true,

                    source:
                        "live",

                    data,
                });
        } catch (
        err
        ) {
            console.error(
                err
            );

            const stale =
                staleCache.get(
                    key
                );

            if (
                stale
            ) {
                return res
                    .status(
                        200
                    )
                    .json({
                        success:
                            true,

                        source:
                            "stale-cache",

                        warning:
                            "Live lookup failed",

                        data:
                            stale,
                    });
            }

            return res
                .status(
                    503
                )
                .json({
                    success:
                        false,

                    error:
                        "Artist lookup failed",
                });
        }
    }
);


app.use(downloadRoute);

process.on(
    "SIGTERM",
    async () => {
        await extractionQueue.onIdle();

        process.exit(
            0
        );
    }
);

app.listen(
    process.env
        .PORT ||
    3000,
    () => {
        console.log(
            "Server started at 3000"
        );
    }
);