/**
 * Shared Dutch speech module — centralizes all Web Speech API logic.
 * Toggle stop/play, adjustable speed, sequential playback with
 * transport controls (next/prev/repeat).
 */

let activeBtn: HTMLElement | null = null;
let isSpeaking = false;

const DEFAULT_RATE = 0.9;
const STORAGE_KEY = "dutch-speech-rate";

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

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "nl-NL";
  utter.rate = getRate();

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

    const utter = new SpeechSynthesisUtterance(texts[currentIndex]);
    utter.lang = "nl-NL";
    utter.rate = getRate();

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
