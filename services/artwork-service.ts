import axios from "axios";
import fs from "fs";

export async function downloadArtwork(
    url: string,
    outputPath: string
) {
    const response = await axios.get(
        url,
        {
            responseType: "arraybuffer"
        }
    );

    fs.writeFileSync(
        outputPath,
        response.data
    );

    return outputPath;
}