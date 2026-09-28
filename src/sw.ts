/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Injected by workbox at build time for PWA precaching
precacheAndRoute(self.__WB_MANIFEST);

// Take control immediately so video streaming benefits without a reload
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;
const GATEWAY_BLOB_PREFIX = "https://shelby.shelbynet.shelby.xyz/shelby/v1/blobs/";

/** Checks if request targets Shelby gateway blob storage */
function isGatewayBlobRequest(request: Request): boolean {
  return request.method === "GET" && request.url.startsWith(GATEWAY_BLOB_PREFIX);
}

// Intercepts gateway blob reads to inject auth while preserving Range headers for video streaming
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isGatewayBlobRequest(request) || !API_KEY) return;
  event.respondWith(authenticatedFetch(request));
});

/** Re-issues request with Bearer auth to enable native byte-range video streaming */
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
