/**
 * Audio Player Panel — collapsible panel with speed slider, blind listening,
 * sentence group selection, play/stop, and now-playing indicator.
 */
import { speakSequence, getRate, setRate, stopAll } from "./dutch-speech";

export interface SentenceItem {
  text: string;
  display: string;
}

export interface SentenceGroup {
  label: string;
  sentences: SentenceItem[];
}

export function buildAudioPanel(groups: SentenceGroup[]): HTMLDetailsElement {
  const totalCount = groups.reduce((n, g) => n + g.sentences.length, 0);
  if (totalCount === 0) {
    const empty = document.createElement("details");
    empty.style.display = "none";
    return empty;
  }

  const details = document.createElement("details");
  details.className = "audio-panel";

  // Summary
  const summary = document.createElement("summary");
  summary.className = "audio-panel-summary";
  summary.innerHTML = `<span class="ap-title">&#x1f3a7; Audio Player</span><span class="ap-count">${totalCount} sentences</span>`;
  details.appendChild(summary);

  const body = document.createElement("div");
  body.className = "audio-panel-body";
  details.appendChild(body);

  // Speed slider row
  const speedRow = document.createElement("div");
  speedRow.className = "audio-panel-speed";
  const speedLabel = document.createElement("span");
  speedLabel.className = "ap-speed-label";
  speedLabel.textContent = "Speed:";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "ap-speed-slider";
  slider.min = "0.5";
  slider.max = "1.5";
  slider.step = "0.05";
  slider.value = String(getRate());
  const speedValue = document.createElement("span");
  speedValue.className = "ap-speed-value";
  speedValue.textContent = `${parseFloat(slider.value).toFixed(2)}x`;
  slider.addEventListener("input", () => {
    const rate = parseFloat(slider.value);
    setRate(rate);
    speedValue.textContent = `${rate.toFixed(2)}x`;
  });
  speedRow.append(speedLabel, slider, speedValue);
  body.appendChild(speedRow);

  // Mode buttons row
  const modeRow = document.createElement("div");
  modeRow.className = "audio-panel-mode";

  const normalBtn = document.createElement("button");
  normalBtn.type = "button";
  normalBtn.className = "ap-mode-btn ap-mode-active";
  normalBtn.textContent = "Normal";

  const blindBtn = document.createElement("button");
  blindBtn.type = "button";
  blindBtn.className = "ap-mode-btn";
  blindBtn.textContent = "Blind Listening";

  let blindMode = false;
  normalBtn.addEventListener("click", () => {
    blindMode = false;
    normalBtn.classList.add("ap-mode-active");
    blindBtn.classList.remove("ap-mode-active");
    body.classList.remove("ap-blind");
  });
  blindBtn.addEventListener("click", () => {
    blindMode = true;
    blindBtn.classList.add("ap-mode-active");
    normalBtn.classList.remove("ap-mode-active");
    body.classList.add("ap-blind");
  });

  // Selection buttons
  const selectAllBtn = document.createElement("button");
  selectAllBtn.type = "button";
  selectAllBtn.className = "ap-select-btn";
  selectAllBtn.textContent = "Select All";

  const selectNoneBtn = document.createElement("button");
  selectNoneBtn.type = "button";
  selectNoneBtn.className = "ap-select-btn";
  selectNoneBtn.textContent = "Select None";

  modeRow.append(normalBtn, blindBtn, selectAllBtn, selectNoneBtn);
  body.appendChild(modeRow);

  // Sentence groups
  const groupsContainer = document.createElement("div");
  groupsContainer.className = "ap-groups";
  const allCheckboxes: HTMLInputElement[] = [];
  const allItems: HTMLDivElement[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const groupEl = document.createElement("div");
    groupEl.className = "ap-group";

    // Group header with checkbox
    const header = document.createElement("div");
    header.className = "ap-group-header";
    const groupCb = document.createElement("input");
    groupCb.type = "checkbox";
    groupCb.checked = true;
    groupCb.className = "ap-group-cb";
    const groupLabel = document.createElement("span");
    groupLabel.className = "ap-group-label";
    groupLabel.textContent = `${gi + 1}. ${group.label} (${group.sentences.length})`;
    header.append(groupCb, groupLabel);
    groupEl.appendChild(header);

    // Sentence items
    const itemCheckboxes: HTMLInputElement[] = [];
    for (let si = 0; si < group.sentences.length; si++) {
      const sentence = group.sentences[si];
      const item = document.createElement("div");
      item.className = "ap-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.className = "ap-item-cb";

      const textSpan = document.createElement("span");
      textSpan.className = "ap-item-text";
      textSpan.textContent = sentence.display;

      item.append(cb, textSpan);
      groupEl.appendChild(item);

      cb.addEventListener("change", () => {
        // Update group checkbox
        const allChecked = itemCheckboxes.every(c => c.checked);
        const noneChecked = itemCheckboxes.every(c => !c.checked);
        groupCb.checked = allChecked;
        groupCb.indeterminate = !allChecked && !noneChecked;
      });

      itemCheckboxes.push(cb);
      allCheckboxes.push(cb);
      allItems.push(item);
    }

    // Group checkbox toggles all items
    groupCb.addEventListener("change", () => {
      for (const cb of itemCheckboxes) cb.checked = groupCb.checked;
      groupCb.indeterminate = false;
    });

    groupsContainer.appendChild(groupEl);
  }

  body.appendChild(groupsContainer);

  // Select All / Select None
  selectAllBtn.addEventListener("click", () => {
    for (const cb of allCheckboxes) cb.checked = true;
    body.querySelectorAll<HTMLInputElement>(".ap-group-cb").forEach(gcb => {
      gcb.checked = true;
      gcb.indeterminate = false;
    });
  });
  selectNoneBtn.addEventListener("click", () => {
    for (const cb of allCheckboxes) cb.checked = false;
    body.querySelectorAll<HTMLInputElement>(".ap-group-cb").forEach(gcb => {
      gcb.checked = false;
      gcb.indeterminate = false;
    });
  });

  // Transport controls
  const transport = document.createElement("div");
  transport.className = "audio-panel-transport";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "ap-play-btn";
  playBtn.innerHTML = "&#9654; Play Selected";

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "ap-stop-btn";
  stopBtn.innerHTML = "&#9632; Stop";
  stopBtn.disabled = true;

  transport.append(playBtn, stopBtn);
  body.appendChild(transport);

  // Now-playing bar
  const nowPlaying = document.createElement("div");
  nowPlaying.className = "audio-panel-now-playing";
  nowPlaying.style.display = "none";
  body.appendChild(nowPlaying);

  // Build flat sentence list for lookup
  const flatSentences: SentenceItem[] = [];
  for (const g of groups) flatSentences.push(...g.sentences);

  let cancelFn: (() => void) | null = null;

  function startPlaying() {
    // Collect selected sentences
    const selected: { text: string; display: string; index: number }[] = [];
    for (let i = 0; i < allCheckboxes.length; i++) {
      if (allCheckboxes[i].checked) {
        selected.push({ ...flatSentences[i], index: i });
      }
    }
    if (selected.length === 0) return;

    playBtn.disabled = true;
    stopBtn.disabled = false;
    nowPlaying.style.display = "";

    cancelFn = speakSequence(
      selected.map(s => s.text),
      {
        onStart(seqIndex) {
          // Remove previous highlight
          allItems.forEach(item => item.classList.remove("ap-item-active"));
          const globalIndex = selected[seqIndex].index;
          allItems[globalIndex].classList.add("ap-item-active");
          // Scroll active item into view
          allItems[globalIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });

          const displayText = blindMode ? "..." : selected[seqIndex].display;
          nowPlaying.textContent = `Now playing: ${displayText}  ${seqIndex + 1} / ${selected.length}`;
        },
        onDone() {
          resetTransport();
        },
      }
    );
  }

  function resetTransport() {
    cancelFn = null;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    nowPlaying.style.display = "none";
    nowPlaying.textContent = "";
    allItems.forEach(item => item.classList.remove("ap-item-active"));
  }

  playBtn.addEventListener("click", startPlaying);
  stopBtn.addEventListener("click", () => {
    if (cancelFn) cancelFn();
    stopAll();
    resetTransport();
  });

  return details;
}
