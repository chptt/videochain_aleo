
import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const entitlements = await db.entitlementCache.findMany({
      where: { userId: session.userId },
      include: {
        video: {
          select: {
            contentId: true,
            title: true,
            thumbnailUri: true,
            accessType: true,
            durationSeconds: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = entitlements.map((e) => ({
      contentId: e.video.contentId,
      title: e.video.title,
      thumbnailUri: e.video.thumbnailUri,
      accessType: e.accessType,
      status: e.status,
      expiresAt: e.expiresAt?.toISOString(),
      viewsRemaining: e.viewsRemaining,
      lastVerifiedAt: e.lastVerifiedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: items });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch entitlements" }, { status: 500 });
  }
}
