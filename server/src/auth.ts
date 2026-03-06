// server/src/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ACCESS_COOKIE = "access_token";
const ACCESS_TTL_SECONDS = 60 * 60 * 24; // 1 day

type JwtClaims = {
  userId: number;
  presenterNames: string[]; // לפי ההנחיות: שמות המגיש/ים
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error("JWT_SECRET missing/too short");
  return secret;
}

/**
 * Hashes a password using bcrypt (salted hash).
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a JWT access token valid for one day.
 */
export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, getJwtSecret(), { expiresIn: ACCESS_TTL_SECONDS });
}

/**
 * Verifies a JWT token and returns its payload.
 */
export function verifyAccessToken(token: string): JwtClaims & jwt.JwtPayload {
  return jwt.verify(token, getJwtSecret()) as any;
}

/**
 * Builds an HttpOnly cookie for the access token.
 */
export function buildAccessCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${ACCESS_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ACCESS_TTL_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getAccessCookieName(): string {
  return ACCESS_COOKIE;
}