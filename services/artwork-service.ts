import axios from "axios";
import fs from "fs/promises";
import { httpsAgent } from "./http-agents";

export async function downloadArtwork(url: string, outputPath: string) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000,
        maxRedirects: 3,
        httpsAgent,
        headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    });

    await fs.writeFile(outputPath, response.data);
    return outputPath;
}
