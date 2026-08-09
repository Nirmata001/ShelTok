/// <reference lib="webworker" />

/**
 * Custom service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 * Beyond the usual PWA precache: shelbynet gateway blob reads require an
 * `Authorization: Bearer <apiKey>` header and 429-throttle anonymous reads, and
 * a native <video>/<img> `src` cannot attach headers. Rather than download each
 * blob fully and play it from an object URL (which kills progressive streaming
 * and seeking), this worker intercepts the browser's own requests to the
 * gateway and re-issues them with the auth header attached, preserving the
 * `Range` header the media stack sends. That yields native byte-range streaming
 * with authentication.
 *
 * The API key and gateway prefix are build-time constants (Vite inlines
 * `import.meta.env.VITE_API_KEY`). This deliberately mirrors the main app
 * bundle, which already inlines the same key — so nothing new lands on disk —
 * and, unlike a postMessage handshake, it survives the worker being terminated
 * and restarted (which drops all in-memory state).
 */

import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Injected by workbox at build time. Required for injectManifest to be valid.
precacheAndRoute(self.__WB_MANIFEST);

// Take control as soon as possible so playback benefits without a reload.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;
// Blob-read prefix on the shelbynet gateway (mirrors SHELBY_RPC_BASE).
const GATEWAY_BLOB_PREFIX = "https://shelby.shelbynet.shelby.xyz/shelby/v1/blobs/";

/**
 * True for gateway blob reads we should authenticate. Only GETs to the gateway
 * blob prefix are touched — everything else (app assets, Supabase, the indexer,
 * dicebear avatars) falls through untouched.
 */
function isGatewayBlobRequest(request: Request): boolean {
  return request.method === "GET" && request.url.startsWith(GATEWAY_BLOB_PREFIX);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isGatewayBlobRequest(request)) return; // not ours — default handling
  if (!API_KEY) return; // no key at build time — let it hit the network as-is
  event.respondWith(authenticatedFetch(request));
});

/**
 * Re-issues a gateway request with the auth header added, preserving Range so
 * the browser's media stack keeps driving byte-range streaming. Returns the
 * gateway response verbatim (including 206/416) so the <video> element sees
 * real partial-content semantics.
 */
async function authenticatedFetch(request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${API_KEY}`);

  const authed = new Request(request.url, {
    method: "GET",
    headers,
    mode: "cors",
    credentials: "omit",
    redirect: "follow",
  });

  return fetch(authed);
}
