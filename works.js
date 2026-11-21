(() => {
  const works = document.querySelector('.works');
  if (!works) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupLane(lane) {
    const track = lane.querySelector('.work-track');
    const controls = lane.querySelector('.work-controls');
    const [previous, next] = controls.querySelectorAll('[data-direction]');
    const cards = Array.from(track.children);
    let drag;

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    function updateControls() {
      const max = maxScroll();
      controls.hidden = max <= 2;
      previous.setAttribute('aria-disabled', track.scrollLeft <= 2);
      next.setAttribute('aria-disabled', track.scrollLeft >= max - 2);
    }

    function stops() {
      const first = cards[0].getBoundingClientRect().left;
      const max = maxScroll();
      return [...new Set(cards.map(card => Math.min(card.getBoundingClientRect().left - first, max)))];
    }

    function slideTo(left) {
      track.scrollTo({left, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }

    function slide(direction) {
      const left = track.scrollLeft;
      const positions = stops();
      const target = direction > 0
        ? positions.find(position => position > left + 3)
        : positions.reverse().find(position => position < left - 3);
      if (target !== undefined) slideTo(target);
    }

    controls.addEventListener('click', event => {
      const button = event.target.closest('button[data-direction]');
      if (button?.getAttribute('aria-disabled') === 'false') slide(Number(button.dataset.direction));
    });

    track.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || maxScroll() <= 2) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      slide(event.key === 'ArrowRight' ? 1 : -1);
    });

    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || maxScroll() <= 2) return;
      if (!event.target.closest('.work-card')) return;
      drag = {id: event.pointerId, startX: event.clientX, left: track.scrollLeft, moved: false};
    });

    track.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const distance = event.clientX - drag.startX;
      if (!drag.moved && Math.abs(distance) < 8) return;
      if (!drag.moved) {
        drag.moved = true;
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
      }
      track.scrollLeft = drag.left - distance;
    });

    function endDrag(event) {
      if (drag?.id !== event.pointerId) return;
      const {moved} = drag;
      drag = undefined;
      if (!moved) return;

      const left = track.scrollLeft;
      const nearest = stops().reduce((best, position) =>
        Math.abs(position - left) < Math.abs(best - left) ? position : best, 0);
      track.classList.remove('is-dragging');
      slideTo(nearest);
    }

    track.addEventListener('pointerleave', event => {
      if (drag?.id === event.pointerId && !drag.moved) drag = undefined;
    });
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('lostpointercapture', endDrag);
    track.addEventListener('scroll', updateControls, {passive: true});
    new ResizeObserver(updateControls).observe(track);
    updateControls();
  }

  const imageViewer = document.querySelector('.image-viewer');

  function setupCircularGallery(lane) {
    if (!lane.hasAttribute('data-circular-gallery') || !window.CSS?.supports('perspective', '800px')) return false;

    const track = lane.querySelector('.work-track');
    const controls = lane.querySelector('.work-controls');
    const toggle = controls.querySelector('[data-gallery-toggle]');
    const title = lane.querySelector('[data-gallery-title]');
    const position = lane.querySelector('[data-gallery-position]');
    const cards = Array.from(track.children, element => {
      const link = element.querySelector('.work-card');
      return {element, link, image: link.querySelector('img'), title: link.querySelector('.work-card-title').textContent.trim()};
    });
    if (cards.length < 3 || !toggle || !title || !position) return false;

    const count = cards.length;
    const anglePerCard = 2 * Math.PI / count;
    let phase = 0;
    let target = null;
    let activeIndex = -1;
    let cardWidth = 0;
    let radius = 0;
    let animation = 0;
    let lastFrame = 0;
    let visible = false;
    let entered = false;
    let entering = false;
    let hovered = false;
    let paused = false;
    let drag;
    let ignoreDragClick = false;
    let wheelTimer = 0;

    const wrapIndex = value => ((value % count) + count) % count;
    const distanceFrom = (index, current) => wrapIndex(index - current + count / 2) - count / 2;

    function paint() {
      const front = wrapIndex(Math.round(phase));
      const useRing = !reducedMotion.matches;

      cards.forEach(({element, link, image}, index) => {
        const distance = distanceFrom(index, phase);
        const angle = distance * anglePerCard;
        const facing = Math.abs(angle) < Math.PI / 2;
        element.hidden = useRing ? !facing : index !== front;
        if (entered && image.loading === 'lazy' && (useRing ? Math.abs(distance) < 4.5 : index === front)) {
          image.loading = 'eager';
        }
        if (element.hidden) return;

        const cosine = useRing ? Math.cos(angle) : 1;
        const x = useRing ? radius * Math.sin(angle) : 0;
        const y = cardWidth * (cosine - 1) * .09;
        const z = radius * (cosine - 1);
        element.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${useRing ? angle : 0}rad)`;
        element.style.opacity = .28 + .72 * Math.pow(cosine, 1.6);
        element.style.zIndex = Math.round(cosine * 1000);
        element.classList.toggle('is-gallery-front', index === front);
        link.tabIndex = index === front ? 0 : -1;
      });

      if (front !== activeIndex) {
        activeIndex = front;
        title.textContent = cards[front].title;
        position.textContent = `${front + 1} / ${count}`;
      }
    }

    function measure() {
      const width = track.clientWidth;
      if (!width) return;
      cardWidth = Math.min(436, Math.round(width * .45 + 64));
      radius = (cardWidth * 1.075 + 16) / (2 * Math.tan(anglePerCard / 2));
      track.style.setProperty('--gallery-card-width', `${cardWidth}px`);
      track.style.setProperty('--gallery-height', `${Math.round(cardWidth * 9 / 16 + (cardWidth < 300 ? 78 : 110))}px`);
      track.style.setProperty('--gallery-perspective', `${Math.max(600, cardWidth * 3.1)}px`);
      paint();
    }

    function autoplaying() {
      return visible && !entering && !paused && !hovered && !drag && !wheelTimer &&
        !document.hidden && !imageViewer.open && !lane.querySelector(':focus-visible') && !reducedMotion.matches;
    }

    function refresh() {
      const animate = !document.hidden && !reducedMotion.matches && (target !== null || autoplaying());
      if (animate && !animation) animation = requestAnimationFrame(update);
      if (!animate) {
        if (animation) cancelAnimationFrame(animation);
        animation = 0;
        lastFrame = 0;
      }
    }

    function update(now) {
      animation = 0;
      const seconds = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      if (target !== null) {
        phase += (target - phase) * (1 - Math.exp(-13 * seconds));
        if (Math.abs(target - phase) < .006) {
          phase = target;
          target = null;
        }
      } else if (autoplaying()) {
        phase += seconds * .34;
      }
      paint();
      refresh();
    }

    function moveTo(next) {
      if (reducedMotion.matches) {
        phase = next;
        target = null;
        paint();
      } else {
        target = next;
      }
      refresh();
    }

    function step(direction) {
      moveTo(Math.round(target ?? phase) + direction);
    }

    function updateMotionMode() {
      lane.classList.toggle('is-gallery-static', reducedMotion.matches);
      if (reducedMotion.matches) {
        entering = false;
        lane.classList.remove('is-gallery-entering');
        phase = Math.round(target ?? phase);
        target = null;
      }
      paint();
      refresh();
    }

    function updateVisibility(inView) {
      visible = inView;
      if (visible && !entered) {
        entered = true;
        if (!reducedMotion.matches) {
          entering = true;
          cards.forEach(({element}, index) => {
            element.style.setProperty('--gallery-rise-delay', `${Math.min(250, Math.abs(distanceFrom(index, phase)) * 60)}ms`);
          });
          lane.classList.add('is-gallery-entering');
          window.setTimeout(() => {
            lane.classList.remove('is-gallery-entering');
            entering = false;
            refresh();
          }, 760);
        }
        paint();
      }
      refresh();
    }

    controls.addEventListener('click', event => {
      const control = event.target.closest('button');
      if (control === toggle) {
        paused = !paused;
        toggle.toggleAttribute('data-paused', paused);
        toggle.setAttribute('aria-label', paused ? '开启自动转动' : '暂停自动转动');
        if (paused) moveTo(Math.round(phase));
        refresh();
      } else if (control?.hasAttribute('data-direction')) {
        step(Number(control.dataset.direction));
      }
    });

    lane.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.target.closest('.work-card')) track.focus({preventScroll: true});
        step(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.target === track && event.key === 'Enter') {
        event.preventDefault();
        cards[wrapIndex(Math.round(phase))].link.click();
      }
    });

    track.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      ignoreDragClick = false;
      drag = {id: event.pointerId, x: event.clientX, y: event.clientY, phase, moved: false};
      target = null;
      refresh();
    });

    track.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          drag = undefined;
          refresh();
          return;
        }
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
        drag.moved = true;
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
      }
      if (!reducedMotion.matches) {
        phase = drag.phase - dx / (cardWidth * .66 + 15);
        paint();
      }
    });

    function endDrag(event) {
      if (event.type === 'lostpointercapture' && event.target !== track) return;
      if (drag?.id !== event.pointerId) return;
      const {x, moved} = drag;
      drag = undefined;
      if (moved) {
        ignoreDragClick = true;
        track.classList.remove('is-dragging');
        if (reducedMotion.matches) {
          if (event.type === 'pointerup' && Math.abs(event.clientX - x) > 24) step(event.clientX < x ? 1 : -1);
        } else {
          moveTo(Math.round(phase));
        }
      }
      refresh();
    }

    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      track.addEventListener(eventName, endDrag);
    }

    track.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (ignoreDragClick && event.detail !== 0) {
        event.preventDefault();
        return;
      }
      const card = event.target.closest('.work-card');
      const next = cards.findIndex(({link}) => link === card);
      if (next < 0 || next === activeIndex) return;
      event.preventDefault();
      const current = Math.round(phase);
      moveTo(current + distanceFrom(next, current));
    });

    track.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY) || drag) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
      if (reducedMotion.matches) {
        if (!wheelTimer) step(event.deltaX > 0 ? 1 : -1);
      } else {
        target = null;
        phase += event.deltaX * unit / (cardWidth * .8 + 15);
        paint();
      }
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        wheelTimer = 0;
        if (!reducedMotion.matches) moveTo(Math.round(phase));
        refresh();
      }, 145);
      refresh();
    }, {passive: false});

    lane.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') hovered = true;
      refresh();
    });
    lane.addEventListener('pointerleave', () => {
      hovered = false;
      if (drag && !drag.moved) drag = undefined;
      refresh();
    });
    lane.addEventListener('focusin', refresh);
    lane.addEventListener('focusout', () => queueMicrotask(refresh));
    document.addEventListener('visibilitychange', refresh);
    new MutationObserver(refresh).observe(imageViewer, {attributes: true, attributeFilter: ['open']});
    reducedMotion.addEventListener('change', updateMotionMode);

    lane.classList.add('is-circular-gallery');
    controls.hidden = false;
    track.tabIndex = 0;
    updateMotionMode();
    measure();
    new ResizeObserver(measure).observe(track);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => updateVisibility(entry.intersectionRatio >= .18), {threshold: [.18]}).observe(track);
    } else {
      updateVisibility(true);
    }
    return true;
  }

  works.querySelectorAll('.work-lane').forEach(lane => {
    if (!setupCircularGallery(lane)) setupLane(lane);
  });

  const videoViewer = document.querySelector('.video-viewer');
  const featuredVideo = videoViewer.querySelector('video');
  const videos = [...works.querySelectorAll('.video-entry video'), featuredVideo];

  function pauseOtherVideos(selected) {
    for (const video of videos) {
      if (video !== selected && !video.paused) video.pause();
    }
  }

  document.addEventListener('play', event => {
    if (videos.includes(event.target)) pauseOtherVideos(event.target);
  }, true);

  const fullImage = imageViewer.querySelector('img');

  works.addEventListener('click', event => {
    const card = event.target.closest('.work-card');
    if (!card || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const isVideo = card.classList.contains('video-card');
    const viewer = isVideo ? videoViewer : imageViewer;
    if (typeof viewer.showModal !== 'function') return;

    event.preventDefault();
    const title = card.querySelector('.work-card-title').textContent;
    viewer.querySelector('h2').textContent = title;
    if (isVideo) {
      pauseOtherVideos(featuredVideo);
      featuredVideo.poster = card.querySelector('img').src;
      featuredVideo.src = card.href;
    } else {
      fullImage.alt = title;
      fullImage.src = card.href;
    }

    viewer.showModal();
    if (isVideo) {
      featuredVideo.play().catch(() => {
        // Playback remains available through the video controls.
      });
    }
  });

  for (const viewer of [imageViewer, videoViewer]) {
    viewer.addEventListener('click', event => {
      if (event.target === viewer) viewer.close();
    });
  }

  imageViewer.addEventListener('close', () => {
    if (!imageViewer.open) fullImage.removeAttribute('src');
  });

  videoViewer.addEventListener('close', () => {
    if (videoViewer.open) return;
    featuredVideo.pause();
    featuredVideo.removeAttribute('src');
    featuredVideo.removeAttribute('poster');
    featuredVideo.load();
  });
})();
