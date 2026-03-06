import { NextResponse } from "next/server";

type LatLng = [number, number];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Rough helper to move a point by km and bearing (for choosing candidate waypoints)
function movePoint(lat: number, lon: number, km: number, bearingRad: number) {
  const dLat = (km / 110.574) * Math.cos(bearingRad);
  const dLon =
    (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(bearingRad);
  return { lat: lat + dLat, lon: lon + dLon };
}

/**
 * Very simple "script" detector (not perfect, but practical)
 */
type Script = "HE" | "AR" | "LATIN" | "CYRILLIC" | "OTHER";

function detectScript(s: string): Script {
  if (/[א-ת]/.test(s)) return "HE";
  if (/[\u0600-\u06FF]/.test(s)) return "AR";
  if (/[\u0400-\u04FF]/.test(s)) return "CYRILLIC";
  if (/[A-Za-z]/.test(s)) return "LATIN";
  return "OTHER";
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
    // fallback: first part of display_name
    String(x.display_name ?? "").split(",")[0].trim() ||
    place;

  const countryCode = String(x?.address?.country_code ?? "").toLowerCase();
  if (!countryCode) throw new Error("Missing country_code from geocoder");

  return {
    lat: Number(x.lat),
    lon: Number(x.lon),
    countryCode,
    localName,
  };
}

async function reverseMeta(lat: number, lon: number) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json` +
    `&addressdetails=1&namedetails=1&zoom=10` +
    `&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;

  const r = await fetch(url, {
    headers: { "User-Agent": "afeka-travel-planner/1.0 (student project)" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Reverse geocoding failed");
  const x = await r.json();

  const localName =
    (x?.namedetails?.name as string | undefined) ||
    (x?.name as string | undefined) ||
    String(x?.display_name ?? "").split(",")[0].trim() ||
    "Unknown";

  const countryCode = String(x?.address?.country_code ?? "").toLowerCase();

  return { localName, countryCode };
}

async function osrmRoute(points: { lat: number; lon: number }[]) {
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("OSRM failed");

  const data = await r.json();
  const geometry = data.routes?.[0]?.geometry?.coordinates as
    | [number, number][]
    | undefined; // [lon,lat]
  const distanceM = Number(data.routes?.[0]?.distance ?? 0);

  if (!geometry || geometry.length < 2) throw new Error("OSRM returned no route");

  const polyline: LatLng[] = geometry.map(([lon, lat]) => [lat, lon]);
  const distanceKm = round1(distanceM / 1000);

  // last point of returned route
  const last = polyline[polyline.length - 1];
  const endLat = last[0];
  const endLon = last[1];

  return { polyline, distanceKm, endLat, endLon };
}

/**
 * Hike loop generator: start -> p1 -> p2 -> start
 * retries until routed distance is within 5-10km
 */
async function makeHikeLoop(
  start: { lat: number; lon: number },
  minKm: number,
  maxKm: number,
  maxAttempts = 18
) {
  const startPoint = { lat: start.lat, lon: start.lon };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const target = rand(minKm, maxKm);
    const legKm = clamp(target / 3, 1.0, 4.0);

    const b1 = Math.random() * Math.PI * 2;
    const b2 = b1 + Math.PI / 2 + rand(-0.4, 0.4);

    const p1 = movePoint(start.lat, start.lon, legKm, b1);
    const p2 = movePoint(start.lat, start.lon, legKm, b2);

    const route = await osrmRoute([startPoint, p1, p2, startPoint]);
    if (route.distanceKm >= minKm && route.distanceKm <= maxKm) return route;
  }

  // fallback loop
  const p1 = movePoint(start.lat, start.lon, 2.0, Math.random() * Math.PI * 2);
  const p2 = movePoint(start.lat, start.lon, 2.0, Math.random() * Math.PI * 2);
  return osrmRoute([startPoint, p1, p2, startPoint]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const place = String(body?.place ?? "").trim();
    const kind = String(body?.kind ?? "bike");
    const inputCount = Number(body?.days ?? 2); // bike: days, hike: number of routes

    if (!place) return new NextResponse("Missing place", { status: 400 });
    if (kind !== "bike" && kind !== "hike")
      return new NextResponse("Bad kind", { status: 400 });

    const start = await geocode(place);
    const startPoint = { lat: start.lat, lon: start.lon };
    const startScript = detectScript(start.localName);

    // -------------------------
    // BIKE: 2-3 consecutive days (city-to-city)
    // + we enforce: same country_code AND same script for the END city name
    // -------------------------
    if (kind === "bike") {
      const totalDays = clamp(inputCount, 2, 3);
      const minKm = 30;
      const maxKm = 70;

      const dayPlans: { day: number; distanceKm: number; polyline: LatLng[] }[] =
        [];
      let cur = { ...startPoint };

      for (let d = 1; d <= totalDays; d++) {
        let chosenRoute: Awaited<ReturnType<typeof osrmRoute>> | null = null;

        // Try multiple candidates until the end city matches our constraints
        for (let attempt = 0; attempt < 12; attempt++) {
          const targetKm = rand(minKm, maxKm);
          const bearing = Math.random() * Math.PI * 2;
          const nextGuess = movePoint(cur.lat, cur.lon, targetKm, bearing);

          const route = await osrmRoute([cur, nextGuess]);

          // Validate end point by reverse geocoding the route end
          const meta = await reverseMeta(route.endLat, route.endLon);
          const endScript = detectScript(meta.localName);

          const sameCountry = meta.countryCode && meta.countryCode === start.countryCode;
          const sameScript = endScript === startScript || startScript === "OTHER"; // if start is OTHER, don't block

          if (sameCountry && sameScript) {
            chosenRoute = route;
            break;
          }
        }

        // Fallback: if we didn't find a perfect match, accept last attempt's simplest route
        if (!chosenRoute) {
          const targetKm = rand(minKm, maxKm);
          const bearing = Math.random() * Math.PI * 2;
          const nextGuess = movePoint(cur.lat, cur.lon, targetKm, bearing);
          chosenRoute = await osrmRoute([cur, nextGuess]);
        }

        dayPlans.push({
          day: d,
          distanceKm: chosenRoute.distanceKm,
          polyline: chosenRoute.polyline,
        });

        // next day starts where previous ended
        cur = { lat: chosenRoute.endLat, lon: chosenRoute.endLon };
      }

      return NextResponse.json({
        title: `Bike trip near ${start.localName}`,
        kind: "bike",
        center: [start.lat, start.lon] as LatLng,
        days: dayPlans,
      });
    }

    // -------------------------
    // HIKE: 1-3 loop routes, each 5-10 km, start & end at start
    // Country/script issues are basically avoided because loops stay near start.
    // -------------------------
    const routeCount = clamp(inputCount, 1, 3);
    const minKm = 5;
    const maxKm = 10;

    const routes: { day: number; distanceKm: number; polyline: LatLng[] }[] = [];

    for (let i = 1; i <= routeCount; i++) {
      const loop = await makeHikeLoop(startPoint, minKm, maxKm);
      routes.push({ day: i, distanceKm: loop.distanceKm, polyline: loop.polyline });
    }

    return NextResponse.json({
      title: `Hike routes from ${start.localName}`,
      kind: "hike",
      center: [start.lat, start.lon] as LatLng,
      days: routes,
    });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Error", { status: 500 });
  }
}
