
/**
 * Pluggable storage adapter.
 * Supports: pinata (IPFS), walrus, local (dev only).
 * Set STORAGE_PROVIDER in .env to switch providers.
 */

import fs from "fs/promises";
import path from "path";
import { env } from "./env";

export interface StorageUploadResult {
  uri: string;       // canonical retrieval URI
  cid?: string;      // IPFS CID if applicable
  blobId?: string;   // Walrus blob ID if applicable
}

// ─── Provider interface ───────────────────────────────────────────────────────

interface StorageProvider {
  upload(data: Buffer, filename: string, mimeType: string): Promise<StorageUploadResult>;
  getUrl(uri: string): string;
}

// ─── Pinata (IPFS) ────────────────────────────────────────────────────────────

class PinataProvider implements StorageProvider {
  async upload(data: Buffer, filename: string, mimeType: string): Promise<StorageUploadResult> {
    const FormData = (await import("form-data")).default;
    const axios = (await import("axios")).default;

    const form = new FormData();
    form.append("file", data, { filename, contentType: mimeType });
    form.append("pinataMetadata", JSON.stringify({ name: filename }));

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: env.PINATA_API_KEY,
        pinata_secret_api_key: env.PINATA_SECRET_API_KEY,
      },
      maxBodyLength: Infinity,
    });

    const cid: string = res.data.IpfsHash;
    return { uri: `ipfs://${cid}`, cid };
  }

  getUrl(uri: string): string {
    const cid = uri.replace("ipfs://", "");
    return `${env.PINATA_GATEWAY}/ipfs/${cid}`;
  }
}

// ─── Walrus ───────────────────────────────────────────────────────────────────

class WalrusProvider implements StorageProvider {
  async upload(data: Buffer, _filename: string, _mimeType: string): Promise<StorageUploadResult> {
    const axios = (await import("axios")).default;
    const res = await axios.put(`${env.WALRUS_PUBLISHER_URL}/v1/store`, data, {
      headers: { "Content-Type": "application/octet-stream" },
    });
    const blobId: string = res.data.newlyCreated?.blobObject?.blobId ?? res.data.alreadyCertified?.blobId;
    return { uri: `walrus://${blobId}`, blobId };
  }

  getUrl(uri: string): string {
    const blobId = uri.replace("walrus://", "");
    return `${env.WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
  }
}

// ─── Local (dev only) ─────────────────────────────────────────────────────────

class LocalProvider implements StorageProvider {
  async upload(data: Buffer, filename: string, _mimeType: string): Promise<StorageUploadResult> {
    const dir = env.LOCAL_STORAGE_PATH;
    await fs.mkdir(dir, { recursive: true });
    const dest = path.join(dir, filename);
    await fs.writeFile(dest, data);
    return { uri: `local://${filename}` };
  }

  getUrl(uri: string): string {
    const filename = uri.replace("local://", "");
    return `/api/stream/local/${filename}`;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function getProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "pinata": return new PinataProvider();
    case "walrus": return new WalrusProvider();
    case "local":  return new LocalProvider();
    default:       return new LocalProvider();
  }
}

const provider = getProvider();

export const storage = {
  upload: (data: Buffer, filename: string, mimeType: string) =>
    provider.upload(data, filename, mimeType),
  getUrl: (uri: string) => provider.getUrl(uri),
};
