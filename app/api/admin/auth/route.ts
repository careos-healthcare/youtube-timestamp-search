import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSecret,
  isValidAdminSecret,
} from "@/lib/admin-auth";

type AuthBody = {
  secret?: string;
};

export async function POST(request: Request) {
  if (!getAdminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as AuthBody;
  const secret = body.secret?.trim() ?? "";

  if (!isValidAdminSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
