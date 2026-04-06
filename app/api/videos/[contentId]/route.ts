
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { storage } from "@/services/storage";
import type { VideoMetadata } from "@/types";

function getCreatorDisplayName(aleoAddress: string): string {
  if (aleoAddress.length <= 12) return aleoAddress;
  return `${aleoAddress.slice(0, 6)}...${aleoAddress.slice(-4)}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const video = await db.video.findUnique({
      where: { contentId },
      select: {
        id: true,
        contentId: true,
        creatorAddress: true,
        metadataUri: true,
        status: true,
        createdAt: true,
      },
    });

    if (!video || video.status === "UNPUBLISHED") {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    let metadata: VideoMetadata | undefined;

    try {
      metadata = await storage.readJson<VideoMetadata>(video.metadataUri);
    } catch {
      metadata = undefined;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: video.id,
        contentId: video.contentId,
        creatorAddress: video.creatorAddress,
        metadataUri: video.metadataUri,
        title: metadata?.title ?? "Untitled",
        description: metadata?.description,
        category: metadata?.category,
        thumbnailUri: metadata?.thumbnailUri ? storage.getUrl(metadata.thumbnailUri) : undefined,
        price: metadata?.price ?? 0,
        accessType: metadata?.accessType ?? "PAY_PER_VIEW",
        durationSeconds: metadata?.durationSeconds,
        maxViews: metadata?.maxViews,
        rentalHours: metadata?.rentalHours,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
        creator: { displayName: getCreatorDisplayName(video.creatorAddress) },
        metadata,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch video" }, { status: 500 });
  }
}
