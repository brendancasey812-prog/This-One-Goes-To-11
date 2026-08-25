# This Goes to 11

A travel blog UI. Three tabs, no build step, no dependencies — just HTML, CSS and
vanilla JavaScript you can open straight in a browser.

| Tab | File | What's on it |
| --- | --- | --- |
| **Home** | `index.html` | The hook, the "why" behind the blog, an about-me section, and a wall of trip photos |
| **Trips** | `trips.html` | One editable block per destination, alternating photo/text |
| **Recommendations** | `recommendations.html` | Filterable cards for places worth vouching for |

## Two modes

The site runs in one of two modes, decided by the URL:

| Mode | URL | What you get |
| --- | --- | --- |
| **View** | `index.html` | The finished blog. Plain text, no drop boxes, empty frames hidden. This is what a visitor sees. |
| **Edit** | `index.html?edit` | Every field editable, every frame a drop target, plus a toolbar to export your content. |

Nobody can stumble into edit mode by accident, and editing only ever changes
*your* browser — it can't change what a visitor sees. Only committing a new
`content.json` does that.

## Running it

Open `index.html` in a browser. That's it. To serve it locally instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000       (the published view)
#            http://localhost:8000/?edit (the editor)
```

Note: `content.json` is loaded with `fetch`, which browsers block on `file://`.
Open the site over `http://` (the command above) if you want to see your
published content; otherwise it falls back to the seeded examples.

## Publishing your content

Everything you type and drop lives in *your browser*, so it isn't part of the
site until you export it. The loop:

1. Open the site with `?edit` and fill it in — text, photos, ratings.
2. Click **Export content.json** in the toolbar at the bottom.
3. Drop the downloaded `content.json` next to `index.html` and commit it.

Now every visitor sees your trips instead of the examples. Your local edits
still override the published file while you keep working; **Reset** clears them
and shows you exactly what a visitor sees. **Import** loads a `content.json`
back in — useful for editing from a different machine.

Photos are embedded in `content.json` as data URIs, so it's a single
self-contained file. Expect roughly 200–400 KB per photo; if it grows past a
few MB, drop some frames or re-export with smaller images.

## Putting it on GitHub Pages

The site is plain static files with only relative links, so it works at any
path with no build step and no configuration:

1. Push it to a **public** repo (Pages needs GitHub Pro for private repos).
2. Repo **Settings → Pages → Source: Deploy from a branch**, pick `main` and
   `/ (root)`.
3. It goes live at `https://<username>.github.io/<repo>/` in a minute or two.

A `.nojekyll` file is included so Pages serves the files as-is instead of
running them through Jekyll.

**A Pages site on a public repo is public.** An unguessable URL isn't privacy —
the repo is browsable, the images are downloadable, and search engines can
index the page. If you need it genuinely restricted, GitHub's access-controlled
Pages is Enterprise-only; Cloudflare Pages with Cloudflare Access is the usual
free way to put a login in front of a static site.

## Photo drop boxes

Every photo placeholder is a drop target. Drag a file onto it, or click to browse:

- **Previews:** JPG, JPEG, PNG, WEBP, AVIF, GIF, BMP, SVG
- **Accepted, no preview:** HEIC, HEIF, TIFF, PDF — the filename is kept on the card
  (browsers can't decode HEIC, so it's stored as a reference)

Images are resized to a 1600px longest edge before being saved so they fit in browser
storage. If storage fills up, the photo still shows for the visit and a note appears.

## Where the content lives

Reads fall through three layers: `localStorage` (your unpublished edits) →
`content.json` (what's published) → the seeded examples. Writes only ever touch
`localStorage`, so editing never mutates the published file.

Everything you type or drop is saved under the `tg11:v1:*` keys — it stays on
your machine and never leaves the browser until you export it.

To wipe it manually, run this in the browser console:

```js
Object.keys(localStorage).filter(k => k.startsWith('tg11:')).forEach(k => localStorage.removeItem(k));
```

## Design

| Token | Value | Used for |
| --- | --- | --- |
| `--deep-navy` | `#071c2a` | Nav, footer, deepest sections |
| `--deep-ocean` | `#0c2c3f` | Hero gradient, drop boxes |
| `--deep-pine` | `#0e3630` | About section, active filters |
| `--sea` / `--sea-bright` | `#17605c` / `#2c8a80` | Links, active tab, accents |
| `--sand` | `#e0b874` | Primary button, stamps, ratings |
| `--on-dark` / `--on-light` | `#ffffff` / `#0a1a1f` | Text, picked per surface |

Sections declare `.on-dark` or `.on-light`, which sets white or near-black text and
the matching muted tone. Type is Fraunces (display) over Inter (body).

## Files

```
index.html              Home
trips.html              Trips
recommendations.html    Recommendations
content.json            Your published content (created by Export; optional)
css/styles.css          The whole design system
js/storage.js           Data layer: published content under local edits
js/content.js           View/edit modes, export/import, page bootstrap
js/photos.js            Photo slots: drag/drop, preview, resize, persistence
js/scroll-reveal.js     Reveal-on-scroll, HTML escaper, textarea auto-grow
js/home.js              Home page rendering
js/trips.js             Trip blocks
js/recommendations.js   Recommendation cards + filters
assets/                 Put committed images here
.nojekyll               Tells GitHub Pages to serve the files as-is
```
