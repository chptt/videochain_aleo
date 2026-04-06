
import { VideoGrid } from "@/app/components/VideoGrid";
import { VideoGridSkeleton } from "@/app/components/LoadingSkeleton";
import { Suspense } from "react";
import type { Video } from "@/types";

async function getVideos(search?: string, category?: string): Promise<Video[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/videos?${params}`, { cache: "no-store" });
  const json = await res.json();
  return json.data?.items ?? [];
}

const CATEGORIES = ["All", "Tutorial", "Music", "Film", "Gaming", "Education", "Other"];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const { search, category } = await searchParams;
  const videos = await getVideos(search, category);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Browse Videos</h1>
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search…"
            className="input w-48"
          />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      {/* Category filter */}
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
        <VideoGrid videos={videos} emptyMessage="No videos match your search." />
      </Suspense>
    </div>
  );
}
