import { NextResponse } from "next/server";
import { buildClearAuthCookie } from "@/lib/auth";

/**
 * Clears the auth cookie and logs the user out.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearAuthCookie());
  return res;
}