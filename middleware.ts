// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware: verifies JWT from Express and silently refreshes it when close to expiry.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return reject(req);

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

  try {
    const { payload } = await jwtVerify(token, secret);

    const userId = String((payload as any).userId ?? "");
    const presenterNames = Array.isArray((payload as any).presenterNames)
      ? ((payload as any).presenterNames as string[])
      : [];

    if (!userId) return reject(req);

    const exp = Number(payload.exp ?? 0);
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = exp - now;

    // Create a new request headers object and forward user id to route handlers.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-name", presenterNames.join(", "));

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Refresh silently if the token expires soon (e.g., within 2 hours).
    if (secondsLeft > 0 && secondsLeft < 60 * 60 * 2) {
      const authUrl = process.env.AUTH_SERVER_URL ?? "http://localhost:4000";

      const refreshResp = await fetch(`${authUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
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