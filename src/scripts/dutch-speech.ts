/**
 * Shared Dutch speech module — centralizes all Web Speech API logic.
 * Toggle stop/play, adjustable speed, sequential playback.
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
  speechSynthesis.cancel();
  isSpeaking = false;
  if (activeBtn) {
    activeBtn.classList.remove("speaking");
    activeBtn = null;
  }
}

/* ---- Single utterance with toggle ---- */

export function speakDutch(text: string, btn?: HTMLElement): void {
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

/* ---- Sequential playback ---- */

export interface SequenceOpts {
  pause?: number;
  onStart?: (index: number) => void;
  onDone?: () => void;
}

export function speakSequence(texts: string[], opts?: SequenceOpts): () => void {
  const pause = opts?.pause ?? 600;
  let cancelled = false;
  let currentIndex = 0;

  // Cancel any current speech first
  stopAll();
  isSpeaking = true;

  function speakNext() {
    if (cancelled || currentIndex >= texts.length) {
      isSpeaking = false;
      opts?.onDone?.();
      return;
    }

    opts?.onStart?.(currentIndex);
    const utter = new SpeechSynthesisUtterance(texts[currentIndex]);
    utter.lang = "nl-NL";
    utter.rate = getRate();
    utter.onend = () => {
      currentIndex++;
      if (!cancelled) setTimeout(speakNext, pause);
    };
    utter.onerror = () => {
      currentIndex++;
      if (!cancelled) setTimeout(speakNext, pause);
    };
    speechSynthesis.speak(utter);
  }

  speakNext();

  return () => {
    cancelled = true;
    speechSynthesis.cancel();
    isSpeaking = false;
    opts?.onDone?.();
  };
}
