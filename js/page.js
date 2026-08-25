/* page.js — wires up the hand-written pages.
 *
 * Every page declares its photo frames in the HTML rather than in JavaScript:
 *
 *   <div data-photo="yukon-hero"
 *        data-photo-label="The aurora over Whitehorse"
 *        data-photo-icon="🌌"
 *        data-photo-class="dropzone--tall"></div>
 *
 * In view mode that renders the photo (or a quiet "coming soon" frame while
 * the slot is still empty). In edit mode it becomes a drop target.
 */

function mountPhotoSlots(root = document) {
  root.querySelectorAll('[data-photo]').forEach((el) => {
    el.innerHTML = Photos.markup({
      slotId: el.dataset.photo,
      label: el.dataset.photoLabel || 'Drop a photo here',
      icon: el.dataset.photoIcon || '📷',
      hint: el.dataset.photoHint || 'JPG, PNG, WEBP, HEIC, GIF or PDF',
      classes: el.dataset.photoClass || '',
    });
  });
}

/** Postcard captions: a textarea while editing, plain text once published. */
function mountCaptions(root = document) {
  const captions = Storage.getCaptions();

  root.querySelectorAll('[data-caption]').forEach((el) => {
    const slot = el.dataset.caption;
    const value = captions[slot] || el.dataset.captionDefault || '';

    if (!EditMode.active) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'postcard__caption postcard__caption--static';
      figcaption.textContent = value;
      el.replaceWith(figcaption);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.className = 'postcard__caption';
    textarea.placeholder = el.dataset.captionPlaceholder || 'Where was this?';
    textarea.setAttribute('aria-label', textarea.placeholder);
    textarea.value = value;
    textarea.addEventListener('input', () => Storage.saveCaption(slot, textarea.value));
    el.replaceWith(textarea);
  });
}

/** Builds the 11-notch dial that gives the blog its name. */
function mountDials(root = document) {
  root.querySelectorAll('[data-dial]').forEach((el) => {
    const level = Math.max(0, Math.min(11, Number(el.dataset.dial) || 11));
    const notches = Array.from({ length: 11 }, (_, i) => {
      const on = i < level ? ' is-on' : '';
      const peak = i === 10 ? ' dial__notch--peak' : '';
      return `<span class="dial__notch${on}${peak}"></span>`;
    }).join('');
    el.innerHTML = `
      <span class="dial__notches" aria-hidden="true">${notches}</span>
      <span class="dial__label">${level} / 11</span>
    `;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `Rated ${level} out of 11`);
  });
}

/** Marks the current page in the nav without hard-coding it per file. */
function markCurrentNavLink() {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav__links a').forEach((link) => {
    const target = link.getAttribute('href');
    if (target === here) link.classList.add('is-active');
  });
}

function renderPage() {
  markCurrentNavLink();
  mountDials();
  mountPhotoSlots();
  mountCaptions();
  Photos.attachAll();
  initAutoGrow();
  initScrollReveal('.reveal');
}

document.addEventListener('DOMContentLoaded', () => bootstrap(renderPage));
