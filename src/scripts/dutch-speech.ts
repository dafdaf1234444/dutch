/**
 * Shared Dutch speech module — centralizes all Web Speech API logic.
 * Explicitly finds and caches a Dutch voice to prevent English fallback.
 * Toggle stop/play, adjustable speed, sequential playback with
 * transport controls (next/prev/repeat).
 */

let activeBtn: HTMLElement | null = null;
let isSpeaking = false;

const DEFAULT_RATE = 0.9;
const STORAGE_KEY = "dutch-speech-rate";

/* ---- Dutch voice selection ---- */

let dutchVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;
let voiceReadyCallbacks: (() => void)[] = [];

/**
 * Find the best Dutch voice from available voices.
 * Priority: nl-NL exact > nl exact > lang starts with "nl" > name contains dutch/nederland
 */
function findDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority 1: exact nl-NL match
  let match = voices.find(v => v.lang === "nl-NL");
  if (match) return match;

  // Priority 2: exact nl-BE (Belgian Dutch is still Dutch)
  match = voices.find(v => v.lang === "nl-BE");
  if (match) return match;

  // Priority 3: exact nl match
  match = voices.find(v => v.lang === "nl");
  if (match) return match;

  // Priority 4: lang starts with "nl"
  match = voices.find(v => v.lang.startsWith("nl"));
  if (match) return match;

  // Priority 5: name contains "dutch" or "nederland" (case-insensitive)
  match = voices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("dutch") || name.includes("nederland");
  });
  if (match) return match;

  return null;
}

function initVoices(): void {
  if (typeof speechSynthesis === "undefined") return;

  const tryLoad = () => {
    const found = findDutchVoice();
    if (found) {
      dutchVoice = found;
      voicesReady = true;
      // Flush pending callbacks
      for (const cb of voiceReadyCallbacks) cb();
      voiceReadyCallbacks = [];
      return true;
    }
    return false;
  };

  // Try immediately (Chrome desktop often has them ready)
  if (tryLoad()) return;

  // Listen for async voice loading (most browsers)
  speechSynthesis.addEventListener("voiceschanged", () => {
    tryLoad();
  });

  // Fallback: poll a few times for browsers that don't fire voiceschanged reliably
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (tryLoad() || attempts >= 20) {
      clearInterval(poll);
      if (!voicesReady) {
        // No Dutch voice found at all — mark as ready anyway so speech still works
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
function whenVoicesReady(cb: () => void): void {
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

export function stopAll(): void {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
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

  // Explicitly set the Dutch voice if we found one
  if (dutchVoice) {
    utter.voice = dutchVoice;
  }

  return utter;
}

/* ---- Single utterance with toggle ---- */

export function speakDutch(text: string, btn?: HTMLElement): void {
  // Check if Web Speech API is available
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

  // Cancel any current speech
  stopAll();

  const utter = createUtterance(text);

  if (btn) {
    activeBtn = btn;
    btn.classList.add("speaking");
  }

  utter.onend = () => {
    isSpeaking = false;
    if (btn) {
      btn.classList.remove("speaking");
      if (activeBtn === btn) activeBtn = null;
    }
  };
  utter.onerror = () => {
    isSpeaking = false;
    if (btn) {
      btn.classList.remove("speaking");
      if (activeBtn === btn) activeBtn = null;
    }
  };

  isSpeaking = true;
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

  function speakAt(index: number, gen: number) {
    if (cancelled || index < 0 || index >= texts.length) {
      isSpeaking = false;
      opts?.onDone?.();
      return;
    }

    currentIndex = index;
    opts?.onStart?.(currentIndex);

    const utter = createUtterance(texts[currentIndex]);

    utter.onend = () => {
      // Ignore if generation has changed (user used transport controls)
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
      speechSynthesis.cancel();
      isSpeaking = false;
    },
    next() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      speechSynthesis.cancel();
      speakAt(currentIndex + 1, generation);
    },
    prev() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      speechSynthesis.cancel();
      speakAt(Math.max(0, currentIndex - 1), generation);
    },
    repeat() {
      generation++;
      if (pendingTimeout) clearTimeout(pendingTimeout);
      speechSynthesis.cancel();
      speakAt(currentIndex, generation);
    },
    getCurrentIndex() {
      return currentIndex;
    },
  };
}
