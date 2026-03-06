// lib/pixabay.ts

/**
 * Fetches a single representative photo for a destination from Pixabay.
 * Returns the image URL and photographer credit, or null on failure.
 */
export async function getDestinationPhoto(place: string): Promise<{
  url: string;
  photographer: string;
  pageUrl: string;
} | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    console.warn("PIXABAY_API_KEY is not set");
    return null;
  }

  try {
    const query = encodeURIComponent(`${place} landscape travel`);
    const url =
      `https://pixabay.com/api/?key=${key}` +
      `&q=${query}&image_type=photo&orientation=horizontal` +
      `&category=travel&per_page=3&safesearch=true`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;

    const data = await r.json();
    const hit = data?.hits?.[0];
    if (!hit) return null;

    return {
      url: hit.largeImageURL as string,
      photographer: hit.user as string,
      pageUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
    };
  } catch {
    return null;
  }
}
