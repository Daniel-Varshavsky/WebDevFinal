// ui/HistoryClient.tsx
"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import MapIframe from "./MapIframe";
import WeatherForecast from "./WeatherForecast";

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

export default function HistoryClient({ plans }: { plans: RoutePlan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    plans[0]?.id ?? null
  );
  const [selectedDay, setSelectedDay] = useState(plans[0]?.days[0]?.day ?? 1);
  const [weather, setWeather] = useState<DayForecast[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  // Fetch fresh weather whenever the selected plan changes
  useEffect(() => {
    if (!selectedPlan) return;

    setWeather([]);
    setWeatherLoading(true);

    fetch(`/api/route/weather?lat=${selectedPlan.center[0]}&lon=${selectedPlan.center[1]}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setWeather(json.weather ?? []))
      .catch(() => setWeather([]))
      .finally(() => setWeatherLoading(false));
  }, [selectedPlan?.id]);

  const selectedDayRoute = selectedPlan?.days.find((d) => d.day === selectedDay);

  if (plans.length === 0) {
    return (
      <div className="card">
        <p>No saved routes yet. <Link href="/plan">Plan one!</Link></p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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

      {selectedPlan && (
        <div style={{ marginTop: 8 }}>
          {weatherLoading ? (
            <p style={{ color: "#888", fontSize: 13 }}>Loading weather forecast...</p>
          ) : (
            <WeatherForecast weather={weather} />
          )}
        </div>
      )}
    </div>
  );
}