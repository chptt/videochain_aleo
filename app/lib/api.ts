
/**
 * Frontend API client — typed wrappers around fetch calls to our API routes.
 */

import type {
  ApiResponse,
  Video,
  PaginatedResponse,
  PlaybackSession,
  PurchasePayload,
  PurchaseResult,
  CreatorStats,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  return res.json();
}

// ─── Videos ───────────────────────────────────────────────────────────────────

export const api = {
  videos: {
    list: (params?: { page?: number; category?: string; search?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<PaginatedResponse<Video>>(`/api/videos${q ? `?${q}` : ""}`);
    },
    get: (contentId: string) => request<Video>(`/api/videos/${contentId}`),
  },

  upload: {
    create: (formData: FormData) =>
      fetch(`${BASE}/api/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      }).then((r) => r.json() as Promise<ApiResponse<Video>>),
  },

  purchase: {
    create: (payload: PurchasePayload) =>
      request<PurchaseResult>("/api/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  playback: {
    requestSession: (payload: {
      contentId: string;
      aleoAddress: string;
      aleoTxId?: string;
    }) =>
      request<PlaybackSession>("/api/playback/session", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  creator: {
    stats: () => request<CreatorStats>("/api/creator/stats"),
  },

  auth: {
    register: (payload: { email: string; password: string; role?: string }) =>
      request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }) =>
      request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    logout: () =>
      request("/api/auth/logout", { method: "POST" }),
  },

  entitlements: {
    list: () => request<Array<{
      contentId: string;
      title: string;
      status: string;
      expiresAt?: string;
      viewsRemaining?: number;
    }>>("/api/entitlements"),
  },
};
