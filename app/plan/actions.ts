// app/plan/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { getUserFromRequest } from "@/lib/auth";
import { saveRoutePlan } from "@/lib/routeHistory";

type LatLng = [number, number];

type SaveRouteInput = {
  title: string;
  place: string;
  kind: "bike" | "hike";
  center: LatLng;
  days: { day: number; distanceKm: number; polyline: LatLng[] }[];
};

/**
 * Server Action: saves the approved generated route to the database.
 * Called directly from the Client Component — no fetch('/api/route/history') needed.
 * revalidatePath ensures the history page shows the new entry immediately.
 */
export async function saveRouteAction(
  cookieHeader: string,
  input: SaveRouteInput
): Promise<{ planId: number }> {
  // Build a minimal Request so getUserFromRequest can read the cookie
  const fakeReq = new Request("http://localhost", {
    headers: { cookie: cookieHeader },
  });

  const user = await getUserFromRequest(fakeReq);

  const planId = await saveRoutePlan({
    userId: user.id,
    ...input,
  });

  // Invalidate the history page so it reflects the newly saved route
  revalidatePath("/history");

  return { planId };
}
