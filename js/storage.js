/* storage.js — shared localStorage data layer for This Trip Goes to 11.
 *
 * The written content of the site lives in the HTML. What lives here is the
 * stuff the owner adds from the browser: photos dropped into frames, postcard
 * captions, and any free-text notes. Published values arrive from content.json
 * (see content.js) and localStorage overrides them locally.
 */

const STORAGE_KEYS = {
  photos: 'tg11:v1:photos',
  captions: 'tg11:v1:captions',
  about: 'tg11:v1:about',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not read ${key} from localStorage`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Could not write ${key} to localStorage`, err);
    return false;
  }
}

/** Published content from content.json, when content.js has loaded one. */
function publishedSection(key) {
  return typeof Content !== 'undefined' ? Content.section(key) : null;
}

const Storage = {
  /* ---- Captions (postcards) ---- */
  getCaptions() {
    return { ...(publishedSection('captions') || {}), ...readJSON(STORAGE_KEYS.captions, {}) };
  },

  saveCaption(slotId, text) {
    // Writes stay local — published values are only ever read through.
    const captions = readJSON(STORAGE_KEYS.captions, {});
    captions[slotId] = text;
    writeJSON(STORAGE_KEYS.captions, captions);
  },

  /* ---- Free-text notes keyed by field ---- */
  getAbout() {
    return { ...(publishedSection('about') || {}), ...readJSON(STORAGE_KEYS.about, {}) };
  },

  saveAboutField(key, text) {
    const about = readJSON(STORAGE_KEYS.about, {});
    about[key] = text;
    writeJSON(STORAGE_KEYS.about, about);
  },

  /* ---- Photos (dataURLs keyed by slot) ---- */
  getPhotos() {
    return { ...(publishedSection('photos') || {}), ...readJSON(STORAGE_KEYS.photos, {}) };
  },

  getPhoto(slotId) {
    return this.getPhotos()[slotId] || null;
  },

  savePhoto(slotId, photo) {
    // Only the local override is written, so published photos never get
    // copied into localStorage and blow the quota.
    const photos = readJSON(STORAGE_KEYS.photos, {});
    photos[slotId] = photo;
    return writeJSON(STORAGE_KEYS.photos, photos);
  },

  removePhoto(slotId) {
    const photos = readJSON(STORAGE_KEYS.photos, {});
    // A null marks the slot as cleared, which also hides a published photo.
    photos[slotId] = null;
    writeJSON(STORAGE_KEYS.photos, photos);
  },
};
