
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
  read(uri: string): Promise<Buffer>;
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

  async read(uri: string): Promise<Buffer> {
    const res = await fetch(this.getUrl(uri));
    if (!res.ok) {
      throw new Error(`Failed to read Pinata object: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}

// ─── Walrus ───────────────────────────────────────────────────────────────────

class WalrusProvider implements StorageProvider {
  async upload(data: Buffer, _filename: string, _mimeType: string): Promise<StorageUploadResult> {
    const axios = (await import("axios")).default;
    const res = await axios.put(`${env.WALRUS_PUBLISHER_URL}/v1/blobs`, data, {
      headers: { "Content-Type": "application/octet-stream" },
    });
    const blobId: string = res.data.newlyCreated?.blobObject?.blobId ?? res.data.alreadyCertified?.blobId;
    return { uri: `walrus://${blobId}`, blobId };
  }

  getUrl(uri: string): string {
    const blobId = uri.replace("walrus://", "");
    return `${env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
  }

  async read(uri: string): Promise<Buffer> {
    const res = await fetch(this.getUrl(uri));
    if (!res.ok) {
      throw new Error(`Failed to read Walrus object: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
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

  async read(uri: string): Promise<Buffer> {
    const filename = uri.replace("local://", "");
    return fs.readFile(path.join(env.LOCAL_STORAGE_PATH, filename));
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
  getUrl: (uri: string) => {
    if (uri.startsWith("data:")) return uri;
    return provider.getUrl(uri);
  },
  read: (uri: string) => {
    if (uri.startsWith("data:")) {
      const base64 = uri.split(",")[1] ?? "";
      return Promise.resolve(Buffer.from(base64, "base64"));
    }
    return provider.read(uri);
  },
  readJson: async <T>(uri: string): Promise<T> => {
    if (uri.startsWith("data:")) {
      const base64 = uri.split(",")[1] ?? "";
      return JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as T;
    }
    const buffer = await provider.read(uri);
    return JSON.parse(buffer.toString("utf8")) as T;
  },
};
