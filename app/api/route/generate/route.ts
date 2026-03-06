// app/api/route/generate/route.ts
import { NextResponse } from "next/server";
import { getLLMRouteplan } from "@/lib/llmRoute";
import { getWeatherForecast, DayForecast } from "@/lib/weather";
import { getDestinationPhoto } from "@/lib/pixabay";

type LatLng = [number, number];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

async function geocode(place: string) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
    `&addressdetails=1&namedetails=1` +
    `&q=${encodeURIComponent(place)}`;

  const r = await fetch(url, {
    headers: { "User-Agent": "afeka-travel-planner/1.0 (student project)" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Geocoding failed");

  const arr = (await r.json()) as any[];
  if (!arr?.[0]) throw new Error("Place not found");

  const x = arr[0];
  const localName =
    (x?.namedetails?.name as string | undefined) ||
    (x?.name as string | undefined) ||
    String(x.display_name ?? "").split(",")[0].trim() ||
    place;

  return {
    lat: Number(x.lat),
    lon: Number(x.lon),
    localName,
  };
}

async function osrmRoute(points: { lat: number; lon: number }[]) {
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("OSRM failed");

  const data = await r.json();
  const geometry = data.routes?.[0]?.geometry?.coordinates as
    | [number, number][]
    | undefined;
  const distanceM = Number(data.routes?.[0]?.distance ?? 0);

  if (!geometry || geometry.length < 2) throw new Error("OSRM returned no route");

  const polyline: LatLng[] = geometry.map(([lon, lat]) => [lat, lon]);
  const distanceKm = round1(distanceM / 1000);
  const last = polyline[polyline.length - 1];

  return { polyline, distanceKm, endLat: last[0], endLon: last[1] };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const place = String(body?.place ?? "").trim();
    const kind = String(body?.kind ?? "bike") as "bike" | "hike";
    const inputCount = clamp(Number(body?.days ?? 2), 1, 3);

    if (!place) return new NextResponse("Missing place", { status: 400 });
    if (kind !== "bike" && kind !== "hike")
      return new NextResponse("Bad kind", { status: 400 });

    // 1. Geocode the starting location
    const start = await geocode(place);

    // 2. Get GPT-4o waypoint suggestions + narrative
    const llmPlan = await getLLMRouteplan({ place, kind, days: inputCount });

    // 3. Route each day's waypoints through OSRM for realistic road paths
    const dayPlans: {
      day: number;
      distanceKm: number;
      polyline: LatLng[];
      narrative: string;
    }[] = [];

    for (const llmDay of llmPlan.days) {
      // Fallback: if GPT returned fewer waypoints than expected, use start point
      const points =
        llmDay.waypoints.length >= 2
          ? llmDay.waypoints.map((w) => ({ lat: w.lat, lon: w.lon }))
          : [
              { lat: start.lat, lon: start.lon },
              { lat: start.lat + 0.05, lon: start.lon + 0.05 },
            ];

      try {
        const routed = await osrmRoute(points);
        dayPlans.push({
          day: llmDay.day,
          distanceKm: routed.distanceKm,
          polyline: routed.polyline,
          narrative: llmDay.narrative,
        });
      } catch {
        // If OSRM fails for this day, skip it rather than crashing
        console.warn(`OSRM failed for day ${llmDay.day}, skipping`);
      }
    }

    if (dayPlans.length === 0) {
      return new NextResponse("Failed to generate any routes", { status: 500 });
    }

    // 4. Fetch weather forecast (3 days starting tomorrow)
    let weather: DayForecast[] = [];
    try {
      weather = await getWeatherForecast(start.lat, start.lon);
    } catch (e) {
      console.warn("Weather fetch failed:", e);
    }

    // 5. Fetch destination photo from Unsplash
    let photo: { url: string; photographer: string; pageUrl: string } | null = null;
    try {
      photo = await getDestinationPhoto(place);
    } catch (e) {
      console.warn("Unsplash fetch failed:", e);
    }

    return NextResponse.json({
      title: `${kind === "bike" ? "Bike trip" : "Hike routes"} near ${start.localName}`,
      kind,
      center: [start.lat, start.lon] as LatLng,
      tripNarrative: llmPlan.tripNarrative,
      days: dayPlans,
      weather,
      photo,
    });
  } catch (e: any) {
    console.error("Generate route error:", e);
    return new NextResponse(e?.message ?? "Error", { status: 500 });
  }
}