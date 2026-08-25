/* home.js — hero, why/about photo slots, and the postcard wall */

/* Two wide frames on the first row, three on the second. */
const POSTCARDS = [
  { slot: 'postcard-1', label: 'The one that started it', icon: '🌊', size: 'wide' },
  { slot: 'postcard-2', label: 'Somewhere above the tree line', icon: '⛰️', size: 'wide' },
  { slot: 'postcard-3', label: 'Dinner, eventually', icon: '🍜', size: 'third' },
  { slot: 'postcard-4', label: 'The long way round', icon: '🚂', size: 'third' },
  { slot: 'postcard-5', label: 'Last light', icon: '🌅', size: 'third' },
];

function hideIfEmpty(el) {
  // In view mode an empty frame leaves a hole in the layout — drop the column
  // and collapse the section to a single one.
  if (!el || EditMode.active || el.innerHTML.trim()) return;
  // The hero frame carries the stamp badge, so hide the whole column.
  const target = el.closest('.hero__media') || el;
  target.hidden = true;
  const feature = el.closest('.feature');
  if (feature) feature.classList.add('feature--textonly');
  const hero = el.closest('.hero__grid');
  if (hero) hero.classList.add('hero__grid--textonly');
}

function renderHeroSlots() {
  const hero = document.getElementById('heroSlot');
  if (hero) {
    hero.innerHTML = Photos.markup({
      slotId: 'home-hero',
      label: 'Drop the headline photo here',
      hint: 'JPG, PNG, WEBP, HEIC, GIF or PDF — or click to browse',
      icon: '🖼️',
      classes: 'dropzone--tall',
    });
  }

  const why = document.getElementById('whySlot');
  if (why) {
    why.innerHTML = Photos.markup({
      slotId: 'home-why',
      label: 'A photo that explains the why',
      icon: '🧭',
      classes: 'dropzone--wide',
    });
  }

  const about = document.getElementById('aboutSlot');
  if (about) {
    about.innerHTML = Photos.markup({
      slotId: 'home-about',
      label: 'Drop a photo of yourself here',
      icon: '👋',
      classes: 'dropzone--wide',
    });
  }
}

function renderPostcards() {
  const grid = document.getElementById('postcardGrid');
  if (!grid) return;
  const captions = Storage.getCaptions();
  const editing = EditMode.active;

  const cards = editing
    ? POSTCARDS
    // A visitor should only see frames that actually have something in them.
    : POSTCARDS.filter((card) => {
        const photo = Storage.getPhoto(card.slot);
        return (photo && photo.dataUrl) || (captions[card.slot] || '').trim();
      });

  // The mosaic spans only tile when all five frames are present, so a
  // published page uses an even grid over however many actually have content.
  grid.classList.toggle('postcards--mixed', editing);
  grid.classList.toggle('postcards--even', !editing);

  const section = grid.closest('section');
  if (section) section.hidden = cards.length === 0;
  if (cards.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = cards.map((card, index) => {
    const media = Photos.markup({
      slotId: card.slot,
      label: card.label,
      icon: card.icon,
      hint: 'Drop a photo in',
      classes: card.size === 'wide' ? 'dropzone--wide' : 'dropzone--square',
    });
    const caption = editing
      ? `<textarea
           class="postcard__caption"
           data-slot="${card.slot}"
           placeholder="Where was this?"
           aria-label="Caption for ${escapeHTML(card.label)}"
         >${escapeHTML(captions[card.slot] || '')}</textarea>`
      : `<figcaption class="postcard__caption postcard__caption--static">${escapeHTML(captions[card.slot] || '')}</figcaption>`;

    return `
      <figure class="postcard postcard--${card.size}" style="transition-delay: ${index * 80}ms">
        ${media}
        ${caption}
      </figure>
    `;
  }).join('');

  grid.querySelectorAll('.postcard__caption').forEach((textarea) => {
    if (textarea.tagName !== 'TEXTAREA') return;
    textarea.addEventListener('input', () => {
      Storage.saveCaption(textarea.dataset.slot, textarea.value);
    });
  });
}

function renderStats() {
  const trips = document.getElementById('statTrips');
  const recs = document.getElementById('statRecs');
  if (trips) trips.textContent = Storage.getTrips().length;
  if (recs) recs.textContent = Storage.getRecommendations().length;
}

function initAboutField() {
  const field = document.getElementById('aboutExtra');
  if (!field) return;
  const about = Storage.getAbout();
  const value = about[field.dataset.aboutKey] || '';

  if (!EditMode.active) {
    // Swap the editor for plain prose, and drop it entirely when empty.
    if (!value.trim()) {
      field.remove();
      return;
    }
    const paragraph = document.createElement('p');
    paragraph.className = 'muted';
    paragraph.textContent = value;
    field.replaceWith(paragraph);
    return;
  }

  field.value = value;
  field.addEventListener('input', () => {
    Storage.saveAboutField(field.dataset.aboutKey, field.value);
  });
}

function renderHome() {
  renderHeroSlots();
  ['heroSlot', 'whySlot', 'aboutSlot'].forEach((id) => hideIfEmpty(document.getElementById(id)));
  renderPostcards();
  renderStats();
  initAboutField();
  Photos.attachAll();
  initAutoGrow();
  initScrollReveal('.reveal');
}

document.addEventListener('DOMContentLoaded', () => bootstrap(renderHome));
