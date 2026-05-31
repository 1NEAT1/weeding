import { applyGuestPersonalization } from './guests.js';

document.addEventListener('DOMContentLoaded', () => {
  applyGuestPersonalization();
});

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
  function whenPreloaderHidden(callback) {
    if (!document.getElementById('preloader')) {
      callback();
      return;
    }
    window.addEventListener('preloader-hidden', callback, { once: true });
  }

  function easeInOutSmoothstep(t) {
    const p = Math.max(0, Math.min(1, t));
    return p * p * (3 - 2 * p);
  }

  function clampDrawProgress(scrollY, start, end, maxScroll) {
    const safeEnd = Math.min(end, maxScroll);
    if (safeEnd <= start) {
      const fallbackSpan = Math.max(1, maxScroll - start);
      return Math.max(0, Math.min(1, (scrollY - start) / fallbackSpan));
    }
    const span = Math.max(1, safeEnd - start);
    return Math.max(0, Math.min(1, (scrollY - start) / span));
  }

  const INFO_LINE_TAIL_START_RATIO = 0.88;
  const INFO_LINE_FINISH_SCROLL_RATIO = 0.95;

  /** info__line: плавно в viewport + финиш около 95% прокрутки страницы. */
  function getInfoLineDrawProgress(svg) {
    const rect = svg.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const finishScroll = maxScroll * INFO_LINE_FINISH_SCROLL_RATIO;

    if (rect.top > vh) {
      return 0;
    }

    if (rect.bottom < 0 || scrollY >= finishScroll) {
      return 1;
    }

    const anchorY = rect.top + rect.height * 0.38;
    const startAnchor = vh * 0.96;
    const endAnchor = vh * 0.34;
    const span = Math.max(1, startAnchor - endAnchor);
    const linear = Math.max(0, Math.min(1, (startAnchor - anchorY) / span));
    let progress = easeInOutSmoothstep(linear);

    if (maxScroll > 0) {
      const tailStart = maxScroll * INFO_LINE_TAIL_START_RATIO;
      const tailEnd = Math.max(tailStart + 1, finishScroll);

      if (scrollY >= tailStart) {
        const tailLinear = Math.max(0, Math.min(1, (scrollY - tailStart) / (tailEnd - tailStart)));
        progress = Math.max(progress, easeInOutSmoothstep(tailLinear));
      }
    }

    return Math.min(1, progress);
  }

  /** Горизонтальные timeline__deco в .timeline__lines — быстрее, пока блок в зоне видимости. */
  function isTimelineHeaderDecoLine(svg) {
    return svg.classList.contains('timeline__deco') && !svg.classList.contains('timing-line');
  }

  function getTimelineHeaderDecoDrawProgress(svg) {
    const rect = svg.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const elementTop = rect.top + scrollY;

    const start = elementTop - vh * 0.92;
    const end = elementTop - vh * 0.55;

    if (end <= start + 6) {
      return rect.top < vh * 0.95 && rect.bottom > 0 ? 1 : 0;
    }

    return clampDrawProgress(scrollY, start, end, maxScroll);
  }

  /** Доля отрисовки 0…1: растёт при скролле вниз по мере приближения блока к верху экрана. */
  function getDrawProgress(svg) {
    if (svg.classList.contains('info__line')) {
      return getInfoLineDrawProgress(svg);
    }

    if (isTimelineHeaderDecoLine(svg)) {
      return getTimelineHeaderDecoDrawProgress(svg);
    }

    const rect = svg.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const vh = window.innerHeight;
    const elementTop = rect.top + scrollY;
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );

    const start = elementTop - vh * 1.02;
    const idealEnd = elementTop + vh * 0.08;
    return clampDrawProgress(scrollY, start, idealEnd, maxScroll);
  }

  function setLineStyles(svgElement) {
    const paths = svgElement.querySelectorAll('path, line, polyline');
    paths.forEach(path => {
      const length = path.getTotalLength();
      path.style.setProperty('--line-length', String(length));
      path.dataset.lineLength = String(length);
      path.setAttribute('stroke-dasharray', String(length));
    });
  }

  function applyLineProgress(svg, progress) {
    const paths = svg.querySelectorAll('path, line, polyline');
    const isTimelineDeco = svg.classList.contains('timeline__deco') &&
      !svg.classList.contains('timing-line');
    const isTimingLine = svg.classList.contains('timing-line');
    const isInfoLine = svg.classList.contains('info__line');
    paths.forEach(path => {
      const length = Number(path.dataset.lineLength) || path.getTotalLength();
      const offset = length * (1 - progress);
      path.style.strokeDashoffset = String(offset);
      if (progress <= 0.001) {
        path.style.opacity = '0';
      } else if (isTimelineDeco || isTimingLine) {
        path.style.opacity = '1';
      } else if (isInfoLine) {
        path.style.opacity = String(Math.min(1, easeInOutSmoothstep(progress)));
      } else {
        path.style.opacity = String(Math.min(1, 0.12 + progress * 0.88));
      }
    });
  }

  function isHeroIntroLine(svg) {
    return (
      svg.classList.contains('hero__deco--left') &&
      svg.classList.contains('draw-line') &&
      (svg.classList.contains('desktop') ||
        svg.classList.contains('tablet') ||
        svg.classList.contains('mobile') ||
        svg.classList.contains('mini'))
    );
  }

  /** desktop ≥1200, tablet 768–1199, mobile 450–767, mini ≤449 */
  function getActiveHeroIntroSvg() {
    const desktop = document.querySelector('.hero__deco--left.draw-line.desktop');
    const tablet = document.querySelector('.hero__deco--left.draw-line.tablet');
    const mobile = document.querySelector('.hero__deco--left.draw-line.mobile');
    const mini = document.querySelector('.hero__deco--left.draw-line.mini');
    if (window.matchMedia('(min-width: 1200px)').matches) {
      return desktop;
    }
    if (window.matchMedia('(min-width: 768px)').matches) {
      return tablet;
    }
    if (window.matchMedia('(min-width: 450px)').matches) {
      return mobile;
    }
    return mini;
  }

  const HERO_STROKE_MS = 1000;
  const HERO_DELAY_MS = 200;
  const HERO_OPACITY_MS = 380;
  /**
   * После выравнивания по bbox ещё уменьшаем right (линия вправо).
   * Подобрано: вручную ~570px выглядело верно при завышенном авто-значении.
   */
  const HERO_LINE_RIGHT_VISUAL_TRIM_PX = { tablet: 180, desktop: 56, mobile: 120, mini: 75 };

  /** Начало path timeline-deco desktop (viewBox 1165×194) */
  const TIMELINE_DECO_VB = { w: 1165, h: 194 };
  const TIMELINE_DECO_PATH_START_NX = 0.594238 / TIMELINE_DECO_VB.w;
  const TIMELINE_DECO_PATH_START_NY = 48.9146 / TIMELINE_DECO_VB.h;
  const TIMELINE_DECO_ANCHOR_TRIM_PX = 10;

  /** Начало path timeline-deco tablet (viewBox 179×93) */
  const TIMELINE_TABLET_DECO_VB = { w: 179, h: 93 };
  const TIMELINE_TABLET_DECO_PATH_START_NX = 0.387207 / TIMELINE_TABLET_DECO_VB.w;
  const TIMELINE_TABLET_DECO_PATH_START_NY = 0.248291 / TIMELINE_TABLET_DECO_VB.h;
  const TIMELINE_TABLET_DECO_ANCHOR_TRIM_PX = 4;

  /** Начало path timeline-deco mobile (viewBox 287×110) */
  const TIMELINE_MOBILE_DECO_VB = { w: 287, h: 110 };
  const TIMELINE_MOBILE_DECO_PATH_START_NX = 0.394287 / TIMELINE_MOBILE_DECO_VB.w;
  const TIMELINE_MOBILE_DECO_PATH_START_NY = 0.307373 / TIMELINE_MOBILE_DECO_VB.h;
  const TIMELINE_MOBILE_DECO_ANCHOR_TRIM_PX = 4;

  /** Начало path timeline-deco mini (viewBox 550×265) */
  const TIMELINE_MINI_DECO_VB = { w: 550, h: 265 };
  const TIMELINE_MINI_DECO_PATH_START_NX = 0.620605 / TIMELINE_MINI_DECO_VB.w;
  const TIMELINE_MINI_DECO_PATH_START_NY = 0.483643 / TIMELINE_MINI_DECO_VB.h;
  const TIMELINE_MINI_DECO_ANCHOR_TRIM_PX = 4;

  let heroIntroCleanup = null;
  let heroIntroCompletedSvg = null;
  let heroIntroPlayingSvg = null;
  let lastHeroLineRightPx = null;
  let heroDecoPositionLocked = false;
  let heroDecoLockWidth = null;
  let heroDecoPositionSettled = false;
  let lastLayoutSyncWidth = window.innerWidth;

  function resetHeroLinePositionCache() {
    lastHeroLineRightPx = null;
  }

  function resetHeroDecoLock() {
    heroDecoPositionLocked = false;
    heroDecoLockWidth = null;
  }

  function applyHeroDecoLock() {
    heroDecoPositionLocked = true;
    heroDecoLockWidth = window.innerWidth;
  }

  function cancelHeroIntro() {
    if (typeof heroIntroCleanup === 'function') {
      heroIntroCleanup();
      heroIntroCleanup = null;
    }
    heroIntroPlayingSvg = null;
  }

  function ensureHeroLineDrawn(svg) {
    if (!svg || !isHeroIntroLine(svg)) {
      return;
    }
    cancelHeroIntro();
    setLineStyles(svg);
    svg.querySelectorAll('path, line, polyline').forEach(path => {
      const len = Number(path.dataset.lineLength) || path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = '0';
      path.style.opacity = '1';
    });
    heroIntroCompletedSvg = svg;
  }

  function finishHeroIntro(svg) {
    heroIntroCompletedSvg = svg;
    heroIntroPlayingSvg = null;
    heroIntroCleanup = null;
  }

  /** Ручная отрисовка: CSS/WAAPI по stroke-dashoffset на SVG часто не работают. */
  function playHeroIntro(svg) {
    if (!svg || !isHeroIntroLine(svg)) {
      return;
    }
    cancelHeroIntro();
    heroIntroPlayingSvg = svg;
    svg.classList.remove('draw-line--visible');

    setLineStyles(svg);
    void svg.getBoundingClientRect();

    function collectPaths() {
      return Array.from(svg.querySelectorAll('path, line, polyline'))
        .map(path => ({
          path,
          len: Number(path.dataset.lineLength) || path.getTotalLength()
        }))
        .filter(({ len }) => len > 0);
    }

    let paths = collectPaths();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function applyStartState() {
      paths.forEach(({ path, len }) => {
        path.style.transition = 'none';
        if (path.getAnimations) {
          path.getAnimations().forEach(a => a.cancel());
        }
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
        path.style.opacity = '0';
      });
    }

    function startRafAnimation() {
      if (!paths.length) {
        return;
      }
      if (reducedMotion) {
        paths.forEach(({ path }) => {
          path.style.strokeDashoffset = '0';
          path.style.opacity = '1';
        });
        finishHeroIntro(svg);
        return;
      }

      const t0 = performance.now() + HERO_DELAY_MS;
      let rafId = 0;

      function easeOutCubic(t) {
        return 1 - (1 - t) ** 3;
      }

      function tick(now) {
        const elapsed = now - t0;
        const tStroke = Math.min(1, Math.max(0, elapsed / HERO_STROKE_MS));
        const e = easeOutCubic(tStroke);
        paths.forEach(({ path, len }) => {
          path.style.strokeDashoffset = String(len * (1 - e));
        });
        const tOp = Math.min(1, Math.max(0, elapsed) / HERO_OPACITY_MS);
        const op = elapsed <= 0 ? 0 : Math.min(1, 0.12 + tOp * 0.88);
        paths.forEach(({ path }) => {
          path.style.opacity = String(op);
        });
        if (tStroke < 1 || tOp < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          paths.forEach(({ path }) => {
            path.style.strokeDashoffset = '0';
            path.style.opacity = '1';
          });
          finishHeroIntro(svg);
        }
      }

      rafId = requestAnimationFrame(tick);
      heroIntroCleanup = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };
    }

    if (!paths.length) {
      requestAnimationFrame(() => {
        setLineStyles(svg);
        void svg.getBoundingClientRect();
        paths = collectPaths();
        if (!paths.length) {
          window.addEventListener(
            'load',
            () => {
              setLineStyles(svg);
              paths = collectPaths();
              if (!paths.length) {
                return;
              }
              applyStartState();
              startRafAnimation();
            },
            { once: true }
          );
          return;
        }
        applyStartState();
        startRafAnimation();
      });
      return;
    }

    applyStartState();
    startRafAnimation();
  }

  /**
   * Правый край SVG к центру первой фото.
   * База: hero.right − targetCx, затем итерации по bbox (конец path обычно левее правого края бокса).
   */
  function syncHeroDecoToFirstPhoto(options = {}) {
    const { force = false } = options;
    const hero = document.querySelector('.hero');
    const photo = document.querySelector('.timeline__photos .timeline__photo');
    const layoutWidth = window.innerWidth;
    const widthChanged = heroDecoLockWidth !== null &&
      Math.abs(layoutWidth - heroDecoLockWidth) > 8;

    if (!hero || !photo) {
      return;
    }

    if (heroDecoPositionSettled && heroDecoPositionLocked && !widthChanged) {
      return;
    }

    if (widthChanged) {
      resetHeroDecoLock();
      resetHeroLinePositionCache();
    }

    function measure() {
      const hr = hero.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      if (pr.width < 1 || hr.width < 1) {
        return null;
      }
      const targetCx = pr.left + pr.width / 2;
      const rightPx = Math.max(0, hr.right - targetCx);
      return { targetCx, rightPx };
    }

    function commit(px) {
      const rounded = Math.round(px * 100) / 100;
      if (!force && lastHeroLineRightPx !== null && Math.abs(lastHeroLineRightPx - rounded) < 2) {
        return;
      }
      lastHeroLineRightPx = rounded;
      hero.style.setProperty('--hero-line-right-in-hero', `${rounded}px`);
    }

    /** Сдвиг декора вправо = уменьшить CSS right. */
    function refineRightToTarget(targetCx, active, startRightPx, stepCap, steps) {
      let rp = startRightPx;
      for (let i = 0; i < steps; i += 1) {
        commit(rp);
        if (!active || !active.getClientRects().length) {
          break;
        }
        const br = active.getBoundingClientRect().right;
        const delta = targetCx - br;
        if (Math.abs(delta) < 0.8) {
          break;
        }
        const step = Math.max(-stepCap, Math.min(stepCap, delta));
        rp = Math.max(0, rp - step);
      }
      return rp;
    }

    const first = measure();
    if (!first) {
      return;
    }
    commit(first.rightPx);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const m = measure();
        if (!m) {
          return;
        }
        const active = getActiveHeroIntroSvg();
        if (!active) {
          commit(m.rightPx);
          if (heroDecoPositionSettled) {
            applyHeroDecoLock();
          }
          return;
        }
        const tablet = Boolean(active.classList.contains('tablet'));
        const mobile = Boolean(active.classList.contains('mobile'));
        const mini = Boolean(active.classList.contains('mini'));

        let stepCap = 72;
        let steps = 6;
        let trim = HERO_LINE_RIGHT_VISUAL_TRIM_PX.desktop;
        if (tablet) {
          stepCap = 96;
          steps = 8;
          trim = HERO_LINE_RIGHT_VISUAL_TRIM_PX.tablet;
        } else if (mobile) {
          stepCap = 88;
          steps = 8;
          trim = HERO_LINE_RIGHT_VISUAL_TRIM_PX.mobile;
        } else if (mini) {
          stepCap = 64;
          steps = 7;
          trim = HERO_LINE_RIGHT_VISUAL_TRIM_PX.mini;
        }

        let rp = refineRightToTarget(m.targetCx, active, m.rightPx, stepCap, steps);
        rp = Math.max(0, rp - trim);
        commit(rp);
        if (heroDecoPositionSettled) {
          applyHeroDecoLock();
        }
      });
    });
  }

  function isTimelineDecoDesktopVisible(deco) {
    return Boolean(
      deco &&
      deco.classList.contains('timeline__deco--desktop') &&
      window.matchMedia('(min-width: 1200px)').matches
    );
  }

  function isTimelineDecoTabletVisible(deco) {
    return Boolean(
      deco &&
      deco.classList.contains('timeline__deco--tablet') &&
      window.matchMedia('(min-width: 768px) and (max-width: 1199px)').matches
    );
  }

  function isTimelineDecoMobileVisible(deco) {
    return Boolean(
      deco &&
      deco.classList.contains('timeline__deco--mobile') &&
      window.matchMedia('(min-width: 576px) and (max-width: 768px)').matches
    );
  }

  function isTimelineDecoMiniVisible(deco) {
    return Boolean(
      deco &&
      deco.classList.contains('timeline__deco--mini') &&
      window.matchMedia('(max-width: 575px)').matches
    );
  }

  function applyTimelineDecoPosition({
    timeline,
    deco,
    photo,
    vb,
    pathStartNx,
    pathStartNy,
    anchorTrimPx,
    cssPrefix,
    maxWidthRatio = null
  }) {
    function measureAndApply() {
      const tr = timeline.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      if (pr.width < 1 || tr.width < 1) {
        return;
      }

      const anchorCx = pr.left + pr.width / 2;
      const anchorCy = pr.bottom;
      const anchorCxInTimeline = anchorCx - tr.left;
      const r = pathStartNx;

      let leftPx = (anchorCxInTimeline - tr.width * r) / (1 - r);
      leftPx = Math.max(0, leftPx + anchorTrimPx);
      let widthPx = Math.max(80, tr.width - leftPx);
      if (maxWidthRatio != null) {
        widthPx = Math.min(widthPx, tr.width * maxWidthRatio);
      }

      const aspect = vb.h / vb.w;
      let topPx = anchorCy - tr.top - widthPx * aspect * pathStartNy;

      timeline.style.setProperty(`--${cssPrefix}-left`, `${Math.round(leftPx * 100) / 100}px`);
      timeline.style.setProperty(`--${cssPrefix}-width`, `${Math.round(widthPx * 100) / 100}px`);
      timeline.style.setProperty(`--${cssPrefix}-top`, `${Math.round(topPx * 100) / 100}px`);

      void deco.offsetWidth;
      const path = deco.querySelector('path');
      if (path && path.getTotalLength() > 0) {
        const pt = path.getPointAtLength(0);
        const p = deco.createSVGPoint();
        p.x = pt.x;
        p.y = pt.y;
        const ctm = path.getScreenCTM();
        if (ctm) {
          const sp = p.matrixTransform(ctm);
          const gapX = anchorCx - sp.x;
          const gapY = anchorCy - sp.y;
          if (Math.abs(gapX) > 0.5) {
            leftPx = Math.max(0, leftPx + Math.max(-48, Math.min(48, gapX)));
            widthPx = Math.max(80, tr.width - leftPx);
            timeline.style.setProperty(`--${cssPrefix}-left`, `${Math.round(leftPx * 100) / 100}px`);
            timeline.style.setProperty(`--${cssPrefix}-width`, `${Math.round(widthPx * 100) / 100}px`);
          }
          if (Math.abs(gapY) > 0.5) {
            const h = widthPx * aspect;
            topPx = anchorCy - tr.top - h * pathStartNy +
              Math.max(-32, Math.min(32, gapY));
            timeline.style.setProperty(`--${cssPrefix}-top`, `${Math.round(topPx * 100) / 100}px`);
          }
        }
      }
    }

    measureAndApply();
    requestAnimationFrame(() => {
      requestAnimationFrame(measureAndApply);
    });
  }

  /**
   * Desktop-линия таймлайна: старт по центру 4-й фото (нижний правый угол сетки),
   * ширина до правого края .timeline.
   */
  function syncTimelineDecoToFourthPhoto() {
    const timeline = document.querySelector('.timeline');
    const photos = document.querySelectorAll('.timeline__photos .timeline__photo');
    const deco = document.querySelector('.timeline__deco.timeline__deco--desktop.draw-line');
    const photo = photos[3] || photos[photos.length - 1];
    if (!timeline || !photo || !deco || !isTimelineDecoDesktopVisible(deco)) {
      return;
    }

    applyTimelineDecoPosition({
      timeline,
      deco,
      photo,
      vb: TIMELINE_DECO_VB,
      pathStartNx: TIMELINE_DECO_PATH_START_NX,
      pathStartNy: TIMELINE_DECO_PATH_START_NY,
      anchorTrimPx: TIMELINE_DECO_ANCHOR_TRIM_PX,
      cssPrefix: 'timeline-deco'
    });
  }

  /** Tablet-линия: привязка начала path к 4-й фото. */
  function syncTimelineDecoTabletToFourthPhoto() {
    const timeline = document.querySelector('.timeline');
    const photos = document.querySelectorAll('.timeline__photos .timeline__photo');
    const deco = document.querySelector('.timeline__deco.timeline__deco--tablet.draw-line');
    const photo = photos[3] || photos[photos.length - 1];
    if (!timeline || !photo || !deco || !isTimelineDecoTabletVisible(deco)) {
      return;
    }

    applyTimelineDecoPosition({
      timeline,
      deco,
      photo,
      vb: TIMELINE_TABLET_DECO_VB,
      pathStartNx: TIMELINE_TABLET_DECO_PATH_START_NX,
      pathStartNy: TIMELINE_TABLET_DECO_PATH_START_NY,
      anchorTrimPx: TIMELINE_TABLET_DECO_ANCHOR_TRIM_PX,
      cssPrefix: 'timeline-deco-tablet',
      maxWidthRatio: 0.44
    });
  }

  /** Mobile-линия: привязка начала path к 4-й фото. */
  function syncTimelineDecoMobileToFourthPhoto() {
    const timeline = document.querySelector('.timeline');
    const photos = document.querySelectorAll('.timeline__photos .timeline__photo');
    const deco = document.querySelector('.timeline__deco.timeline__deco--mobile.draw-line');
    const photo = photos[3] || photos[photos.length - 1];
    if (!timeline || !photo || !deco || !isTimelineDecoMobileVisible(deco)) {
      return;
    }

    applyTimelineDecoPosition({
      timeline,
      deco,
      photo,
      vb: TIMELINE_MOBILE_DECO_VB,
      pathStartNx: TIMELINE_MOBILE_DECO_PATH_START_NX,
      pathStartNy: TIMELINE_MOBILE_DECO_PATH_START_NY,
      anchorTrimPx: TIMELINE_MOBILE_DECO_ANCHOR_TRIM_PX,
      cssPrefix: 'timeline-deco-mobile',
      maxWidthRatio: 0.52
    });
  }

  /** Mini-линия: привязка начала path к 4-й фото. */
  function syncTimelineDecoMiniToFourthPhoto() {
    const timeline = document.querySelector('.timeline');
    const photos = document.querySelectorAll('.timeline__photos .timeline__photo');
    const deco = document.querySelector('.timeline__deco.timeline__deco--mini.draw-line');
    const photo = photos[3] || photos[photos.length - 1];
    if (!timeline || !photo || !deco || !isTimelineDecoMiniVisible(deco)) {
      return;
    }

    applyTimelineDecoPosition({
      timeline,
      deco,
      photo,
      vb: TIMELINE_MINI_DECO_VB,
      pathStartNx: TIMELINE_MINI_DECO_PATH_START_NX,
      pathStartNy: TIMELINE_MINI_DECO_PATH_START_NY,
      anchorTrimPx: TIMELINE_MINI_DECO_ANCHOR_TRIM_PX,
      cssPrefix: 'timeline-deco-mini',
      maxWidthRatio: 0.56
    });
  }

  function syncTimelineDecoLines() {
    syncTimelineDecoToFourthPhoto();
    syncTimelineDecoTabletToFourthPhoto();
    syncTimelineDecoMobileToFourthPhoto();
    syncTimelineDecoMiniToFourthPhoto();
  }

  const MOBILE_FIRST_SCREEN_MQ = '(max-width: 576px)';
  const MOBILE_FIRST_SCREEN_MIN_PHOTO = 92;
  const MOBILE_FIRST_SCREEN_SAFE_INSET = 23;
  let lastMobileLayoutState = null;
  let mobileFirstScreenLocked = false;
  let mobileFirstScreenLockWidth = null;
  let mobileFirstScreenLockVh = null;
  let mobileFirstScreenSettled = false;
  let layoutGeometryRaf = 0;
  let pendingLayoutGeometry = { mobile: false, deco: false, heroDeco: false };

  function scheduleLayoutGeometrySync(flags = {}) {
    pendingLayoutGeometry.mobile = pendingLayoutGeometry.mobile || Boolean(flags.mobile);
    pendingLayoutGeometry.deco = pendingLayoutGeometry.deco || Boolean(flags.deco);
    pendingLayoutGeometry.heroDeco = pendingLayoutGeometry.heroDeco || Boolean(flags.heroDeco);

    if (layoutGeometryRaf) {
      return;
    }

    layoutGeometryRaf = requestAnimationFrame(() => {
      layoutGeometryRaf = 0;
      const snapshot = pendingLayoutGeometry;
      pendingLayoutGeometry = { mobile: false, deco: false, heroDeco: false };

      if (snapshot.mobile) {
        syncMobileFirstScreenLayout();
      }
      if (snapshot.deco) {
        syncTimelineDecoLines();
      }
      if (snapshot.heroDeco) {
        syncHeroDecoToFirstPhoto({ force: false });
      }
    });
  }

  function applyMobileFirstScreenLock(layoutWidth) {
    mobileFirstScreenLocked = true;
    mobileFirstScreenLockWidth = layoutWidth;
    mobileFirstScreenLockVh = window.innerHeight;
  }

  function resetMobileFirstScreenLock() {
    mobileFirstScreenLocked = false;
    mobileFirstScreenLockWidth = null;
    mobileFirstScreenLockVh = null;
  }

  /** ≤576px: размер фото и padding hero под высоту экрана, чтобы сетка была на первом экране. */
  function syncMobileFirstScreenLayout() {
    const root = document.documentElement;
    const hero = document.querySelector('.hero');
    const container = hero && hero.querySelector('.container');
    const isMobile = window.matchMedia(MOBILE_FIRST_SCREEN_MQ).matches;
    const layoutWidth = window.innerWidth;

    if (!isMobile || !hero || !container) {
      if (lastMobileLayoutState === null) {
        return;
      }
      lastMobileLayoutState = null;
      resetMobileFirstScreenLock();
      resetHeroDecoLock();
      root.classList.remove('is-compact-first-screen');
      root.style.removeProperty('--mobile-first-screen-photo-size');
      root.style.removeProperty('--mobile-above-seam');
      hero.style.removeProperty('padding-bottom');
      return;
    }

    const widthChanged = mobileFirstScreenLockWidth !== null &&
      Math.abs(layoutWidth - mobileFirstScreenLockWidth) > 8;

    if (mobileFirstScreenSettled && mobileFirstScreenLocked && !widthChanged) {
      return;
    }

    if (widthChanged) {
      resetMobileFirstScreenLock();
    }

    const styles = getComputedStyle(root);
    const gap = parseFloat(styles.getPropertyValue('--timeline-photo-gap')) || 10;
    const pad = parseFloat(styles.getPropertyValue('--timeline-photos-padding')) || 12;
    const vh = mobileFirstScreenLockVh ?? window.innerHeight;
    const maxPhoto = Math.min(layoutWidth * 0.42, 200);
    const safeBottom = vh - MOBILE_FIRST_SCREEN_SAFE_INSET;

    function measurePhotoSize() {
      const heroRect = hero.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const aboveSeam = containerRect.bottom - heroRect.top;
      const photoSize = (safeBottom - aboveSeam - 2 * pad - gap) / 2;
      return { aboveSeam, photoSize };
    }

    root.classList.remove('is-compact-first-screen');
    let { aboveSeam, photoSize } = measurePhotoSize();
    const needsCompact = photoSize < MOBILE_FIRST_SCREEN_MIN_PHOTO;

    if (needsCompact) {
      root.classList.add('is-compact-first-screen');
      ({ aboveSeam, photoSize } = measurePhotoSize());
    }

    photoSize = Math.max(
      MOBILE_FIRST_SCREEN_MIN_PHOTO,
      Math.min(maxPhoto, photoSize)
    );

    const stackOffset = photoSize + pad + gap / 2;
    const roundedPhoto = Math.round(photoSize * 100) / 100;
    const roundedStack = Math.round(stackOffset * 100) / 100;
    const nextState = `${roundedPhoto}|${roundedStack}|${needsCompact ? 1 : 0}|${Math.round(layoutWidth)}`;

    if (lastMobileLayoutState === nextState) {
      if (lastMobileLayoutState) {
        const prevCompact = lastMobileLayoutState.split('|')[2] === '1';
        root.classList.toggle('is-compact-first-screen', prevCompact);
      }
      if (mobileFirstScreenSettled) {
        applyMobileFirstScreenLock(layoutWidth);
      }
      return;
    }

    lastMobileLayoutState = nextState;
    root.classList.toggle('is-compact-first-screen', needsCompact);
    root.style.setProperty('--mobile-first-screen-photo-size', `${roundedPhoto}px`);
    root.style.setProperty('--mobile-above-seam', `${Math.round(aboveSeam)}px`);
    hero.style.setProperty('padding-bottom', `${roundedStack}px`);
    if (mobileFirstScreenSettled) {
      applyMobileFirstScreenLock(layoutWidth);
    }
  }

  function initDrawLines() {
    const lines = document.querySelectorAll('.draw-line');
    if (!lines.length) {
      return;
    }

    const scrollLines = Array.from(lines).filter(svg => !isHeroIntroLine(svg));

    let rafId = 0;

    function updateDrawLines() {
      scrollLines.forEach(svg => {
        applyLineProgress(svg, getDrawProgress(svg));
      });
    }

    function scheduleUpdate() {
      if (rafId) {
        return;
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateDrawLines();
      });
    }

    lines.forEach(svg => {
      setLineStyles(svg);
      if (isHeroIntroLine(svg)) {
        svg.querySelectorAll('path, line, polyline').forEach(path => {
          path.style.removeProperty('stroke-dasharray');
          path.style.removeProperty('stroke-dashoffset');
          path.style.removeProperty('opacity');
        });
      } else {
        applyLineProgress(svg, getDrawProgress(svg));
      }
    });

    whenPreloaderHidden(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncMobileFirstScreenLayout();
          mobileFirstScreenSettled = true;
          heroDecoPositionSettled = true;
          syncMobileFirstScreenLayout();
          resetHeroLinePositionCache();
          syncHeroDecoToFirstPhoto({ force: true });
          syncTimelineDecoLines();
          const activeHero = getActiveHeroIntroSvg();
          if (activeHero) {
            playHeroIntro(activeHero);
          } else {
            cancelHeroIntro();
          }
        });
      });
    });

    window.addEventListener('scroll', scheduleUpdate, { passive: true });

    function handleLayoutResize() {
      const layoutWidth = window.innerWidth;
      const widthChanged = Math.abs(layoutWidth - lastLayoutSyncWidth) > 8;
      lastLayoutSyncWidth = layoutWidth;

      const isMobileFirstScreen = layoutWidth <= 576;
      if (widthChanged || (isMobileFirstScreen && mobileFirstScreenSettled && !mobileFirstScreenLocked)) {
        syncMobileFirstScreenLayout();
      }
      syncTimelineDecoLines();
      scrollLines.forEach(setLineStyles);
      updateDrawLines();

      if (!widthChanged) {
        return;
      }

      syncHeroDecoToFirstPhoto({ force: true });

      const activeHero = getActiveHeroIntroSvg();
      if (!activeHero) {
        cancelHeroIntro();
        heroIntroCompletedSvg = null;
        return;
      }
      if (activeHero === heroIntroCompletedSvg) {
        ensureHeroLineDrawn(activeHero);
        return;
      }
      if (activeHero === heroIntroPlayingSvg) {
        return;
      }
      playHeroIntro(activeHero);
    }

    let layoutResizeTimer = 0;
    function scheduleLayoutResize() {
      clearTimeout(layoutResizeTimer);
      layoutResizeTimer = setTimeout(handleLayoutResize, 220);
    }

    window.addEventListener('resize', scheduleLayoutResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function bootDrawLines() {
      syncMobileFirstScreenLayout();
      syncHeroDecoToFirstPhoto({ force: true });
      syncTimelineDecoLines();
      initDrawLines();
    });
  } else {
    syncMobileFirstScreenLayout();
    syncHeroDecoToFirstPhoto({ force: true });
    syncTimelineDecoLines();
    initDrawLines();
  }

  window.addEventListener('load', () => {
    syncMobileFirstScreenLayout();
    syncHeroDecoToFirstPhoto({ force: true });
    syncTimelineDecoLines();
  });

  const timelinePhotos = document.querySelector('.timeline__photos');
  if (timelinePhotos && typeof ResizeObserver !== 'undefined') {
    const timelineDecoRo = new ResizeObserver(() => {
      scheduleLayoutGeometrySync({ deco: true, heroDeco: true });
    });
    timelineDecoRo.observe(timelinePhotos);
  }

  const heroContainer = document.querySelector('.hero .container');
  if (heroContainer && typeof ResizeObserver !== 'undefined') {
    const heroLayoutRo = new ResizeObserver(() => {
      scheduleLayoutGeometrySync({ mobile: true, deco: true, heroDeco: true });
    });
    heroLayoutRo.observe(heroContainer);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      scheduleLayoutGeometrySync({ mobile: true, deco: true, heroDeco: true });
    });
  }
})();

(function() {
  const GUEST_FORM_ERRORS = {
    name: 'Укажите имя и фамилию',
    drink: 'Выберите хотя бы один напиток'
  };
  const GUEST_ATTENDANCE_LABELS = {
    yes: 'Да, с удовольствием приду!',
    no: 'К сожалению, не смогу присутствовать.'
  };
  const GUEST_EMAILJS = {
    url: 'https://api.emailjs.com/api/v1.0/email/send',
    serviceId: 'service_rpck6di',
    templateId: 'template_5cq5dt9',
    userId: 'c_j2eBbmCMU-jywNX'
  };
  const GUEST_SEND_SUCCESS = 'Спасибо! Анкета отправлена.';
  const GUEST_SEND_ERROR = 'Не удалось отправить анкету. Попробуйте позже.';
  const GUEST_ALREADY_SENT = 'Вы уже отправили форму';
  const GUEST_SUBMIT_COOKIE = 'guest_form_sent';
  const GUEST_SUBMIT_COOKIE_MAX_AGE_SEC = 600;
  const GUEST_ALERT_HIDE_MS = 5000;
  const GUEST_ALERT_TRANSITION_MS = 350;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('guest-form');
    if (!form) {
      return;
    }

    const nameInput = form.querySelector('#guest-name');
    const allergyInput = form.querySelector('#guest-allergy');
    const drinkInputs = form.querySelectorAll('input[name="drink"]');
    const drinkFieldset = form.querySelector('[data-field="drink"]');
    const submitBtn = form.querySelector('.guest__button');
    const alertEl = document.getElementById('guest-form-alert');
    let alertHideTimer = null;

    function getCookie(name) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : '';
    }

    function isGuestSubmitBlocked() {
      return getCookie(GUEST_SUBMIT_COOKIE) === '1';
    }

    function setGuestSubmitCookie() {
      document.cookie = `${GUEST_SUBMIT_COOKIE}=1; max-age=${GUEST_SUBMIT_COOKIE_MAX_AGE_SEC}; path=/; SameSite=Lax`;
    }

    function clearAlertHideTimer() {
      if (alertHideTimer) {
        clearTimeout(alertHideTimer);
        alertHideTimer = null;
      }
    }

    function hideGuestAlert(immediate = false) {
      if (!alertEl) {
        return;
      }
      clearAlertHideTimer();

      const finishHide = () => {
        alertEl.classList.remove('is-visible', 'guest__alert--success');
        alertEl.hidden = true;
        alertEl.replaceChildren();
      };

      if (immediate || !alertEl.classList.contains('is-visible')) {
        finishHide();
        return;
      }

      alertEl.classList.remove('is-visible');
      alertHideTimer = setTimeout(() => {
        alertHideTimer = null;
        finishHide();
      }, GUEST_ALERT_TRANSITION_MS);
    }

    function showGuestAlert(messages, variant = 'error') {
      if (!alertEl || !messages.length) {
        return;
      }
      clearAlertHideTimer();

      alertEl.classList.toggle('guest__alert--success', variant === 'success');
      alertEl.replaceChildren();

      if (variant === 'success' || variant === 'info') {
        const messageEl = document.createElement('p');
        messageEl.className = 'guest__alert-message';
        messageEl.textContent = messages[0];
        alertEl.appendChild(messageEl);
      } else {
        const list = document.createElement('ul');
        list.className = 'guest__alert-list';
        messages.forEach(message => {
          const item = document.createElement('li');
          item.className = 'guest__alert-item';
          item.textContent = message;
          list.appendChild(item);
        });
        alertEl.appendChild(list);
      }

      alertEl.hidden = false;
      requestAnimationFrame(() => {
        alertEl.classList.add('is-visible');
      });

      alertHideTimer = setTimeout(() => {
        hideGuestAlert();
      }, GUEST_ALERT_HIDE_MS);
    }

    function setSubmitLoading(isLoading) {
      if (!submitBtn) {
        return;
      }
      submitBtn.classList.toggle('is-loading', isLoading);
      submitBtn.disabled = isLoading;
      submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }

    function clearFieldErrors() {
      nameInput.classList.remove('is-invalid');
      drinkFieldset.classList.remove('is-invalid');
      hideGuestAlert();
    }

    function validateGuestForm() {
      const errors = [];
      const name = nameInput.value.trim();

      if (!name) {
        nameInput.classList.add('is-invalid');
        errors.push(GUEST_FORM_ERRORS.name);
      }

      const hasDrink = Array.from(drinkInputs).some(input => input.checked);
      if (!hasDrink) {
        drinkFieldset.classList.add('is-invalid');
        errors.push(GUEST_FORM_ERRORS.drink);
      }

      if (errors.length) {
        showGuestAlert(errors, 'error');
        return false;
      }

      return true;
    }

    function getSelectedAttendanceLabel() {
      const selected = form.querySelector('input[name="attendance"]:checked');
      if (!selected) {
        return '';
      }
      return GUEST_ATTENDANCE_LABELS[selected.value] || selected.value;
    }

    function getSelectedDrinksLabel() {
      return Array.from(drinkInputs)
        .filter(input => input.checked)
        .map(input => {
          const textEl = input.closest('.checkbox-item')?.querySelector('.checkbox-text');
          return textEl?.textContent?.trim() || input.value;
        })
        .join(', ');
    }

    function collectGuestFormPayload() {
      return {
        name: nameInput.value.trim(),
        answer: getSelectedAttendanceLabel(),
        drinks: getSelectedDrinksLabel(),
        allergy: allergyInput?.value.trim() || ''
      };
    }

    async function sendGuestFormViaEmailJs(templateParams) {
      const response = await fetch(GUEST_EMAILJS.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: GUEST_EMAILJS.serviceId,
          template_id: GUEST_EMAILJS.templateId,
          user_id: GUEST_EMAILJS.userId,
          template_params: templateParams
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `EmailJS error: ${response.status}`);
      }
    }

    function resetGuestFormAfterSuccess() {
      form.reset();
      const yesRadio = form.querySelector('#guest-attendance-yes');
      if (yesRadio) {
        yesRadio.checked = true;
      }
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      hideGuestAlert(true);

      if (isGuestSubmitBlocked()) {
        showGuestAlert([GUEST_ALREADY_SENT], 'info');
        return;
      }

      if (!validateGuestForm()) {
        if (!nameInput.value.trim()) {
          nameInput.focus({ preventScroll: false });
        } else {
          drinkInputs[0].focus({ preventScroll: false });
        }
        return;
      }

      setSubmitLoading(true);

      try {
        await sendGuestFormViaEmailJs(collectGuestFormPayload());
        setGuestSubmitCookie();
        showGuestAlert([GUEST_SEND_SUCCESS], 'success');
        resetGuestFormAfterSuccess();
      } catch {
        showGuestAlert([GUEST_SEND_ERROR], 'error');
      } finally {
        setSubmitLoading(false);
      }
    });

    function tryHideValidationAlert() {
      const nameOk = Boolean(nameInput.value.trim());
      const drinkOk = Array.from(drinkInputs).some(item => item.checked);
      if (nameOk) {
        nameInput.classList.remove('is-invalid');
      }
      if (drinkOk) {
        drinkFieldset.classList.remove('is-invalid');
      }
      if (nameOk && drinkOk) {
        hideGuestAlert();
      }
    }

    nameInput.addEventListener('input', () => {
      hideGuestAlert(true);
      tryHideValidationAlert();
    });

    drinkInputs.forEach(input => {
      input.addEventListener('change', () => {
        hideGuestAlert(true);
        tryHideValidationAlert();
      });
    });
  });
})();