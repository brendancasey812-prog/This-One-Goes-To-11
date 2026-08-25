/* content.js — publish pipeline.
 *
 * The site runs in one of two modes:
 *   view  (default)      — a finished blog. Text is plain text, empty photo
 *                          frames are hidden. This is what a visitor sees.
 *   edit  (?edit in URL) — every field is editable, every frame is a drop
 *                          target, and a toolbar can export the result.
 *
 * Content comes from content.json when it exists (that's the published copy,
 * committed alongside the site), and localStorage overrides it locally so the
 * owner can keep editing without touching the published file.
 */

const EditMode = {
  get active() {
    return /(^|[?&#])edit\b/.test(window.location.search + window.location.hash);
  },
};

const Content = {
  published: null,

  /** Loads the published content.json, if the site has one. */
  async load() {
    try {
      const response = await fetch('content.json', { cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      this.published = data && typeof data === 'object' ? data : null;
    } catch (err) {
      // No content.json yet, or opened over file:// where fetch is blocked.
      this.published = null;
    }
    return this.published;
  },

  /** The published value for a section, or null. */
  section(key) {
    return this.published && this.published[key] ? this.published[key] : null;
  },
};

/* ---------------------------------------------------------------------- */
/* Export / import toolbar (edit mode only)                                */
/* ---------------------------------------------------------------------- */

function buildExportPayload() {
  return {
    generatedAt: new Date().toISOString(),
    about: Storage.getAbout(),
    captions: Storage.getCaptions(),
    photos: Object.fromEntries(Object.entries(Storage.getPhotos()).filter(([, photo]) => photo)),
  };
}

function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initEditToolbar() {
  if (!EditMode.active) return;

  const bar = document.createElement('div');
  bar.className = 'editbar';
  bar.innerHTML = `
    <span class="editbar__dot" aria-hidden="true"></span>
    <span class="editbar__label">Edit mode — changes save to this browser</span>
    <button class="btn btn--small btn--primary" type="button" data-action="export">Export content.json</button>
    <label class="btn btn--small btn--ghost editbar__import">
      Import
      <input type="file" accept="application/json,.json" hidden />
    </label>
    <button class="btn btn--small btn--ghost" type="button" data-action="reset">Reset</button>
    <a class="editbar__exit" href="${window.location.pathname}">Preview as a visitor →</a>
  `;
  document.body.appendChild(bar);

  bar.querySelector('[data-action="export"]').addEventListener('click', () => {
    const payload = buildExportPayload();
    const size = new Blob([JSON.stringify(payload)]).size;
    downloadJSON(payload, 'content.json');
    showToast(`Exported content.json (${formatBytes(size)}) — commit it next to index.html.`);
  });

  bar.querySelector('.editbar__import input').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.captions) localStorage.setItem(STORAGE_KEYS.captions, JSON.stringify(data.captions));
        if (data.about) localStorage.setItem(STORAGE_KEYS.about, JSON.stringify(data.about));
        if (data.photos) localStorage.setItem(STORAGE_KEYS.photos, JSON.stringify(data.photos));
        window.location.reload();
      } catch (err) {
        console.warn('Could not import content', err);
        showToast("That file didn't look like a content.json export.");
      }
    };
    reader.readAsText(file);
  });

  bar.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (!window.confirm('Clear everything saved in this browser and go back to the published content?')) return;
    Object.keys(localStorage)
      .filter((key) => key.startsWith('tg11:'))
      .forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  });
}

/** Every page boots the same way: load published content, render, wire up. */
async function bootstrap(render) {
  await Content.load();
  if (EditMode.active) document.body.classList.add('is-editing');
  render();
  initEditToolbar();
}
