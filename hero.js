(() => {
  const section = document.querySelector('.scroll-hero');
  if (!section) return;
  const stage = section.querySelector('.scroll-hero-stage');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (start, end, value) => {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  };

  let pending = false;
  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  function update() {
    pending = false;
    if (reducedMotion.matches) {
      section.style.setProperty('--scene-progress', 1);
      section.style.setProperty('--image-mix', 1);
      section.style.setProperty('--copy-progress', 1);
      return;
    }

    const distance = Math.max(1, section.offsetHeight - window.innerHeight);
    const progress = clamp(-section.getBoundingClientRect().top / distance);
    pointerX += (targetX - pointerX) * .11;
    pointerY += (targetY - pointerY) * .11;
    const tiltX = (-pointerY * 3).toFixed(3);
    const tiltY = (pointerX * 4).toFixed(3);
    const driftX = pointerX * 1.2;
    const driftY = pointerY * .8;
    section.style.setProperty('--scene-progress', progress.toFixed(4));
    section.style.setProperty('--image-mix', smoothstep(0.18, 0.76, progress).toFixed(4));
    section.style.setProperty('--copy-progress', smoothstep(0.62, 0.9, progress).toFixed(4));
    section.style.setProperty('--start-transform', `translate3d(${-2.5 * progress + driftX}%, ${-progress + driftY}%, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${1.06 + .16 * progress})`);
    section.style.setProperty('--end-transform', `translate3d(${1.5 * (1 - progress) + driftX}%, ${1 - progress + driftY}%, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${1.18 - .12 * progress})`);
    section.style.setProperty('--copy-transform', `translate3d(0, ${35 * (1 - smoothstep(.62, .9, progress))}px, 0)`);
    section.style.setProperty('--hint-opacity', clamp(1 - progress * 3));
    if (Math.abs(targetX - pointerX) > .002 || Math.abs(targetY - pointerY) > .002) requestUpdate();
  }

  function requestUpdate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = stage.getBoundingClientRect();
    targetX = clamp(((event.clientX - bounds.left) / bounds.width - .5) * 2, -1, 1);
    targetY = clamp(((event.clientY - bounds.top) / bounds.height - .5) * 2, -1, 1);
    requestUpdate();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    requestUpdate();
  });
  reducedMotion.addEventListener('change', requestUpdate);
  requestUpdate();
})();
