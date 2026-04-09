import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300;

const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER_URL ??
  "https://publisher.walrus-testnet.walrus.space";

const TMP_DIR = "/tmp/vc-uploads";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

function chunkPath(uploadId: string, idx: number) {
  return path.join(TMP_DIR, `${uploadId}-${idx}`);
}

function metaPath(uploadId: string) {
  return path.join(TMP_DIR, `${uploadId}-meta`);
}

export async function POST(req: NextRequest) {
  try {
    const uploadId    = req.headers.get("x-upload-id");
    const chunkIndex  = req.headers.get("x-chunk-index");
    const totalChunks = req.headers.get("x-total-chunks");

    // ── Single-shot (no chunk headers) ──────────────────────────────────────
    if (!uploadId || chunkIndex === null || totalChunks === null) {
      const body = await req.arrayBuffer();
      return await forwardToWalrus(Buffer.from(body));
    }

    // ── Chunked ──────────────────────────────────────────────────────────────
    await ensureTmpDir();

    const idx   = parseInt(chunkIndex);
    const total = parseInt(totalChunks);
    const chunk = Buffer.from(await req.arrayBuffer());

    // Write this chunk to /tmp
    await writeFile(chunkPath(uploadId, idx), chunk);
    // Write/update meta (total count)
    await writeFile(metaPath(uploadId), String(total));

    // Check how many chunks we have
    let received = 0;
    for (let i = 0; i < total; i++) {
      if (existsSync(chunkPath(uploadId, i))) received++;
    }

    if (received < total) {
      return NextResponse.json({ success: true, received, total });
    }

    // All chunks present — assemble
    const parts: Buffer[] = [];
    for (let i = 0; i < total; i++) {
      parts.push(await readFile(chunkPath(uploadId, i)));
    }
    const assembled = Buffer.concat(parts);

    // Clean up tmp files
    for (let i = 0; i < total; i++) {
      unlink(chunkPath(uploadId, i)).catch(() => {});
    }
    unlink(metaPath(uploadId)).catch(() => {});

    return await forwardToWalrus(assembled);

  } catch (err) {
    console.error("Walrus proxy error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

async function forwardToWalrus(body: Buffer): Promise<NextResponse> {
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/store`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.length),
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error("Walrus rejected:", res.status, text);
    return NextResponse.json(
      { success: false, error: `Walrus error ${res.status}: ${text}` },
      { status: 502 }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ success: false, error: "Walrus returned non-JSON response" }, { status: 502 });
  }

  const blobId: string =
    (data.newlyCreated as Record<string, Record<string, string>> | undefined)?.blobObject?.blobId ??
    (data.alreadyCertified as Record<string, string> | undefined)?.blobId ?? "";

  if (!blobId) {
    console.error("Walrus no blobId:", JSON.stringify(data));
    return NextResponse.json({ success: false, error: `Walrus returned no blobId: ${JSON.stringify(data)}` }, { status: 502 });
  }

  return NextResponse.json({ success: true, uri: `walrus://${blobId}`, blobId });
}
