// app/history/page.tsx
import Link from "next/link";
import { getUserFromCookies } from "@/lib/auth";
import { getRoutePlansByUser } from "@/lib/routeHistory";
import HistoryClient from "../../ui/HistoryClient";

export default async function HistoryPage() {
  const user = await getUserFromCookies();
  console.log("USER:", user);
  const plans = await getRoutePlansByUser(user.id);
  console.log("PLANS:", plans);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Route History</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={linkStyle}>← Back to Home</Link>
          <Link href="/plan" style={linkStyle}>Plan Routes</Link>
        </div>
      </div>
      <HistoryClient plans={plans} />
    </>
  );
}

const linkStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  textDecoration: "none",
  color: "inherit",
  background: "#fff",
  fontWeight: 500,
};