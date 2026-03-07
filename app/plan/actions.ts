// app/plan/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getUserFromCookies } from "@/lib/auth";
import { saveRoutePlan } from "@/lib/routeHistory";

type LatLng = [number, number];

type SaveRouteInput = {
  title: string;
  place: string;
  kind: "bike" | "hike";
  center: LatLng;
  days: { day: number; distanceKm: number; polyline: LatLng[] }[];
};

export async function saveRouteAction(
  input: SaveRouteInput
): Promise<{ planId: number }> {
  const user = await getUserFromCookies();

  const planId = await saveRoutePlan({
    userId: user.id,
    ...input,
  });

  revalidatePath("/history");
  return { planId };
}