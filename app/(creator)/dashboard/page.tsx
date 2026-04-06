
import Link from "next/link";
import type { CreatorStats, Video } from "@/types";

async function getStats(): Promise<CreatorStats | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/creator/stats`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

async function getMyVideos(): Promise<Video[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/videos?mine=true`, { cache: "no-store" });
  const json = await res.json();
  return json.data?.items ?? [];
}

export default async function CreatorDashboard() {
  const [stats, videos] = await Promise.all([getStats(), getMyVideos()]);

  const statCards = [
    { label: "Total videos",   value: stats?.totalVideos   ?? 0 },
    { label: "Total views",    value: stats?.totalViews    ?? 0 },
    { label: "Revenue (USD)",  value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}` },
    { label: "Active viewers", value: stats?.activeViewers ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
        <Link href="/upload" className="btn-primary">+ Upload video</Link>
      </div>

      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Videos table */}
      <h2 className="mb-4 text-lg font-semibold text-white">Your videos</h2>
      {videos.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          No videos yet. <Link href="/upload" className="text-brand-400 hover:underline">Upload one</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-surface-800 text-gray-400">
              <tr>
                {["Title", "Access type", "Price", "Status", "Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.contentId} className="border-b border-gray-800 hover:bg-surface-800">
                  <td className="px-4 py-3 text-white">
                    <Link href={`/video/${v.contentId}`} className="hover:text-brand-400">{v.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{v.accessType}</td>
                  <td className="px-4 py-3 text-gray-400">${v.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={v.status === "PUBLISHED" ? "badge-green" : "badge-yellow"}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
