/**
 * Shared Dutch speech module — centralizes all Web Speech API logic.
 * Explicitly finds and caches a Dutch voice to prevent English fallback.
 * Toggle stop/play, adjustable speed, sequential playback with
 * transport controls (next/prev/repeat).
 *
 * Includes workarounds for Chrome's Web Speech API bugs:
 * - Keepalive timer prevents the ~15s utterance cutoff on mobile
 * - resume() before cancel() handles paused speech state
 * - Visibility change handler resumes paused speech when tab regains focus
 */

let activeBtn: HTMLElement | null = null;
let isSpeaking = false;

const DEFAULT_RATE = 0.9;
const STORAGE_KEY = "dutch-speech-rate";

/* ---- Chrome keepalive workaround ---- */

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Chrome's Web Speech API silently stops utterances after ~15 seconds
 * on many devices (especially mobile). Periodically pausing and resuming
 * keeps the synthesis connection alive.
 */
function startKeepAlive(): void {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    }
  }, 10_000);
}

function stopKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/* ---- Resume speech when page becomes visible again ---- */

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (typeof speechSynthesis === "undefined") return;
    if (document.visibilityState === "visible" && isSpeaking && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  });
}

/* ---- Dutch voice selection ---- */

let dutchVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let voiceReadyCallbacks: (() => void)[] = [];

/**
 * Find the best Dutch voice from available voices.
 * Priority: nl-NL exact > nl-BE > nl exact > lang starts with "nl" > name contains dutch/nederland
 */
function findDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let match = voices.find(v => v.lang === "nl-NL");
  if (match) return match;

  match = voices.find(v => v.lang === "nl-BE");
  if (match) return match;

  match = voices.find(v => v.lang === "nl");
  if (match) return match;

  match = voices.find(v => v.lang.startsWith("nl"));
  if (match) return match;

  match = voices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("dutch") || name.includes("nederland");
  });
  if (match) return match;

  return null;
}

function initVoices(): void {
  if (typeof speechSynthesis === "undefined") return;

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const tryLoad = () => {
    const found = findDutchVoice();
    if (found) {
      dutchVoice = found;
      voicesReady = true;
      // Clear poll timer if voiceschanged beat it
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      for (const cb of voiceReadyCallbacks) cb();
      voiceReadyCallbacks = [];
      return true;
    }
    return false;
  };

  // Try immediately (Chrome desktop often has them ready)
  if (tryLoad()) return;

  // Listen for async voice loading (most browsers)
  speechSynthesis.addEventListener("voiceschanged", () => tryLoad());

  // Fallback: poll for browsers that don't fire voiceschanged reliably
  let attempts = 0;
  pollTimer = setInterval(() => {
    attempts++;
    if (tryLoad() || attempts >= 20) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (!voicesReady) {
        // No Dutch voice found — mark as ready anyway so speech still works
        // (will fall back to lang-only which may use English on some devices)
        voicesReady = true;
        for (const cb of voiceReadyCallbacks) cb();
        voiceReadyCallbacks = [];
      }
    }
  }, 250);
}

// Initialize voice detection immediately
initVoices();

/** Wait for voices to be loaded, then call back. If already loaded, calls immediately. */
export function whenVoicesReady(cb: () => void): void {
  if (voicesReady) {
    cb();
  } else {
    voiceReadyCallbacks.push(cb);
  }
}

/* ---- Rate management ---- */

export function getRate(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_RATE;
  } catch {
    return DEFAULT_RATE;
  }
}

export function setRate(rate: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(rate));
  } catch {
    // localStorage unavailable
  }
}

/* ---- Stop all speech ---- */

/** Cancel() may not work on paused speech in some browsers — resume first. */
function safeCancel(): void {
  if (typeof speechSynthesis === "undefined") return;
  if (speechSynthesis.paused) speechSynthesis.resume();
  speechSynthesis.cancel();
}

export function stopAll(): void {
  if (typeof speechSynthesis === "undefined") return;
  stopKeepAlive();
  safeCancel();
  isSpeaking = false;
  if (activeBtn) {
    activeBtn.classList.remove("speaking");
    activeBtn = null;
  }
}

/* ---- Create a properly configured utterance ---- */

function createUtterance(text: string): SpeechSynthesisUtterance {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "nl-NL";
  utter.rate = getRate();

  if (dutchVoice) {
    utter.voice = dutchVoice;
  }

  return utter;
}

/* ---- Single utterance with toggle ---- */

export function speakDutch(text: string, btn?: HTMLElement): void {
  if (typeof speechSynthesis === "undefined") {
    if (btn) {
      btn.title = "Audio not supported in this browser";
      btn.style.opacity = "0.4";
    }
    return;
  }

  // Toggle: if same button is already speaking, stop
  if (btn && btn === activeBtn && isSpeaking) {
    stopAll();
    return;
  }

  stopAll();

  const utter = createUtterance(text);

  if (btn) {
    activeBtn = btn;
    btn.classList.add("speaking");
  }

  utter.onend = () => {
    stopKeepAlive();
    isSpeaking = false;
    if (btn) {
      btn.classList.remove("speaking");
      if (activeBtn === btn) activeBtn = null;
    }
  };
  utter.onerror = () => {
    stopKeepAlive();
    isSpeaking = false;
    if (btn) {
      btn.classList.remove("speaking");
      if (activeBtn === btn) activeBtn = null;
    }
  };

  isSpeaking = true;
  startKeepAlive();
  speechSynthesis.speak(utter);
}

/* ---- Sequential playback with transport controls ---- */

export interface SequenceOpts {
  pause?: number;
  startIndex?: number;
  onStart?: (index: number) => void;
  onDone?: () => void;
}

export interface SequenceController {
  cancel: () => void;
  next: () => void;
  prev: () => void;
  repeat: () => void;
  getCurrentIndex: () => number;
}

export function speakSequence(texts: string[], opts?: SequenceOpts): SequenceController {
  const noop: SequenceController = {
    cancel() {},
    next() {},
    prev() {},
    repeat() {},
    getCurrentIndex() { return 0; },
  };

  if (typeof speechSynthesis === "undefined") {
    opts?.onDone?.();
    return noop;
  }

  const pause = opts?.pause ?? 600;
  let cancelled = false;
  let currentIndex = opts?.startIndex ?? 0;
  let generation = 0;
  let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Cancel any current speech first
  stopAll();
  isSpeaking = true;
  startKeepAlive();

  function speakAt(index: number, gen: number) {
    if (cancelled || index < 0 || index >= texts.length) {
      stopKeepAlive();
      isSpeaking = false;
      opts?.onDone?.();
      return;
    }

    currentIndex = index;
    opts?.onStart?.(currentIndex);

    const utter = createUtterance(texts[currentIndex]);

    utter.onend = () => {
      if (gen !== generation || cancelled) return;
      const nextIdx = currentIndex + 1;
      pendingTimeout = setTimeout(() => speakAt(nextIdx, gen), pause);
    };
    utter.onerror = () => {
      if (gen !== generation || cancelled) return;
      const nextIdx = currentIndex + 1;
      pendingTimeout = setTimeout(() => speakAt(nextIdx, gen), pause);
    };

    speechSynthesis.speak(utter);
  }

  speakAt(currentIndex, generation);

  return {
    cancel() {
      cancelled = true;
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      stopKeepAlive();
      safeCancel();
      isSpeaking = false;
    },
    next() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      safeCancel();
      speakAt(currentIndex + 1, generation);
    },
    prev() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      safeCancel();
      speakAt(Math.max(0, currentIndex - 1), generation);
    },
    repeat() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      safeCancel();
      speakAt(currentIndex, generation);
    },
    getCurrentIndex() {
      return currentIndex;
    },
  };
}
