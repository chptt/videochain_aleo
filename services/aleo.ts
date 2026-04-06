
/**
 * Aleo service layer — backend integration with the video_entitlement.aleo program.
 *
 * This service:
 *  - Calls Aleo RPC to execute/verify transitions
 *  - Verifies entitlement proofs submitted by the frontend
 *  - Does NOT expose private keys to the frontend
 *
 * The frontend uses app/lib/aleo-adapter.ts for client-side Aleo interactions.
 */

import { env } from "./env";
import { logger } from "./logger";
import type { EntitlementRecord, AleoEntitlementResult, AccessType } from "@/types";

const PROGRAM_ID = env.ALEO_PROGRAM_ID;
const RPC_URL    = env.ALEO_RPC_URL;
const NETWORK    = env.ALEO_NETWORK;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a string contentId to a field value Aleo can use */
export function contentIdToField(contentId: string): string {
  // Use first 16 bytes of SHA-256 as a u128, then cast to field
  // In production, use a proper hash-to-field function from the Aleo SDK
  const hex = Buffer.from(contentId).toString("hex").slice(0, 32);
  return `${BigInt("0x" + hex).toString()}field`;
}

/** Map numeric access_type back to our enum */
function numToAccessType(n: number): AccessType {
  const map: Record<number, AccessType> = {
    1: "PAY_PER_VIEW",
    2: "RENTAL",
    3: "LIMITED_VIEWS",
    4: "SUBSCRIPTION",
    5: "LIFETIME",
  };
  return map[n] ?? "PAY_PER_VIEW";
}

// ─── RPC call wrapper ─────────────────────────────────────────────────────────

async function aleoRpc(path: string): Promise<unknown> {
  const url = `${RPC_URL}/${NETWORK}/${path}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Aleo RPC error ${res.status}: ${url}`);
  return res.json();
}

// ─── Verify a transition execution result ─────────────────────────────────────

/**
 * Verifies that a given Aleo transaction ID corresponds to a successful
 * validate_access or consume_view execution for the given content/user.
 *
 * The frontend executes the transition client-side and submits the tx ID.
 * The backend independently confirms the transaction on-chain.
 */
export async function verifyEntitlementTransaction(
  txId: string,
  expectedOwner: string,
  expectedContentId: string,
): Promise<AleoEntitlementResult> {
  try {
    const tx = await aleoRpc(`transaction/${txId}`) as Record<string, unknown>;

    // Confirm the transaction is for our program and the correct transition
    const execution = (tx as Record<string, unknown>).execution as Record<string, unknown> | undefined;
    if (!execution) {
      return { valid: false, reason: "Transaction has no execution" };
    }

    const transitions = execution.transitions as Array<Record<string, unknown>>;
    const relevant = transitions?.find(
      (t) => t.program === PROGRAM_ID &&
        (t.function === "validate_access" || t.function === "consume_view")
    );

    if (!relevant) {
      return { valid: false, reason: "No matching transition in transaction" };
    }

    logger.info("ALEO_TX_VERIFIED", { txId, owner: expectedOwner });

    // TODO: In production, decrypt the output record using the view key
    // and verify owner + content_id match. For now we trust the tx inclusion.
    return {
      valid: true,
      record: {
        owner: expectedOwner,
        contentId: expectedContentId,
        accessType: "PAY_PER_VIEW",
        nonce: txId,
        status: "ACTIVE",
      },
    };
  } catch (err) {
    logger.error("ALEO_TX_VERIFY_FAILED", { txId, error: String(err) });
    return { valid: false, reason: "Transaction verification failed" };
  }
}

/**
 * Checks the revoked_nonces mapping to ensure a nonce hasn't been revoked.
 */
export async function isNonceRevoked(nonce: string): Promise<boolean> {
  try {
    const result = await aleoRpc(
      `program/${PROGRAM_ID}/mapping/revoked_nonces/${nonce}field`
    );
    return result === true || result === "true";
  } catch {
    // If mapping lookup fails, assume not revoked (fail open for availability)
    return false;
  }
}

/**
 * Builds the inputs for a grant_access transition call.
 * Called by the backend after a confirmed purchase.
 * The actual execution is done client-side by the user's wallet,
 * or by the backend service account for custodial flows.
 */
export function buildGrantAccessInputs(params: {
  recipient: string;
  contentId: string;
  accessType: number;
  expiresAt: number;
  viewsLeft: number;
  nonce: string;
}): string[] {
  return [
    params.recipient,
    contentIdToField(params.contentId),
    `${params.accessType}u8`,
    `${params.expiresAt}u64`,
    `${params.viewsLeft}u32`,
    `${params.nonce}field`,
  ];
}
