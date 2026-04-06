
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const video = await db.video.findUnique({
      where: { contentId },
      select: {
        id: true, contentId: true, creatorId: true, title: true,
        description: true, category: true, thumbnailUri: true,
        price: true, accessType: true, durationSeconds: true,
        maxViews: true, rentalHours: true, status: true, createdAt: true, updatedAt: true,
        creator: { select: { displayName: true, avatarUri: true } },
        // encryptedVideoUri and encryptedKeyRef are intentionally excluded
      },
    });

    if (!video || video.status === "UNPUBLISHED") {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: video });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch video" }, { status: 500 });
  }
}
