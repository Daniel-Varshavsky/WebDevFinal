// app/plan/loading.tsx

/**
 * Next.js automatically shows this while the plan page is loading.
 * No "use client" needed — this is a Server Component.
 */
export default function PlanLoading() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
      <p style={{ fontSize: 16 }}>Loading route planner...</p>
    </div>
  );
}
