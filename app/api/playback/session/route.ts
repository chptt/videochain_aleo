import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { issuePlaybackSession } from "@/services/playback";
import { logger } from "@/services/logger";
import { getDb } from "@/services/db";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  contentId:   z.string(),
  aleoTxId:    z.string().optional(), // tx ID from frontend validate_access execution
});

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(`playback:${session.aleoAddress}`, 10)) {
      logger.warn("PLAYBACK_RATE_LIMITED", { aleoAddress: session.aleoAddress });
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = schema.parse(await req.json());
    const db = await getDb();
    // Look up the video
    const video = await db.video.findUnique({ where: { contentId: body.contentId } });
    if (!video) {
      return NextResponse.json({ success: false, error: "Video not found" }, { status: 404 });
    }

    // In dev mode without an Aleo tx, skip on-chain verification
    // In production: require aleoTxId and verify it on-chain
    if (process.env.NODE_ENV === "production" && !body.aleoTxId) {
      return NextResponse.json(
        { success: false, error: "Aleo entitlement proof required", code: "PROOF_REQUIRED" },
        { status: 403 }
      );
    }

    // TODO: In production, call verifyEntitlementTransaction(body.aleoTxId, session.aleoAddress, body.contentId)
    // and check the result before issuing a session.

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const playbackSession = await issuePlaybackSession({
      aleoAddress: session.aleoAddress,
      contentId: body.contentId,
      ipHash,
    });

    logger.info("PLAYBACK_SESSION_GRANTED", {
      aleoAddress: session.aleoAddress,
      contentId: body.contentId,
      sessionId: playbackSession.sessionId,
    });

    return NextResponse.json({ success: true, data: playbackSession });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    logger.error("PLAYBACK_SESSION_ERROR", { error: String(err) });
    return NextResponse.json({ success: false, error: "Session error" }, { status: 500 });
  }
}
