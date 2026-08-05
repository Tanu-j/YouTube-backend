import http from "http";
import https from "https";

export const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 64,
    maxFreeSockets: 16,
});

export const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 64,
    maxFreeSockets: 16,
});
