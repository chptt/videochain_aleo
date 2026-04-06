"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AleoConnect } from "./AleoConnect";
import { api } from "@/app/lib/api";

const NAV = [
  { href: "/browse",           label: "Browse" },
  { href: "/dashboard",        label: "Creator" },
  { href: "/viewer-dashboard", label: "My Videos" },
  { href: "/upload",           label: "Upload" },
];

export function Navbar() {
  const path = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await api.auth.logout();
    router.push("/auth");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-surface-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-brand-400">⬡</span> VideoChain
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`text-sm transition ${
                path.startsWith(n.href) ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <AleoConnect />
          <button
            onClick={handleLogout}
            className="hidden text-xs text-gray-500 hover:text-gray-300 md:block"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
