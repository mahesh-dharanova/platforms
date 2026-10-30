# platforms

Static landing page linking out to a set of standalone HTML tools, deployed as one GitHub Pages site.

## Pages

- `orbit/` — Orbit
- `iris/` — Iris, Vision Instrument
- `cinema-directory/` — The Reel Index, Watchlist & Cinema Directory
- `watchlist/` — A Watchlist

## Deploy

GitHub Pages, served from `main` branch root. Live at:
https://mahesh-dharanova.github.io/platforms/

Orbit's "generate a pick" feature calls a small serverless function
(`api/generate.js`) for a real LLM call — the same repo is also linked to
Vercel, which only serves `/api/*`; its static mirror at `*.vercel.app` is
unused. Required env vars (set in the Vercel dashboard or via
`vercel env add`, never committed — see `.env.example`):

- `GROQ_API_KEY` — https://console.groq.com/keys
- `GEMINI_API_KEY` — fallback when Groq is rate-limited — https://aistudio.google.com/apikey
- `ALLOWED_ORIGIN` — set to `https://mahesh-dharanova.github.io` (CORS allowlist)

Get/verify keys locally first with `~/Dev/Tools/env/ai-keys add groq` and
`~/Dev/Tools/env/ai-keys add google`, then copy the values into Vercel.

If `orbit/index.html`'s `API_BASE` constant ever needs to change (e.g. Vercel
assigns a different project URL), update it there.

## Local preview

```
python3 -m http.server -d . 8080
```
