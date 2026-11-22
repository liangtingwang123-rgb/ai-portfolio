(() => {
  const grid = document.querySelector('.folder-grid');
  if (!grid) return;

  const hoverCapable = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let active = null;
  let pinned = false;
  let leaveTimer;

  function close() {
    window.clearTimeout(leaveTimer);
    if (!active) return;

    const { group, button, menu } = active;
    active = null;
    pinned = false;
    button.setAttribute('aria-expanded', 'false');
    group.removeAttribute('data-open');
    if (menu.contains(document.activeElement)) button.focus({ preventScroll: true });
    menu.hidden = true;
  }

  function open(entry, pin = false) {
    window.clearTimeout(leaveTimer);
    if (active === entry) {
      pinned ||= pin;
      return;
    }

    close();
    const { group, button, menu } = entry;
    active = entry;
    pinned = pin;
    menu.hidden = false;
    group.setAttribute('data-open', '');
    button.setAttribute('aria-expanded', 'true');
  }

  for (const group of grid.querySelectorAll('.folder-group')) {
    const button = group.querySelector('.folder-link');
    const menu = group.querySelector('.folder-menu');
    if (!button || !menu) continue;

    const entry = { group, button, menu };
    group.addEventListener('pointerenter', event => {
      if (!hoverCapable.matches || event.pointerType === 'touch') return;
      if (active && active !== entry && (pinned || active.menu.contains(document.activeElement))) return;
      open(entry);
    });

    group.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch' || active !== entry || pinned) return;
      if (menu.contains(document.activeElement)) return;
      leaveTimer = window.setTimeout(close, 140);
    });

    button.addEventListener('click', () => {
      if (active === entry && pinned) close();
      else open(entry, true);
    });

    group.addEventListener('focusout', event => {
      if (active !== entry || !event.relatedTarget || group.contains(event.relatedTarget)) return;
      if (pinned || !group.matches(':hover')) close();
    });
  }

  document.addEventListener('pointerdown', event => {
    if (active && !active.group.contains(event.target)) close();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active || event.defaultPrevented) return;
    close();
  });
})();
