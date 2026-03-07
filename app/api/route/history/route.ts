// app/api/route/history/route.ts
import { NextResponse } from "next/server";
import { getRoutePlansByUser, saveRoutePlan } from "@/lib/routeHistory";
import { getUserFromRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type LatLng = [number, number];

/**
 * Returns the saved route history for the current user.
 * The user is identified via the verified JWT cookie (handled by lib/auth.ts).
 */
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const plans = await getRoutePlansByUser(user.id);
    return NextResponse.json({ plans });
  } catch (error: any) {
    const status = error?.message === "Unauthorized" ? 401 : 500;
    return new NextResponse(error?.message ?? "Failed to load history", { status });
  }
}

/**
 * Saves an approved generated route plan for the current user,
 * then revalidates the history page so the new entry is visible immediately.
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const place = String(body?.place ?? "").trim();
    const kind = body?.kind === "hike" ? "hike" : "bike";
    const center = body?.center as LatLng;
    const days = body?.days as {
      day: number;
      distanceKm: number;
      polyline: LatLng[];
    }[];

    if (!title || !place) {
      return new NextResponse("Missing title/place", { status: 400 });
    }

    if (!Array.isArray(center) || center.length !== 2) {
      return new NextResponse("Invalid center", { status: 400 });
    }

    if (!Array.isArray(days) || days.length === 0) {
      return new NextResponse("Missing days", { status: 400 });
    }

    const planId = await saveRoutePlan({
      userId: user.id,
      title,
      place,
      kind,
      center,
      days,
    });

    // Tell Next.js the history page data has changed — no manual refresh needed
    revalidatePath("/history");

    return NextResponse.json({ ok: true, planId });
  } catch (error: any) {
    const status = error?.message === "Unauthorized" ? 401 : 500;
    return new NextResponse(error?.message ?? "Failed to save history", { status });
  }
}