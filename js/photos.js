/* photos.js — drag-and-drop photo slots that accept a wide range of file formats.
   Any element with .dropzone can be wired up with Photos.attach(el, slotId). */

const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg',
  '.heic', '.heif', '.tif', '.tiff', '.pdf',
];

/* Accept attribute used by every file input on the site. */
const ACCEPT_ATTR = `image/*,application/pdf,${ACCEPTED_EXTENSIONS.join(',')}`;

/* Longest edge (px) an image is resized to before being stored. */
const MAX_STORED_EDGE = 1600;

let toastEl = null;
let toastTimer = null;

function showToast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4200);
}

function isProbablyImage(file) {
  if (file.type && file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => ext !== '.pdf' && name.endsWith(ext));
}

/** Reads a File as a data URL. */
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Draws the image onto a canvas at a capped size so it fits in localStorage.
    Resolves with null when the browser cannot decode the format (e.g. HEIC). */
function downscaleImage(dataUrl, type) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.naturalWidth, img.naturalHeight);
      if (!longest) return resolve(null);
      const scale = Math.min(1, MAX_STORED_EDGE / longest);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const keepAlpha = type === 'image/png' || type === 'image/gif' || type === 'image/webp';
        resolve(canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.82));
      } catch (err) {
        console.warn('Could not re-encode image', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

const Photos = {
  ACCEPT_ATTR,

  /** Markup for a photo slot.
   *  View mode renders the photo as a plain image, or nothing when the slot
   *  is empty. Edit mode renders the drop target. */
  markup({ slotId, label, hint = 'Drop a photo here — JPG, PNG, WEBP, HEIC, GIF or PDF', icon = '📷', classes = '' }) {
    if (typeof EditMode !== 'undefined' && !EditMode.active) {
      const photo = Storage.getPhoto(slotId);
      if (!photo || !photo.dataUrl) return '';
      return `<figure class="photo ${classes}"><img src="${photo.dataUrl}" alt="${escapeHTML(photo.name || 'Trip photo')}" loading="lazy" /></figure>`;
    }
    return `
      <label class="dropzone ${classes}" for="${slotId}-input" data-slot="${slotId}">
        <img class="dropzone__preview" alt="" />
        <button type="button" class="dropzone__clear" aria-label="Remove this photo">&times;</button>
        <span class="dropzone__icon" aria-hidden="true">${icon}</span>
        <span class="dropzone__label">${label}</span>
        <span class="dropzone__hint">${hint}</span>
        <span class="dropzone__filename"></span>
        <input type="file" id="${slotId}-input" accept="${ACCEPT_ATTR}" />
      </label>
    `;
  },

  /** Wires up a .dropzone element: click, drag/drop, preview, persistence. */
  attach(dropzone, slotId = dropzone.dataset.slot) {
    if (!dropzone || dropzone.dataset.wired === 'true') return;
    dropzone.dataset.wired = 'true';
    dropzone.dataset.slot = slotId;

    const input = dropzone.querySelector('input[type="file"]');
    const preview = dropzone.querySelector('.dropzone__preview');
    const filenameEl = dropzone.querySelector('.dropzone__filename');
    const clearBtn = dropzone.querySelector('.dropzone__clear');

    if (input && !input.getAttribute('accept')) input.setAttribute('accept', ACCEPT_ATTR);

    const render = (photo) => {
      if (!photo) {
        dropzone.classList.remove('has-file', 'has-image');
        if (preview) { preview.removeAttribute('src'); preview.alt = ''; }
        if (filenameEl) filenameEl.textContent = '';
        return;
      }
      dropzone.classList.add('has-file');
      if (filenameEl) filenameEl.textContent = photo.name || '';
      if (photo.dataUrl && preview) {
        preview.src = photo.dataUrl;
        preview.alt = photo.name || 'Trip photo';
        dropzone.classList.add('has-image');
      } else {
        dropzone.classList.remove('has-image');
      }
    };

    const handleFile = async (file) => {
      if (!file) return;
      const meta = { name: file.name, type: file.type || 'unknown', addedAt: new Date().toISOString() };

      if (!isProbablyImage(file)) {
        // Non-image (e.g. a PDF itinerary): keep the reference, no preview.
        render(meta);
        if (!Storage.savePhoto(slotId, meta)) {
          showToast('Saved for this visit only — browser storage is full.');
        }
        return;
      }

      let dataUrl;
      try {
        dataUrl = await readAsDataURL(file);
      } catch (err) {
        console.warn('Could not read file', err);
        showToast('That file could not be read. Try another one?');
        return;
      }

      const stored = await downscaleImage(dataUrl, file.type);
      if (!stored) {
        // Format the browser cannot decode (HEIC is the usual culprit).
        render(meta);
        Storage.savePhoto(slotId, meta);
        showToast(`${file.name} was added, but this browser can't preview that format.`);
        return;
      }

      const photo = { ...meta, dataUrl: stored };
      render(photo);
      if (!Storage.savePhoto(slotId, photo)) {
        showToast('Photo shown for this visit only — browser storage is full.');
      }
    };

    if (input) {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (file) handleFile(file);
      });
    }

    ['dragenter', 'dragover'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'dragend'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (e.target === dropzone || !dropzone.contains(e.relatedTarget)) {
          dropzone.classList.remove('is-dragover');
        }
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (input) input.value = '';
        Storage.removePhoto(slotId);
        render(null);
      });
    }

    render(Storage.getPhoto(slotId));
  },

  /** Wires every dropzone inside a root element. */
  attachAll(root = document) {
    root.querySelectorAll('.dropzone').forEach((el) => Photos.attach(el, el.dataset.slot));
  },
};

/* A file dropped outside a box shouldn't navigate the page away. */
['dragover', 'drop'].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    if (!e.target.closest || !e.target.closest('.dropzone')) e.preventDefault();
  });
});
