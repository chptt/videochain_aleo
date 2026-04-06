
import Link from "next/link";
import Image from "next/image";
import type { Video } from "@/types";

const ACCESS_LABELS: Record<string, string> = {
  PAY_PER_VIEW: "Pay-per-view",
  RENTAL: "Rental",
  LIMITED_VIEWS: "Limited views",
  SUBSCRIPTION: "Subscription",
  LIFETIME: "Lifetime",
};

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/video/${video.contentId}`} className="card group flex flex-col gap-3 hover:border-gray-700 transition">
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden rounded-lg bg-surface-700">
        {video.thumbnailUri ? (
          <Image
            src={video.thumbnailUri}
            alt={video.title}
            fill
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-600">▶</div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-gray-300">
          {video.durationSeconds ? `${Math.floor(video.durationSeconds / 60)}m` : "—"}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium text-white">{video.title}</h3>
        <p className="text-xs text-gray-500">{video.creator?.displayName ?? "Creator"}</p>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between">
        <span className="badge-blue">{ACCESS_LABELS[video.accessType] ?? video.accessType}</span>
        <span className="text-sm font-semibold text-brand-400">${video.price.toFixed(2)}</span>
      </div>
    </Link>
  );
}
