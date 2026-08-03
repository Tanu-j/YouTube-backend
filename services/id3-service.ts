import NodeID3 from "node-id3";
import fs from "fs";

export async function writeMetadata(
    filePath: string,
    title: string,
    artist: string,
    artworkPath?: string
) {

    const tags: NodeID3.Tags = {
        title,
        artist,
    };

    if (
        artworkPath &&
        fs.existsSync(artworkPath)
    ) {

        tags.image = {
            mime: "image/jpeg",
            type: {
                id: 3,
                name: "front cover"
            },
            description: "Cover",
            imageBuffer: fs.readFileSync(
                artworkPath
            )
        };

    }

    const success =
        NodeID3.write(
            tags,
            filePath
        );

    if (!success) {
        throw new Error(
            "Failed to write metadata"
        );
    }
}