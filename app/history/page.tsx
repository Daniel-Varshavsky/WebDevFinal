// app/history/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MapIframe from "../../ui/MapIframe";
import WeatherForecast from "../../ui/WeatherForecast";

type LatLng = [number, number];

type DayForecast = {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  description: string;
  emoji: string;
};

type RoutePlan = {
  id: number;
  title: string;
  place: string;
  kind: "bike" | "hike";
  center: LatLng;
  createdAt: string;
  days: { day: number; distanceKm: number; polyline: LatLng[] }[];
};

export default function HistoryPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  // Weather for the currently selected plan
  const [weather, setWeather] = useState<DayForecast[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    try {
      const r = await fetch("/api/route/history");
      if (!r.ok) throw new Error(await r.text());

      const json = await r.json();
      const nextPlans = (json.plans ?? []) as RoutePlan[];
      setPlans(nextPlans);

      if (nextPlans.length > 0) {
        setSelectedPlanId(nextPlans[0].id);
        setSelectedDay(nextPlans[0].days[0]?.day ?? 1);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  // Fetch fresh weather whenever the selected plan changes
  useEffect(() => {
    if (!selectedPlan) return;

    setWeather([]);
    setWeatherLoading(true);

    fetch(
      `/api/weather?lat=${selectedPlan.center[0]}&lon=${selectedPlan.center[1]}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setWeather(json.weather ?? []))
      .catch(() => setWeather([]))
      .finally(() => setWeatherLoading(false));
  }, [selectedPlan?.id]);

  const selectedDayRoute = selectedPlan?.days.find((d) => d.day === selectedDay);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Route History</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={linkStyle}>← Back to Home</Link>
          <Link href="/plan" style={linkStyle}>Plan Routes</Link>
        </div>
      </div>

      <div className="card">
        <button type="button" onClick={loadHistory} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>

        {!loading && plans.length === 0 && (
          <p style={{ marginTop: 12 }}>No saved routes yet.</p>
        )}

        {!loading && plans.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <label>
                Saved plan
                <select
                  value={selectedPlanId ?? ""}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    setSelectedPlanId(nextId);
                    const p = plans.find((x) => x.id === nextId);
                    setSelectedDay(p?.days[0]?.day ?? 1);
                  }}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.title}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPlan && (
                <label>
                  {selectedPlan.kind === "hike" ? "Route" : "Day"}
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                  >
                    {selectedPlan.days.map((d) => (
                      <option key={d.day} value={d.day}>
                        {selectedPlan.kind === "hike" ? "Route" : "Day"} {d.day} ({d.distanceKm} km)
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {selectedPlan && (
              <div style={{ marginTop: 12 }}>
                <p><b>Place:</b> {selectedPlan.place}</p>
                <p><b>Type:</b> {selectedPlan.kind}</p>
                <p><b>Saved at:</b> {new Date(selectedPlan.createdAt).toLocaleString()}</p>
              </div>
            )}

            {selectedPlan && selectedDayRoute && (
              <>
                <p><b>Distance:</b> {selectedDayRoute.distanceKm} km</p>
                <MapIframe center={selectedPlan.center} polyline={selectedDayRoute.polyline} />
              </>
            )}

            {/* Fresh weather forecast for this destination */}
            {selectedPlan && (
              <div style={{ marginTop: 8 }}>
                {weatherLoading ? (
                  <p style={{ color: "#888", fontSize: 13 }}>Loading weather forecast...</p>
                ) : (
                  <WeatherForecast weather={weather} />
                )}
              </div>
            )}
          </>
        )}
      </div>
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