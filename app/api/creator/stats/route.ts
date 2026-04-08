import { NextResponse } from "next/server";
import { getDb } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const db = await getDb();
    const [totalVideos, activeSessions] = await Promise.all([
      db.video.count({ where: { creatorAddress: session.aleoAddress } }),
      db.playbackSession.count({
        where: {
          video: { is: { creatorAddress: session.aleoAddress } },
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalVideos,
        totalViews: 0,
        totalRevenue: 0,
        activeViewers: activeSessions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
