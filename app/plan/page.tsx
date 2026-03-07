// app/plan/page.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import MapIframe from "../../ui/MapIframe";
import WeatherForecast from "../../ui/WeatherForecast";
import { saveRouteAction } from "./actions";

type LatLng = [number, number];

type DayForecast = {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  description: string;
  emoji: string;
};

type ApiResp = {
  title: string;
  kind: "bike" | "hike";
  center: LatLng;
  tripNarrative: string;
  days: { day: number; distanceKm: number; polyline: LatLng[]; narrative: string }[];
  weather: DayForecast[];
  photo: { url: string; photographer: string; photographerLink: string } | null;
};

export default function PlanPage() {
  const [place, setPlace] = useState("Bangkok");
  const [kind, setKind] = useState<"bike" | "hike">("bike");
  const [count, setCount] = useState(2);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [selected, setSelected] = useState(1);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setData(null);
    setSavedPlanId(null);

    try {
      const r = await fetch("/api/route/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ place, kind, days: count }),
      });

      if (!r.ok) throw new Error(await r.text());

      const json = (await r.json()) as ApiResp;
      setData(json);
      setSelected(1);
    } catch (e: any) {
      alert(e?.message ?? "Failed to generate route");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Uses a Server Action instead of fetch('/api/route/history').
   * The Server Action also calls revalidatePath('/history') automatically.
   */
  async function approveAndSave() {
    if (!data) return;
    setSaving(true);

    try {
      // No need to pass document.cookie — the Server Action reads it directly
      const { planId } = await saveRouteAction({
        title: data.title,
        place: place.trim(),
        kind: data.kind,
        center: data.center,
        days: data.days.map(({ day, distanceKm, polyline }) => ({
          day,
          distanceKm,
          polyline,
        })),
      });

      setSavedPlanId(planId);
      alert("Route saved to history ✅");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save route");
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = data?.days?.find((x) => x.day === selected);
  const isHike = kind === "hike";
  const min = isHike ? 1 : 2;
  const labelPrefix = data?.kind === "hike" ? "Route" : "Day";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Plan Routes</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={linkStyle}>← Back to Home</Link>
          <Link href="/history" style={linkStyle}>View History</Link>
        </div>
      </div>

      {/* Form — generate still uses fetch because it waits for an AI response */}
      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); generate(); }}>
          <label>
            Country / City
            <input value={place} onChange={(e) => setPlace(e.target.value)} />
          </label>

          <label>
            Trip Type
            <select value={kind} onChange={(e) => {
              const newKind = e.target.value as "bike" | "hike";
              setKind(newKind);
              setCount(newKind === "hike" ? 1 : 2);
            }}>
              <option value="bike">🚴 Bike</option>
              <option value="hike">🥾 Hike</option>
            </select>
          </label>

          <label>
            {isHike ? "Number of routes" : "Duration (days)"}
            <input
              type="number"
              min={min}
              max={3}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "✨ Generating with AI..." : "Generate Route"}
          </button>

          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            {isHike
              ? "AI will suggest real hiking waypoints for 1–3 loop routes (5–10 km each)."
              : "AI will suggest real cycling waypoints for a 2–3 day city-to-city route (30–70 km/day)."}
          </p>
        </form>
      </div>

      {/* Results */}
      {data && (
        <div className="card">
          {/* Destination photo */}
          {data.photo && (
            <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", position: "relative" }}>
              <img
                src={data.photo.url}
                alt={place}
                style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                background: "rgba(0,0,0,0.45)", color: "#fff",
                fontSize: 11, padding: "3px 8px", borderTopLeftRadius: 6,
              }}>
                Photo by{" "}
                <a href={data.photo.photographerLink} target="_blank" rel="noreferrer"
                  style={{ color: "#ddf" }}>
                  {data.photo.photographer}
                </a>{" "}
                on Pixabay
              </div>
            </div>
          )}

          <h2 style={{ marginBottom: 6 }}>{data.title}</h2>

          {data.tripNarrative && (
            <p style={{ color: "#555", fontSize: 14, marginBottom: 12, lineHeight: 1.6 }}>
              {data.tripNarrative}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span><b>Type:</b> {data.kind}</span>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <b>{labelPrefix}:</b>
              <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                {data.days.map((d) => (
                  <option key={d.day} value={d.day}>
                    {labelPrefix} {d.day} ({d.distanceKm} km)
                  </option>
                ))}
              </select>
            </label>

            {/* Approve & Save now calls a Server Action */}
            <button type="button" onClick={approveAndSave} disabled={saving || !!savedPlanId}>
              {saving ? "Saving..." : savedPlanId ? `✅ Saved (#${savedPlanId})` : "Approve & Save"}
            </button>
          </div>

          {selectedItem?.narrative && (
            <p style={{ color: "#555", fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
              📍 {selectedItem.narrative}
            </p>
          )}

          {selectedItem && (
            <p style={{ marginBottom: 8 }}>
              <b>Distance:</b> {selectedItem.distanceKm} km
            </p>
          )}

          {selectedItem && (
            <MapIframe center={data.center} polyline={selectedItem.polyline} />
          )}

          <WeatherForecast weather={data.weather} />
        </div>
      )}
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