// app/plan/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import MapIframe from "./MapIframe";

type LatLng = [number, number];

type ApiResp = {
  title: string;
  kind: "bike" | "hike";
  center: LatLng;
  days: { day: number; distanceKm: number; polyline: LatLng[] }[];
};

export default function PlanPage() {
  const [place, setPlace] = useState("bangkok ");
  const [kind, setKind] = useState<"bike" | "hike">("bike");
  const [count, setCount] = useState(2); // bike: days (2-3), hike: routes (1-3)

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [selected, setSelected] = useState(1);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

  /**
   * Requests a generated route plan preview from the server.
   */
  async function generate() {
    setLoading(true);
    setData(null);
    setSavedPlanId(null);

    try {
      const r = await fetch("/api/route/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // API still expects "days" — for hike it means "number of routes"
        body: JSON.stringify({ place, kind, days: count }),
      });

      if (!r.ok) throw new Error(await r.text());

      const json = (await r.json()) as ApiResp;
      setData(json);
      setSelected(1);
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Saves the currently displayed generated plan into the user's route history.
   */
  async function approveAndSave() {
    if (!data) return;

    setSaving(true);

    try {
      const r = await fetch("/api/route/history", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          
        },
        body: JSON.stringify({
          title: data.title,
          place: place.trim(),
          kind: data.kind,
          center: data.center,
          days: data.days,
        }),
      });

      if (!r.ok) throw new Error(await r.text());

      const json = await r.json();
      setSavedPlanId(Number(json.planId));
      alert("Route saved to history");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save route");
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = data?.days?.find((x) => x.day === selected);

  const isHike = kind === "hike";
  const min = isHike ? 1 : 2;
  const max = 3;

  const labelPrefix = data?.kind === "hike" ? "Route" : "Day";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
  <h1 style={{ margin: 0 }}>Plan Routes</h1>

  <Link
    href="/"
    style={{
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ccc",
      textDecoration: "none",
      color: "inherit",
      background: "#fff",
      fontWeight: 500,
    }}
  >
    ← Back to Home
  </Link><Link
  href="/history"
  style={{
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    textDecoration: "none",
    color: "inherit",
    background: "#fff",
    fontWeight: 500,
  }}
>
  View History
</Link>
</div>

      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <label>
            Country / City
            <input value={place} onChange={(e) => setPlace(e.target.value)} />
          </label>

          <label>
            Trip Type
            <select
              value={kind}
              onChange={(e) => {
                const newKind = e.target.value as "bike" | "hike";
                setKind(newKind);
                setCount(newKind === "hike" ? 1 : 2);
              }}
            >
              <option value="bike">Bike</option>
              <option value="hike">Hike</option>
            </select>
          </label>

          <label>
            {isHike ? "Number of routes" : "Duration (days)"}
            <input
              type="number"
              min={min}
              max={max}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>

          <p style={{ marginTop: 10, opacity: 0.8 }}>
            {isHike
              ? "Hike: 1-3 loop routes (start & end at the selected city), 5-10 km each."
              : "Bike: 2-3 consecutive days (city-to-city), full trip starts and ends at the selected city."}
          </p>
        </form>
      </div>

      {data && (
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>{data.title}</h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <span>
              <b>Type:</b> {data.kind}
            </span>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <b>{labelPrefix}:</b>
              <select
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {data.days.map((d) => (
                  <option key={d.day} value={d.day}>
                    {labelPrefix} {d.day} ({d.distanceKm} km)
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={approveAndSave} disabled={saving}>
              {saving ? "Saving..." : "Approve & Save"}
            </button>
          </div>

          {savedPlanId && (
            <p style={{ color: "green", marginTop: 6 }}>
              Saved to history (ID: {savedPlanId})
            </p>
          )}

          {selectedItem && (
            <>
              <p style={{ marginTop: 6 }}>
                <b>Distance:</b> {selectedItem.distanceKm} km
              </p>

              <MapIframe center={data.center} polyline={selectedItem.polyline} />
            </>
          )}
        </div>
      )}
    </>
  );
}