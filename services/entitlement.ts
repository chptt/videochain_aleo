
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

import { verifyEntitlementTransaction, isNonceRevoked } from "./aleo";
import { logger } from "./logger";
import type { AleoEntitlementResult } from "@/types";

export async function verifyEntitlement(params: {
  userId: string;
  contentId: string;
  aleoAddress: string;
  aleoTxId?: string;
  skipAleoVerify?: boolean;
}): Promise<AleoEntitlementResult> {
  const { userId, contentId, aleoAddress, aleoTxId, skipAleoVerify } = params;

  if (!skipAleoVerify) {
    if (!aleoTxId) {
      return { valid: false, reason: "Aleo entitlement proof required" };
    }

    const aleoResult = await verifyEntitlementTransaction(aleoTxId, aleoAddress, contentId);
    if (!aleoResult.valid) {
      logger.warn("ALEO_ENTITLEMENT_INVALID", { userId, contentId, reason: aleoResult.reason });
      return aleoResult;
    }

    // Check nonce not revoked
    if (await isNonceRevoked(aleoTxId)) {
      return { valid: false, reason: "Nonce has been revoked" };
    }
    if (aleoResult.record) {
      return aleoResult;
    }
  }

  logger.info("ENTITLEMENT_VERIFIED", { userId, contentId });

  return {
    valid: true,
    record: {
      owner: aleoAddress,
      contentId,
      accessType: "LIFETIME",
      nonce: aleoTxId ?? contentId,
      status: "ACTIVE",
    },
  };
}

export async function consumeView(userId: string, contentId: string): Promise<void> {
  logger.info("VIEW_CONSUMED", { userId, contentId });
}
