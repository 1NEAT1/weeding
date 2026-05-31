import AOS from 'aos';
import 'aos/dist/aos.css';

function initAos() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  AOS.init({
    duration: 700,
    easing: 'ease-out-cubic',
    once: true,
    offset: 80,
    disable: reducedMotion
  });
}

document.addEventListener('DOMContentLoaded', initAos);

window.addEventListener('load', () => {
  AOS.refresh();
});

window.addEventListener('preloader-hidden', () => {
  AOS.refresh();
});

window.addEventListener('guest-personalized', () => {
  AOS.refresh();
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    AOS.refresh();
  }, 150);
});
