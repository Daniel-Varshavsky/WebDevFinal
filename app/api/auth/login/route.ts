import { NextResponse } from "next/server";

/**
 * Proxies login to the Express auth server and forwards Set-Cookie to the browser.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const authUrl = process.env.AUTH_SERVER_URL ?? "http://localhost:4000";

  const resp = await fetch(`${authUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  const res = new NextResponse(text, { status: resp.status });

  const setCookie = resp.headers.get("set-cookie");
  if (setCookie) res.headers.set("set-cookie", setCookie);

  res.headers.set("content-type", resp.headers.get("content-type") ?? "application/json");
  return res;
}