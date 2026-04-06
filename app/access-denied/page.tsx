
import Link from "next/link";

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams?.reason ?? "Your entitlement could not be verified.";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 text-6xl">🚫</span>
      <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
      <p className="mb-6 max-w-md text-gray-400">{reason}</p>
      <div className="flex gap-3">
        <Link href="/browse" className="btn-secondary">Browse videos</Link>
        <Link href="/my-access" className="btn-primary">My access</Link>
      </div>
    </div>
  );
}
