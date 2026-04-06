import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [totalVideos, activeSessions] = await Promise.all([
      db.video.count({ where: { creatorAddress: session.aleoAddress } }),
      db.playbackSession.count({
        where: {
          video: { creatorAddress: session.aleoAddress },
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalVideos,
        totalViews: 0,    // TODO: track views
        totalRevenue: 0,  // TODO: track revenue
        activeViewers: activeSessions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
