// V13 layout + PageFlip + Audio fade (pages 2-3 only)
// Works with index.html that contains: #viewport, #book, #prevBtn, #nextBtn, #pageLabel

document.addEventListener('DOMContentLoaded', () => {
  const viewportEl = document.getElementById('viewport');
  const bookEl = document.getElementById('book');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageLabel = document.getElementById('pageLabel');

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

  function fadeTo(target, onDone){
    clearInterval(fadeTimer);
    const step = (target > music.volume) ? 0.04 : -0.04;
    fadeTimer = setInterval(() => {
      const v = Math.max(0, Math.min(0.6, music.volume + step));
      music.volume = v;
      const reached = (step > 0) ? (v >= target) : (v <= target);
      if (reached){
        clearInterval(fadeTimer);
        if (onDone) onDone();
      }
    }, 120);
  }

  function playWithFadeIn(){
    // must be unlocked OR triggered by a gesture (buttons/swipe)
    music.play().then(() => {
      fadeTo(0.6);
    }).catch(() => {
      // try unlock again on next interaction
      audioUnlocked = false;
    });
  }

  function fadeOutAndPause(){
    fadeTo(0, () => {
      music.pause();
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
