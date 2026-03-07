// app/plan/error.tsx
"use client";

/**
 * Next.js shows this automatically when an error is thrown in the plan route segment.
 * Must be a Client Component (required by Next.js for error boundaries).
 */
export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ color: "#888", marginBottom: 20 }}>{error.message}</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  );
}
