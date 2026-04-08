
import { NextRequest, NextResponse } from "next/server";
import { verifyPlaybackJwt, consumeSession } from "@/services/playback";
import { getDb } from "@/services/db";
import { unwrapKey, decrypt } from "@/services/encryption";
import { storage } from "@/services/storage";
import { logger } from "@/services/logger";
import { env } from "@/services/env";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const sessionId = req.nextUrl.searchParams.get("sid");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session" }, { status: 401 });
    }

    // Verify the playback JWT / session
    let sessionData: Awaited<ReturnType<typeof verifyPlaybackJwt>>;
    try {
      sessionData = await verifyPlaybackJwt(sessionId);
    } catch {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    if (sessionData.contentId !== contentId) {
      return NextResponse.json({ error: "Session/content mismatch" }, { status: 403 });
    }

    // Fetch video record (includes encrypted key ref)
    const db = await getDb();
    const video = await db.video.findUnique({ where: { contentId } });
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Unwrap content key
    const contentKey = unwrapKey(video.encryptedKeyRef, env.KEY_WRAP_SECRET);

    // Fetch encrypted blob from storage
    const encryptedBuffer = await storage.read(video.encryptedVideoUri);
    const encryptedPayload = JSON.parse(encryptedBuffer.toString());

    // Decrypt in memory — never write plaintext to disk
    const plaintext = decrypt(encryptedPayload, contentKey);

    // Mark session as consumed (single-use)
    await consumeSession(sessionData.sessionId);

    logger.info("STREAM_SERVED", { contentId, sessionId: sessionData.sessionId });

    // Stream the decrypted video
    return new NextResponse(new Uint8Array(plaintext), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(plaintext.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        // Prevent embedding in other origins
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (err) {
    logger.error("STREAM_ERROR", { error: String(err) });
    return NextResponse.json({ error: "Stream error" }, { status: 500 });
  }
}
