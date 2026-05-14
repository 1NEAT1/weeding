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
  /** Доля отрисовки 0…1: растёт при скролле вниз по мере приближения блока к верху экрана. */
  function getDrawProgress(svg) {
    const rect = svg.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const vh = window.innerHeight;
    const elementTop = rect.top + scrollY;
    // Окно скролла: p=1 чуть раньше, чтобы линия успевала дорисоваться до «уезда» вниз
    const start = elementTop - vh * 1.02;
    const idealEnd = elementTop + vh * 0.08;
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    // У хвоста страницы idealEnd недостижим — сжимаем до maxScroll, чтобы внизу p доходила до 1
    const end = Math.min(idealEnd, maxScroll);
    if (end <= start) {
      return maxScroll <= 0 ? 1 : Math.min(1, scrollY / maxScroll);
    }
    const span = Math.max(1, end - start);
    return Math.max(0, Math.min(1, (scrollY - start) / span));
  }

  function isDrawLineLayoutVisible(svg) {
    return Boolean(svg && svg.getClientRects().length > 0);
  }

  /** После «открытия» этапа: 0 сразу после гейта, 1 когда raw дошёл до 1. */
  function remapProgressAfterGate(raw, anchor) {
    const span = 1 - anchor;
    if (span <= 1e-5) {
      return raw >= 1 - 1e-5 ? 1 : 0;
    }
    return Math.max(0, Math.min(1, (raw - anchor) / span));
  }


  /**
   * Цепочка таймлайна: desktop-деко → верхняя → нижняя.
   * Якорь: в момент завершения предыдущей линии фиксируем raw следующей,
   * чтобы она визуально начиналась с 0, а не с уже «прокрученного» конца.
   */
  function computeTimelineChainProgress(chain, s) {
    const { deco, top, bottom } = chain;
    const decoVis = isDrawLineLayoutVisible(deco);
    const topVis = isDrawLineLayoutVisible(top);
    const bottomVis = isDrawLineLayoutVisible(bottom);

    const pDecoRaw = decoVis ? getDrawProgress(deco) : 1;
    const pDecoDraw = decoVis ? pDecoRaw : 0;
    const decoDone = !decoVis || pDecoRaw >= 1;

    if (!decoDone) {
      s.decoWasDone = false;
      s.anchorTop = null;
      s.topWasDone = false;
      s.anchorBottom = null;
      return { deco: pDecoDraw, top: 0, bottom: 0 };
    }

    if (!s.decoWasDone) {
      s.anchorTop = topVis ? getDrawProgress(top) : 0;
      s.decoWasDone = true;
    }

    const rawTop = topVis ? getDrawProgress(top) : 0;
    const pTopDraw = topVis ? remapProgressAfterGate(rawTop, s.anchorTop) : 0;
    const topGate = !topVis || pTopDraw >= 1 - 1e-3;

    if (!topGate) {
      s.topWasDone = false;
      s.anchorBottom = null;
      return { deco: pDecoDraw, top: pTopDraw, bottom: 0 };
    }

    if (!s.topWasDone) {
      s.anchorBottom = bottomVis ? getDrawProgress(bottom) : 0;
      s.topWasDone = true;
    }

    const rawBottom = bottomVis ? getDrawProgress(bottom) : 0;
    const pBottomDraw = bottomVis ? remapProgressAfterGate(rawBottom, s.anchorBottom) : 0;

    return { deco: pDecoDraw, top: pTopDraw, bottom: pBottomDraw };
  }

  function getScrollLineProgress(svg, chain, chainState) {
    const p = computeTimelineChainProgress(chain, chainState);
    if (svg === chain.deco) {
      return p.deco;
    }
    if (svg === chain.top) {
      return p.top;
    }
    if (svg === chain.bottom) {
      return p.bottom;
    }
    return getDrawProgress(svg);
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
    const bottomLtr =
      svg.classList.contains('timeline__line--bottom') && svg.classList.contains('draw-line');
    paths.forEach(path => {
      const length = Number(path.dataset.lineLength) || path.getTotalLength();
      // Путь bottom в разметке начинается справа: отрицательный offset — дорисовка слева направо
      const offset = bottomLtr ? -length * (1 - progress) : length * (1 - progress);
      path.style.strokeDashoffset = String(offset);
      path.style.opacity = progress <= 0.001 ? '0' : String(Math.min(1, 0.12 + progress * 0.88));
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

  let heroIntroCleanup = null;

  function cancelHeroIntro() {
    if (typeof heroIntroCleanup === 'function') {
      heroIntroCleanup();
      heroIntroCleanup = null;
    }
  }

  /** Ручная отрисовка: CSS/WAAPI по stroke-dashoffset на SVG часто не работают. */
  function playHeroIntro(svg) {
    if (!svg || !isHeroIntroLine(svg)) {
      return;
    }
    cancelHeroIntro();
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
          heroIntroCleanup = null;
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
  function syncHeroDecoToFirstPhoto() {
    const hero = document.querySelector('.hero');
    const photo = document.querySelector('.timeline__photos .timeline__photo');
    if (!hero || !photo) {
      return;
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
      hero.style.setProperty('--hero-line-right-in-hero', `${Math.round(px * 100) / 100}px`);
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
      });
    });
  }

  function initDrawLines() {
    const lines = document.querySelectorAll('.draw-line');
    if (!lines.length) {
      return;
    }

    const scrollLines = Array.from(lines).filter(svg => !isHeroIntroLine(svg));

    const timelineChain = {
      deco: document.querySelector('.timeline__deco.timeline__deco--desktop.draw-line'),
      top: document.querySelector('.timeline__line.timeline__line--top.draw-line'),
      bottom: document.querySelector('.timeline__line.timeline__line--bottom.draw-line')
    };

    const chainAnimState = {
      decoWasDone: false,
      anchorTop: null,
      topWasDone: false,
      anchorBottom: null
    };

    let rafId = 0;

    function updateDrawLines() {
      scrollLines.forEach(svg => {
        applyLineProgress(svg, getScrollLineProgress(svg, timelineChain, chainAnimState));
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
        applyLineProgress(svg, getScrollLineProgress(svg, timelineChain, chainAnimState));
      }
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncHeroDecoToFirstPhoto();
        const activeHero = getActiveHeroIntroSvg();
        if (activeHero) {
          playHeroIntro(activeHero);
        } else {
          cancelHeroIntro();
        }
      });
    });

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      syncHeroDecoToFirstPhoto();
      chainAnimState.decoWasDone = false;
      chainAnimState.anchorTop = null;
      chainAnimState.topWasDone = false;
      chainAnimState.anchorBottom = null;
      lines.forEach(setLineStyles);
      updateDrawLines();
      const activeHero = getActiveHeroIntroSvg();
      if (activeHero) {
        playHeroIntro(activeHero);
      } else {
        cancelHeroIntro();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function bootDrawLines() {
      syncHeroDecoToFirstPhoto();
      initDrawLines();
    });
  } else {
    syncHeroDecoToFirstPhoto();
    initDrawLines();
  }

  window.addEventListener('load', () => {
    syncHeroDecoToFirstPhoto();
  });
})();