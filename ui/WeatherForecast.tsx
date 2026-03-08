// ui/WeatherForecast.tsx
"use client";

import clsx from "clsx";
import styles from "./WeatherForecast.module.css";

type DayForecast = {
  date: string;
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  description: string;
  emoji: string;
};

function getCardStyle(emoji: string) {
  if (["☀️", "⛅"].includes(emoji)) return styles.cardSunny;
  if (["🌧️", "🌦️", "⛈️"].includes(emoji)) return styles.cardRainy;
  if (["❄️", "🌨️"].includes(emoji)) return styles.cardSnowy;
  return styles.cardDefault;
}

export default function WeatherForecast({ weather }: { weather: DayForecast[] }) {
  if (!weather || weather.length === 0) return null;

  return (
    <div>
      {/* Tailwind for the heading */}
      <h3 className="text-sm font-semibold text-gray-500 mt-4 mb-2">
        🌤️ 3-Day Weather Forecast (starting tomorrow)
      </h3>

      {/* CSS Module for the grid layout */}
      <div className={styles.forecastGrid}>
        {weather.map((day) => (
          <div
            key={day.date}
            // clsx combines the base card style with the condition-dependent color
            className={clsx(styles.card, getCardStyle(day.emoji))}
          >
            <div className="text-xs text-gray-400 mb-1">
              {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-3xl">{day.emoji}</div>
            <div className="text-xs text-gray-600 my-1">{day.description}</div>
            <div className="text-sm font-semibold">
              {day.maxTempC}° / {day.minTempC}°C
            </div>
            {day.precipMm > 0 && (
              <div className="text-xs text-blue-400 mt-1">
                💧 {day.precipMm} mm
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}