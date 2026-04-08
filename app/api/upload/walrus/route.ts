import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER_URL ??
  "https://publisher.walrus-testnet.walrus.space";

// In-memory chunk store (per-deployment, cleared on cold start)
// Key: uploadId, Value: ordered chunks
const chunkStore = new Map<string, Buffer[]>();

/**
 * POST /api/upload/walrus
 *
 * Supports two modes:
 *
 * 1. Chunked upload (multipart):
 *    Headers: x-upload-id, x-chunk-index, x-total-chunks
 *    Body: raw binary chunk
 *    - When all chunks received, assembles and forwards to Walrus
 *
 * 2. Single shot (small files < 4MB):
 *    No extra headers — body forwarded directly to Walrus
 */
export async function POST(req: NextRequest) {
  try {
    const uploadId    = req.headers.get("x-upload-id");
    const chunkIndex  = req.headers.get("x-chunk-index");
    const totalChunks = req.headers.get("x-total-chunks");

    // ── Single-shot ──────────────────────────────────────────────────────────
    if (!uploadId || !chunkIndex || !totalChunks) {
      return await forwardToWalrus(await req.arrayBuffer());
    }

    // ── Chunked ──────────────────────────────────────────────────────────────
    const idx   = parseInt(chunkIndex);
    const total = parseInt(totalChunks);
    const chunk = Buffer.from(await req.arrayBuffer());

    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, new Array(total).fill(null));
    }
    const chunks = chunkStore.get(uploadId)!;
    chunks[idx] = chunk;

    const received = chunks.filter(Boolean).length;

    // Not all chunks yet — acknowledge and wait
    if (received < total) {
      return NextResponse.json({ success: true, received, total });
    }

    // All chunks received — assemble and forward
    chunkStore.delete(uploadId);
    const assembled = Buffer.concat(chunks);
    return await forwardToWalrus(assembled);

  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

async function forwardToWalrus(body: ArrayBuffer | Buffer): Promise<NextResponse> {
  const buf = body instanceof Buffer ? body : Buffer.from(body as ArrayBuffer);
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(buf),
  });

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
    return NextResponse.json({ success: false, error: "Walrus returned no blobId" }, { status: 502 });
  }

  return NextResponse.json({ success: true, uri: `walrus://${blobId}`, blobId });
}
