
export function VideoCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-3 h-40 rounded-lg bg-surface-600" />
      <div className="mb-2 h-4 w-3/4 rounded bg-surface-600" />
      <div className="h-3 w-1/2 rounded bg-surface-600" />
    </div>
  );
}

export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-6 py-10">
      <div className="mb-6 h-8 w-48 rounded bg-surface-700" />
      <VideoGridSkeleton />
    </div>
  );
}
