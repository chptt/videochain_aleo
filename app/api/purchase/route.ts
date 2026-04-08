import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/services/db";
import { getSession } from "@/app/lib/auth";
import { buildGrantAccessInputs } from "@/services/aleo";
import { logger } from "@/services/logger";
import { generateNonce } from "@/services/encryption";
import { verifyPayment, getPaymentMode } from "@/services/payment";
import { z } from "zod";

const schema = z.object({
  contentId:  z.string(),
  accessType: z.enum(["PAY_PER_VIEW", "RENTAL", "LIMITED_VIEWS", "SUBSCRIPTION", "LIFETIME"]),
  paymentRef: z.string().optional(),
});

const ACCESS_TYPE_NUM: Record<string, number> = {
  PAY_PER_VIEW: 1, RENTAL: 2, LIMITED_VIEWS: 3, SUBSCRIPTION: 4, LIFETIME: 5,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await req.json());
    const db = await getDb();
    const video = await db.video.findUnique({ where: { contentId: body.contentId } });
    if (!video || video.status !== "PUBLISHED") {
      return NextResponse.json({ success: false, error: "Video not found" }, { status: 404 });
    }

    // Fetch price from metadata (stored on IPFS/storage)
    // For now we trust the client-provided accessType and use a placeholder price
    // TODO: fetch metadata from storage and verify price server-side
    const price = 0; // placeholder — fetch from metadataUri in production

    // Verify payment
    const paymentResult = await verifyPayment({
      mode: getPaymentMode(),
      paymentRef: body.paymentRef,
      userId: session.aleoAddress,
      contentId: body.contentId,
      expectedAmount: price,
    });

    if (!paymentResult.verified) {
      return NextResponse.json(
        { success: false, error: paymentResult.reason ?? "Payment not verified" },
        { status: 402 }
      );
    }

    const nonce = generateNonce();
    const now   = Math.floor(Date.now() / 1000);

    let expiresAt = 0;
    let viewsLeft = 0;
    // Rental/subscription expiry would be set based on metadata rentalHours
    if (body.accessType === "SUBSCRIPTION") {
      expiresAt = now + 30 * 24 * 3600;
    }

    // Build Aleo grant_access inputs for client-side execution
    const aleoInputs = buildGrantAccessInputs({
      recipient:  session.aleoAddress,
      contentId:  body.contentId,
      accessType: ACCESS_TYPE_NUM[body.accessType] ?? 1,
      expiresAt,
      viewsLeft,
      nonce,
    });

    logger.info("PURCHASE_CREATED", { aleoAddress: session.aleoAddress, contentId: body.contentId });

    return NextResponse.json({
      success: true,
      data: {
        // Return Aleo inputs so the client executes grant_access on their wallet
        aleoGrantInputs: aleoInputs,
        entitlement: {
          owner:      session.aleoAddress,
          contentId:  body.contentId,
          accessType: body.accessType,
          expiresAt:  expiresAt || undefined,
          viewsLeft:  viewsLeft || undefined,
          nonce,
          status: "ACTIVE",
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    logger.error("PURCHASE_FAILED", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ success: false, error: "Purchase failed" }, { status: 500 });
  }
}
