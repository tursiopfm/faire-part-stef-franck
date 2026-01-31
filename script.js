// V13 layout + PageFlip + Audio fade (pages 2-3 only)
// Works with index.html that contains: #viewport, #book, #prevBtn, #nextBtn, #pageLabel

document.addEventListener('DOMContentLoaded', () => {
  const viewportEl = document.getElementById('viewport');
  const bookEl = document.getElementById('book');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageLabel = document.getElementById('pageLabel');
  const audioToggle = document.getElementById('audioToggle');

  // ---- PageFlip init (keep V13 behaviour) ----
  const pageFlip = new St.PageFlip(bookEl, {
    width: 560,
    height: 792,
    size: "stretch",
    minWidth: 320,
    maxWidth: 1400,
    minHeight: 420,
    maxHeight: 950,
    showCover: true,
    flippingTime: 900,
    maxShadowOpacity: 0.45,
    useMouseEvents: true,
    usePortrait: true,
    autoSize: true
  });

  pageFlip.loadFromImages([
    "page1.png",
    "page2.png",
    "page3.png",
    "page4.png"
  ]);

  // ---- Closed cover/back clipping (V13) ----
  function setMode(mode){ // 'cover' | 'back' | 'spread'
    viewportEl.classList.remove('is-cover','is-back','is-spread');
    viewportEl.classList.add(
      mode === 'cover' ? 'is-cover' : (mode === 'back' ? 'is-back' : 'is-spread')
    );
  }

  function updateUI(){
    const i = pageFlip.getCurrentPageIndex(); // 0..3
    if (i === 0){
      pageLabel.textContent = "Couverture";
      setMode('cover');
    } else if (i === 3){
      pageLabel.textContent = "Dos du livre";
      setMode('back');
    } else {
      pageLabel.textContent = "Intérieur (livre ouvert)";
      setMode('spread');
    }

    // buttons
    prevBtn.disabled = (i === 0);
    nextBtn.disabled = (i === 3);

    updateAudio(i);
  }

  // ---- Navigation ----
  prevBtn.addEventListener('click', () => pageFlip.flipPrev());
  nextBtn.addEventListener('click', () => pageFlip.flipNext());

  pageFlip.on('flip', updateUI);
  pageFlip.on('changeState', updateUI);
  pageFlip.on('init', updateUI);

  // Force first UI refresh once images are ready
  setTimeout(updateUI, 200);

  // ---- Audio (fade in on pages 2-3, fade out otherwise) ----
  const AUDIO_SRC = "music.mpeg"; // keep this name (in your zip)
  const music = new Audio(AUDIO_SRC);
  music.loop = true;
  music.volume = 0;

  let audioUnlocked = false;
  let fadeTimer = null;
  let userMuted = false;
  const BASE_VOLUME = 0.35;

  function setAudioButtonState() {
    if (!audioToggle) return;
    audioToggle.textContent = userMuted ? '🔇' : '🔊';
    audioToggle.setAttribute('aria-label', userMuted ? 'Activer la musique' : 'Couper la musique');
    audioToggle.setAttribute('title', userMuted ? 'Activer la musique' : 'Couper la musique');
  }

  function stopFade(){
    if (fadeTimer){
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function applyMuteState(){
    // iOS Safari can be finicky; combining muted + volume + pause ensures silence.
    if (userMuted){
      stopFade();
      music.muted = true;
      music.volume = 0;
      try { music.pause(); } catch(e) {}
    } else {
      music.muted = false;
      // keep volume at current (fade functions set it)
      if (music.volume === 0) music.volume = BASE_VOLUME;
    }
  }

  function toggleMute(e){
    if (e){
      e.preventDefault();
      e.stopPropagation();
    }
    userMuted = !userMuted;
    setAudioButtonState();
    applyMuteState();
    // If unmuting, try to resume music if we are in an "open" page view
    if (!userMuted){
      // this counts as a user gesture, so play() is allowed on iOS
      try { music.play(); } catch(_) {}
    }
  }

  function unlockAudio(){
    if (audioUnlocked) return;
    audioUnlocked = true;
    // tiny play/pause to satisfy browser gesture requirement
    music.play().then(() => {
      music.pause();
      music.currentTime = 0;
    }).catch(() => {
      // If blocked, we'll try again on next user gesture
      audioUnlocked = false;
    });
  }

  // Unlock on any user gesture
  ['click','touchstart','keydown'].forEach(evt =>
    document.addEventListener(evt, unlockAudio, { once: true, passive: true })
  );

  // Mute button (must not interfere with page turning)
  if (audioToggle){
    setAudioButtonState();
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
    };
    audioToggle.addEventListener('click', handler, { passive: false });
    audioToggle.addEventListener('touchend', handler, { passive: false });
  }

  function fadeTo(target, onDone){
    stopFade();
    const clampedTarget = Math.max(0, Math.min(BASE_VOLUME, target));
    const step = (clampedTarget > music.volume) ? 0.04 : -0.04;
    fadeTimer = setInterval(() => {
      const v = Math.max(0, Math.min(BASE_VOLUME, music.volume + step));
      music.volume = v;
      const reached = (step > 0) ? (v >= clampedTarget) : (v <= clampedTarget);
      if (reached){
        stopFade();
        if (onDone) onDone();
      }
    }, 120);
  }

  function playWithFadeIn(){
    if (userMuted) {
      applyMuteState();
      return;
    }
    // must be unlocked OR triggered by a gesture (buttons/swipe)
    music.muted = false;
    music.play().then(() => {
      fadeTo(BASE_VOLUME);
    }).catch(() => {
      // try unlock again on next interaction
      audioUnlocked = false;
    });
  }

  function fadeOutAndPause(){
    fadeTo(0, () => {
      try { music.pause(); } catch(e) {}
      // keep currentTime for smooth resume, or reset if you prefer:
      // music.currentTime = 0;
    });
  }

  function updateAudio(pageIndex){
    const isInside = (pageIndex === 1 || pageIndex === 2);
    if (isInside){
      if (music.paused){
        playWithFadeIn();
      }
    } else {
      if (!music.paused){
        fadeOutAndPause();
      }
    }
  }
});
