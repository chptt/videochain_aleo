
/**
 * Entitlement verification service.
 * Combines Aleo-backed proof verification with local cache checks.
 *
 * Flow:
 *  1. Frontend executes validate_access on Aleo, gets a tx ID
 *  2. Frontend submits tx ID to /api/playback/session
 *  3. This service verifies the tx on-chain and checks local cache
 *  4. If valid, playback service issues a short-lived session
 */

import { db } from "./db";
import { verifyEntitlementTransaction, isNonceRevoked } from "./aleo";
import { logger } from "./logger";
import type { AleoEntitlementResult } from "@/types";

export async function verifyEntitlement(params: {
  userId: string;
  contentId: string;
  aleoAddress: string;
  aleoTxId?: string;       // tx ID from frontend Aleo execution
  skipAleoVerify?: boolean; // dev mode only
}): Promise<AleoEntitlementResult> {
  const { userId, contentId, aleoAddress, aleoTxId, skipAleoVerify } = params;

  // 1. Check local entitlement cache first
  const cached = await db.entitlementCache.findUnique({
    where: { userId_videoId: { userId, videoId: contentId } },
  });

  if (!cached || cached.status !== "ACTIVE") {
    logger.warn("ENTITLEMENT_CACHE_MISS", { userId, contentId });
    return { valid: false, reason: "No active entitlement found" };
  }

  // 2. Check expiry from cache
  if (cached.expiresAt && cached.expiresAt < new Date()) {
    await db.entitlementCache.update({
      where: { id: cached.id },
      data: { status: "EXPIRED" },
    });
    return { valid: false, reason: "Entitlement expired" };
  }

  // 3. Check views remaining
  if (cached.viewsRemaining !== null && cached.viewsRemaining <= 0) {
    return { valid: false, reason: "No views remaining" };
  }

  // 4. Aleo on-chain verification (skip in dev mode)
  if (!skipAleoVerify && aleoTxId) {
    const aleoResult = await verifyEntitlementTransaction(aleoTxId, aleoAddress, contentId);
    if (!aleoResult.valid) {
      logger.warn("ALEO_ENTITLEMENT_INVALID", { userId, contentId, reason: aleoResult.reason });
      return aleoResult;
    }

    // Check nonce not revoked
    if (await isNonceRevoked(aleoTxId)) {
      return { valid: false, reason: "Nonce has been revoked" };
    }
  }

  // 5. Update last verified timestamp
  await db.entitlementCache.update({
    where: { id: cached.id },
    data: { lastVerifiedAt: new Date() },
  });

  logger.info("ENTITLEMENT_VERIFIED", { userId, contentId });

  return {
    valid: true,
    record: {
      owner: aleoAddress,
      contentId,
      accessType: cached.accessType as import("@/types").AccessType,
      expiresAt: cached.expiresAt ? Math.floor(cached.expiresAt.getTime() / 1000) : undefined,
      viewsLeft: cached.viewsRemaining ?? undefined,
      nonce: cached.aleoRecordRef ?? "",
      status: "ACTIVE",
    },
  };
}

/** Decrement views after a successful playback session (LIMITED_VIEWS) */
export async function consumeView(userId: string, contentId: string): Promise<void> {
  const cached = await db.entitlementCache.findUnique({
    where: { userId_videoId: { userId, videoId: contentId } },
  });
  if (!cached || cached.viewsRemaining === null) return;

  const updated = cached.viewsRemaining - 1;
  await db.entitlementCache.update({
    where: { id: cached.id },
    data: {
      viewsRemaining: updated,
      status: updated <= 0 ? "CONSUMED" : "ACTIVE",
    },
  });
  logger.info("VIEW_CONSUMED", { userId, contentId, viewsRemaining: updated });
}
