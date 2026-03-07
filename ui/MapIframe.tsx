// app/plan/MapIframe.tsx
"use client";

type LatLng = [number, number];

export default function MapIframe({
  center,
  polyline,
}: {
  center: LatLng;
  polyline: LatLng[];
}) {
  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body { height: 100%; margin: 0; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const center = ${JSON.stringify(center)};
    const polyline = ${JSON.stringify(polyline)};

    const map = L.map('map').setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    if (polyline.length > 1) {
      const line = L.polyline(polyline, { weight: 5 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [20, 20] });

      L.marker(polyline[0]).addTo(map).bindPopup('Start');
      L.marker(polyline[polyline.length - 1]).addTo(map).bindPopup('End');
    }
  </script>
</body>
</html>`;

  return (
    <iframe
      title="route-map"
      srcDoc={html}
      style={{
        width: "100%",
        height: 420,
        border: "1px solid #ccc",
        borderRadius: 10,
        marginTop: 12,
        background: "white",
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
