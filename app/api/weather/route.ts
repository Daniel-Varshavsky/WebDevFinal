// app/api/weather/route.ts
import { NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/weather";

/**
 * GET /api/weather?lat=...&lon=...
 * Returns a 3-day forecast from Open-Meteo for the given coordinates.
 * Used by the history page to show fresh weather for saved routes.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return new NextResponse("Missing or invalid lat/lon", { status: 400 });
  }

  try {
    const weather = await getWeatherForecast(lat, lon);
    return NextResponse.json({ weather });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Weather fetch failed", { status: 500 });
  }
}
