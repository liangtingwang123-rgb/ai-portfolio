(() => {
  const spread = document.querySelector('.book-spread');
  const page = document.querySelector('#book-page');
  const stock = document.querySelector('.book-static');
  const sheet = document.querySelector('.book-leaf');
  const front = sheet.querySelector('.book-front img');
  const back = sheet.querySelector('.book-back img');
  const previous = document.querySelector('#previous-page');
  const next = document.querySelector('#next-page');
  const status = document.querySelector('#page-status');
  const error = document.querySelector('#reader-error');
  const detailButton = document.querySelector('#open-detail');
  const detail = document.querySelector('#book-detail');
  const detailTitle = document.querySelector('#detail-title');
  const detailImage = document.querySelector('#detail-image');
  const detailViewport = document.querySelector('.detail-viewport');
  const pages = [...document.querySelector('#book-pages').content.querySelectorAll('img')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const decoded = new Map();

  let index = 0;
  let turning = false;
  let gesture;
  let ignoreClickUntil = 0;
  let wheelTravel = 0;
  let wheelReset = 0;
  let ignoreWheelUntil = 0;

  function loadImage(position) {
    if (!decoded.has(position)) {
      const image = new Image();
      image.src = pages[position].getAttribute('src');
      decoded.set(position, image.decode().catch(failure => {
        decoded.delete(position);
        throw failure;
      }));
    }
    return decoded.get(position);
  }

  function preloadNeighbors() {
    for (const neighbor of [index - 1, index + 1]) {
      if (pages[neighbor]) loadImage(neighbor).catch(() => {});
    }
  }

  function updateControls() {
    previous.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    previous.setAttribute('aria-disabled', String(turning || previous.disabled));
    next.setAttribute('aria-disabled', String(turning || next.disabled));
    spread.setAttribute('aria-label', next.disabled ? '翻到上一页' : '翻到下一页');
    status.value = `${index + 1} / ${pages.length}`;
  }

  async function turn(direction) {
    const target = index + direction;
    if (turning || !pages[target]) return;
    turning = true;
    error.hidden = true;
    updateControls();

    try {
      await loadImage(target);
    } catch {
      error.textContent = '这一页暂时没加载出来，请再试一次。';
      error.hidden = false;
      turning = false;
      updateControls();
      return;
    }

    const oldSource = page.getAttribute('src');
    const newSource = pages[target].getAttribute('src');
    const animate = !reducedMotion.matches && typeof sheet.animate === 'function';
    if (animate) {
      spread.dataset.turn = direction > 0 ? 'forward' : 'backward';
      stock.querySelector('img').src = oldSource;
      front.src = oldSource;
      back.src = newSource;
      stock.hidden = false;
      sheet.hidden = false;
    }

    page.src = newSource;
    page.alt = pages[target].alt;

    if (animate) {
      const duration = 540;
      const leafTurn = sheet.animate([
        { transform: 'rotateY(0deg)' },
        { transform: `rotateY(${direction * -180}deg)` },
      ], { duration, easing: 'cubic-bezier(.52,.06,.35,.99)', fill: 'forwards' });
      const halfReveal = stock.animate([
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: .45 },
        { opacity: 0, offset: .52 },
        { opacity: 0, offset: 1 },
      ], { duration, fill: 'forwards' });

      await leafTurn.finished.catch(() => {});
      stock.hidden = true;
      sheet.hidden = true;
      leafTurn.cancel();
      halfReveal.cancel();
      delete spread.dataset.turn;
    }

    index = target;
    turning = false;
    updateControls();
    preloadNeighbors();
  }

  function finishGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = undefined;
    spread.classList.remove('is-dragging');
    if (event.type !== 'pointerup') return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) ignoreClickUntil = performance.now() + 400;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) turn(dx < 0 ? 1 : -1);
  }

  spread.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || turning) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    spread.setPointerCapture(event.pointerId);
  });
  spread.addEventListener('pointermove', event => {
    if (gesture?.id === event.pointerId && Math.abs(event.clientX - gesture.x) > 8) {
      spread.classList.add('is-dragging');
    }
  });
  spread.addEventListener('pointerup', finishGesture);
  spread.addEventListener('pointercancel', finishGesture);
  spread.addEventListener('lostpointercapture', finishGesture);
  spread.addEventListener('click', event => {
    if (event.detail !== 0 && performance.now() < ignoreClickUntil) return;
    turn(index === pages.length - 1 ? -1 : 1);
  });

  spread.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const now = performance.now();
    if (turning || now < ignoreWheelUntil) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1;
    wheelTravel += event.deltaX * scale;
    window.clearTimeout(wheelReset);
    wheelReset = window.setTimeout(() => { wheelTravel = 0; }, 160);
    if (Math.abs(wheelTravel) < 45) return;
    turn(wheelTravel > 0 ? 1 : -1);
    ignoreWheelUntil = now + 650;
    wheelTravel = 0;
  }, { passive: true });

  previous.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  document.addEventListener('keydown', event => {
    if (detail.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    turn(event.key === 'ArrowRight' ? 1 : -1);
  });

  if (typeof detail.showModal === 'function') {
    detailButton.hidden = false;
    detailButton.addEventListener('click', () => {
      if (turning) return;
      detailTitle.textContent = `第 ${index + 1} 跨页 · 放大阅读`;
      detailImage.src = page.src;
      detailImage.alt = page.alt;
      detail.showModal();
      detailViewport.scrollTo(0, 0);
    });
  }

  updateControls();
  preloadNeighbors();
})();
