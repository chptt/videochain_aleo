
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";
import { storage } from "@/services/storage";
import type { Video, VideoMetadata } from "@/types";

function getCreatorDisplayName(aleoAddress: string): string {
  if (aleoAddress.length <= 12) return aleoAddress;
  return `${aleoAddress.slice(0, 6)}...${aleoAddress.slice(-4)}`;
}

async function hydrateVideo(videoRecord: {
  id: string;
  contentId: string;
  creatorAddress: string;
  metadataUri: string;
  status: string;
  createdAt: Date;
}): Promise<Video> {
  let metadata: VideoMetadata | undefined;

  try {
    metadata = await storage.readJson<VideoMetadata>(videoRecord.metadataUri);
  } catch {
    metadata = undefined;
  }

  return {
    id: videoRecord.id,
    contentId: videoRecord.contentId,
    creatorAddress: videoRecord.creatorAddress,
    metadataUri: videoRecord.metadataUri,
    title: metadata?.title ?? "Untitled",
    description: metadata?.description,
    category: metadata?.category,
    thumbnailUri: metadata?.thumbnailUri ? storage.getUrl(metadata.thumbnailUri) : undefined,
    price: metadata?.price ?? 0,
    accessType: metadata?.accessType ?? "PAY_PER_VIEW",
    durationSeconds: metadata?.durationSeconds,
    maxViews: metadata?.maxViews,
    rentalHours: metadata?.rentalHours,
    status: videoRecord.status as Video["status"],
    createdAt: videoRecord.createdAt.toISOString(),
    creator: { displayName: getCreatorDisplayName(videoRecord.creatorAddress) },
    metadata,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page     = Math.max(parseInt(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.max(parseInt(searchParams.get("pageSize") ?? "20") || 20, 1);
    const search   = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const mine     = searchParams.get("mine") === "true";

    const session = await getSession();

    const where: { status?: string; creatorAddress?: string } = { status: "PUBLISHED" };

    if (mine && session) {
      delete where.status;
      where.creatorAddress = session.aleoAddress;
    }

    const records = await db.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contentId: true,
        creatorAddress: true,
        metadataUri: true,
        status: true,
        createdAt: true,
      },
    });

    const hydrated = await Promise.all(records.map((record) => hydrateVideo(record)));
    const normalizedSearch = search?.trim().toLowerCase();
    const normalizedCategory = category && category !== "All" ? category.toLowerCase() : undefined;

    const filtered = hydrated.filter((video) => {
      if (normalizedSearch) {
        const haystack = `${video.title} ${video.description ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (normalizedCategory) {
        return video.category?.toLowerCase() === normalizedCategory;
      }

      return true;
    });

    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({ success: true, data: { items, total, page, pageSize } });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch videos" }, { status: 500 });
  }
}
