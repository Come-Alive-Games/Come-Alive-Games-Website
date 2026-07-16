# Come Alive Games — Playtest Site

A static site for hosting browser-playable tabletop game prototypes, collecting
playtester ratings/comments, and moderating feedback. Built to run entirely on
GitHub Pages + Supabase (both have free tiers).

## Structure

```
come-alive-games/
├── index.html              Homepage (about, offer, CTA, game library)
├── game.html                Game landing page template (reads ?slug=... )
├── admin.html                Moderation dashboard
├── assets/
│   ├── css/style.css        All site styling
│   └── js/
│       ├── main.js          Homepage logic
│       ├── game.js          Game page logic (Supabase reads/writes)
│       ├── admin.js         Admin logic (Supabase reads/deletes)
│       └── supabase-config.js   ← put your Supabase keys here
├── games/
│   ├── games.json           ← THE REGISTRY — one entry per game
│   ├── dice-duel.html       Example self-contained game file
│   ├── card-crawl.html
│   └── trade-routes.html
└── supabase/
    └── schema.sql            Run once in Supabase SQL editor
```

## How to add a new game (your day-to-day workflow)

1. Export your game as a single self-contained `.html` file (all CSS/JS inline —
   no external file dependencies except CDN links, which are fine).
2. Drop the file into the `games/` folder, e.g. `games/skyward.html`.
3. Open `games/games.json` and add one entry:

```json
{
  "slug": "skyward",
  "title": "Skyward",
  "category": "Cooperative",
  "status": "new",
  "version": "0.1",
  "description": "One sentence pitch.",
  "instructions": "How to play, in a paragraph.",
  "knownIssues": ["Anything playtesters should know is rough right now."],
  "file": "skyward.html"
}
```

4. Commit and push. The homepage library and the game's landing page
   (`game.html?slug=skyward`) build themselves automatically from this file —
   no other code changes needed.

`status` can be `"new"`, `"in-testing"`, or `"closed"` — this controls the
stamp badge shown on the game's library card.

## One-time setup

### 1. Supabase (feedback storage)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the SQL editor and run everything in `supabase/schema.sql`.
3. Go to Project Settings → API, copy your **Project URL** and **anon public key**.
4. Paste them into `assets/js/supabase-config.js`:
   ```js
   const SUPABASE_URL = "https://your-project-ref.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-public-key";
   const ADMIN_PASSWORD = "pick-something-only-you-know";
   ```
5. That's it — ratings, comments, and admin moderation all work through this.

**A note on admin security:** `admin.html` uses a simple client-side password
check, which is fine for keeping casual visitors out but is not a real
security boundary (a determined person could view the page source). Since
this is a public playtesting site with low-stakes data (public comments, no
personal info collected beyond an optional display name), this tradeoff is
reasonable for v1. If you want a real login later, swap the password gate for
[Supabase Auth](https://supabase.com/docs/guides/auth) — the schema and admin
UI are structured so that swap only touches `admin.js`.

### 2. GitHub Pages + custom domain

1. Push this folder to a new GitHub repository.
2. In the repo, go to **Settings → Pages**, set the source to your main
   branch (root directory).
3. Under **Custom domain**, enter your domain and follow GitHub's DNS
   instructions (a `CNAME` record to `yourusername.github.io`, or `A` records
   if using an apex domain).
4. GitHub will create a `CNAME` file in your repo root automatically once you
   save the custom domain in settings — leave it there.
5. Enable **Enforce HTTPS** once DNS has propagated.

No build step, no server — every file here is served as-is.

## Design notes

The visual system ("workshop / physical playtest kit": kraft paper texture,
index-card game tiles, rubber-stamp status badges, rulebook-style display
type) uses placeholder brand colors and no logo. To swap in real branding
later, everything lives in `assets/css/style.css` under the `:root` token
block at the top of the file — update the hex values and font names there
and the whole site follows.

## Local preview

No build tools required. Either open `index.html` directly in a browser, or
run a simple local server (recommended, since `fetch()` for `games.json` can
be blocked by some browsers on `file://`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
