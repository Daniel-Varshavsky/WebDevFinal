// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>מסלול טיולים אפקה 2026</h1>

      <nav>
        <ul>
          <li><Link href="/plan">Plan Routes</Link></li>
          <li><Link href="/history">Route History</Link></li>
          <li><Link href="/login">Login</Link></li>
        </ul>
      </nav>

      <div className="card">
        <p>
          Create realistic hiking and biking routes with weather forecast integration.
          Powered by AI waypoint suggestions and real road routing.
        </p>
      </div>
    </>
  );
}