// ─── Enums ────────────────────────────────────────────────────────────────────

export type AccessType =
  | "PAY_PER_VIEW"
  | "RENTAL"
  | "LIMITED_VIEWS"
  | "SUBSCRIPTION"
  | "LIFETIME";

export type VideoStatus = "PUBLISHED" | "UNPUBLISHED";

export type SessionStatus = "ACTIVE" | "EXPIRED" | "CONSUMED" | "REVOKED";

export type EntitlementStatus = "ACTIVE" | "EXPIRED" | "CONSUMED" | "REVOKED";

// ─── Identity ─────────────────────────────────────────────────────────────────
// No email/password — Aleo wallet address is the sole identity.

export interface WalletIdentity {
  aleoAddress: string;
  network: string;
}

// ─── Video metadata ───────────────────────────────────────────────────────────
// Stored as JSON on IPFS/Walrus alongside the encrypted blob.
// Nothing sensitive here — this is fully public.

export interface VideoMetadata {
  contentId: string;
  creatorAddress: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUri?: string;   // IPFS/Walrus URI of thumbnail
  price: number;
  accessType: AccessType;
  durationSeconds?: number;
  maxViews?: number;       // for LIMITED_VIEWS
  rentalHours?: number;    // for RENTAL
  createdAt: string;
}

// ─── Video (server record) ────────────────────────────────────────────────────

export interface Video {
  id: string;
  contentId: string;
  creatorAddress: string;
  metadataUri: string;
  status: VideoStatus;
  createdAt: string;
  // Metadata fields resolved from IPFS (populated by API)
  metadata?: VideoMetadata;
}

// ─── Entitlement ──────────────────────────────────────────────────────────────

export interface EntitlementRecord {
  owner: string;          // Aleo address
  contentId: string;
  accessType: AccessType;
  expiresAt?: number;     // unix timestamp
  viewsLeft?: number;
  nonce: string;
  status: EntitlementStatus;
}

export interface AleoEntitlementResult {
  valid: boolean;
  record?: EntitlementRecord;
  reason?: string;
}

// ─── Playback ─────────────────────────────────────────────────────────────────

export interface PlaybackSession {
  sessionId: string;
  wrappedKey: string;
  expiresAt: string;
  nonce: string;
}

export interface PlaybackSessionRequest {
  contentId: string;
  aleoAddress: string;
  aleoTxId?: string;
  signature?: string;     // wallet signature proving address ownership
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface VideoUploadPayload {
  title: string;
  description?: string;
  category?: string;
  price: number;
  accessType: AccessType;
  maxViews?: number;
  rentalHours?: number;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
