// lib/llmRoute.ts

export type LLMWaypoint = {
  name: string;
  lat: number;
  lon: number;
};

export type LLMRouteDay = {
  day: number;
  narrative: string;
  waypoints: LLMWaypoint[];
};

type LLMRouteResult = {
  tripNarrative: string;
  days: LLMRouteDay[];
};

/**
 * Calls Groq (llama-3.1-8b-instant) to suggest realistic waypoints and a narrative
 * for a bike or hike trip.
 * Returns structured JSON with waypoints (lat/lon) that OSRM will then route through.
 *
 * Groq exposes an OpenAI-compatible API, so the request shape is identical
 * to the OpenAI SDK — only the base URL and key env var differ.
 */
export async function getLLMRouteplan(params: {
  place: string;
  kind: "bike" | "hike";
  days: number; // bike: number of days, hike: number of routes
}): Promise<LLMRouteResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const { place, kind, days } = params;

  const systemPrompt = `You are an expert travel route planner. 
When asked, you respond ONLY with a valid JSON object — no markdown, no explanation.`;

  const userPrompt =
    kind === "bike"
      ? `Plan a ${days}-day bike trip starting from ${place}.
Each day should cover 25–55 km between waypoints.
For each day provide 3–5 waypoints (real places with accurate lat/lon coordinates).

Respond with this exact JSON shape:
{
  "tripNarrative": "A 2-3 sentence overview of the whole trip",
  "days": [
    {
      "day": 1,
      "narrative": "1-2 sentence description of this day's ride",
      "waypoints": [
        { "name": "Start Town", "lat": 0.0, "lon": 0.0 },
        { "name": "Mid Village", "lat": 0.0, "lon": 0.0 },
        { "name": "End Town", "lat": 0.0, "lon": 0.0 }
      ]
    }
  ]
}`
      : `Plan ${days} hiking loop route(s) starting and ending at ${place}.
Each loop should cover 4–8 km between waypoints.
For each route provide 3–5 waypoints (real places with accurate lat/lon coordinates),
where the first and last waypoint are both at or very near ${place}.

Respond with this exact JSON shape:
{
  "tripNarrative": "A 2-3 sentence overview of the hiking area",
  "days": [
    {
      "day": 1,
      "narrative": "1-2 sentence description of this loop route",
      "waypoints": [
        { "name": "Trailhead", "lat": 0.0, "lon": 0.0 },
        { "name": "Scenic Overlook", "lat": 0.0, "lon": 0.0 },
        { "name": "Trailhead", "lat": 0.0, "lon": 0.0 }
      ]
    }
  ]
}`;

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  // Strip accidental markdown fences
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as LLMRouteResult;
  } catch {
    throw new Error("Groq returned invalid JSON: " + raw.slice(0, 200));
  }
}
