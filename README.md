# 🎵 YouTube Audio Backend

A high-performance **TypeScript + Express** backend for extracting, streaming, and downloading audio from YouTube. Built with performance, caching, reliability, and scalability in mind.

The server provides fast audio URL extraction, direct streaming, downloadable audio with embedded metadata and artwork, intelligent caching, and request throttling.

---

## ✨ Features

- 🎵 Extract playable YouTube audio URLs
- 🚀 High-speed direct audio streaming
- 📥 Download audio in multiple formats
- 🎼 Automatic ID3 metadata embedding
- 🖼️ Album artwork embedding
- ⚡ Intelligent in-memory caching
- 🔄 Stale cache fallback
- 📈 Download progress tracking
- 🧹 Automatic temporary file cleanup
- 🎯 FFmpeg transcoding
- 💾 Download cache for instant repeat downloads
- 🚦 Built-in rate limiting
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
- yt-dlp
- youtubei.js
- @distube/ytdl-core

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

Downloads audio with embedded metadata.

### Query Parameters

| Parameter | Description |
|-----------|-------------|
| format | mp3, m4a, opus, flac, wav |
| quality | Audio bitrate |
| title | Song title |
| artist | Artist name |
| artwork | Artwork URL |

Example

```
/download/dQw4w9WgXcQ?format=mp3&quality=320
```

---

## Direct Streaming Download

```
GET /download-stream/:videoId
```

Streams audio directly to the client without writing files to disk.

Supports

- MP3
- M4A
- OPUS
- WAV
- FLAC

---

## Download Progress

```
GET /download-progress/:videoId
```

Example response

```json
{
    "progress": 72
}
```

---

# Supported Formats

| Format | Supported |
|---------|-----------|
| MP3 | ✅ |
| M4A | ✅ |
| OPUS | ✅ |
| FLAC | ✅ |
| WAV | ✅ |

---

# Performance Optimizations

- In-memory caching
- Stale cache fallback
- Queue-based extraction
- Download cache reuse
- Stream URL reuse
- Automatic timeout handling
- Temporary file cleanup
- Efficient FFmpeg pipeline
- Direct streaming without disk writes
- Metadata written only when required

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
Resolve Stream URL
    │
    ▼
Download Audio
    │
    ▼
Transcode (if required)
    │
    ▼
Download Artwork
    │
    ▼
Embed ID3 Metadata
    │
    ▼
Cache Final File
    │
    ▼
Return Download
```

---

# Security

- Request rate limiting
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
├── services
│   ├── artwork-service.ts
│   ├── download-progress.ts
│   ├── id3-service.ts
│   └── stream-resolver.ts
├── utils
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