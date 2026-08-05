# 🎵 YouTube Audio Backend

A high-performance **TypeScript + Express** backend for extracting, streaming, and downloading audio from YouTube. Built with performance, caching, reliability, and scalability in mind.

The server provides fast audio URL extraction, direct streaming, downloadable audio with embedded metadata and artwork, intelligent caching, and request throttling.

---

## ✨ Features

- 🎵 Extract playable YouTube audio URLs
- 🚀 High-speed direct audio streaming
- 📥 Download audio in multiple formats
- 🎼 Automatic ID3 metadata embedding
- 🖼️ High-resolution album artwork embedding, with automatic fallback
- ⚡ Intelligent in-memory caching
- 🔄 Stale cache fallback
- 📈 Download progress tracking
- 🧹 Automatic temporary file cleanup
- 🎯 FFmpeg transcoding, with stream-copy when re-encoding isn't needed
- 💾 Download cache for instant repeat downloads
- 🔌 Keep-alive CDN connections (no handshake-per-request overhead)
- 🚦 Built-in rate limiting, tuned per route
- 🌐 CORS enabled
- ⏱ Timeout protection
- 📦 Queue-based extraction
- 🔒 Video ID validation
- 📝 Fully written in TypeScript

---

# Tech Stack

- TypeScript
- Node.js
- Express 5
- FFmpeg
- Axios
- NodeCache
- yt-dlp (via `yt-dlp-exec`)

---

# Requirements

- Node.js 18+
- FFmpeg installed and available in PATH

Verify FFmpeg:

```bash
ffmpeg -version
```

---

# Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file.

```env
PORT=

CACHE_TTL=

STALE_CACHE_TTL=

TRUST_PROXY=

DEBUG_FFMPEG=

MAX_CONCURRENT=

YT_COOKIES=

YT_COOKIES_CONTENT=

BACKEND_URL=
```

---

# Running

Development

```bash
npm run dev
```

Production Build

```bash
npm run build
```

Start

```bash
npm start
```

Server starts on

```
http://localhost:3000
```

---

# API Endpoints

---

## Get Audio Stream Information

```
GET /audio/:videoId
```

Returns a playable audio stream URL.

### Response

```json
{
    "success": true,
    "source": "live",
    "data": {
        "...": "..."
    }
}
```

Possible sources

- live
- cache
- stale-cache

---

## Artist Artwork

```
GET /artist-image/:name
```

Returns artist artwork fetched from TheAudioDB.

Example

```
GET /artist-image/Coldplay
```

Response

```json
{
    "success": true,
    "data": {
        "name": "Coldplay",
        "image": "...",
        "logo": "...",
        "banner": "...",
        "fanart": "..."
    }
}
```

---

## Download Audio

```
GET /download/:videoId
```

Downloads audio with embedded metadata and artwork.

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| format | mp3, m4a, opus, flac, wav | `mp3` |
| quality | Audio bitrate (kbps). `0` maps to 320k for mp3, 160k for opus | `0` |
| title | Song title | video id |
| artist | Artist name | — |
| artwork | Artwork URL override | auto (see Artwork below) |

Example

```
/download/dQw4w9WgXcQ?format=mp3&quality=320
```

### Artwork resolution

When no `artwork` URL is supplied, the server tries YouTube's static thumbnail
tiers from highest to lowest resolution and embeds the first one that
actually exists for that video:

```
maxresdefault.jpg  (1280x720, when available)
        ↓ falls back if missing
sddefault.jpg      (640x480)
        ↓ falls back if missing
hqdefault.jpg      (480x360, always available)
```

---

## Direct Streaming Download

```
GET /download-stream/:videoId
```

Streams audio directly to the client without writing files to disk or
waiting for the full pipeline (no ID3/artwork embedding on this route).
Lower latency to first byte than `/download`.

Supports

- MP3 (default)
- M4A
- OPUS
- WAV
- FLAC

If the requested format already matches the source codec (e.g. `opus`
when YouTube's source stream is already Opus-encoded), the audio is
stream-copied instead of re-encoded — same output, far less CPU/time.

---

## Download Progress

```
GET /download-progress/:videoId
```

Example response

```json
{
    "progress": 72,
    "status": "downloading"
}
```

`status` is one of `downloading`, `completed`, or `failed`. A `failed`
response also includes an `error` field. This endpoint has its own,
higher rate limit (600 requests/minute) separate from the rest of the
API, since clients typically poll it every second per active download.

---

# Supported Formats

| Format | Supported | Default on |
|---------|-----------|------------|
| MP3 | ✅ | `/download` and `/download-stream` |
| M4A | ✅ | — |
| OPUS | ✅ | — |
| FLAC | ✅ | — |
| WAV | ✅ | — |

---

# Performance Optimizations

- In-memory caching (audio metadata + stream URLs)
- Stale cache fallback when live extraction fails
- Queue-based extraction (bounded concurrency for yt-dlp)
- Download cache reuse (repeat downloads of the same video/format/quality skip re-encoding entirely)
- Stream URL reuse across `/audio`, `/play`, `/download`, and `/download-stream`
- Keep-alive HTTP agent shared across all CDN requests (`/play`, `/download`, `/download-stream`) — avoids a fresh TCP/TLS handshake on every request
- Stream-copy instead of re-encode when the source codec already matches the requested output format (currently applies to opus)
- In-flight request de-duplication — concurrent requests for the same video share one extraction instead of triggering duplicate yt-dlp runs
- Automatic timeout handling on extraction and CDN requests
- Temporary file cleanup (hourly sweep of stale cached files)
- Direct streaming without disk writes on `/download-stream`
- Metadata (ID3 tags) written only when required
- Dedicated, higher-throughput rate limit for progress polling so it can't be starved by the rest of the API's traffic

### A note on download speed

Download progress on `/download` and `/download-stream` climbs roughly
in step with real time because YouTube's CDN paces long single-connection
downloads close to real-time playback speed — this is upstream throttling
behavior, not something this backend controls. `/download-stream` gets
you a faster *time to first byte* since it doesn't wait for the full file
before responding, and the stream-copy fast path above avoids adding any
extra re-encode time on top of that transfer.

---

# Caching Strategy

Two cache layers are used.

## Audio Cache

Stores recently extracted stream information.

Default TTL

```
15 minutes
```

---

## Stale Cache

Stores previous successful extractions.

Default TTL

```
24 hours
```

If a new extraction fails, the backend automatically serves stale cached data whenever possible.

---

# Download Pipeline

```
Client
    │
    ▼
Validate Video ID
    │
    ▼
Resolve Stream URL (cache → stale cache → yt-dlp)
    │
    ▼
Download Audio  ─┬─ Download Artwork  (run concurrently)
    │             │
    ▼             ▼
Transcode (skipped/stream-copied when source already matches format)
    │
    ▼
Embed ID3 Metadata + Artwork
    │
    ▼
Cache Final File
    │
    ▼
Return Download
```

---

# Security

- Request rate limiting (global + a separate limiter for progress polling)
- Video ID validation
- Filename sanitization
- Timeout protection
- Automatic cleanup of temporary files
- Disabled X-Powered-By header

---

# Error Responses

Invalid Video

```json
{
    "success": false,
    "error": "Invalid video id"
}
```

Rate Limited

```json
{
    "success": false,
    "error": "Too many requests"
}
```

Extraction Failed

```json
{
    "success": false,
    "error": "Extraction failed"
}
```

Download Failed

```json
{
    "success": false,
    "error": "Failed to create download"
}
```

---

# Project Structure

```
.
├── cache.ts
├── queue.ts
├── yt.ts
├── yt-download.ts
├── dt-route.ts
├── play.ts
├── startup-cookies.ts
├── services
│   ├── artwork-service.ts
│   ├── cdn-headers.ts
│   ├── download-progress.ts
│   ├── http-agents.ts
│   ├── id3-service.ts
│   ├── inflight.ts
│   └── stream-resolver.ts
├── utils
│   └── temp-file.ts
├── index.ts
└── package.json
```

---

# Available Scripts

Development

```bash
npm run dev
```

Build

```bash
npm run build
```

Production

```bash
npm start
```

---

# Future Improvements

- Playlist support
- Batch downloads
- Lyrics integration
- HLS streaming
- Redis caching
- Docker support
- Health check endpoint
- Prometheus metrics
- OpenAPI / Swagger documentation
- Authentication support

---

# License

ISC License

---

# Author

Developed with ❤️ using TypeScript, Express, FFmpeg, and modern Node.js tooling.
