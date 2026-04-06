
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { createSession, setSessionCookie } from "@/app/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      aleoAddress: user.aleoAddress ?? undefined,
    });
    const { name, value, options } = setSessionCookie(token);

    const res = NextResponse.json({
      success: true,
      data: { userId: user.id, role: user.role, aleoAddress: user.aleoAddress },
    });
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
