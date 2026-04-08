import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";
import { generateContentKey, wrapKey, hashContent, encrypt } from "@/services/encryption";
import { storage } from "@/services/storage";
import { logger } from "@/services/logger";
import { env } from "@/services/env";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "500mb",
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    if (!videoFile) {
      return NextResponse.json({ success: false, error: "No video file provided" }, { status: 400 });
    }

    const title       = (formData.get("title") as string) || "Untitled";
    const description = (formData.get("description") as string) || undefined;
    const category    = (formData.get("category") as string) || undefined;
    const price       = parseFloat((formData.get("price") as string) || "0");
    const accessType  = (formData.get("accessType") as string) || "PAY_PER_VIEW";
    const maxViews    = formData.get("maxViews") ? parseInt(formData.get("maxViews") as string) : undefined;
    const rentalHours = formData.get("rentalHours") ? parseInt(formData.get("rentalHours") as string) : undefined;

    // 1. Read video bytes
    const videoBytes = Buffer.from(await videoFile.arrayBuffer());

    // 2. Generate per-content AES key and encrypt
    const contentKey  = generateContentKey();
    const contentHash = hashContent(videoBytes);
    const encrypted   = encrypt(videoBytes, contentKey);
    const encryptedBuffer = Buffer.from(JSON.stringify(encrypted));

    // 3. Wrap the content key with master wrap secret
    const wrappedKey = wrapKey(contentKey, env.KEY_WRAP_SECRET);

    // 4. Upload encrypted blob to storage
    const contentId = uuidv4();
    const { uri: encryptedVideoUri } = await storage.upload(
      encryptedBuffer,
      `${contentId}.enc`,
      "application/octet-stream"
    );

    // 5. Build public metadata JSON and upload to storage
    const metadata = {
      contentId,
      creatorAddress: session.aleoAddress,
      title,
      description,
      category,
      price,
      accessType,
      maxViews,
      rentalHours,
      createdAt: new Date().toISOString(),
    };
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const { uri: metadataUri } = await storage.upload(
      metadataBuffer,
      `${contentId}-meta.json`,
      "application/json"
    );

    // 6. Upload thumbnail if provided
    let thumbnailUri: string | undefined;
    const thumbFile = formData.get("thumbnail") as File | null;
    if (thumbFile) {
      const thumbBytes = Buffer.from(await thumbFile.arrayBuffer());
      const { uri } = await storage.upload(thumbBytes, `${contentId}-thumb.jpg`, thumbFile.type);
      thumbnailUri = storage.getUrl(uri);
      // Update metadata with thumbnail
      metadata.description = description; // already set
    }

    // 7. Persist minimal server-side record (only security-critical fields)
    const video = await db.video.create({
      data: {
        contentId,
        creatorAddress: session.aleoAddress,
        encryptedVideoUri,
        metadataUri,
        contentHash,
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
        metadataUri: storage.getUrl(metadataUri),
      },
    });
  } catch (err) {
    logger.error("UPLOAD_FAILED", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
