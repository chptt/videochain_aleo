
import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "CREATOR") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const creator = await db.creatorProfile.findUnique({ where: { userId: session.userId } });
    if (!creator) {
      return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
    }

    const [totalVideos, purchases, activeSessions] = await Promise.all([
      db.video.count({ where: { creatorId: creator.id } }),
      db.purchase.findMany({
        where: { video: { creatorId: creator.id } },
        select: { amountPaid: true },
      }),
      db.playbackSession.count({
        where: {
          video: { creatorId: creator.id },
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    const totalRevenue = purchases.reduce((sum, p) => sum + p.amountPaid, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalVideos,
        totalViews: purchases.length,
        totalRevenue,
        activeViewers: activeSessions,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
