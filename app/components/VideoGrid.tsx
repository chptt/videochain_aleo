
import { VideoCard } from "./VideoCard";
import type { Video } from "@/types";

interface Props {
  videos: Video[];
  emptyMessage?: string;
}

export function VideoGrid({ videos, emptyMessage = "No videos found." }: Props) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <span className="mb-3 text-5xl">📭</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v.contentId} video={v} />
      ))}
    </div>
  );
}
