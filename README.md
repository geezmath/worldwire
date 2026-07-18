# Worldwire

A real-time world politics headline aggregator: Express backend (keeps your
API key secret, caches responses) + a static frontend styled like a wire
service dispatch feed.

## 1. Get an API key

This uses **NewsData.io** because, unlike NewsAPI.org and a few others, its
free tier is explicitly allowed for live/public projects (not just local
development). Trade-offs on the free tier: descriptions only (no full
article text) and roughly a 12-hour delay on some plans — check your
dashboard for current limits, since terms change.

1. Sign up at https://newsdata.io and grab your API key.
2. `cp .env.example .env` and paste the key into `NEWSDATA_API_KEY`.

If you outgrow NewsData or want a second source, the provider logic lives
entirely in `providers/newsdata.js` — write a `providers/gnews.js` (or
whatever) with the same `fetchHeadlines()` shape and swap the `require` in
`server.js`.

## 2. Run it locally

```bash
npm install
npm start
```

Open http://localhost:3000.

## 3. How it's structured

```
server.js              Express app: serves the frontend + /api/headlines
providers/newsdata.js   All NewsData.io-specific request/response logic
public/                 Static frontend (vanilla HTML/CSS/JS, no build step)
```

- `/api/headlines?region=europe` — cached for 5 minutes (`CACHE_TTL_SECONDS`
  in `.env`) so concurrent visitors share one upstream request instead of
  each burning your quota.
- Regions and their country codes are defined in the `REGIONS` object at the
  top of `server.js` — edit freely. NewsData's free/basic plans cap requests
  at 5 country codes each, which is why each region list is trimmed to 5.
- A basic rate limiter caps each visitor at 30 `/api` requests/minute so one
  client can't burn through your provider quota.

## 4. Deploying (Render — free tier)

The repo is already set up for a one-click Render deploy (`render.yaml`) and
also includes a `Procfile` in case you'd rather use Railway or another
Heroku-style host instead. Steps below are for Render specifically.

**Push this repo to GitHub:**
```bash
# from inside the worldwire/ folder — it's already a git repo with one commit
git remote add origin https://github.com/<your-username>/worldwire.git
git branch -M main
git push -u origin main
```
(Create the empty `worldwire` repo on GitHub first, without a README, so
there's nothing to conflict with.)

**Deploy on Render:**
1. Go to https://dashboard.render.com and sign in (or create a free account).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if you haven't, then pick the `worldwire` repo.
4. Render reads `render.yaml` automatically and shows a service called
   `worldwire` with the build/start commands already filled in — click
   **Apply**.
5. It will pause on one thing it can't fill in for you: the
   `NEWSDATA_API_KEY` environment variable. Open the service → **Environment**
   → add `NEWSDATA_API_KEY` with your real key → **Save Changes**.
6. Render builds and deploys automatically. When it's done you'll get a URL
   like `https://worldwire.onrender.com`.

Free-tier Render web services spin down after inactivity and take ~30-60
seconds to wake back up on the next request — fine for a demo, worth
upgrading to a paid instance if you want it always warm.

**Alternative hosts:** Railway and Fly.io both work the same way — connect
the GitHub repo, they'll detect `npm start` (or use the `Procfile`), and you
add `NEWSDATA_API_KEY` as an environment variable in their dashboard the
same way.

**Before you get real traffic:**
- Re-check NewsData.io's current free-tier terms and rate limits — API
  pricing and terms shift over time, and this was accurate as of when this
  was built, not necessarily today.
- If you expect meaningful traffic, budget for a paid tier; free tiers are
  request-capped (often ~100–200/day) and the cache here only stretches
  that so far.
- Consider adding a CDN/reverse proxy (Cloudflare) in front for extra
  caching and to keep your origin off the public internet directly.
- Consider upgrading off Render's free plan (or the equivalent on another
  host) once this isn't just a demo, so it doesn't sleep between visits.

## 5. Ideas for next steps

- Add a `/api/headlines?q=` keyword search using NewsData's `latest`
  endpoint's `q` parameter.
- Persist headlines to a small database so the ticker has history instead
  of only the current cache window.
- Add a world map (e.g. a simple SVG or a library like `react-simple-maps`
  if you migrate to a frontend framework) that highlights countries with
  active coverage.
