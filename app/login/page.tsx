// app/login/page.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/api/auth/actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="card">
      <h1>Login</h1>

      {error && (
        <p style={{
          color: "#c0392b",
          background: "#fdecea",
          padding: "10px 14px",
          borderRadius: 6,
          marginBottom: 12,
        }}>
          {error}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />

        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>

        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>

        <button type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        No account? <Link href="/register">Register</Link>
      </p>
    </div>
  );
}