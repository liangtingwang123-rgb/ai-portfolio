const socialMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('.social-profile').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || socialMotion.matches) return;

    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  }, { passive: true });

  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--spotlight-x');
    card.style.removeProperty('--spotlight-y');
  });
});
