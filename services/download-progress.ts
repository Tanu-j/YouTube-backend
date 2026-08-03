// services/download-progress.ts

export const downloadProgress =
    new Map<string, number>();

export function setDownloadProgress(
    videoId: string,
    progress: number
) {
    downloadProgress.set(
        videoId,
        Math.min(
            100,
            Math.max(0, progress)
        )
    );
}

export function getDownloadProgress(
    videoId: string
) {
    return downloadProgress.get(videoId) ?? 0;
}

export function clearDownloadProgress(
    videoId: string
) {
    downloadProgress.delete(videoId);
}