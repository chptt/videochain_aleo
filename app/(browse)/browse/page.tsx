import { VideoGrid } from "@/app/components/VideoGrid";
import { VideoGridSkeleton } from "@/app/components/LoadingSkeleton";
import { Suspense } from "react";
import { db } from "@/services/db";

const CATEGORIES = ["All", "Tutorial", "Music", "Film", "Gaming", "Education", "Other"];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const { search, category } = await searchParams;

  // Query DB directly — no HTTP self-call needed on server
  const videos = await db.video.findMany({
    where: {
      status: "PUBLISHED",
      ...(search ? {
        OR: [
          { metadataUri: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      contentId: true,
      creatorAddress: true,
      metadataUri: true,
      status: true,
      createdAt: true,
    },
  });

  // Map to Video type
  const videoList = videos.map((v) => ({
    id: v.id,
    contentId: v.contentId,
    creatorAddress: v.creatorAddress,
    metadataUri: v.metadataUri,
    status: v.status as "PUBLISHED" | "UNPUBLISHED",
    createdAt: v.createdAt.toISOString(),
    // Metadata will be fetched client-side from metadataUri
    metadata: undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Browse Videos</h1>
        <form className="flex gap-2">
          <input name="search" defaultValue={search} placeholder="Search…" className="input w-48" />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <a
            key={c}
            href={`/browse?category=${c === "All" ? "" : c}${search ? `&search=${search}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs transition ${
              (category ?? "All") === c
                ? "bg-brand-600 text-white"
                : "bg-surface-700 text-gray-400 hover:text-white"
            }`}
          >
            {c}
          </a>
        ))}
      </div>

      <Suspense fallback={<VideoGridSkeleton />}>
        <VideoGrid
          videos={videoList as Parameters<typeof VideoGrid>[0]["videos"]}
          emptyMessage="No videos yet. Be the first to upload."
        />
      </Suspense>
    </div>
  );
}
