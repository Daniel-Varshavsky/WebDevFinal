// app/register/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hashPassword, signAuthToken } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * Server Action: creates a new user account and sets the auth cookie.
 */
async function registerAction(formData: FormData) {
  "use server";

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) throw new Error("Full name is required");
  if (!email || !email.includes("@")) throw new Error("Valid email required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");

  const exists = await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [email]);
  if (exists.rows.length > 0) throw new Error("Email already registered");

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

/**
 * Register page — rendered as a Server Component.
 * The form posts to the Server Action above; no "use client" needed.
 */
export default function RegisterPage() {
  return (
    <div className="card">
      <h1>Register</h1>

      <form action={registerAction}>
        <label>
          Full name
          <input name="fullName" type="text" required autoComplete="name" />
        </label>

        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>

        <label>
          Password
          <input name="password" type="password" required autoComplete="new-password" />
        </label>

        <button type="submit">Register</button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}