/**
 * Client-side and server-side encryption utilities.
 * Uses AES-256-GCM for authenticated encryption.
 * Content keys are per-video and wrapped with the master key before storage.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12;  // bytes (96-bit for GCM)
const TAG_LENGTH = 16; // bytes

// ─── Key generation ───────────────────────────────────────────────────────────

export function generateContentKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

export interface EncryptedPayload {
  iv: string;       // hex
  tag: string;      // hex
  ciphertext: string; // hex
}

export function encrypt(plaintext: Buffer, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): Buffer {
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── Key wrapping ─────────────────────────────────────────────────────────────
// Wraps a content key with the master wrap key so it can be stored safely.

export function wrapKey(contentKey: Buffer, wrapSecret: string): string {
  const wrapKey = Buffer.from(wrapSecret, "hex").subarray(0, KEY_LENGTH);
  const payload = encrypt(contentKey, wrapKey);
  return JSON.stringify(payload);
}

export function unwrapKey(wrappedKeyJson: string, wrapSecret: string): Buffer {
  const wrapKey = Buffer.from(wrapSecret, "hex").subarray(0, KEY_LENGTH);
  const payload: EncryptedPayload = JSON.parse(wrappedKeyJson);
  return decrypt(payload, wrapKey);
}

// ─── Short-lived session key ──────────────────────────────────────────────────
// Wraps a content key fragment for a single playback session.
// The session key is derived from the content key + session nonce.

export function deriveSessionKey(contentKey: Buffer, nonce: string): Buffer {
  return crypto.createHmac("sha256", contentKey).update(nonce).digest();
}

export function wrapSessionKey(contentKey: Buffer, nonce: string, sessionSecret: string): string {
  const sessionKey = deriveSessionKey(contentKey, nonce);
  const wrapKeyBuf = Buffer.from(sessionSecret, "hex").subarray(0, KEY_LENGTH);
  const payload = encrypt(sessionKey, wrapKeyBuf);
  return JSON.stringify(payload);
}

// ─── Content hash ─────────────────────────────────────────────────────────────

export function hashContent(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
