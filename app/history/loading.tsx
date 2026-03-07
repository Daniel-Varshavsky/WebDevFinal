// app/history/loading.tsx

/**
 * Next.js automatically shows this while the history page data is being fetched.
 */
export default function HistoryLoading() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <p style={{ fontSize: 16 }}>Loading your route history...</p>
    </div>
  );
}
