/* storage.js — shared localStorage data layer for This Goes to 11 */

const STORAGE_KEYS = {
  trips: 'tg11:v1:trips',
  recommendations: 'tg11:v1:recommendations',
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

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultTrips() {
  return [
    {
      id: 'trip-lofoten',
      title: 'Lofoten, Norway',
      when: 'March 2025',
      tags: ['Arctic', 'Road trip', 'Cold water'],
      notes:
        'Six days chasing light above the Arctic Circle. The sun barely cleared the ridgeline, ' +
        'the water was an impossible green, and we ate more cinnamon buns than is strictly defensible. ' +
        'Replace this with your own words — every field on this page is editable.',
    },
    {
      id: 'trip-oaxaca',
      title: 'Oaxaca, Mexico',
      when: 'November 2024',
      tags: ['Food first', 'Slow travel'],
      notes:
        'A week of markets, mezcal, and mole. We rented a place with a rooftop and a stubborn cat, ' +
        'and mostly walked until something smelled too good to keep walking past.',
    },
    {
      id: 'trip-hokkaido',
      title: 'Hokkaidō, Japan',
      when: 'February 2024',
      tags: ['Powder', 'Onsen', 'Trains'],
      notes:
        'Deep snow, deeper baths. Trains that arrive to the second, and a ramen shop in Sapporo ' +
        'we thought about for the rest of the year.',
    },
  ];
}

function defaultRecommendations() {
  return [
    {
      id: 'rec-1',
      category: 'Eat',
      title: 'The tiny place with no sign',
      where: 'Oaxaca de Juárez, Mexico',
      rating: 5,
      notes:
        'Six stools, one grill, one thing on the menu. Go at 8pm, order whatever the person next to you ordered.',
    },
    {
      id: 'rec-2',
      category: 'Stay',
      title: 'The red rorbu at the end of the road',
      where: 'Reine, Lofoten',
      rating: 5,
      notes:
        'Fisherman\'s cabin on stilts over the water. Worth it for the window alone. Book absurdly far ahead.',
    },
    {
      id: 'rec-3',
      category: 'Do',
      title: 'Night bath after a powder day',
      where: 'Niseko, Hokkaidō',
      rating: 4,
      notes: 'Outdoor onsen, snow falling into the steam. Best twenty minutes of the whole trip.',
    },
    {
      id: 'rec-4',
      category: 'Move',
      title: 'The slow train instead of the fast one',
      where: 'Anywhere with a coastline',
      rating: 4,
      notes:
        'Costs less, takes longer, and you actually see the place. This is the whole thesis of the blog, honestly.',
    },
  ];
}

/** Published content from content.json, when content.js has loaded one. */
function publishedSection(key) {
  return typeof Content !== 'undefined' ? Content.section(key) : null;
}

const Storage = {
  /* ---- Trips ---- */
  getTrips() {
    const trips = readJSON(STORAGE_KEYS.trips, null);
    if (Array.isArray(trips) && trips.length > 0) return trips;

    const published = publishedSection('trips');
    if (Array.isArray(published) && published.length > 0) return published;

    // Nothing published and nothing local: seed the examples so the page
    // isn't blank the first time it's opened.
    const seeded = defaultTrips();
    writeJSON(STORAGE_KEYS.trips, seeded);
    return seeded;
  },

  saveTrips(trips) {
    writeJSON(STORAGE_KEYS.trips, trips);
  },

  updateTrip(id, fields) {
    const trips = this.getTrips();
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;
    Object.assign(trip, fields);
    this.saveTrips(trips);
  },

  addTrip() {
    const trips = this.getTrips();
    const trip = { id: makeId('trip'), title: '', when: '', tags: [], notes: '' };
    trips.push(trip);
    this.saveTrips(trips);
    return trip;
  },

  removeTrip(id) {
    this.saveTrips(this.getTrips().filter((t) => t.id !== id));
  },

  /* ---- Recommendations ---- */
  getRecommendations() {
    const recs = readJSON(STORAGE_KEYS.recommendations, null);
    if (Array.isArray(recs) && recs.length > 0) return recs;

    const published = publishedSection('recommendations');
    if (Array.isArray(published) && published.length > 0) return published;

    const seeded = defaultRecommendations();
    writeJSON(STORAGE_KEYS.recommendations, seeded);
    return seeded;
  },

  saveRecommendations(recs) {
    writeJSON(STORAGE_KEYS.recommendations, recs);
  },

  updateRecommendation(id, fields) {
    const recs = this.getRecommendations();
    const rec = recs.find((r) => r.id === id);
    if (!rec) return;
    Object.assign(rec, fields);
    this.saveRecommendations(recs);
  },

  addRecommendation(category = 'Eat') {
    const recs = this.getRecommendations();
    const rec = { id: makeId('rec'), category, title: '', where: '', rating: 0, notes: '' };
    recs.unshift(rec);
    this.saveRecommendations(recs);
    return rec;
  },

  removeRecommendation(id) {
    this.saveRecommendations(this.getRecommendations().filter((r) => r.id !== id));
  },

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

  /* ---- About text ---- */
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
