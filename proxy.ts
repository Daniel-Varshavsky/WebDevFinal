// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware: verifies JWT from the auth cookie and forwards user info
 * to route handlers via request headers.
 * Silently refreshes the token when it is close to expiry.
 */
export async function proxy(req: NextRequest) {
  // "auth_token" matches the AUTH_COOKIE_NAME constant in lib/auth.ts
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return reject(req);

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

  try {
    const { payload } = await jwtVerify(token, secret);

    // lib/auth.ts puts the user id in "sub" (standard JWT subject claim)
    const userId = String(payload.sub ?? "");
    const userName = String((payload as any).name ?? "");

    if (!userId) return reject(req);

    const exp = Number(payload.exp ?? 0);
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = exp - now;

    // Forward the verified user id to API route handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-name", userName);

    const res = NextResponse.next({ request: { headers: requestHeaders } });

    // Silently refresh if the token expires within 2 hours
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