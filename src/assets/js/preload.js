const MIN_DURATION_MS = 1200;
const MAX_DURATION_MS = 2400;

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader || preloader.classList.contains('preloader--hide')) {
    return;
  }

  preloader.classList.add('preloader--hide');
  document.documentElement.classList.remove('is-preloading');

  preloader.addEventListener(
    'transitionend',
    () => {
      preloader.remove();
    },
    { once: true }
  );

  window.dispatchEvent(new Event('preloader-hidden'));
}

const startedAt = performance.now();
let hidden = false;

function tryHidePreloader() {
  if (hidden) {
    return;
  }

  const elapsed = performance.now() - startedAt;
  if (elapsed < MIN_DURATION_MS) {
    setTimeout(tryHidePreloader, MIN_DURATION_MS - elapsed);
    return;
  }

  hidden = true;
  hidePreloader();
}

Promise.all([
  new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    window.addEventListener('load', resolve, { once: true });
  }),
  document.fonts?.ready ?? Promise.resolve(),
]).then(() => {
  tryHidePreloader();
});

setTimeout(() => {
  if (!hidden) {
    hidden = true;
    hidePreloader();
  }
}, MAX_DURATION_MS);
