/* scroll-reveal.js — fades/slides elements in as they enter the viewport */

function initScrollReveal(selector = '.reveal', options = {}) {
  const elements = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px', ...options }
  );

  elements.forEach((el) => observer.observe(el));
}

/** Shared HTML escaper for the render functions on each page. */
function escapeHTML(str) {
  return String(str == null ? '' : str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Grows a textarea to fit its content so nothing gets clipped. */
function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/** Applies auto-grow to every textarea in a subtree, now and as the user types. */
function initAutoGrow(root = document) {
  root.querySelectorAll('textarea').forEach((textarea) => {
    autoGrow(textarea);
    if (textarea.dataset.autogrow === 'true') return;
    textarea.dataset.autogrow = 'true';
    textarea.addEventListener('input', () => autoGrow(textarea));
  });
}
