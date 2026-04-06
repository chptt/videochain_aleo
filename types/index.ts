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
  thumbnailUri?: string;
  price: number;
  accessType: AccessType;
  durationSeconds?: number;
  maxViews?: number;
  rentalHours?: number;
  createdAt: string;
}

export interface CreatorProfile {
  displayName?: string;
  avatarUri?: string;
}

export interface Video {
  id: string;
  contentId: string;
  creatorAddress: string;
  metadataUri: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUri?: string;
  price: number;
  accessType: AccessType;
  durationSeconds?: number;
  maxViews?: number;
  rentalHours?: number;
  status: VideoStatus;
  createdAt: string;
  creator?: CreatorProfile;
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
  signature?: string;
}

export interface VideoUploadPayload {
  title: string;
  description?: string;
  category?: string;
  price: number;
  accessType: AccessType;
  maxViews?: number;
  rentalHours?: number;
}

export interface PurchasePayload {
  contentId: string;
  accessType: AccessType;
  paymentRef?: string;
}

export interface PurchaseResult {
  aleoGrantInputs: string[];
  entitlement: EntitlementRecord;
}

export interface CreatorStats {
  totalVideos: number;
  totalViews: number;
  totalRevenue: number;
  activeViewers: number;
}

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
