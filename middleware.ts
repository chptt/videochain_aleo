import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

// Routes that require a valid playback session JWT (passed as ?sid= query param)
const STREAM_PREFIX = "/api/stream";

// Routes that require an Aleo address session
const PROTECTED_API = [
  "/api/upload",
  "/api/purchase",
  "/api/playback",
  "/api/creator",
  "/api/entitlements",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Stream endpoint — validated inside the route handler via sid param
  if (pathname.startsWith(STREAM_PREFIX)) {
    return NextResponse.next();
  }

  const isProtectedApi = PROTECTED_API.some((p) => pathname.startsWith(p));
  if (!isProtectedApi) return NextResponse.next();

  const token = req.cookies.get("vc_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
  }
}

export const config = {
  matcher: [
    "/api/upload/:path*",
    "/api/purchase/:path*",
    "/api/playback/:path*",
    "/api/creator/:path*",
    "/api/entitlements/:path*",
    "/api/stream/:path*",
  ],
};
