// app/api/route/history/route.ts
import { NextResponse } from "next/server";
import { getRoutePlansByUser, saveRoutePlan } from "@/lib/routeHistory";

type LatLng = [number, number];

/**
 * Reads the current user id from a trusted request header.
 * Replace this later with JWT verification / middleware forwarding.
 */function getUserId(req: Request): number {
  const raw = req.headers.get("x-user-id");
  const userId = Number(raw);

  if (!raw || !Number.isInteger(userId) || userId <= 0) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Returns the saved route history for the current user.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserId(req);
    const plans = await getRoutePlansByUser(userId);
    return NextResponse.json({ plans });
  } catch (error: any) {
    const status = error?.message === "Unauthorized" ? 401 : 500;
    return new NextResponse(error?.message ?? "Failed to load history", { status });
  }
}

/**
 * Saves an approved generated route plan for the current user.
 */
export async function POST(req: Request) {
  try {
    const userId = getUserId(req);
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
      userId,
      title,
      place,
      kind,
      center,
      days,
    });

    return NextResponse.json({ ok: true, planId });
  } catch (error: any) {
    const status = error?.message === "Unauthorized" ? 401 : 500;
    return new NextResponse(error?.message ?? "Failed to save history", { status });
  }
}