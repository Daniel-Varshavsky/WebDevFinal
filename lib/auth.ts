// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_ALG = "HS256";
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day

type JwtPayload = {
  sub: string; // user id
  email: string;
  name: string;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hashes a password using PBKDF2 with a random salt.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const iterations = 120_000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");

  return `pbkdf2$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Verifies a password against a stored PBKDF2 hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [scheme, iterText, saltB64, hashB64] = storedHash.split("$");
    if (scheme !== "pbkdf2") return false;

    const iterations = Number(iterText);
    if (!Number.isFinite(iterations) || iterations < 10_000) return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");

    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Creates a signed JWT token for the authenticated user.
 */
export async function signAuthToken(user: {
  id: number;
  email: string;
  name: string;
}): Promise<string> {
  const payload: JwtPayload = {
    sub: String(user.id),
    email: user.email,
    name: user.name,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

/**
 * Verifies a JWT token and returns the decoded payload.
 */
export async function verifyAuthToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: [JWT_ALG],
  });

  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ""),
    name: String(payload.name ?? ""),
  };
}

/**
 * Extracts the authenticated user from the request Cookie header.
 */
export async function getUserFromRequest(req: Request): Promise<{
  id: number;
  email: string;
  name: string;
}> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = readCookie(cookieHeader, AUTH_COOKIE_NAME);

  if (!token) throw new Error("Unauthorized");

  const payload = await verifyAuthToken(token);
  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Unauthorized");
  }

  return {
    id: userId,
    email: payload.email,
    name: payload.name,
  };
}

/**
 * Returns a Set-Cookie value for the auth token.
 */
export function buildAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production";

  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TOKEN_TTL_SECONDS}`,
  ];

  if (secure) parts.push("Secure");

  return parts.join("; ");
}

/**
 * Returns a Set-Cookie value that removes the auth cookie.
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

/**
 * Reads one cookie value from a raw Cookie header string.
 */
function readCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }

  return null;
}