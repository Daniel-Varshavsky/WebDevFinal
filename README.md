# מסלול טיולים אפקה 2026 — Afeka Travel Planner

> Final project for Internet Technologies 2026, Afeka College of Engineering.

## Students

| Name | GitHub |
|------|--------|
| Daniel Varshavsky | https://github.com/Daniel-Varshavsky/WebDevFinal |
| Yuval Gefen |  |

## Deployment

This project runs locally only. Cloud deployment was attempted on Vercel, but it is not possible because Vercel is a serverless platform — it cannot host a persistent Express server.

---

## About

Afeka Travel Planner is a full-stack web application that generates realistic hiking and biking routes using AI, renders them on an interactive map, and shows a 3-day weather forecast for the destination.

**Key features:**
- AI-generated route waypoints via Groq (llama-3.3-70b)
- Real road routing via OSRM (not straight lines)
- Interactive Leaflet.js map with Start/End markers
- 3-day weather forecast via Open-Meteo
- Destination photo via Pixabay
- Route approval and save to the database
- Route history with fresh weather per saved trip
- JWT authentication with silent daily refresh

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + SSR | Next.js 15 (App Router) |
| Auth Server | Express.js |
| Database | PostgreSQL |
| LLM | Groq API (llama-3.3-70b) |
| Routing | OSRM (Open Source Routing Machine) |
| Weather | Open-Meteo API |
| Photos | Pixabay API |
| Map | Leaflet.js |
| Styling | Tailwind CSS + CSS Modules + clsx |

---

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home page (Server Component)
│   ├── plan/
│   │   ├── page.tsx        # Route planner (Client Component)
│   │   ├── actions.ts      # Server Action — save route to DB
│   │   ├── loading.tsx     # Loading state
│   │   └── error.tsx       # Error boundary
│   ├── history/
│   │   ├── page.tsx        # Route history (Server Component)
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── api/
│       ├── auth/           # Proxy routes → Express server
│       └── route/          # Route generation, history, weather
├── ui/                     # Shared components
│   ├── MapIframe.tsx       # Leaflet map (Client Component)
│   ├── WeatherForecast.tsx # Weather cards (CSS Modules + clsx)
│   └── HistoryClient.tsx   # Interactive history UI (Client Component)
├── lib/                    # Server-side utilities
│   ├── auth.ts             # JWT verification
│   ├── db.ts               # PostgreSQL pool
│   ├── llmRoute.ts         # Groq LLM integration
│   ├── weather.ts          # Open-Meteo integration
│   ├── pixabay.ts          # Pixabay photo integration
│   └── routeHistory.ts     # DB queries for saved routes
├── server/                 # Express auth server (separate process)
│   └── src/
│       ├── index.ts
│       ├── routes_auth.ts
│       ├── auth.ts
│       └── db.ts
└── proxy.ts                # Next.js JWT route protection
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL database
- The following API keys:
  - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
  - `PIXABAY_API_KEY` — from [pixabay.com/api/docs](https://pixabay.com/api/docs)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone [GITHUB URL]
cd [REPO NAME]
```

### 2. Install dependencies

```bash
# Next.js app
npm install

# Express auth server
cd server
npm install
cd ..
```

### 3. Create the database tables

Connect to your PostgreSQL database and run:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE route_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  place TEXT NOT NULL,
  trip_kind TEXT NOT NULL CHECK (trip_kind IN ('bike', 'hike')),
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE route_plan_days (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES route_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  polyline_json JSONB NOT NULL
);
```

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT — must be the same value in both .env.local and server/.env
JWT_SECRET=your-long-random-secret-at-least-32-chars

# Express auth server URL
AUTH_SERVER_URL=http://localhost:4000

# API Keys
GROQ_API_KEY=your-groq-api-key
PIXABAY_API_KEY=your-pixabay-api-key
```

Create a `server/.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-long-random-secret-at-least-32-chars
AUTH_PORT=4000
NODE_ENV=development
```

> ⚠️ `JWT_SECRET` must be identical in both files. The Express server signs tokens and Next.js verifies them using the same secret.

### 5. Run the development servers

You need two terminal windows:

**Terminal 1 — Express auth server:**
```bash
cd server
npm run dev
# Listening on http://localhost:4000
```

**Terminal 2 — Next.js app:**
```bash
npm run dev
# Listening on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

1. **Register / Login** — handled by the Express server, which issues a JWT stored as an `access_token` HttpOnly cookie
2. **Route Protection** — `proxy.ts` intercepts every request to `/plan` and `/history`, verifies the JWT, and silently refreshes it when it is close to expiry
3. **Plan a Route** — enter a destination, choose bike or hike, select number of days/routes, and click Generate. The app geocodes the location, asks Groq for waypoints, sanitizes them, routes them through OSRM, and fetches weather and a photo
4. **Approve & Save** — click "Approve & Save" to store the route in PostgreSQL via a Server Action. `revalidatePath('/history')` ensures the history page updates immediately
5. **Route History** — a Server Component reads saved routes directly from the database and passes them to a Client Component for interactive display with fresh weather

---

## Known Limitations

- **Route distance constraints** — the app targets 30–70 km per day for bike routes and 5–10 km per loop for hike routes. Due to the LLM's imprecise spatial reasoning and real road inflation, actual distances may deviate by ~3–10 km. Mitigations applied: tightened prompt ranges, Haversine-based waypoint sanitization, and on-screen warnings when constraints are exceeded.
- **No cloud deployment** — Vercel (serverless-only) cannot host a persistent Express server. Local deployment approved by lecturer.
