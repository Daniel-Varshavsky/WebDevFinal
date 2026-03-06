// lib/weather.ts

export type DayForecast = {
  date: string;        // "2026-03-07"
  maxTempC: number;
  minTempC: number;
  precipMm: number;
  weatherCode: number; // WMO code
  description: string;
  emoji: string;
};

/**
 * Maps WMO weather interpretation codes to human-readable descriptions and emojis.
 * https://open-meteo.com/en/docs#weathervariables
 */
function interpretCode(code: number): { description: string; emoji: string } {
  if (code === 0) return { description: "Clear sky", emoji: "☀️" };
  if (code <= 2) return { description: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { description: "Overcast", emoji: "☁️" };
  if (code <= 49) return { description: "Foggy", emoji: "🌫️" };
  if (code <= 59) return { description: "Drizzle", emoji: "🌦️" };
  if (code <= 69) return { description: "Rain", emoji: "🌧️" };
  if (code <= 79) return { description: "Snow", emoji: "❄️" };
  if (code <= 84) return { description: "Rain showers", emoji: "🌦️" };
  if (code <= 94) return { description: "Snow showers", emoji: "🌨️" };
  return { description: "Thunderstorm", emoji: "⛈️" };
}

/**
 * Fetches a 3-day weather forecast from Open-Meteo for the given coordinates.
 * Assumes the trip starts tomorrow, so returns days: tomorrow, +2, +3.
 */
export async function getWeatherForecast(
  lat: number,
  lon: number
): Promise<DayForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto&forecast_days=4`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Weather fetch failed");

  const data = await r.json();

  const dates: string[] = data.daily.time;
  const codes: number[] = data.daily.weathercode;
  const maxTemps: number[] = data.daily.temperature_2m_max;
  const minTemps: number[] = data.daily.temperature_2m_min;
  const precip: number[] = data.daily.precipitation_sum;

  // Skip index 0 (today), take indices 1–3 (tomorrow + 2 more days)
  return dates.slice(1, 4).map((date, i) => {
    const idx = i + 1;
    const { description, emoji } = interpretCode(codes[idx]);
    return {
      date,
      maxTempC: Math.round(maxTemps[idx]),
      minTempC: Math.round(minTemps[idx]),
      precipMm: Math.round(precip[idx] * 10) / 10,
      weatherCode: codes[idx],
      description,
      emoji,
    };
  });
}
