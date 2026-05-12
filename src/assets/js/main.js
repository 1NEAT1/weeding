(function() {
  document.addEventListener('DOMContentLoaded', function() {

    const WEDDING_DATE = new Date(2026, 8, 11, 13, 30, 0);

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
      console.error('Элементы таймера не найдены');
      return;
    }

    function updateCountdown() {
      const now = new Date();
      const diff = WEDDING_DATE - now;

      if (diff <= 0) {
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minutesEl.textContent = '00';
        secondsEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minutesEl.textContent = String(minutes).padStart(2, '0');
      secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  });
})();

(function() {
  function setLineStyles(svgElement) {
    const paths = svgElement.querySelectorAll('path, line, polyline');
    paths.forEach(path => {
      const length = path.getTotalLength();

      path.style.setProperty('--line-length', length);
      path.setAttribute('stroke-dasharray', length);
      path.setAttribute('stroke-dashoffset', length);
    });
  }

  const lines = document.querySelectorAll('.draw-line');
  lines.forEach(setLineStyles);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      entry.target.classList.toggle('visible', entry.isIntersecting);
    });
  }, {
    threshold: 0.4
  });

  lines.forEach(svg => observer.observe(svg));

  window.addEventListener('resize', () => {
    lines.forEach(setLineStyles);
  });
})();