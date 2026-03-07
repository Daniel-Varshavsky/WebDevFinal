// app/login/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // POST to the Next.js proxy route, which forwards to Express
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!res.ok) {
      setError(await res.text());
      setPending(false);
      return;
    }

    router.push(next);
  }

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

      <form onSubmit={handleSubmit}>
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