
/**
 * Payment adapter — abstraction layer for access acquisition.
 *
 * Supports multiple payment modes without coupling the core entitlement
 * logic to any single provider. Aleo entitlement is always granted AFTER
 * a successful payment confirmation from this layer.
 *
 * Modes:
 *   dev       — skip payment, grant immediately (development only)
 *   stripe    — Stripe payment intent verification (TODO: wire in)
 *   onchain   — EVM or other on-chain payment verification (TODO: wire in)
 */

import { logger } from "./logger";

export type PaymentMode = "dev" | "stripe" | "onchain";

export interface PaymentVerifyParams {
  mode: PaymentMode;
  paymentRef?: string;   // Stripe payment intent ID, tx hash, etc.
  userId: string;
  contentId: string;
  expectedAmount: number;
}

export interface PaymentVerifyResult {
  verified: boolean;
  reason?: string;
}

export async function verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
  const { mode, paymentRef, userId, contentId, expectedAmount } = params;

  switch (mode) {
    case "dev": {
      // Development mode — always succeeds. Never use in production.
      if (process.env.NODE_ENV === "production") {
        logger.warn("DEV_PAYMENT_IN_PRODUCTION", { userId, contentId });
        return { verified: false, reason: "Dev payment mode not allowed in production" };
      }
      logger.info("PAYMENT_DEV_BYPASS", { userId, contentId });
      return { verified: true };
    }

    case "stripe": {
      // TODO: verify Stripe payment intent
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      // const intent = await stripe.paymentIntents.retrieve(paymentRef!);
      // if (intent.status !== "succeeded") return { verified: false, reason: "Payment not succeeded" };
      // if (intent.amount < expectedAmount * 100) return { verified: false, reason: "Insufficient amount" };
      logger.warn("STRIPE_PAYMENT_STUB", { userId, contentId, paymentRef });
      return { verified: false, reason: "Stripe integration not yet configured — see services/payment.ts" };
    }

    case "onchain": {
      // TODO: verify on-chain payment (EVM tx, Aleo credits, etc.)
      // const receipt = await provider.getTransactionReceipt(paymentRef!);
      // verify receipt.to === contractAddress, value >= expectedAmount
      logger.warn("ONCHAIN_PAYMENT_STUB", { userId, contentId, paymentRef });
      return { verified: false, reason: "On-chain payment integration not yet configured — see services/payment.ts" };
    }

    default:
      return { verified: false, reason: "Unknown payment mode" };
  }
}

/** Determine which payment mode to use based on env config */
export function getPaymentMode(): PaymentMode {
  if (process.env.NODE_ENV === "development" && !process.env.STRIPE_SECRET_KEY) {
    return "dev";
  }
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "dev";
}
