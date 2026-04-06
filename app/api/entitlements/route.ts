import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";

// Entitlement state is managed by Aleo wallet records, not the DB.
// This endpoint returns an empty list — the client checks entitlement
// via the Aleo wallet directly when requesting playback.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Once Aleo program is live, query the user's AccessRecords
    // using their view key to list owned content.
    return NextResponse.json({ success: true, data: [] });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch entitlements" }, { status: 500 });
  }
}
