
const audio = document.getElementById("audio");
const btn = document.getElementById("audioToggle");

let unlocked = false;

function unlockAudio(){
  if(unlocked) return;
  audio.play().then(()=>{
    audio.pause();
    audio.currentTime = 0;
    unlocked = true;
  }).catch(()=>{});
}

btn.addEventListener("click", ()=>{
  unlockAudio();
  if(audio.paused){
    audio.play();
    btn.textContent = "🔇";
  } else {
    audio.pause();
    btn.textContent = "🔊";
  }
});

document.addEventListener("touchstart", unlockAudio, { once:true });

const pageFlip = new St.PageFlip(document.getElementById("book"),{
  width:560,
  height:792,
  size:"stretch",
  showCover:true,
  flippingTime:900
});

pageFlip.loadFromImages([
  "page1.png",
  "page2.png",
  "page3.png",
  "page4.png"
]);

pageFlip.on("flip", ()=>{
  const i = pageFlip.getCurrentPageIndex();
  if(i === 0 || i === 3){
    audio.pause();
    btn.textContent = "🔊";
  }
});
