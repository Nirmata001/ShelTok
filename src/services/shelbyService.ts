import { Buffer } from "buffer";
import {
  type BlobCommitments,
  type StorageProviderAck,
  createDefaultErasureCodingProvider,
  generateCommitments,
  expectedTotalChunksets,
  ShelbyBlobClient,
  ShelbyClient,
  SHELBY_DEPLOYER,
} from "@shelby-protocol/sdk/browser";
import { registerSW } from "virtual:pwa-register";
import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";

// Service worker state for authenticated byte-range video streaming
let swReady: Promise<boolean> | null = null;
const SW_CONTROL_TIMEOUT_MS = 5000;

/** Resolves true when the auth SW controls the page for native video streaming */
export const isShelbySWReady = (): Promise<boolean> => {
  if (swReady) return swReady;

  if (!("serviceWorker" in navigator)) {
    swReady = Promise.resolve(false);
    return swReady;
  }

  swReady = new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    if (navigator.serviceWorker.controller) {
      done(true);
      return;
    }

    registerSW({ immediate: true });
    navigator.serviceWorker.addEventListener("controllerchange", () =>
      done(!!navigator.serviceWorker.controller)
    );
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active && navigator.serviceWorker.controller) done(true);
    });

    window.setTimeout(() => done(false), SW_CONTROL_TIMEOUT_MS);
  });

  return swReady;
};

// Shelby network endpoints and storage region
export const SHELBY_RPC_BASE = "https://shelby.shelbynet.shelby.xyz/shelby";
export const SHELBY_EXPLORER_BASE = "https://explorer.shelby.xyz/shelbynet";
export const SHELBY_LOCATION = "shelbynet-1";

/** Builds the gateway URL for a stored blob */
export const buildBlobUrl = (owner: string, blobName: string): string =>
  `${SHELBY_RPC_BASE}/v1/blobs/${owner}/${blobName}`;

const SHELBY_API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

/** Bearer auth headers for direct gateway blob requests */
export const shelbyAuthHeaders = (): Record<string, string> =>
  SHELBY_API_KEY ? { Authorization: `Bearer ${SHELBY_API_KEY}` } : {};

/** Fetches a stored blob with auth and returns an object URL */
export const fetchBlobObjectUrl = async (
  owner: string,
  blobName: string
): Promise<string> => {
  const res = await fetch(buildBlobUrl(owner, blobName), {
    headers: shelbyAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
  return URL.createObjectURL(await res.blob());
};

// Aptos and Shelby clients targeting shelbynet
export const aptosClient = new Aptos(
  new AptosConfig({
    network: Network.SHELBYNET,
    clientConfig: {
      API_KEY: import.meta.env.VITE_API_KEY,
    },
  }),
);

export const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: import.meta.env.VITE_API_KEY,
  locationHint: SHELBY_LOCATION,
});

/** Encodes file into erasure-coded chunks and returns commitment hashes */
export const encodeFile = async (file: File): Promise<BlobCommitments> => {
  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  const provider = await createDefaultErasureCodingProvider();
  return await generateCommitments(provider, data as any);
};

/** Creates on-chain registration transaction payload for a blob */
export const createRegisterBlobPayload = (
  accountAddress: string,
  fileName: string,
  commitments: BlobCommitments
) => {
  return ShelbyBlobClient.createRegisterBlobPayload({
    account: AccountAddress.from(accountAddress),
    blobName: fileName,
    blobMerkleRoot: commitments.blob_merkle_root,
    numChunksets: expectedTotalChunksets(commitments.raw_data_size),
    blobSize: commitments.raw_data_size,
    encoding: 0,
    selectedLocation: SHELBY_LOCATION,
  });
};

/** Extracts on-chain blob UID from registration transaction events */
export const parseBlobUid = (
  events: ReadonlyArray<{ type: string; data: unknown }> | undefined,
  blobName: string
): bigint => {
  const registered = ShelbyBlobClient.registeredBlobUids(
    events ?? [],
    AccountAddress.from(SHELBY_DEPLOYER)
  );
  const match =
    registered.find((r) => r.objectName.endsWith(`/${blobName}`)) ?? registered[0];
  if (!match) {
    throw new Error("Could not find registered blob UID in transaction events");
  }
  return match.uid;
};

/** Uploads erasure-coded chunksets to Shelby RPC and returns provider ACKs */
export const uploadBlobChunksets = async (
  accountAddress: string,
  file: File,
  uid: bigint,
  commitments: BlobCommitments
): Promise<StorageProviderAck[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const blobData = new Uint8Array(arrayBuffer);

  const { spAcks } = await shelbyClient.rpc.putBlobChunksets({
    accountAddress,
    uid,
    blobData,
    commitments,
  });

  return spAcks;
};

/** Creates commit transaction payload to finalize blob write on-chain */
export const createCommitPayload = (
  uid: bigint,
  blobName: string,
  storageProviderAcks: StorageProviderAck[]
) => {
  return ShelbyBlobClient.createCommitObjectPayload({
    uid,
    blobName,
    overwrite: false,
    storageProviderAcks,
  });
};
