
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { createSession, setSessionCookie } from "@/app/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(["VIEWER", "CREATOR"]).default("VIEWER"),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await db.user.create({
      data: { email: body.email, passwordHash, role: body.role },
    });

    if (body.role === "CREATOR") {
      await db.creatorProfile.create({
        data: { userId: user.id, displayName: body.email.split("@")[0] },
      });
    }

    const token = await createSession({ userId: user.id, email: user.email, role: user.role });
    const { name, value, options } = setSessionCookie(token);

    const res = NextResponse.json({ success: true, data: { userId: user.id, role: user.role } });
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}
