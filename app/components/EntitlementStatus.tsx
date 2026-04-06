
"use client";

import type { EntitlementStatus } from "@/types";

interface Props {
  status: EntitlementStatus | "unknown";
  expiresAt?: string;
  viewsLeft?: number;
}

const STATUS_CONFIG = {
  ACTIVE:   { label: "Access active",   cls: "badge-green" },
  EXPIRED:  { label: "Access expired",  cls: "badge-red" },
  CONSUMED: { label: "Views exhausted", cls: "badge-red" },
  REVOKED:  { label: "Access revoked",  cls: "badge-red" },
  unknown:  { label: "No access",       cls: "badge-yellow" },
};

export function EntitlementStatus({ status, expiresAt, viewsLeft }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={cfg.cls}>{cfg.label}</span>
        {status === "ACTIVE" && (
          <span className="text-xs text-gray-500">
            🔒 Verified via Aleo
          </span>
        )}
      </div>
      {expiresAt && status === "ACTIVE" && (
        <p className="text-xs text-gray-500">
          Expires: {new Date(expiresAt).toLocaleString()}
        </p>
      )}
      {viewsLeft !== undefined && viewsLeft > 0 && (
        <p className="text-xs text-gray-500">{viewsLeft} view(s) remaining</p>
      )}
    </div>
  );
}
