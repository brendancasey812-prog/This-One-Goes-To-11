/* photos.js — drag-and-drop photo slots that accept a wide range of file formats.
   Any element with .dropzone can be wired up with Photos.attach(el, slotId). */

const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg',
  '.heic', '.heif', '.tif', '.tiff', '.pdf',
];

/* Every frame takes any file. An unrestricted input still offers a phone's
   camera, scanner and photo library, and it stops the picker greying out
   formats we can in fact handle (HEIC being the one that kept catching
   people out). ACCEPTED_EXTENSIONS below is only a decode heuristic now. */
const ACCEPT_ATTR = '*/*';

/* Longest edge (px) an image is resized to before being stored. */
const MAX_STORED_EDGE = 1600;

/* A file we can't decode to an image is kept whole — there's nothing to
   downscale — so it only gets stored inline if it's small enough to survive
   base64 (~+33%) inside the ~5MB localStorage budget. Anything larger keeps
   its name only. */
const MAX_STORED_FILE_BYTES = 1_500_000;

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

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True for a stored record we kept as a file rather than a decoded image.
    Records saved before `kind` existed are identified by being PDFs. */
function isAttachment(photo) {
  return photo.kind === 'file' || isPdf(photo);
}

/** True for a File or a stored photo record that is a PDF. */
function isPdf(fileOrPhoto) {
  const type = (fileOrPhoto.type || '').toLowerCase();
  const name = (fileOrPhoto.name || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
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

/** Paints a decoded image onto a capped canvas and returns a data URL.
    Re-encoding is also what converts an exotic format into something every
    browser can display — a decoded HEIC comes back out as JPEG. */
function toCappedDataUrl(source, width, height, type) {
  const longest = Math.max(width, height);
  if (!longest) return null;
  const scale = Math.min(1, MAX_STORED_EDGE / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    const keepAlpha = type === 'image/png' || type === 'image/gif' || type === 'image/webp';
    return canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.82);
  } catch (err) {
    console.warn('Could not re-encode image', err);
    return null;
  }
}

/** Decodes a file to a capped data URL, or null if this browser can't.
 *
 *  Two paths, because they don't cover the same formats. createImageBitmap
 *  hands the file to the platform decoder, which on Apple devices includes
 *  HEIC — so an iPhone photo goes straight in. Browsers without a HEIC
 *  decoder fail both paths and the caller keeps the original file instead. */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const out = toCappedDataUrl(bitmap, bitmap.width, bitmap.height, file.type);
      if (bitmap.close) bitmap.close();
      if (out) return out;
    } catch (err) {
      /* Platform can't decode it — try the <img> path below. */
    }
  }

  try {
    const dataUrl = await readAsDataURL(file);
    const img = await new Promise((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = dataUrl;
    });
    if (img) return toCappedDataUrl(img, img.naturalWidth, img.naturalHeight, file.type);
  } catch (err) {
    console.warn('Could not read file', err);
  }
  return null;
}

const Photos = {
  ACCEPT_ATTR,

  /** Markup for a photo slot.
   *  View mode renders the photo as a plain image; an empty slot becomes a
   *  quiet "coming soon" frame so the layout still reads, unless the caller
   *  passes placeholder:false. Edit mode always renders the drop target. */
  markup({
    slotId,
    label,
    hint = 'Any file — HEIC, JPG, PNG, a scan or a PDF',
    icon = '📷',
    classes = '',
    placeholder = true,
  }) {
    if (typeof EditMode !== 'undefined' && !EditMode.active) {
      const photo = Storage.getPhoto(slotId);
      if (photo && photo.dataUrl && isAttachment(photo)) {
        // Nothing we could decode into an <img>, so it becomes a card that
        // opens or downloads the original file.
        const pdf = isPdf(photo);
        const ext = (photo.name || '').split('.').pop().toUpperCase();
        return `
          <figure class="photo photo--doc ${classes}">
            <a class="doccard" href="${photo.dataUrl}" target="_blank" rel="noopener" download="${escapeHTML(photo.name || 'file')}">
              <span class="doccard__icon" aria-hidden="true">${pdf ? '📄' : '📎'}</span>
              <span class="doccard__name">${escapeHTML(photo.name || label || 'File')}</span>
              <span class="doccard__note">${escapeHTML(ext && ext.length <= 5 ? ext : 'File')} — open</span>
            </a>
          </figure>
        `;
      }
      if (photo && photo.dataUrl) {
        return `<figure class="photo ${classes}"><img src="${photo.dataUrl}" alt="${escapeHTML(photo.name || label || 'Trip photo')}" loading="lazy" /></figure>`;
      }
      if (!placeholder) return '';
      // An empty frame is a to-do, so it offers the action rather than just
      // announcing itself. The link opens the editor scrolled to this frame.
      const page = window.location.pathname.split('/').pop() || 'index.html';
      return `
        <div class="photo-slot ${classes}">
          <span class="photo-slot__icon" aria-hidden="true">${icon}</span>
          <span class="photo-slot__label">${escapeHTML(label)}</span>
          <a class="photo-slot__add" href="${page}?edit#${slotId}-input">Add a photo</a>
        </div>
      `;
    }
    return `
      <label class="dropzone ${classes}" for="${slotId}-input" data-slot="${slotId}">
        <img class="dropzone__preview" alt="" />
        <button type="button" class="dropzone__clear" aria-label="Remove this photo">&times;</button>
        <span class="dropzone__icon" aria-hidden="true">${icon}</span>
        <span class="dropzone__label">${label}</span>
        <span class="dropzone__cta">Choose a file</span>
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
        dropzone.classList.remove('has-file', 'has-image', 'has-doc');
        if (preview) { preview.removeAttribute('src'); preview.alt = ''; }
        if (filenameEl) filenameEl.textContent = '';
        return;
      }
      dropzone.classList.add('has-file');
      dropzone.classList.toggle('has-doc', isAttachment(photo));
      if (filenameEl) filenameEl.textContent = photo.name || '';
      if (photo.dataUrl && preview && !isAttachment(photo)) {
        preview.src = photo.dataUrl;
        preview.alt = photo.name || 'Trip photo';
        dropzone.classList.add('has-image');
      } else {
        dropzone.classList.remove('has-image');
        if (preview) preview.removeAttribute('src');
      }
    };

    const handleFile = async (file) => {
      if (!file) return;
      const meta = { name: file.name, type: file.type || 'unknown', addedAt: new Date().toISOString() };

      /** Falls back to keeping the file itself, so nothing silently vanishes. */
      const keepAsFile = async (why) => {
        if (file.size > MAX_STORED_FILE_BYTES) {
          render(meta);
          Storage.savePhoto(slotId, meta);
          showToast(`${file.name} is ${formatFileSize(file.size)} — too large to publish, so only the name was kept.`);
          return;
        }
        try {
          const dataUrl = await readAsDataURL(file);
          const record = { ...meta, kind: 'file', dataUrl };
          render(record);
          if (!Storage.savePhoto(slotId, record)) {
            showToast('Shown for this visit only — browser storage is full.');
          } else if (why) {
            showToast(why);
          }
        } catch (err) {
          console.warn('Could not read file', err);
          showToast('That file could not be read. Try another one?');
        }
      };

      // A PDF has no image to decode; keep it whole.
      if (isPdf(file)) return keepAsFile();

      // Try to decode anything that might be a picture, whatever the
      // extension says. HEIC lands here and succeeds wherever the platform
      // has a decoder.
      if (isProbablyImage(file) || !file.type) {
        const stored = await decodeImage(file);
        if (stored) {
          const photo = { ...meta, kind: 'image', dataUrl: stored };
          render(photo);
          if (!Storage.savePhoto(slotId, photo)) {
            showToast('Photo shown for this visit only — browser storage is full.');
          }
          return;
        }
        return keepAsFile(`This browser can't display ${file.name}, so it was attached as a file instead.`);
      }

      // Anything else — a document, an archive, whatever — is kept as a file.
      return keepAsFile();
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
