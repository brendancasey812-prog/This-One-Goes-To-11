/* trips.js — alternating photo/text blocks, one per trip, all fields editable */

function tripMarkup(trip, index) {
  const reverse = index % 2 === 1;
  const number = String(index + 1).padStart(2, '0');
  const tags = (trip.tags || []).map((tag) => `<span class="chip">${escapeHTML(tag)}</span>`).join('');
  const editing = EditMode.active;

  const media = [
    Photos.markup({
      slotId: `${trip.id}-main`,
      label: 'Drop the main photo here',
      hint: 'JPG, PNG, WEBP, HEIC, GIF or PDF',
      icon: '🖼️',
      classes: 'dropzone--tall',
    }),
    Photos.markup({
      slotId: `${trip.id}-detail-a`,
      label: 'Detail shot',
      hint: 'Drop a photo in',
      icon: '📷',
      classes: 'dropzone--short',
    }),
    Photos.markup({
      slotId: `${trip.id}-detail-b`,
      label: 'One more',
      hint: 'Drop a photo in',
      icon: '📷',
      classes: 'dropzone--short',
    }),
  ].join('');

  const body = editing
    ? `<input
         class="field-title"
         type="text"
         value="${escapeHTML(trip.title)}"
         data-field="title"
         placeholder="Where did you go?"
         aria-label="Trip title"
       />
       <input
         class="field-line muted"
         type="text"
         value="${escapeHTML(trip.when)}"
         data-field="when"
         placeholder="When was it?"
         aria-label="Trip dates"
       />
       <textarea
         class="field-notes"
         data-field="notes"
         placeholder="What made this one an eleven?"
         aria-label="Trip notes"
       >${escapeHTML(trip.notes)}</textarea>
       <button class="link-btn" type="button" data-action="remove">Remove this trip</button>`
    : `<h2 class="trip__title">${escapeHTML(trip.title)}</h2>
       ${trip.when ? `<p class="trip__when muted">${escapeHTML(trip.when)}</p>` : ''}
       ${trip.notes ? `<p class="trip__notes">${escapeHTML(trip.notes)}</p>` : ''}`;

  // A trip with no photos shouldn't leave an empty column next to its text.
  const mediaColumn = media.trim() ? `<div class="trip__media">${media}</div>` : '';

  return `
    <article class="trip ${reverse ? 'trip--reverse' : ''} ${mediaColumn ? '' : 'trip--textonly'} reveal" data-trip-id="${trip.id}">
      ${mediaColumn}
      <div class="trip__body">
        <div class="trip__meta">
          <span class="chip chip--sand">Trip ${number}</span>
          ${tags}
        </div>
        ${body}
      </div>
    </article>
  `;
}

function renderTrips() {
  const list = document.getElementById('tripList');
  if (!list) return;
  const trips = Storage.getTrips();

  const count = document.getElementById('tripCount');
  if (count) count.textContent = trips.length;

  const visible = EditMode.active
    ? trips
    : trips.filter((trip) => (trip.title || '').trim() || (trip.notes || '').trim());

  if (visible.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No trips yet. Add the first one and start dropping photos in.</p>
      </div>`;
    return;
  }

  list.innerHTML = visible.map(tripMarkup).join('');

  list.querySelectorAll('.trip').forEach((article) => {
    const id = article.dataset.tripId;

    article.querySelectorAll('[data-field]').forEach((field) => {
      field.addEventListener('input', () => {
        Storage.updateTrip(id, { [field.dataset.field]: field.value });
      });
    });

    const removeBtn = article.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        const trip = Storage.getTrips().find((t) => t.id === id);
        const name = (trip && trip.title) || 'this trip';
        if (!window.confirm(`Remove ${name}? The photos in its frames go too.`)) return;
        ['main', 'detail-a', 'detail-b'].forEach((suffix) => Storage.removePhoto(`${id}-${suffix}`));
        Storage.removeTrip(id);
        renderTrips();
      });
    }
  });

  Photos.attachAll(list);
  initAutoGrow(list);
  initScrollReveal('.reveal');
}

function initTripsPage() {
  renderTrips();

  const toolbar = document.querySelector('.toolbar');
  if (toolbar && !EditMode.active) toolbar.hidden = true;

  const addBtn = document.getElementById('addTripBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const trip = Storage.addTrip();
      renderTrips();
      const el = document.querySelector(`[data-trip-id="${trip.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const title = el.querySelector('.field-title');
        if (title) title.focus();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => bootstrap(initTripsPage));
