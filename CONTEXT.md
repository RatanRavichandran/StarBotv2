# StarBotv2 — Codebase Context

> **Maintenance note:** Update this file whenever you add a module, change an API integration, change deployment targets, or shift any architectural decision. The sections most likely to go stale are [Location](#locationjs), [Config / API keys](#configjs), and [Deployment](#deployment).

---

## What this app does

**"what you probably cant see when you look up"** — a real-time sky scanner that shows what is directly overhead (or nearby) from the user's location. On each scan it fetches and displays:

- Airplanes (OpenSky Network, enriched with routes via AviationStack)
- Satellites (CelesTrak TLE data, propagated with satellite.js)
- Solar system planets and the Moon/Sun (NASA JPL Horizons API)
- Stars (static catalog of ~80 bright stars, magnitude ≤ ~2.75)
- Interesting "deep sky" objects — dwarf planets and large asteroids (NASA Horizons with static fallback)
- AI-generated fun facts per object (OpenAI GPT-4o-mini, optional SerpAPI web-search context)

Live deployment:
- **Frontend:** https://ratanravichandran.github.io/StarBot/
- **Backend:** https://starbot-backend.onrender.com

---

## File map

```
starbotv2/
├── index.html          — Single-page app shell; loads all JS modules via <script> tags
├── styles.css          — All styles, animated starfield background, glass-morphism UI
├── server.js           — Express backend (Render deployment)
├── api/
│   ├── health.js       — Vercel serverless health endpoint
│   ├── horizons.js     — Vercel serverless proxy for NASA Horizons (not used in Express)
│   └── openai.js       — Vercel serverless proxy for OpenAI
├── js/
│   ├── config.js       — Global CONFIG object (API keys, thresholds, star catalog, bodies list)
│   ├── astronomy.js    — Pure math: Julian date, GMST/LST, RA/Dec ↔ Alt/Az, angular distance
│   ├── location.js     — LocationManager: get/watch/format user coordinates
│   ├── api.js          — APIManager: all external data fetching + caching + calculations
│   ├── display.js      — DisplayController: DOM rendering for all result sections
│   ├── facts.js        — FactsFetcher: OpenAI + SerpAPI fun-fact generation with cache
│   ├── map.js          — MapManager: Leaflet map for airplane positions + trajectories
│   └── app.js          — App: top-level controller, init, scan orchestration
├── public/             — Static assets served by Express (currently empty)
├── package.json        — Node deps: express, cors, dotenv, node-fetch
├── render.yaml         — Render.com deployment config
├── vercel.json         — Vercel rewrite rules (routes non-api traffic to /public)
└── .gitignore
```

Script load order in `index.html` (order matters — no bundler):
`config.js` → `astronomy.js` → `location.js` → `facts.js` → `api.js` → `display.js` → `map.js` → `app.js`

Third-party scripts loaded via CDN:
- `satellite.js@5.0.0` — TLE propagation (required before `api.js`)
- `Leaflet@1.9.4` — Map rendering (required before `map.js`)

---

## Module details

### `config.js`

Central config object `CONFIG`. Key fields:

| Field | Purpose |
|---|---|
| `USE_BACKEND` | `true` = proxy all API calls through backend; `false` = direct browser calls (CORS will block most) |
| `BACKEND_URL` | Auto-switches between `localhost:3001` and `https://starbot-backend.onrender.com/api` based on hostname |
| `ZENITH_TOLERANCE` | 5° — objects within this are shown as "at zenith" |
| `NEARBY_TOLERANCE` | 10° — objects within this are shown in "nearby" section |
| `SATELLITE_GROUPS` | CelesTrak groups fetched: stations, visual, starlink, iridium-NEXT, galileo, gps-ops |
| `SOLAR_SYSTEM_BODIES` | 9 bodies queried via NASA Horizons (Sun through Neptune) |
| `BRIGHT_STARS` | Hardcoded catalog of ~80 named stars with RA, Dec, magnitude, constellation |
| `MAX_SATELLITES_DISPLAY` | 15 |
| `MAX_AIRPLANES_DISPLAY` | 20 |
| `CACHE_DURATION` | 300,000 ms (5 min) |

**API keys stored here (plaintext — do not commit real secrets):**
- `N2YO_API_KEY` — currently hardcoded; N2YO API is not actively used (satellite data comes from CelesTrak instead)
- `AVIATIONSTACK_KEY` — hardcoded; used for flight route enrichment
- `OPENAI_API_KEY` — left empty; set via backend `.env` instead
- `SERPAPI_KEY` — left empty; set via backend `.env` instead

---

### `astronomy.js`

Stateless math utilities (`AstronomyUtils`). No DOM, no fetch.

| Function | What it does |
|---|---|
| `dateToJulianDate(date)` | JS Date → Julian Date |
| `calculateGMST(date)` | Greenwich Mean Sidereal Time in hours |
| `calculateLST(date, lon)` | Local Sidereal Time in hours |
| `geographicToZenithCelestial(lat, lon, date)` | Returns `{ra, dec, lst, jd}` for the zenith point. RA = LST, Dec = latitude |
| `angularDistance(ra1, dec1, ra2, dec2)` | Haversine angular distance in degrees (RA in hours, Dec in degrees) |
| `altAzToRADec(alt, az, lat, lon, date)` | Converts observed sky position to celestial coordinates |
| `raDecToAltAz(ra, dec, lat, lon, date)` | Inverse: celestial coords → observer horizon coords |
| `formatRA / formatDec / formatLST` | Format for display (HH mm ss / ±DD mm ss) |

---

### `location.js`

`LocationManager` — provides user coordinates.

**Current state: location is hardcoded to Bangalore, India** (`12.8688°N, 77.6513°E, 920m`). The `getLocation()` method resolves immediately with these values and never calls the browser Geolocation API. `watchLocation()` uses the real API but is never called by the app.

> The git history shows a commit "Use browser geolocation instead of hardcoded coords, IP fallback" but the code was not updated accordingly. This is the most likely thing to change next.

---

### `api.js`

`APIManager` — all external data fetching. Uses an in-memory `Map` cache keyed by params + timestamp (5 min TTL).

**Solar system objects (`fetchSolarSystemObjects`)**
- Iterates `CONFIG.SOLAR_SYSTEM_BODIES` sequentially (not parallel) calling NASA Horizons
- Each Horizons request goes via `CONFIG.BACKEND_URL/horizons` (CORS proxy)
- Response is in CSV ephemeris format; parsed by `parseHorizonsResponse` — finds `$$SOE`/`$$EOE` markers, extracts RA (degrees → hours) and Dec from the first data line

**Airplanes (`fetchAirplanes`)**
- Queries OpenSky Network with a ±2° bounding box (~200 km radius)
- Filters: altitude 1,000–15,000 m, elevation angle > 0°
- Converts each plane's actual lat/lon + altitude → elevation/bearing → RA/Dec via `altAzToRADec`
- Returns top 20 by elevation angle

**Flight route enrichment (`enrichAirplanesWithRoutes` / `fetchFlightRoute`)**
- Tries AviationStack with ICAO callsign, then with IATA code extracted via `extractIATAFromCallsign`
- `extractIATAFromCallsign` has a hardcoded map of ~15 airline ICAO→IATA codes (IGO→6E, AIC→AI, etc.)
- Runs all enrichments in parallel via `Promise.all`

**Satellites (`fetchSatellites`)**
- Fetches TLE text from CelesTrak for each group in `CONFIG.SATELLITE_GROUPS`
- Propagates each TLE with `satellite.js` (`twoline2satrec` + `propagate`)
- Only keeps satellites with elevation > 0°
- Filtered in `App.categorizeObjects`: max 7 total, max 3 Starlink

**Stars (`findNearbyStars`)**
- Purely synchronous — scans `CONFIG.BRIGHT_STARS` for angular distance ≤ `NEARBY_TOLERANCE`

**Interesting celestial bodies (`fetchInterestingCelestialBodies`)**
- Queries Horizons for Ceres, Pluto, Eris, Makemake, Haumea, Vesta, Pallas, Hygiea, Interamnia, Europa (asteroid)
- Falls back to a static list with fun facts if Horizons fails or returns nothing above horizon

---

### `display.js`

`DisplayController` — pure DOM manipulation, no business logic.

Key flow: `displayResults(results)` dispatches to section-specific methods. Each section calls `createObjectElement(obj, isPrimary)` which:
1. Renders name + type badge
2. For satellites/airplanes: calls `FactsFetcher.getFunFact(obj)` (async, awaited)
3. Renders detail rows via `addDetail(container, label, value)`

Airplane cards show different fields than all other objects (callsign, route, speed, flight altitude) — no RA/Dec shown for airplanes.

`formatCelestialDistance(distance, unit)` converts AU distances to human-readable light-time strings.

---

### `facts.js`

`FactsFetcher` — AI-generated fun facts per object.

- Uses OpenAI `gpt-4o-mini` via backend proxy (`/api/openai`)
- Optionally enriches the prompt with a SerpAPI web search (`/api/serp` — **note: this endpoint does not exist in server.js**; it will 404)
- Falls back to static strings if AI call fails or times out (10s)
- Results cached in-memory by object identity key

**Known issue:** The SerpAPI proxy endpoint (`/api/serp`) is referenced in `facts.js` and `config.js` but is not implemented in `server.js`. The code handles this gracefully (proceeds without search context), but SerpAPI enrichment is effectively disabled even when a key is provided.

---

### `map.js`

`MapManager` — Leaflet map for airplane visualization.

- Hidden by default; toggled via "Show Map View" button
- On show: initializes Leaflet centered on user location, adds user marker, adds airplane emoji markers rotated by heading
- For each airplane: draws a dashed line from user to plane, and a yellow trajectory line (10 min prediction, 5 steps) via `calculateTrajectory` → `calculateNewPosition` (spherical earth bearing formula)
- Map auto-fits bounds to show all displayed planes

---

### `app.js`

`App` — top-level controller.

Startup sequence:
1. `App.init()` — attaches event listeners (refresh button, map toggle, collapsible section headers)
2. `detectLocationAndScan()` — calls `LocationManager.getLocation()`, then `scanSky()`
3. `scanSky()` — calculates zenith coords, then fires 5 parallel `Promise.all` fetches (planets, airplanes, satellites, stars, celestial bodies), then serially enriches airplanes with routes, then calls `categorizeObjects` and `DisplayController.displayResults`

`categorizeObjects` splits results into `{zenithObjects, nearbyObjects, airplanes, satellites, planets, stars, celestialBodies}`. Satellite deduplication (max 7, max 3 Starlink) happens here.

---

### `server.js` (Express backend)

Three endpoints:

| Route | Method | Purpose |
|---|---|---|
| `GET /api/health` | — | Health check |
| `GET /api/horizons` | — | CORS proxy to `ssd.jpl.nasa.gov/api/horizons.api` |
| `POST /api/openai` | — | CORS proxy to `api.openai.com/v1/chat/completions` |

Serves `public/` as static files.

**Missing:** `/api/serp` endpoint (referenced by `facts.js`) — not implemented.

---

### `api/` (Vercel serverless)

Alternative deployment target. Contains:
- `health.js` — same as Express health endpoint
- `openai.js` — same logic as Express `/api/openai`
- `horizons.js` — Horizons proxy (parity with Express)

These are only used on Vercel. The Render deployment uses `server.js`.

---

## Data flow summary

```
App.init()
  └── detectLocationAndScan()
        ├── LocationManager.getLocation()  →  hard-coded Bangalore coords
        ├── AstronomyUtils.geographicToZenithCelestial()  →  zenith RA/Dec
        └── App.scanSky()
              ├── APIManager.fetchSolarSystemObjects()  →  backend /api/horizons → NASA JPL
              ├── APIManager.fetchAirplanes()           →  opensky-network.org (direct, no proxy)
              ├── APIManager.fetchSatellites()          →  celestrak.org (direct, TLE text)
              ├── APIManager.findNearbyStars()          →  CONFIG.BRIGHT_STARS (local)
              ├── APIManager.fetchInterestingCelestialBodies()  →  backend /api/horizons
              └── APIManager.enrichAirplanesWithRoutes()  →  aviationstack.com (direct, HTTP!)
                    └── DisplayController.displayResults()
                          └── FactsFetcher.getFunFact() per satellite/airplane
                                └── backend /api/openai → OpenAI GPT-4o-mini
```

---

## Environment variables (`.env`)

```env
PORT=3001
OPENAI_API_KEY=your_openai_key
SERPAPI_KEY=your_serpapi_key   # optional; /api/serp not implemented yet
NODE_ENV=development
```

On Render, `PORT` is set to `10000` via `render.yaml`.

---

## Deployment

| Target | Config file | Entry point | Notes |
|---|---|---|---|
| Render (backend) | `render.yaml` | `node server.js` | Free tier; hosts the CORS proxy |
| GitHub Pages (frontend) | — | `index.html` | `CONFIG.BACKEND_URL` auto-points to Render |
| Vercel (alternative) | `vercel.json` | `api/*.js` | Serverless functions; `public/` must contain the frontend |

**Local dev:**
```bash
npm install
npm start          # or: npm run dev  (nodemon)
# open http://localhost:3001
```

---

## Known issues / quirks

1. **Location hardcoded to Bangalore.** `location.js:28–43` — `getLocation()` never uses the browser Geolocation API. Recent commit message suggests this was supposed to be fixed.

2. **`/api/serp` missing from server.js.** `facts.js:105` calls `CONFIG.BACKEND_URL/serp` but this route is not implemented. SerpAPI enrichment silently falls through to AI-only mode.

3. **AviationStack uses HTTP, not HTTPS.** `CONFIG.AVIATIONSTACK_API` is `http://api.aviationstack.com/...`. Free-tier AviationStack does not support HTTPS, so mixed-content errors may appear on HTTPS deployments.

4. **API keys in config.js are committed.** `N2YO_API_KEY` and `AVIATIONSTACK_KEY` are hardcoded in `js/config.js`. These are frontend-visible by design (N2YO currently unused; AviationStack free-tier key). OpenAI and SerpAPI keys are correctly kept server-side only.

5. **Solar system fetch is sequential, not parallel.** `api.js:26–34` iterates bodies with a `for...of await` loop, so 9 Horizons requests happen one after another. This is a known performance bottleneck.

6. **`public/` directory is empty.** `server.js:12` serves `public/` as static. The frontend `index.html` sits at the project root, not inside `public/`. On Render, the app serves only the API endpoints; the frontend is served from GitHub Pages separately.

---

## How to maintain this document

- **New JS module added:** add a row to the file map and a new `###` subsection.
- **API integration changed:** update the relevant module section and the data flow diagram.
- **New env var:** add it to the Environment variables table.
- **Deployment target changed:** update the Deployment table.
- **Bug fixed from Known issues:** remove the item from that section.
- **New known quirk discovered:** add it to Known issues.
