import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/services/db";
import { getSession } from "@/app/lib/auth";
import { wrapKey } from "@/services/encryption";
import { logger } from "@/services/logger";
import { env } from "@/services/env";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/upload
 *
 * Accepts JSON — the heavy video bytes are uploaded client-side directly to
 * Walrus. This endpoint only receives metadata + the raw AES key (hex) so it
 * can wrap it server-side and persist the DB record.
 *
 * Body:
 *  encryptedVideoUri  — walrus://<blobId> from client upload
 *  keyHex             — raw AES-256 key (hex) to be wrapped server-side
 *  ivHex              — AES-GCM IV (hex)
 *  contentHashHex     — SHA-256 of original plaintext (hex)
 *  title, description, category, price, accessType,
 *  maxViews?, rentalHours?
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      encryptedVideoUri,
      keyHex,
      ivHex,
      contentHashHex,
      title = "Untitled",
      description,
      category,
      price = 0,
      accessType = "PAY_PER_VIEW",
      maxViews,
      rentalHours,
    } = body;

    if (!encryptedVideoUri || !keyHex || !ivHex || !contentHashHex) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: encryptedVideoUri, keyHex, ivHex, contentHashHex" },
        { status: 400 }
      );
    }

    // Wrap the client-provided AES key with the server master secret
    const contentKey = Buffer.from(keyHex, "hex");
    const wrappedKey = wrapKey(contentKey, env.KEY_WRAP_SECRET);

    const contentId = uuidv4();

    // Store metadata as inline data URI — no external storage needed
    const metadata = {
      contentId,
      creatorAddress: session.aleoAddress,
      title,
      description,
      category,
      price: parseFloat(String(price)),
      accessType,
      maxViews: maxViews ? parseInt(String(maxViews)) : undefined,
      rentalHours: rentalHours ? parseInt(String(rentalHours)) : undefined,
      createdAt: new Date().toISOString(),
    };

    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

    const db = await getDb();
    const video = await db.video.create({
      data: {
        contentId,
        creatorAddress: session.aleoAddress,
        encryptedVideoUri,
        metadataUri,
        contentHash: contentHashHex,
        encryptedKeyRef: wrappedKey,
        status: "PUBLISHED",
      },
    });

    logger.info("VIDEO_UPLOADED", { contentId, creatorAddress: session.aleoAddress });

    return NextResponse.json({
      success: true,
      data: {
        contentId: video.contentId,
        title,
      },
    });
  } catch (err) {
    logger.error("UPLOAD_FAILED", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
