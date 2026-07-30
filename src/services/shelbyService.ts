import { Buffer } from "buffer";
import {
  type BlobCommitments,
  createDefaultErasureCodingProvider,
  generateCommitments,
  expectedTotalChunksets,
  ShelbyBlobClient,
  ShelbyClient,
} from "@shelby-protocol/sdk/browser";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Initialize Aptos client
export const aptosClient = new Aptos(
  new AptosConfig({
    network: Network.TESTNET,
    clientConfig: {
      API_KEY: import.meta.env.VITE_API_KEY,
    },
  }),
);

// Initialize Shelby client
export const shelbyClient = new ShelbyClient({
  network: Network.TESTNET,
  apiKey: import.meta.env.VITE_API_KEY,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
  },
} as any);

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
 */
export const createRegisterBlobPayload = (
  accountAddress: string,
  fileName: string,
  commitments: BlobCommitments
) => {
  return ShelbyBlobClient.createRegisterBlobPayload({
    account: accountAddress as any,
    blobName: fileName,
    blobMerkleRoot: commitments.blob_merkle_root,
    numChunksets: expectedTotalChunksets(commitments.raw_data_size),
    expirationMicros: (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000, // 30 days from now
    blobSize: commitments.raw_data_size,
    encoding: 0, // Default encoding
  });
};

/**
 * Uploads file data to Shelby RPC.
 * This must be called after on-chain registration.
 */
export const uploadBlobToRpc = async (
  accountAddress: string,
  file: File,
  blobName?: string
) => {
  const arrayBuffer = await file.arrayBuffer();
  const blobData = new Uint8Array(arrayBuffer);

  return await shelbyClient.rpc.putBlob({
    account: accountAddress as any,
    blobName: blobName || file.name,
    blobData,
  });
};
