import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER_URL ??
  "https://publisher.walrus-testnet.walrus.space";

/**
 * POST /api/upload/walrus
 * Proxies the encrypted video blob to Walrus server-side, bypassing CORS.
 * The body is streamed directly — not buffered — so Vercel's body-size
 * limit does not apply to the blob itself.
 */
export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      // @ts-expect-error — Node 18 fetch supports body as ReadableStream
      body: req.body,
      duplex: "half",
    } as RequestInit);

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Walrus error ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const blobId: string =
      data.newlyCreated?.blobObject?.blobId ??
      data.alreadyCertified?.blobId;

    if (!blobId) {
      return NextResponse.json(
        { success: false, error: "Walrus returned no blobId" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, uri: `walrus://${blobId}`, blobId });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
