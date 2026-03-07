// app/plan/WeatherForecast.tsx
"use client";

type DayForecast = {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  description: string;
  emoji: string;
};

export default function WeatherForecast({ weather }: { weather: DayForecast[] }) {
  if (!weather || weather.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8, fontSize: 15, color: "#444" }}>
        🌤️ 3-Day Weather Forecast (starting tomorrow)
      </h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {weather.map((day) => (
          <div
            key={day.date}
            style={{
              background: "#f0f7ff",
              border: "1px solid #cce0ff",
              borderRadius: 10,
              padding: "12px 16px",
              minWidth: 130,
              textAlign: "center",
              flex: "1 1 130px",
            }}
          >
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div style={{ fontSize: 28 }}>{day.emoji}</div>
            <div style={{ fontSize: 13, color: "#333", margin: "4px 0" }}>
              {day.description}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {day.maxTempC}° / {day.minTempC}°C
            </div>
            {day.precipMm > 0 && (
              <div style={{ fontSize: 12, color: "#5588bb", marginTop: 2 }}>
                💧 {day.precipMm} mm
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
