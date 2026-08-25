/* recommendations.js — filterable cards for places worth vouching for */

const CATEGORIES = ['Stay', 'Eat', 'Do', 'Move'];
const CATEGORY_ICONS = { Stay: '🛏️', Eat: '🍽️', Do: '🥾', Move: '🚆' };

let activeFilter = 'All';

function ratingMarkup(rec) {
  return [1, 2, 3, 4, 5]
    .map(
      (value) => `
        <button
          class="rating__star ${value <= (rec.rating || 0) ? 'is-on' : ''}"
          type="button"
          data-rating="${value}"
          aria-label="Rate ${value} out of 5"
        >★</button>`
    )
    .join('');
}

function recMarkup(rec) {
  const icon = CATEGORY_ICONS[rec.category] || '📍';
  const editing = EditMode.active;

  const media = Photos.markup({
    slotId: `${rec.id}-photo`,
    label: 'Drop a photo here',
    hint: 'JPG, PNG, WEBP, HEIC, GIF or PDF',
    icon,
    classes: '',
  });

  const head = editing
    ? `<div class="rec-card__top">
         <select class="cat-select" data-field="category" aria-label="Category">
           ${CATEGORIES.map(
             (cat) => `<option value="${cat}" ${cat === rec.category ? 'selected' : ''}>${cat}</option>`
           ).join('')}
         </select>
       </div>
       <textarea
         class="rec-card__title"
         rows="1"
         data-field="title"
         placeholder="What is it?"
         aria-label="Recommendation name"
       >${escapeHTML(rec.title)}</textarea>
       <input
         class="rec-card__where"
         type="text"
         value="${escapeHTML(rec.where)}"
         data-field="where"
         placeholder="Where in the world?"
         aria-label="Location"
       />
       <textarea
         class="rec-card__notes"
         data-field="notes"
         placeholder="Why would you send someone here?"
         aria-label="Notes"
       >${escapeHTML(rec.notes)}</textarea>`
    : `<div class="rec-card__top">
         <span class="chip">${escapeHTML(rec.category)}</span>
       </div>
       <h2 class="rec-card__title rec-card__title--static">${escapeHTML(rec.title)}</h2>
       ${rec.where ? `<p class="rec-card__where rec-card__where--static">${escapeHTML(rec.where)}</p>` : ''}
       ${rec.notes ? `<p class="rec-card__notes rec-card__notes--static">${escapeHTML(rec.notes)}</p>` : ''}`;

  const foot = editing
    ? `<div class="rec-card__foot">
         <div class="rating" role="group" aria-label="Rating">${ratingMarkup(rec)}</div>
         <button class="link-btn" type="button" data-action="remove">Remove</button>
       </div>`
    : rec.rating
      ? `<div class="rec-card__foot">
           <div class="rating" aria-label="Rated ${rec.rating} out of 5">${
             [1, 2, 3, 4, 5]
               .map((v) => `<span class="rating__star ${v <= rec.rating ? 'is-on' : ''}" aria-hidden="true">★</span>`)
               .join('')
           }</div>
         </div>`
      : '';

  return `
    <article class="rec-card reveal" data-rec-id="${rec.id}">
      ${media}
      <div class="rec-card__body">
        ${head}
        ${foot}
      </div>
    </article>
  `;
}

function renderFilters() {
  const bar = document.getElementById('filters');
  if (!bar) return;
  const counts = Storage.getRecommendations().reduce((acc, rec) => {
    acc[rec.category] = (acc[rec.category] || 0) + 1;
    return acc;
  }, {});

  bar.innerHTML = ['All', ...CATEGORIES]
    .map((cat) => {
      const count = cat === 'All' ? Storage.getRecommendations().length : counts[cat] || 0;
      return `<button class="filter ${cat === activeFilter ? 'is-active' : ''}" type="button" data-filter="${cat}">
                ${cat} <span class="muted">${count}</span>
              </button>`;
    })
    .join('');

  bar.querySelectorAll('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      renderFilters();
      renderRecommendations();
    });
  });
}

function renderRecommendations() {
  const grid = document.getElementById('recGrid');
  if (!grid) return;

  const all = EditMode.active
    ? Storage.getRecommendations()
    : Storage.getRecommendations().filter((rec) => (rec.title || '').trim());
  const visible = activeFilter === 'All' ? all : all.filter((rec) => rec.category === activeFilter);

  if (visible.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>Nothing under <strong>${escapeHTML(activeFilter)}</strong> yet. Add one and it'll show up here.</p>
      </div>`;
    return;
  }

  grid.innerHTML = visible.map(recMarkup).join('');

  grid.querySelectorAll('.rec-card').forEach((card) => {
    const id = card.dataset.recId;

    const titleField = card.querySelector('.rec-card__title');
    if (titleField) {
      // It's a textarea so long names wrap, but it should still behave like one line.
      titleField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault();
      });
    }

    card.querySelectorAll('[data-field]').forEach((field) => {
      const event = field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(event, () => {
        Storage.updateRecommendation(id, { [field.dataset.field]: field.value });
        if (field.dataset.field === 'category') {
          renderFilters();
          renderRecommendations();
        }
      });
    });

    card.querySelectorAll('.rating__star').forEach((star) => {
      star.addEventListener('click', () => {
        const rec = Storage.getRecommendations().find((r) => r.id === id);
        const value = Number(star.dataset.rating);
        // Clicking the current rating clears it.
        Storage.updateRecommendation(id, { rating: rec && rec.rating === value ? 0 : value });
        renderRecommendations();
      });
    });

    const removeBtn = card.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const rec = Storage.getRecommendations().find((r) => r.id === id);
        const name = (rec && rec.title) || 'this recommendation';
        if (!window.confirm(`Remove ${name}?`)) return;
        Storage.removePhoto(`${id}-photo`);
        Storage.removeRecommendation(id);
        renderFilters();
        renderRecommendations();
      });
    }
  });

  Photos.attachAll(grid);
  initAutoGrow(grid);
  initScrollReveal('.reveal');
}

function initRecsPage() {
  renderFilters();
  renderRecommendations();

  const addBtn = document.getElementById('addRecBtn');
  if (addBtn && !EditMode.active) addBtn.hidden = true;
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const category = activeFilter === 'All' ? 'Eat' : activeFilter;
      const rec = Storage.addRecommendation(category);
      renderFilters();
      renderRecommendations();
      const card = document.querySelector(`[data-rec-id="${rec.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const title = card.querySelector('.rec-card__title');
        if (title) title.focus();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => bootstrap(initRecsPage));
