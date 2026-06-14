// Global audio unlock.
//
// Browsers block audio (both HTMLMediaElement.play() and AudioContext) until
// the user interacts with the page. The host clicks through phases so their
// audio is unlocked; a passive player (esp. on mobile) may sit without a tap
// and the news anchor stays silent until a page refresh. We fix this by:
//   1. resuming a single shared AudioContext on the first user gesture
//      (players always tap many times before the news: join, pick country,
//      "Готов", etc. — that sticky activation lets resume() succeed), and
//   2. exposing unlockAudio() so the news player can also force it from a tap.

let ctx: AudioContext | null = null;
let installed = false;

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function getAudioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function isAudioUnlocked(): boolean {
  const c = getAudioCtx();
  return !!c && c.state === 'running';
}

export function unlockAudio(): void {
  const c = getAudioCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  // A 1-sample silent buffer primes the audio session (helps iOS).
  try {
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

export function installAudioUnlock(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const handler = () => unlockAudio();
  const opts: AddEventListenerOptions = { passive: true };
  // Listeners stay attached: if the context gets suspended again (tab switch on
  // mobile) the next interaction resumes it. Resuming a running context is a no-op.
  window.addEventListener('pointerdown', handler, opts);
  window.addEventListener('touchend', handler, opts);
  window.addEventListener('click', handler, opts);
  window.addEventListener('keydown', handler);
}
