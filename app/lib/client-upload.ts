"use client";

/**
 * Client-side encrypt-then-upload.
 * Flow:
 *  1. Generate AES-256-GCM key in browser (Web Crypto)
 *  2. Encrypt the video bytes
 *  3. POST encrypted blob to /api/upload/walrus (server-side proxy — no CORS)
 *  4. Export the raw key as hex — server wraps it before storing
 */

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

/** Upload a blob via the server-side Walrus proxy (avoids CORS), returns walrus://<blobId> */
export async function uploadToWalrus(blob: Blob, onProgress?: (pct: number) => void): Promise<WalrusUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/walrus");
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
          if (!data.success) return reject(new Error(data.error ?? "Proxy upload failed"));
          resolve({ uri: data.uri, blobId: data.blobId });
        } catch {
          reject(new Error("Invalid proxy response JSON"));
        }
      } else {
        reject(new Error(`Upload proxy failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(blob);
  });
}
