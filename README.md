# SHELTOK

**A decentralized, TikTok-style video feed built entirely on Shelby's hot storage network.**

No centralized database for content. No traditional backend. Every video lives on Shelby, is fetched directly from Shelby, and is discoverable by anyone through Shelby alone.

---

## What is SHELTOK?

SHELTOK is a fully decentralized short-form video platform. Users connect a wallet, upload videos directly to the Shelby network, and scroll through a global, TikTok-style vertical feed — all without relying on any centralized media server or content database.

Every video that exists on SHELTOK exists because it was uploaded to Shelby. Every video that appears in the feed appears because SHELTOK queried Shelby directly and found it. There is no separate "SHELTOK server" holding your videos — Shelby *is* the backend.

---

## How It All Fits Together

### 1. Upload — turning a video into a Shelby blob

When a user selects a video file to upload, SHELTOK does not simply hand the raw file to Shelby. It constructs a specific **blob name** that encodes both a discovery tag and the video's caption directly into the filename itself:

```
sheltok/{timestamp}_{randomId}.{extension}:::{description}
```

For example:

```
sheltok/1781234567890_x7f3kd.mp4:::my first upload on shelby!
```

Breaking this down:

- **`sheltok/`** — a namespace prefix. This is what allows SHELTOK's feed to later ask Shelby "give me every blob that belongs to this app" without needing any external index.
- **`{timestamp}_{randomId}`** — guarantees a unique filename so two uploads never collide, even from the same wallet in the same second.
- **`.{extension}`** — preserves the real file type (`.mp4`, `.mov` etc.) so the file remains previewable and downloadable correctly.
- **`:::{description}`** — a delimiter followed by the caption the user typed. Shelby has no concept of "video metadata" as a separate field, so SHELTOK encodes the caption directly into the name of the blob itself. No external database required to know what a video is about.

Once the blob name is constructed, the upload happens in three concrete steps against the Shelby SDK:

1. **Encode** — the raw file is converted into commitment hashes via Shelby's erasure coding provider (`generateCommitments`)
2. **Register on-chain** — a transaction is built (`createRegisterBlobPayload`) and signed by the connected wallet, registering the blob's existence, size, and 30-day expiration on the Aptos blockchain
3. **Upload to Shelby RPC** — the actual video bytes are sent to Shelby's storage network via `putBlob`, using the exact blob name constructed above

After this, the video exists as a real, addressable file on Shelby — permanently discoverable by anyone who knows the pattern.

---

### 2. The Feed — fetching videos with zero external database

This is the core of what makes SHELTOK different from a typical "Web3 video app." There is no Postgres table of video metadata. There is no API that lists videos. The feed works entirely by asking Shelby a single, direct question:

> *"Show me every blob in existence whose name matches the SHELTOK naming pattern."*

Concretely, SHELTOK queries Shelby's coordination layer with a filter like:

```
blob_name ILIKE '%sheltok/%:::%'
```

Any blob — from any wallet, uploaded at any time — that matches this pattern is a valid SHELTOK video. This single query is how the entire global feed is populated. There is no crawler, no indexer, no separate content service. Shelby's own blob registry *is* the content index.

Once the raw list of matching blobs comes back, SHELTOK does the following for each one:

- **Extracts the caption** from the `:::` delimiter in the blob name
- **Extracts the owning wallet address** from the blob's `owner` field
- **Constructs a playable URL** pointing directly at Shelby's public blob endpoint, scoped to that wallet and that blob name
- **Shuffles the full list once** (Fisher-Yates) on first load so every viewer gets a naturally randomized, TikTok-like order — without needing a recommendation engine
- **Lazy-loads video sources** — only the currently visible video and the next one in the feed actually have their `src` set at any given time, so scrolling through hundreds of videos never floods Shelby's network with simultaneous requests

Playback itself is just a native HTML `<video>` element pointed at a Shelby blob URL — Shelby serves the bytes, the browser does the rest.

---

### 3. Following & Likes

SHELTOK layers a lightweight social graph — follows and likes — on top of the Shelby-native content layer using Supabase purely for these relational, low-stakes interactions. Video content itself never touches Supabase; only "who follows whom" and "who liked what" live there, since these are fast-changing, high-frequency interactions that don't need to be permanently on-chain the way content ownership does.

The `Following` feed filter simply narrows the same Shelby-derived video list down to blobs whose owner address matches a wallet the current user follows — the discovery mechanism underneath is identical either way.

---

## Why This Architecture Matters

Most "decentralized" apps still quietly depend on a centralized database to know what content exists. If that database goes down, the app has no idea what to show — even if the actual files are still sitting untouched on decentralized storage.

SHELTOK has no such single point of failure for its content layer. As long as Shelby is up:

- Every previously uploaded video is still discoverable
- The feed can always be rebuilt from scratch with one query
- No one — including the SHELTOK team — can silently delete a video from the index, because there is no separate index to tamper with

The naming convention *is* the metadata layer. Shelby *is* the content database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Storage & Content Discovery | Shelby Protocol (`@shelby-protocol/sdk`) |
| Blockchain | Aptos Testnet |
| Wallet | Aptos Wallet Adapter |
| Social Graph (follows/likes) | Supabase |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |

---

## Core Features

- 🎥 **Global video feed** — sourced entirely from live Shelby blob queries, no content backend
- ⬆️ **Direct-to-Shelby upload** — 3-step encode → register on-chain → push to RPC flow
- 🔀 **Randomized discovery** — Fisher-Yates shuffle on first load, TikTok-style scroll
- 👤 **Wallet-native identity** — no accounts, no passwords, your wallet is your identity
- ❤️ **Likes & follows** — lightweight social layer on top of Shelby-native content
- 🖼️ **Media gallery** — browse your own uploads with the same lazy-loading discovery pattern
- 🗑️ **On-chain deletion** — remove a blob you own directly through the same wallet that created it

---

## Running Locally

```bash
npm install
cp .env.example .env
# Add your Shelby API key and Supabase credentials to .env

npm run dev
```

---

*Built on Shelby — where the storage layer isn't just where your data lives, it's how your app knows what exists.*
