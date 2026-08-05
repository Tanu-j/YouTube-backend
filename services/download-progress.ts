// services/download-progress.ts

export type DownloadStatus = "downloading" | "completed" | "failed";

export interface DownloadRecord {
    progress: number;
    status: DownloadStatus;
    error?: string;
    updatedAt: number;
}

// Single source of truth: id -> full record.
// Progress and status are always written together, atomically,
// so no consumer can ever observe one without the other.
const downloadRecords = new Map<string, DownloadRecord>();

// How long a finished (completed/failed) record is kept around before
// being pruned, so late reads (e.g. a client poll that started just
// before completion) still see the final state instead of "not found".
const FINISHED_RECORD_TTL_MS = 10_000;

// Timers so we can cancel/replace a pending prune if a new download
// for the same videoId starts before the old record is pruned.
const pruneTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearPruneTimer(videoId: string) {
    const existing = pruneTimers.get(videoId);
    if (existing) {
        clearTimeout(existing);
        pruneTimers.delete(videoId);
    }
}

function writeRecord(videoId: string, record: DownloadRecord) {
    downloadRecords.set(videoId, record);
}

/**
 * Update progress for an in-flight download. Only meaningful while
 * status is "downloading" — once a terminal status (completed/failed)
 * has been set, further progress updates are ignored so a late/stray
 * event can't undo the final state.
 */
export function setDownloadProgress(videoId: string, progress: number) {
    const existing = downloadRecords.get(videoId);

    if (existing && existing.status !== "downloading") {
        // Terminal state already reached — ignore stale progress events.
        return;
    }

    writeRecord(videoId, {
        progress: Math.min(100, Math.max(0, progress)),
        status: "downloading",
        updatedAt: Date.now(),
    });
}

/**
 * Mark a download completed. Progress and status are written together
 * so a reader never sees progress reset to 0 alongside status:"completed".
 * The record is kept for a short TTL (not deleted immediately) so any
 * in-flight poll still reads the final state, then pruned automatically.
 */
export function markDownloadCompleted(videoId: string) {
    clearPruneTimer(videoId);
    writeRecord(videoId, {
        progress: 100,
        status: "completed",
        updatedAt: Date.now(),
    });
    schedulePrune(videoId);
}

/**
 * Mark a download failed. Kept alongside completed for symmetry —
 * status and (final, frozen) progress are written atomically here too.
 */
export function markDownloadFailed(videoId: string, error?: string) {
    clearPruneTimer(videoId);
    const existing = downloadRecords.get(videoId);
    writeRecord(videoId, {
        progress: existing?.progress ?? 0,
        status: "failed",
        error,
        updatedAt: Date.now(),
    });
    schedulePrune(videoId);
}

function schedulePrune(videoId: string) {
    const timer = setTimeout(() => {
        downloadRecords.delete(videoId);
        pruneTimers.delete(videoId);
    }, FINISHED_RECORD_TTL_MS);
    pruneTimers.set(videoId, timer);
}

export function getDownloadProgress(videoId: string): number {
    return downloadRecords.get(videoId)?.progress ?? 0;
}

export function getDownloadRecord(videoId: string): DownloadRecord | undefined {
    return downloadRecords.get(videoId);
}

/**
 * Explicit, immediate removal — use this only for deliberate cleanup
 * (e.g. the client acknowledges/removes the item from its list), never
 * as part of the normal completion flow.
 */
export function clearDownloadProgress(videoId: string) {
    clearPruneTimer(videoId);
    downloadRecords.delete(videoId);
}