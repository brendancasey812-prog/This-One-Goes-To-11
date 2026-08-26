# This One Goes to 11

A travel blog. Three tabs, no build step, no dependencies — just HTML, CSS and
vanilla JavaScript you can open straight in a browser.

| Tab | File | What's on it |
| --- | --- | --- |
| **About** | `index.html` | Who I am, what you'll learn, why the dial goes to 11, and the trip index |
| **Yukon** | `yukon.html` | Aurora Borealis in Whitehorse — why it goes to 11, planning notes, Top 11 things to do, logistics |
| **Norway** | `norway.html` | Perfect Norway 9-Day Summer Itinerary — driving notes, the four cities, Top 11 stops |

Each trip carries its own recommendations as a **Top 11** list, rather than
pooling them on a separate page.

Each trip header carries two labelled blocks — **At a Glance** (the dial and the
trip facts) and **In This Guide** (the section links, on a 2x2 grid) — so the
pills read as two groups rather than loose scattered chips.

### Adding a trip

Copy `yukon.html`, replace the content, then add a link to it in the `.site-nav__links`
list and the footer of all three pages. The nav highlights the current page
automatically — no per-file class to set.

## Two modes

The site runs in one of two modes, decided by the URL:

| Mode | URL | What you get |
| --- | --- | --- |
| **View** | `index.html` | The finished blog. Photos render as photos; a frame still waiting on a picture shows what belongs there plus an **Add a photo** button that opens the editor on that exact frame. |
| **Edit** | `index.html?edit` | Every frame becomes a drop target, captions become editable, plus a toolbar to export your content. |

Nobody can stumble into edit mode by accident, and editing only ever changes
*your* browser — it can't change what a visitor sees. Only committing a new
`content.json` does that.

The written content of the site lives in the HTML, so edit mode is for photos
and captions. To change the words, edit the `.html` file directly.

## Running it

Open `index.html` in a browser. That's it. To serve it locally instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000       (the published view)
#            http://localhost:8000/?edit (the editor)
```

Note: `content.json` is loaded with `fetch`, which browsers block on `file://`.
Open the site over `http://` (the command above) if you want to see your
published photos.

## Publishing your photos

Photos you drop live in *your browser*, so they aren't part of the site until
you export them. The loop:

1. Open the site with `?edit` and drop photos into the frames.
2. Click **Export content.json** in the toolbar at the bottom.
3. Drop the downloaded `content.json` next to `index.html` and commit it.

Now every visitor sees your photos instead of the placeholders. Your local edits
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

Every frame takes **any file** — the input is unrestricted, so nothing is greyed
out in the picker and a phone still offers its camera, scanner, photo library and
files app. What happens next depends on whether the browser can decode it:

1. **It decodes to a picture** → resized to a 1600px longest edge, re-encoded, and
   shown inline. Covers JPG, PNG, WEBP, AVIF, GIF, BMP, SVG everywhere.
2. **It doesn't** → the original file is kept whole and published as a card that
   opens or downloads it. Covers PDFs, and any format this browser lacks a decoder
   for. Nothing is ever silently dropped.
3. **It doesn't and it's over ~1.5 MB** → only the name is kept, with a message
   saying so, because base64 would overrun the ~5 MB localStorage budget.

### HEIC

`decodeImage()` tries two paths: `createImageBitmap`, which hands the file to the
**platform** decoder, and then an `<img>` element. On Apple devices the platform
decoder handles HEIC, so an iPhone photo decodes and is re-encoded as JPEG like any
other picture. Browsers without a HEIC decoder — Chromium on Linux, for one — fail
both paths and fall to case 2, attaching the original.

This means HEIC behaviour is browser-dependent by design. If HEIC is attaching
rather than displaying on the machine you use, the fix is a bundled WASM decoder
(libheif) rather than anything in this file.

Frames are declared in the HTML, so adding one is a single element:

```html
<div data-photo="yukon-dogs"
     data-photo-label="The team, ten Alaskan huskies"
     data-photo-icon="🛷"
     data-photo-class="dropzone--wide"></div>
```

The `data-photo` value is the storage key — keep it unique and stable, since
renaming it orphans any photo already dropped there.

## Where the content lives

Reads fall through two layers: `localStorage` (your unpublished edits) →
`content.json` (what's published). Writes only ever touch `localStorage`, so
editing never mutates the published file.

Everything you drop is saved under the `tg11:v1:*` keys — it stays on your
machine and never leaves the browser until you export it.

To wipe it manually, run this in the browser console:

```js
Object.keys(localStorage).filter(k => k.startsWith('tg11:')).forEach(k => localStorage.removeItem(k));
```

## Design

Every surface is drawn from one clear-water scale, so the whole site reads as
water rather than as a dark site with turquoise accents.

| Token | Value | Used for |
| --- | --- | --- |
| `--shallow-01/02/03` | `#e8faf7` → `#5ccbcf` | Hero and trip headers — sunlit shallows with caustic light |
| `--mist` / `--mist-warm` | `#eafaf8` / `#f2fcfb` | The pale sections, which carry deep-blue type |
| `--surface-alt` | `#d4f2ef` | Empty photo frames, chips |
| `--deep-pine` | `#0f6a80` | Deep sections (6.2:1 with white) |
| `--deep-ocean` | `#0d6280` | Drop boxes (6.8:1 with white) |
| `--deep-navy` | `#0a5570` | Nav, footer, deepest sections (8.3:1 with white) |
| `--sea` | `#0f6a80` | Links and eyebrows (5.8:1 on the shallows) |
| `--sand` | `#e0b874` | The one warm accent: primary button, focus rings, the 11th notch |
| `--lagoon-*` | `#cdf5ea` → `#4cc6c6` | Clear-water gradient on the page-link cards |
| `--reef-*` | `#c7f0f7` → `#52c4de` | The bluer, deeper variant of the same |
| `--ink-water` | `#08304a` | Type on the water cards and the bright headers |
| `--on-light` | `#0b2545` | Body and heading type on the pale sections (14.1:1) |
| `--on-light-muted` | `#3c5a7d` | Secondary type on the pale sections (6.5:1) |
| `--on-dark` | `#ffffff` | Type on the deep sections |

Sections declare `.on-dark` or `.on-light`, which sets white or deep-blue text and
the matching muted tone. Type is Fraunces (display) over Inter (body).

Most of these grounds are gradients, so a contrast checker that reads declared
CSS colours reports false failures. `scratchpad/pixel2.js`-style verification —
screenshot the page and sample the rendered pixel behind each text node — is the
one that tells the truth. Last run: 51 elements, all clear AA.

The dial motif — 11 notches with the last one in sand — is built by `mountDials()`
from `<span class="dial" data-dial="11"></span>`.

Cards that link to another page share the `.water-card` class: a clear-water
gradient built from four layers — the body of the water, a depth shadow in the
far corner, refracted light lines, and the sun catching the near surface. Add
`.water-card--reef` for the bluer pool. Because these cards are light, they set
their own ink colours rather than inheriting the white type of the dark section
they sit in.

## Files

```
index.html              About
yukon.html              Aurora Borealis in the Yukon
norway.html             Perfect Norway 9-Day Summer Itinerary
content.json            Your published photos (created by Export; optional)
css/styles.css          The whole design system
js/storage.js           Data layer: published content under local edits
js/content.js           View/edit modes, export/import, page bootstrap
js/photos.js            Photo slots: drag/drop, preview, resize, persistence
js/scroll-reveal.js     Reveal-on-scroll, HTML escaper, textarea auto-grow
js/page.js              Mounts photo frames, captions, dials, nav state
assets/                 Put committed images here
.nojekyll               Tells GitHub Pages to serve the files as-is
```
