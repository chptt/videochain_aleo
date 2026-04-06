import Link from "next/link";

interface EntitlementItem {
  contentId: string;
  title: string;
  status: string;
  expiresAt?: string;
  viewsRemaining?: number;
  accessType: string;
}

async function getMyAccess(): Promise<EntitlementItem[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/entitlements`, { cache: "no-store" });
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

const ACCESS_LABELS: Record<string, string> = {
  PAY_PER_VIEW: "Pay-per-view",
  RENTAL: "Rental",
  LIMITED_VIEWS: "Limited views",
  SUBSCRIPTION: "Subscription",
  LIFETIME: "Lifetime",
};

export default async function MyAccessPage() {
  const items = await getMyAccess();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold text-white">My Access</h1>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-5xl">🎬</span>
          <p className="text-gray-400">You haven't unlocked any videos yet.</p>
          <Link href="/browse" className="btn-primary">Browse videos</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.contentId} className="card flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="font-medium text-white">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{ACCESS_LABELS[item.accessType] ?? item.accessType}</span>
                  {item.expiresAt && (
                    <span>· Expires {new Date(item.expiresAt).toLocaleString()}</span>
                  )}
                  {item.viewsRemaining !== undefined && item.viewsRemaining !== null && (
                    <span>· {item.viewsRemaining} views left</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={item.status === "ACTIVE" ? "badge-green" : "badge-red"}>
                  {item.status}
                </span>
                {item.status === "ACTIVE" && (
                  <Link href={`/video/${item.contentId}`} className="btn-primary text-xs px-3 py-1">
                    Watch
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
