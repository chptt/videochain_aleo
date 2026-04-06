import Link from "next/link";
import { db } from "@/services/db";
import { getSession } from "@/app/lib/auth";

export default async function CreatorDashboard() {
  const session = await getSession();

  const [totalVideos, activeSessions] = session ? await Promise.all([
    db.video.count({ where: { creatorAddress: session.aleoAddress } }),
    db.playbackSession.count({
      where: {
        video: { creatorAddress: session.aleoAddress },
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    }),
  ]) : [0, 0];

  const videos = session ? await db.video.findMany({
    where: { creatorAddress: session.aleoAddress },
    orderBy: { createdAt: "desc" },
    take: 20,
  }) : [];

  const statCards = [
    { label: "Total videos",   value: totalVideos },
    { label: "Active viewers", value: activeSessions },
    { label: "Revenue (USD)",  value: "$0.00" },
    { label: "Total views",    value: 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
        <Link href="/upload" className="btn-primary">+ Upload video</Link>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

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
                {["Content ID", "Status", "Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.contentId} className="border-b border-gray-800 hover:bg-surface-800">
                  <td className="px-4 py-3 text-white font-mono text-xs">{v.contentId.slice(0, 16)}…</td>
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
