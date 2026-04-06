import { notFound } from "next/navigation";
import { PlaybackGate } from "@/app/components/PlaybackGate";
import { PurchaseButton } from "@/app/components/PurchaseButton";
import type { Video } from "@/types";

async function getVideo(contentId: string): Promise<Video | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/videos/${contentId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

const ACCESS_LABELS: Record<string, string> = {
  PAY_PER_VIEW: "Pay-per-view",
  RENTAL: "Rental",
  LIMITED_VIEWS: "Limited views",
  SUBSCRIPTION: "Subscription",
  LIFETIME: "Lifetime",
};

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  const video = await getVideo(contentId);
  if (!video) notFound();

  const v = video!;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-white">{v.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <span>by {v.creator?.displayName ?? "Creator"}</span>
          {v.category && <span className="badge-blue">{v.category}</span>}
          <span className="badge-blue">{ACCESS_LABELS[v.accessType]}</span>
          <span className="font-semibold text-brand-400">${v.price.toFixed(2)}</span>
        </div>
      </div>

      {v.description && <p className="mb-8 text-gray-400">{v.description}</p>}

      <div className="flex flex-col gap-4">
        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <p className="font-medium text-white">Purchase to unlock</p>
              <p className="text-sm text-gray-400">
                Your entitlement is stored as a private Aleo record — only you can prove ownership.
              </p>
            </div>
          </div>
          <PurchaseButton
            contentId={v.contentId}
            price={v.price}
            accessType={v.accessType}
          />
        </div>

        <PlaybackGate video={v} />
      </div>
    </div>
  );
}
