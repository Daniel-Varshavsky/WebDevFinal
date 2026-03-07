// app/register/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // POST to the Next.js proxy route, which forwards to the Express server
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    if (!res.ok) {
      setError(await res.text());
      setPending(false);
      return;
    }

    router.push("/plan");
  }

  return (
    <div className="card">
      <h1>Register</h1>

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
        <button type="submit" disabled={pending}>
          {pending ? "Registering..." : "Register"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}