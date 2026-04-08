
/**
 * POST /api/auth/connect
 *
 * Wallet-based authentication. No email/password.
 * The user proves ownership of their Aleo address by connecting their wallet.
 *
 * In production: verify a signed message from the wallet before issuing a session.
 * In dev mode: trust the address directly (no signature check).
 *
 * Body: { aleoAddress: string, network: string, signature?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  aleoAddress: z.string().min(10),
  network:     z.string().default("testnet3"),
  signature:   z.string().optional(), // wallet signature (required in production)
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    // TODO: In production, verify the wallet signature here
    // The user should sign a challenge message with their Aleo private key
    // and the backend verifies it using the Aleo SDK before issuing a session.

    const token = await createSession({
      aleoAddress: body.aleoAddress,
      network: body.network,
    });

    const { name, value, options } = setSessionCookie(token);
    const res = NextResponse.json({
      success: true,
      data: { aleoAddress: body.aleoAddress, network: body.network },
    });
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Auth failed" }, { status: 500 });
  }
}
