"use client";

/**
 * Client-side encrypt-then-upload to Walrus.
 * Keeps large video bytes out of the Next.js serverless function entirely.
 *
 * Flow:
 *  1. Generate AES-256-GCM key in browser (Web Crypto)
 *  2. Encrypt the video bytes
 *  3. Upload encrypted blob directly to Walrus publisher
 *  4. Export the raw key as hex — caller wraps it server-side
 */

const WALRUS_PUBLISHER =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ??
  "https://publisher.walrus-testnet.walrus.space";

export interface ClientEncryptResult {
  encryptedBlob: Blob;
  keyHex: string;       // raw AES key, hex-encoded — send to server for wrapping
  ivHex: string;
  tagHex: string;       // GCM auth tag (last 16 bytes of ciphertext from SubtleCrypto)
  contentHashHex: string;
}

export interface WalrusUploadResult {
  uri: string;          // walrus://<blobId>
  blobId: string;
}

/** SHA-256 of raw bytes, returned as hex */
async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Encrypt video bytes in-browser using AES-256-GCM */
export async function encryptVideo(file: File): Promise<ClientEncryptResult> {
  const raw = await file.arrayBuffer();
  const contentHashHex = await sha256Hex(raw);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,   // extractable
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    raw
  );

  // SubtleCrypto appends the 16-byte tag at the end of ciphertext
  const ctBytes = new Uint8Array(ciphertext);
  const tagHex = Array.from(ctBytes.slice(-16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const rawKey = await crypto.subtle.exportKey("raw", key);
  const keyHex = Array.from(new Uint8Array(rawKey))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    encryptedBlob: new Blob([ciphertext], { type: "application/octet-stream" }),
    keyHex,
    ivHex,
    tagHex,
    contentHashHex,
  };
}

/** Upload a blob directly to Walrus, returns walrus://<blobId> */
export async function uploadToWalrus(blob: Blob, onProgress?: (pct: number) => void): Promise<WalrusUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${WALRUS_PUBLISHER}/v1/store`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const blobId: string =
            data.newlyCreated?.blobObject?.blobId ??
            data.alreadyCertified?.blobId;
          if (!blobId) return reject(new Error("Walrus: no blobId in response"));
          resolve({ uri: `walrus://${blobId}`, blobId });
        } catch {
          reject(new Error("Walrus: invalid response JSON"));
        }
      } else {
        reject(new Error(`Walrus upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Walrus upload network error"));
    xhr.send(blob);
  });
}
