// app/auth/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { verifyPassword, hashPassword, signAuthToken } from "@/lib/auth";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) return "Email and password are required.";

  const result = await pool.query(
    `SELECT id, full_name, email, password_hash FROM users WHERE email=$1 LIMIT 1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) return "Invalid email or password.";

  const ok = await verifyPassword(password, String(user.password_hash));
  if (!ok) return "Invalid email or password.";

  const token = await signAuthToken({
    id: Number(user.id),
    email: String(user.email),
    name: String(user.full_name),
  });

  (await cookies()).set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(next);
}

export async function registerAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return "Full name is required.";
  if (!email || !email.includes("@")) return "A valid email is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";

  const exists = await pool.query(
    "SELECT id FROM users WHERE email=$1 LIMIT 1",
    [email]
  );
  if (exists.rows.length > 0) return "This email is already registered.";

  const passwordHash = await hashPassword(password);

  const insert = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email`,
    [fullName, email, passwordHash]
  );

  const user = insert.rows[0];

  const token = await signAuthToken({
    id: Number(user.id),
    email: String(user.email),
    name: String(user.full_name),
  });

  (await cookies()).set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/plan");
}
