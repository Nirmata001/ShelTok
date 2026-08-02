# Sheltok

Decentralized short-form video platform built on the Shelby network. No centralized media server, no content database. Shelby is the entire backend.

---

## Overview

Sheltok is a TikTok-style vertical video feed where every video is stored as a blob on Shelby and discovered by querying Shelby's coordination layer directly. There is no separate indexing service tracking what content exists, the blob registry itself is the content index.

---

## Architecture

```
Upload → Encode → Register on-chain (Aptos) → putBlob (Shelby RPC)
                                                        │
Feed  ← getBlobs (namespace filter) ← Shelby coordination layer
                                                        │
Playback ← byte-range requests ← Shelby testnet gateway
```

---

## Blob Naming Convention

Every upload is stored under a structured blob name that doubles as metadata, since Shelby has no separate metadata field:

```
sheltok/{timestamp}_{randomId}.{extension}:::{description}
```

Example:

```
sheltok/1781234567890_x7f3kd.mp4:::my first upload
```

| Segment | Purpose |
|---|---|
| `sheltok/` | Namespace prefix used to filter this app's content from all other blobs on the network |
| `{timestamp}_{randomId}` | Collision-proof unique identifier |
| `.{extension}` | Preserves file type for correct playback/download behavior |
| `:::{description}` | Delimiter-separated caption, parsed client-side |

The feed is populated with a single filtered query:

```
blob_name ILIKE '%sheltok/%:::%'
```

Any blob on the network matching this pattern from any wallet is treated as valid Sheltok content.

---

## Shelby Integration

### 1. Storage — `putBlob`
Video files are chunked and uploaded directly to Shelby RPC nodes via `shelbyClient.rpc.putBlob`, bypassing any centralized storage layer.

### 2. Coordination & Indexing
Using `@shelby-protocol/react` and `@shelby-protocol/sdk/browser`:
- `coordination.getBlobs` — namespace-filtered query that powers the global feed
- `coordination.getAccountBlobs` — wallet-scoped query used for the media gallery and profile views

Both return live results directly from Shelby's indexer, no caching layer, no external database.

### 3. Streaming
All playback and gallery previews stream directly from Shelby's testnet gateway:
```
https://api.testnet.shelby.xyz/shelby/v1/blobs/
```
Video elements request content via native browser byte-range requests, no custom streaming server involved.

### 4. On-Chain Registration & Deletion
Transactions are built with `ShelbyBlobClient` payloads and signed via the Aptos Wallet Adapter (`signAndSubmitTransaction`). This governs both blob registration at upload time and deregistration on delete, ownership and content lifecycle are enforced on-chain, not by an app-level permission system.

---

## Upload Flow (3 steps)

1. **Encode** — file converted to commitment hashes via Shelby's erasure coding provider (`generateCommitments`)
2. **Register on-chain** — `createRegisterBlobPayload` builds a transaction (blob name, size, 30-day expiration), signed by the connected wallet
3. **Push to RPC** — raw bytes uploaded via `putBlob` using the constructed blob name

---

## Feed Construction

- Single `getBlobs` call with namespace filter returns every Sheltok video across all wallets
- Results are shuffled once (Fisher-Yates) on first load — no reshuffling on refetch, avoiding UI disruption
- Only the active video and the next one in scroll order have their `src` set at any time (lazy loading), preventing simultaneous request bursts against Shelby's gateway

---

## Social Layer (non-Shelby)

Likes and follows are stored in Supabase, deliberately kept outside Shelby since these are high-frequency, low-stakes relational writes that don't need on-chain permanence. Video content and ownership remain entirely Shelby-native; Supabase never touches media.

---

## HLS / Adaptive Bitrate — Explored, Not Shipped

Evaluated `@shelby-protocol/player` and `@shelby-protocol/media-prepare` for HLS output. Transcoding generates many segment files per video, and batch-uploading the full segment set to Shelby was too slow to be viable under current testnet conditions. Shipped with direct MP4 blob streaming via byte-range requests instead, which already performs well. HLS remains a candidate once batch upload throughput improves.

---

## Core Features

- Global feed sourced from a single live Shelby query, no content backend
- 3-step direct-to-Shelby upload (encode → register → push)
- Fisher-Yates shuffle for TikTok-style randomized discovery
- Wallet-native identity — no accounts, no passwords
- Likes & follows (Supabase, non-media)
- Media gallery scoped to connected wallet via `getAccountBlobs`
- On-chain deletion — deregisters the blob via the owning wallet

---

## Stack

| Layer | Technology |
|---|---|
| Storage & indexing | Shelby (`@shelby-protocol/sdk`, `@shelby-protocol/react`) |
| Chain | Aptos Testnet |
| Wallet | Aptos Wallet Adapter |
| Social graph | Supabase |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |

---

## Setup

```bash
npm install
cp .env.example .env
# add Shelby API key + Supabase credentials
npm run dev
```
