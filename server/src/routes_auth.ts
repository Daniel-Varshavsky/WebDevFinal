// server/src/routes_auth.ts
import { Router } from "express";
import { pool } from "./db";
import {
  buildAccessCookie,
  getAccessCookieName,
  hashPassword,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./auth";

/**
 * Auth routes: register, login, refresh, me.
 */
export const authRouter = Router();

/**
 * Registers a user and sets an auth cookie (JWT).
 */
authRouter.post("/register", async (req, res) => {
  const fullName = String(req.body?.fullName ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!fullName) return res.status(400).send("fullName is required");
  if (!email || !email.includes("@")) return res.status(400).send("valid email required");
  if (password.length < 6) return res.status(400).send("password must be 6+ chars");

  const exists = await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [email]);
  if (exists.rows.length > 0) return res.status(409).send("email already exists");

  const passwordHash = await hashPassword(password);

  const insert = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email`,
    [fullName, email, passwordHash]
  );

  const user = insert.rows[0];
  const token = signAccessToken({
    userId: Number(user.id),
    presenterNames: [String(user.full_name)],
  });

  res.setHeader("Set-Cookie", buildAccessCookie(token));
  return res.json({
    ok: true,
    user: { id: Number(user.id), fullName: String(user.full_name), email: String(user.email) },
  });
});

/**
 * Logs in a user and sets an auth cookie (JWT).
 */
authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) return res.status(400).send("email/password required");

  const userRes = await pool.query(
    `SELECT id, full_name, email, password_hash
     FROM users
     WHERE email=$1
     LIMIT 1`,
    [email]
  );

  const user = userRes.rows[0];
  if (!user) return res.status(401).send("invalid credentials");

  const ok = await verifyPassword(password, String(user.password_hash));
  if (!ok) return res.status(401).send("invalid credentials");

  const token = signAccessToken({
    userId: Number(user.id),
    presenterNames: [String(user.full_name)],
  });

  res.setHeader("Set-Cookie", buildAccessCookie(token));
  return res.json({
    ok: true,
    user: { id: Number(user.id), fullName: String(user.full_name), email: String(user.email) },
  });
});

/**
 * Refreshes the JWT silently. Called by Next middleware when token is near expiry.
 */
authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[getAccessCookieName()];
  if (!token) return res.status(401).send("missing token");

  try {
    const payload = verifyAccessToken(token);
    // issue a fresh one-day token with same claims
    const newToken = signAccessToken({
      userId: payload.userId,
      presenterNames: payload.presenterNames ?? [],
    });

    res.setHeader("Set-Cookie", buildAccessCookie(newToken));
    return res.json({ ok: true });
  } catch {
    return res.status(401).send("invalid token");
  }
});

/**
 * Returns current authenticated user info from the token.
 */
authRouter.get("/me", async (req, res) => {
  const token = req.cookies?.[getAccessCookieName()];
  if (!token) return res.status(401).send("missing token");

  try {
    const payload = verifyAccessToken(token);
    return res.json({ ok: true, userId: payload.userId, presenterNames: payload.presenterNames });
  } catch {
    return res.status(401).send("invalid token");
  }
});