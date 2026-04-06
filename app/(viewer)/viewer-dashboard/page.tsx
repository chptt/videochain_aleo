
import Link from "next/link";

interface EntitlementItem {
  contentId: string;
  title: string;
  thumbnailUri?: string;
  accessType: string;
  status: string;
  expiresAt?: string;
  viewsRemaining?: number;
}

async function getEntitlements(): Promise<EntitlementItem[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/entitlements`, { cache: "no-store" });
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   "badge-green",
  EXPIRED:  "badge-red",
  CONSUMED: "badge-red",
  REVOKED:  "badge-red",
};

const ACCESS_LABELS: Record<string, string> = {
  PAY_PER_VIEW: "Pay-per-view",
  RENTAL: "Rental",
  LIMITED_VIEWS: "Limited views",
  SUBSCRIPTION: "Subscription",
  LIFETIME: "Lifetime",
};

export default async function ViewerDashboard() {
  const entitlements = await getEntitlements();
  const active = entitlements.filter((e) => e.status === "ACTIVE");
  const expired = entitlements.filter((e) => e.status !== "ACTIVE");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <Link href="/browse" className="btn-primary">Browse videos</Link>
      </div>

      {/* Summary cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active access",  value: active.length },
          { label: "Total unlocked", value: entitlements.length },
          { label: "Expired",        value: expired.length },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active entitlements */}
      <h2 className="mb-4 text-lg font-semibold text-white">Active access</h2>
      {active.length === 0 ? (
        <div className="card mb-8 py-10 text-center text-gray-500">
          No active access.{" "}
          <Link href="/browse" className="text-brand-400 hover:underline">Browse videos</Link>
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {active.map((e) => (
            <EntitlementRow key={e.contentId} item={e} />
          ))}
        </div>
      )}

      {/* Expired / consumed */}
      {expired.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold text-gray-500">Past access</h2>
          <div className="flex flex-col gap-3 opacity-60">
            {expired.map((e) => (
              <EntitlementRow key={e.contentId} item={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EntitlementRow({ item }: { item: EntitlementItem }) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-white">{item.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{ACCESS_LABELS[item.accessType] ?? item.accessType}</span>
          {item.expiresAt && (
            <span>· Expires {new Date(item.expiresAt).toLocaleDateString()}</span>
          )}
          {item.viewsRemaining !== undefined && item.viewsRemaining !== null && (
            <span>· {item.viewsRemaining} views left</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={STATUS_BADGE[item.status] ?? "badge-yellow"}>{item.status}</span>
        {item.status === "ACTIVE" && (
          <Link href={`/video/${item.contentId}`} className="btn-primary text-xs px-3 py-1">
            Watch
          </Link>
        )}
      </div>
    </div>
  );
}
