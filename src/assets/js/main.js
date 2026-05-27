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
  function clampDrawProgress(scrollY, start, end, maxScroll) {
    const safeEnd = Math.min(end, maxScroll);
    if (safeEnd <= start) {
      const fallbackSpan = Math.max(1, maxScroll - start);
      return Math.max(0, Math.min(1, (scrollY - start) / fallbackSpan));
    }
    const span = Math.max(1, safeEnd - start);
    return Math.max(0, Math.min(1, (scrollY - start) / span));
  }

  /** info__line: прогресс по положению в viewport, без привязки к maxScroll. */
  function getInfoLineDrawProgress(svg) {
    const rect = svg.getBoundingClientRect();
    const vh = window.innerHeight;
    const startTop = vh * 1.05;
    const endTop = vh * 0.88;
    const span = Math.max(1, startTop - endTop);
    return Math.max(0, Math.min(1, (startTop - rect.top) / span));
  }

  /** Доля отрисовки 0…1: растёт при скролле вниз по мере приближения блока к верху экрана. */
  function getDrawProgress(svg) {
    if (svg.classList.contains('info__line')) {
      return getInfoLineDrawProgress(svg);
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
    paths.forEach(path => {
      const length = Number(path.dataset.lineLength) || path.getTotalLength();
      const offset = length * (1 - progress);
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

  /** Начало path timeline-deco desktop (viewBox 1165×194) */
  const TIMELINE_DECO_VB = { w: 1165, h: 194 };
  const TIMELINE_DECO_PATH_START_NX = 0.594238 / TIMELINE_DECO_VB.w;
  const TIMELINE_DECO_PATH_START_NY = 48.9146 / TIMELINE_DECO_VB.h;
  const TIMELINE_DECO_ANCHOR_TRIM_PX = 10;

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

  function isTimelineDecoDesktopVisible(deco) {
    return Boolean(deco && deco.classList.contains('timeline__deco--desktop'));
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

    function measureAndApply() {
      const tr = timeline.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      if (pr.width < 1 || tr.width < 1) {
        return;
      }

      const anchorCx = pr.left + pr.width / 2;
      const anchorCy = pr.bottom;
      const anchorCxInTimeline = anchorCx - tr.left;
      const r = TIMELINE_DECO_PATH_START_NX;

      let leftPx = (anchorCxInTimeline - tr.width * r) / (1 - r);
      leftPx = Math.max(0, leftPx + TIMELINE_DECO_ANCHOR_TRIM_PX);
      let widthPx = Math.max(120, tr.width - leftPx);

      const aspect = TIMELINE_DECO_VB.h / TIMELINE_DECO_VB.w;
      let topPx = anchorCy - tr.top - widthPx * aspect * TIMELINE_DECO_PATH_START_NY;

      timeline.style.setProperty('--timeline-deco-left', `${Math.round(leftPx * 100) / 100}px`);
      timeline.style.setProperty('--timeline-deco-width', `${Math.round(widthPx * 100) / 100}px`);
      timeline.style.setProperty('--timeline-deco-top', `${Math.round(topPx * 100) / 100}px`);

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
            widthPx = Math.max(120, tr.width - leftPx);
            timeline.style.setProperty('--timeline-deco-left', `${Math.round(leftPx * 100) / 100}px`);
            timeline.style.setProperty('--timeline-deco-width', `${Math.round(widthPx * 100) / 100}px`);
          }
          if (Math.abs(gapY) > 0.5) {
            const h = widthPx * aspect;
            topPx = anchorCy - tr.top - h * TIMELINE_DECO_PATH_START_NY +
              Math.max(-32, Math.min(32, gapY));
            timeline.style.setProperty('--timeline-deco-top', `${Math.round(topPx * 100) / 100}px`);
          }
        }
      }
    }

    measureAndApply();
    requestAnimationFrame(() => {
      requestAnimationFrame(measureAndApply);
    });
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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncHeroDecoToFirstPhoto();
        syncTimelineDecoToFourthPhoto();
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
      syncTimelineDecoToFourthPhoto();
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
      syncTimelineDecoToFourthPhoto();
      initDrawLines();
    });
  } else {
    syncHeroDecoToFirstPhoto();
    syncTimelineDecoToFourthPhoto();
    initDrawLines();
  }

  window.addEventListener('load', () => {
    syncHeroDecoToFirstPhoto();
    syncTimelineDecoToFourthPhoto();
  });

  const timelinePhotos = document.querySelector('.timeline__photos');
  if (timelinePhotos && typeof ResizeObserver !== 'undefined') {
    const timelineDecoRo = new ResizeObserver(() => {
      syncTimelineDecoToFourthPhoto();
    });
    timelineDecoRo.observe(timelinePhotos);
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