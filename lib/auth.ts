// lib/auth.ts
import { jwtVerify } from "jose";

// Must match ACCESS_COOKIE in server/src/auth.ts
const AUTH_COOKIE_NAME = "access_token";
const JWT_ALG = "HS256";

type JwtPayload = {
  userId: number;
  presenterNames: string[];
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verifies a JWT token issued by the Express server and returns its payload.
 */
export async function verifyAuthToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: [JWT_ALG],
  });

  return {
    userId: Number((payload as any).userId),
    presenterNames: (payload as any).presenterNames ?? [],
  };
}

/**
 * Reads the auth cookie from a Next.js cookies() store and returns the user.
 */
export async function getUserFromCookies(): Promise<{
  id: number;
  presenterNames: string[];
}> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) throw new Error("Unauthorized");

  const payload = await verifyAuthToken(token);

  if (!payload.userId || payload.userId <= 0) throw new Error("Unauthorized");

  return {
    id: payload.userId,
    presenterNames: payload.presenterNames,
  };
}

/**
 * Extracts the auth cookie from a raw Request object (used by API routes).
 */
export async function getUserFromRequest(req: Request): Promise<{
  id: number;
  presenterNames: string[];
}> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = readCookie(cookieHeader, AUTH_COOKIE_NAME);

  if (!token) throw new Error("Unauthorized");

  const payload = await verifyAuthToken(token);

  if (!payload.userId || payload.userId <= 0) throw new Error("Unauthorized");

  return {
    id: payload.userId,
    presenterNames: payload.presenterNames,
  };
}

/**
 * Returns a Set-Cookie string that clears the auth cookie.
 */
export function buildClearAuthCookie(): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}