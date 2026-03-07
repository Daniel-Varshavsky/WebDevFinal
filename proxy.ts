// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value; // matches Express
  if (!token) return reject(req);

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

  try {
    const { payload } = await jwtVerify(token, secret);

    const userId = String((payload as any).userId ?? "");
    const presenterNames = ((payload as any).presenterNames ?? []).join(", ");

    if (!userId) return reject(req);

    const exp = Number(payload.exp ?? 0);
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = exp - now;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-name", presenterNames);

    const res = NextResponse.next({ request: { headers: requestHeaders } });

    // Silently refresh if token expires within 2 hours
    if (secondsLeft > 0 && secondsLeft < 60 * 60 * 2) {
      const authUrl = process.env.AUTH_SERVER_URL ?? "http://localhost:4000";
      const refreshResp = await fetch(`${authUrl}/auth/refresh`, {
        method: "POST",
        headers: { cookie: req.headers.get("cookie") ?? "" },
      });

      const setCookie = refreshResp.headers.get("set-cookie");
      if (refreshResp.ok && setCookie) {
        res.headers.append("set-cookie", setCookie);
      }
    }

    return res;
  } catch {
    return reject(req);
  }
}

function reject(req: NextRequest): NextResponse {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/plan/:path*", "/history/:path*", "/api/route/history/:path*"],
};