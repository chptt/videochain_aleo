"use client";

/**
 * Client-side encrypt-then-upload.
 * Flow:
 *  1. Generate AES-256-GCM key in browser (Web Crypto)
 *  2. Encrypt the video bytes
 *  3. Upload encrypted blob in 3.5 MB chunks to /api/upload/walrus
 *     (chunks stay under Vercel's 4.5 MB body limit)
 *  4. Export the raw key as hex — server wraps it before storing
 */

const CHUNK_SIZE = 3.5 * 1024 * 1024; // 3.5 MB — safely under Vercel's 4.5 MB limit

export interface ClientEncryptResult {
  encryptedBlob: Blob;
  keyHex: string;
  ivHex: string;
  tagHex: string;
  contentHashHex: string;
}

export interface WalrusUploadResult {
  uri: string;
  blobId: string;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptVideo(file: File): Promise<ClientEncryptResult> {
  const raw = await file.arrayBuffer();
  const contentHashHex = await sha256Hex(raw);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    raw
  );

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

/** Upload blob in chunks to the server-side Walrus proxy */
export async function uploadToWalrus(
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<WalrusUploadResult> {
  const totalSize   = blob.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const uploadId    = crypto.randomUUID();

  let lastResponse: { success: boolean; uri?: string; blobId?: string; error?: string } | null = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = blob.slice(start, end);

    const res = await fetch("/api/upload/walrus", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-upload-id":    uploadId,
        "x-chunk-index":  String(i),
        "x-total-chunks": String(totalChunks),
      },
      credentials: "include",
      body: chunk,
    });

    if (!res.ok) {
      throw new Error(`Chunk ${i + 1}/${totalChunks} failed: ${res.status} ${res.statusText}`);
    }

    lastResponse = await res.json();
    if (lastResponse && !lastResponse.success) {
      throw new Error(lastResponse.error ?? `Chunk ${i + 1} failed`);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  if (!lastResponse?.uri || !lastResponse?.blobId) {
    const detail = lastResponse ? JSON.stringify(lastResponse) : "no response";
    throw new Error(`Upload completed but no URI returned. Server said: ${detail}`);
  }

  return { uri: lastResponse.uri, blobId: lastResponse.blobId };
}
