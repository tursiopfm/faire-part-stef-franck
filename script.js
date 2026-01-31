// Stephanie & Franck — Faire-part interactif
// Objectifs:
// - Flipbook (PageFlip) + navigation boutons + swipe
// - Musique: fade-in doux à l'ouverture / fade-out à la fermeture
// - Bouton muet (compatible iOS): coupe / remet le son sans casser la navigation

document.addEventListener('DOMContentLoaded', () => {
  // ----- DOM
  const bookEl = document.getElementById('book');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const viewLabel = document.getElementById('viewLabel');
  const muteBtn = document.getElementById('muteBtn');
  const audio = document.getElementById('bgm');

  // Sécurité
  if (!bookEl || !prevBtn || !nextBtn || !viewLabel) {
    // Si un élément manque, on évite de planter toute la page.
    return;
  }

  // ----- Audio helpers (fade)
  const BASE_VOLUME = 0.55;
  const FADE_IN_MS = 900;
  const FADE_OUT_MS = 600;
  let isMuted = false;
  let fadeTimer = null;
  let audioUnlocked = false;

  function clearFade() {
    if (fadeTimer) {
      cancelAnimationFrame(fadeTimer);
      fadeTimer = null;
    }
  }

  function fadeTo(targetVolume, durationMs, onDone) {
    if (!audio) return;
    clearFade();

    const start = performance.now();
    const from = Number.isFinite(audio.volume) ? audio.volume : 0;
    const to = Math.max(0, Math.min(1, targetVolume));

    const step = (now) => {
      const t = Math.min(1, (now - start) / Math.max(1, durationMs));
      // courbe douce
      const eased = t * t * (3 - 2 * t);
      audio.volume = from + (to - from) * eased;
      if (t < 1) {
        fadeTimer = requestAnimationFrame(step);
      } else {
        fadeTimer = null;
        onDone && onDone();
      }
    };
    fadeTimer = requestAnimationFrame(step);
  }

  async function playWithFadeIn() {
    if (!audio || isMuted) return;
    try {
      // iOS: play() doit être suite à un geste utilisateur -> on "unlock" au 1er geste.
      audio.volume = 0;
      await audio.play();
      fadeTo(BASE_VOLUME, FADE_IN_MS);
    } catch (e) {
      // Autoplay bloqué: on attend un geste utilisateur.
    }
  }

  function fadeOutAndPause() {
    if (!audio) return;
    // Si déjà en pause, rien.
    if (audio.paused) return;
    fadeTo(0, FADE_OUT_MS, () => {
      audio.pause();
    });
  }

  function setMuteUI() {
    if (!muteBtn) return;
    muteBtn.classList.toggle('is-muted', isMuted);
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    // icône simple (compatible partout)
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.title = isMuted ? 'Activer la musique' : 'Couper la musique';
  }

  // "Unlock" iOS: au premier touch/click, on tente un play() très court.
  async function unlockAudioOnce() {
    if (!audio || audioUnlocked) return;
    audioUnlocked = true;
    try {
      // petit play/pause pour autoriser les prochains play()
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      // ignore
    }
  }

  // On accroche un unlock au 1er geste utilisateur.
  const unlockEvents = ['touchstart', 'pointerdown', 'mousedown', 'click'];
  const onFirstGesture = async () => {
    await unlockAudioOnce();
    unlockEvents.forEach((evt) => document.removeEventListener(evt, onFirstGesture, { passive: true }));
  };
  unlockEvents.forEach((evt) => document.addEventListener(evt, onFirstGesture, { passive: true }));

  // ----- PageFlip init
  // La lib est chargée via CDN dans index.html
  const pageFlip = new St.PageFlip(bookEl, {
    width: 900,
    height: 1200,
    size: 'stretch',
    minWidth: 315,
    maxWidth: 1000,
    minHeight: 420,
    maxHeight: 1350,
    maxShadowOpacity: 0.3,
    showCover: true,
    mobileScrollSupport: false,
    useMouseEvents: true,
    swipeDistance: 25,
  });

  const pages = Array.from(bookEl.querySelectorAll('.page'));
  pageFlip.loadFromHTML(pages);

  function currentViewLabel(pageIndex) {
    return pageIndex === 0 ? 'Couverture' : 'Intérieur (livre ouvert)';
  }

  function updateUI() {
    const page = pageFlip.getCurrentPageIndex();
    viewLabel.textContent = currentViewLabel(page);
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= pageFlip.getPageCount() - 1;
  }

  // Audio logique liée au flip
  function syncAudioToPage(pageIndex) {
    // page 0 = couverture => fade-out
    if (pageIndex <= 0) {
      fadeOutAndPause();
      return;
    }
    // intérieur => fade-in si pas muted
    if (!isMuted) {
      playWithFadeIn();
    }
  }

  pageFlip.on('init', () => {
    updateUI();
    setMuteUI();
    syncAudioToPage(pageFlip.getCurrentPageIndex());
  });

  pageFlip.on('flip', (e) => {
    const page = typeof e?.data === 'number' ? e.data : pageFlip.getCurrentPageIndex();
    updateUI();
    syncAudioToPage(page);
  });

  // ----- Navigation buttons
  prevBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    pageFlip.flipPrev();
  });
  nextBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    pageFlip.flipNext();
  });

  // ----- Mute toggle
  if (muteBtn && audio) {
    setMuteUI();
    muteBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      // Toujours unlock sur iOS avant de (re)jouer
      await unlockAudioOnce();

      isMuted = !isMuted;
      setMuteUI();

      if (isMuted) {
        fadeOutAndPause();
      } else {
        // seulement si le livre est ouvert
        const page = pageFlip.getCurrentPageIndex();
        if (page > 0) {
          playWithFadeIn();
        }
      }
    }, { passive: false });
  }

  // ----- Safety: si l'utilisateur tourne avec un swipe, on empêche la page du navigateur de défiler
  // (Le container est en overflow hidden mais certains iOS peuvent tenter un scroll).
  bookEl.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
});
