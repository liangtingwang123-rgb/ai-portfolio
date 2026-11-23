(() => {
  const mirror = 'https://cdn.jsdelivr.net/gh/liangtingwang123-rgb/ai-portfolio@21fc45842a70abe9d6e6a4e2022e0e66911be544/';
  const root = new URL('.', document.baseURI);
  const timers = new WeakMap();

  function clearTimer(media) {
    window.clearTimeout(timers.get(media));
    timers.delete(media);
  }

  function fallback(media) {
    clearTimer(media);
    if (!media.getAttribute('src')) return;
    const source = new URL(media.src, document.baseURI);
    if (source.origin !== root.origin || !source.pathname.startsWith(root.pathname + 'assets/')) return;

    const alternate = mirror + source.pathname.slice(root.pathname.length);
    if (media instanceof HTMLVideoElement) {
      const position = media.currentTime;
      const resume = !media.paused;
      media.src = alternate;
      media.addEventListener('loadedmetadata', () => {
        if (media.src !== alternate) return;
        if (position > 0 && position < media.duration) media.currentTime = position;
        if (resume) media.play().catch(() => {});
      }, { once: true });
      media.load();
    } else {
      media.src = alternate;
    }
  }

  function watch(media) {
    clearTimer(media);
    timers.set(media, window.setTimeout(() => {
      if (media instanceof HTMLVideoElement) {
        if (!media.paused && media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) fallback(media);
      } else if (!media.complete || !media.naturalWidth) {
        fallback(media);
      }
    }, 12000));
  }

  document.addEventListener('error', event => {
    const media = event.target;
    if (media instanceof HTMLImageElement || media instanceof HTMLVideoElement) fallback(media);
  }, true);

  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) clearTimer(event.target);
  }, true);

  for (const video of document.querySelectorAll('video')) {
    video.addEventListener('waiting', () => watch(video));
    video.addEventListener('play', () => watch(video));
    video.addEventListener('playing', () => clearTimer(video));
    video.addEventListener('pause', () => clearTimer(video));
    video.addEventListener('emptied', () => clearTimer(video));
  }

  const images = document.querySelectorAll('img[src]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          watch(entry.target);
          observer.unobserve(entry.target);
        }
      }
    });
    images.forEach(image => observer.observe(image));
  } else {
    images.forEach(watch);
  }
})();
