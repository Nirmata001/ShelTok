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
import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";

/**
 * Shelby network endpoints.
 *
 * Shelby Testnet has been retired; the app now targets shelbynet. The RPC base
 * below is the same value the SDK resolves internally from Network.SHELBYNET —
 * we re-export it here because blob streaming/download URLs are built by hand
 * (the SDK's getBlob streams, but the app uses native <video> byte-range URLs).
 */
export const SHELBY_RPC_BASE = "https://shelby.shelbynet.shelby.xyz/shelby";
export const SHELBY_EXPLORER_BASE = "https://explorer.shelby.xyz/shelbynet";

/**
 * Builds the public byte-range URL for a stored blob. `owner` is the blob
 * owner's account address; `blobName` is the full name suffix (e.g.
 * "sheltok/123_abc.mp4:::caption").
 */
export const buildBlobUrl = (owner: string, blobName: string): string =>
  `${SHELBY_RPC_BASE}/v1/blobs/${owner}/${blobName}`;

// Initialize Aptos client
export const aptosClient = new Aptos(
  new AptosConfig({
    network: Network.SHELBYNET,
    clientConfig: {
      API_KEY: import.meta.env.VITE_API_KEY,
    },
  }),
);

// Initialize Shelby client
export const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: import.meta.env.VITE_API_KEY,
});

/**
 * Encodes a file for the Shelby network.
 * Splits the file into chunks and generates commitment hashes.
 */
export const encodeFile = async (file: File): Promise<BlobCommitments> => {
  // Convert file to Buffer format
  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  // Create the erasure coding provider
  const provider = await createDefaultErasureCodingProvider();

  // Generate commitment hashes for the file
  const commitments = await generateCommitments(provider, data as any);

  return commitments;
};

/**
 * Creates the registration transaction payload for a blob.
 * The returned payload is signed and submitted by the connected wallet.
 */
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
    expirationMicros: (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000, // 30 days from now
    blobSize: commitments.raw_data_size,
    encoding: 0, // Default encoding
  });
};

/**
 * Parses the on-chain UID assigned to a freshly registered blob from the
 * committed registration transaction's events. Registration and the chunkset
 * upload are keyed by this UID.
 */
export const parseBlobUid = (
  events: ReadonlyArray<{ type: string; data: unknown }> | undefined,
  blobName: string
): bigint => {
  const registered = ShelbyBlobClient.registeredBlobUids(
    events ?? [],
    AccountAddress.from(SHELBY_DEPLOYER)
  );
  // objectName is "@<owner>/<suffix>"; match our suffix, else fall back to the
  // sole entry (we register one blob per transaction).
  const match =
    registered.find((r) => r.objectName.endsWith(`/${blobName}`)) ?? registered[0];
  if (!match) {
    throw new Error("Could not find registered blob UID in transaction events");
  }
  return match.uid;
};

/**
 * Uploads the raw file bytes to Shelby RPC as erasure-coded chunksets.
 * Must be called after on-chain registration (using that blob's UID).
 *
 * Authorization is address-only: the browser wallet cannot sign the RPC
 * challenge, so the write is authorized by the prior on-chain registration
 * plus the API key. Returns the storage-provider acknowledgements that must be
 * committed on-chain to finalize the write.
 */
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

/**
 * Creates the commit transaction payload that finalizes a blob write.
 * The returned payload is signed and submitted by the connected wallet after
 * chunksets have been uploaded.
 */
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
