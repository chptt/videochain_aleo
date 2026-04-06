
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page     = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
    const search   = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const mine     = searchParams.get("mine") === "true";

    const session = await getSession();

    const where: Record<string, unknown> = { status: "PUBLISHED" };

    if (mine && session) {
      // Creator fetching their own videos
      const creator = await db.creatorProfile.findUnique({ where: { userId: session.userId } });
      if (creator) {
        delete where.status; // show all statuses for own videos
        where.creatorId = creator.id;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category && category !== "All") {
      where.category = { equals: category, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      db.video.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { displayName: true, avatarUri: true } } },
        // Never return encryptedKeyRef or encryptedVideoUri in listings
        select: {
          id: true, contentId: true, creatorId: true, title: true,
          description: true, category: true, thumbnailUri: true,
          price: true, accessType: true, durationSeconds: true,
          maxViews: true, rentalHours: true, status: true, createdAt: true, updatedAt: true,
          creator: { select: { displayName: true, avatarUri: true } },
        },
      }),
      db.video.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { items, total, page, pageSize } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch videos" }, { status: 500 });
  }
}
