
import type { CreatorStats } from "@/types";

interface Props {
  stats: CreatorStats | null;
}

export function CreatorStatsCards({ stats }: Props) {
  const cards = [
    { label: "Total videos",   value: stats?.totalVideos   ?? 0,                    icon: "🎬" },
    { label: "Total views",    value: stats?.totalViews    ?? 0,                    icon: "👁" },
    { label: "Revenue (USD)",  value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`,  icon: "💰" },
    { label: "Active viewers", value: stats?.activeViewers ?? 0,                    icon: "🟢" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card flex items-start gap-3">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-0.5 text-xl font-bold text-white">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
