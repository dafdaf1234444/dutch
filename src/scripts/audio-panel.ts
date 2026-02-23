/**
 * Audio Player Panel — collapsible panel with speed slider (up to 3x),
 * blind listening, sentence group selection, play/stop/next/prev/repeat,
 * click-to-start-from, IPA display, and now-playing indicator.
 */
import { speakSequence, getRate, setRate, stopAll, type SequenceController } from "./dutch-speech";

export interface SentenceItem {
  text: string;
  display: string;
  ipa?: string;
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
  slider.max = "3.0";
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

  // Build flat sentence list for lookup
  const flatSentences: SentenceItem[] = [];

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
      flatSentences.push(sentence);
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

      // Show IPA if available
      if (sentence.ipa) {
        const ipaSpan = document.createElement("span");
        ipaSpan.className = "ap-item-ipa";
        ipaSpan.textContent = sentence.ipa;
        item.appendChild(ipaSpan);
      }

      groupEl.appendChild(item);

      cb.addEventListener("change", () => {
        // Update group checkbox
        const allChecked = itemCheckboxes.every(c => c.checked);
        const noneChecked = itemCheckboxes.every(c => !c.checked);
        groupCb.checked = allChecked;
        groupCb.indeterminate = !allChecked && !noneChecked;
      });

      // Click on sentence text to start playback from this point
      textSpan.addEventListener("click", () => {
        startPlayingFrom(allCheckboxes.indexOf(cb));
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

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "ap-transport-btn ap-prev-btn";
  prevBtn.innerHTML = "&#9664; Prev";
  prevBtn.disabled = true;

  const repeatBtn = document.createElement("button");
  repeatBtn.type = "button";
  repeatBtn.className = "ap-transport-btn ap-repeat-btn";
  repeatBtn.innerHTML = "&#8634; Repeat";
  repeatBtn.disabled = true;

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "ap-play-btn";
  playBtn.innerHTML = "&#9654; Play Selected";

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "ap-stop-btn";
  stopBtn.innerHTML = "&#9632; Stop";
  stopBtn.disabled = true;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "ap-transport-btn ap-next-btn";
  nextBtn.innerHTML = "Next &#9654;";
  nextBtn.disabled = true;

  transport.append(prevBtn, repeatBtn, playBtn, stopBtn, nextBtn);
  body.appendChild(transport);

  // Now-playing bar
  const nowPlaying = document.createElement("div");
  nowPlaying.className = "audio-panel-now-playing";
  nowPlaying.style.display = "none";
  body.appendChild(nowPlaying);

  let controller: SequenceController | null = null;

  function getSelectedSentences(): { text: string; display: string; ipa?: string; index: number }[] {
    const selected: { text: string; display: string; ipa?: string; index: number }[] = [];
    for (let i = 0; i < allCheckboxes.length; i++) {
      if (allCheckboxes[i].checked) {
        selected.push({ ...flatSentences[i], index: i });
      }
    }
    return selected;
  }

  function setTransportActive(active: boolean) {
    prevBtn.disabled = !active;
    repeatBtn.disabled = !active;
    nextBtn.disabled = !active;
    playBtn.disabled = active;
    stopBtn.disabled = !active;
  }

  function startPlaying() {
    startPlayingFrom(-1);
  }

  function startPlayingFrom(globalIndex: number) {
    const selected = getSelectedSentences();
    if (selected.length === 0) return;

    // Find starting sequence index from global index
    let startIndex = 0;
    if (globalIndex >= 0) {
      const seqIdx = selected.findIndex(s => s.index === globalIndex);
      if (seqIdx >= 0) startIndex = seqIdx;
    }

    setTransportActive(true);
    nowPlaying.style.display = "";

    controller = speakSequence(
      selected.map(s => s.text),
      {
        startIndex,
        onStart(seqIndex) {
          // Remove previous highlight
          allItems.forEach(item => item.classList.remove("ap-item-active"));
          const gIdx = selected[seqIndex].index;
          allItems[gIdx].classList.add("ap-item-active");
          // Scroll active item into view
          allItems[gIdx].scrollIntoView({ block: "nearest", behavior: "smooth" });

          const displayText = blindMode ? "..." : selected[seqIndex].display;
          const ipaText = selected[seqIndex].ipa && !blindMode ? ` ${selected[seqIndex].ipa}` : "";
          nowPlaying.textContent = `Now playing: ${displayText}${ipaText}  ${seqIndex + 1} / ${selected.length}`;
        },
        onDone() {
          resetTransport();
        },
      }
    );
  }

  function resetTransport() {
    controller = null;
    setTransportActive(false);
    nowPlaying.style.display = "none";
    nowPlaying.textContent = "";
    allItems.forEach(item => item.classList.remove("ap-item-active"));
  }

  playBtn.addEventListener("click", startPlaying);
  stopBtn.addEventListener("click", () => {
    if (controller) controller.cancel();
    stopAll();
    resetTransport();
  });
  prevBtn.addEventListener("click", () => {
    if (controller) controller.prev();
  });
  nextBtn.addEventListener("click", () => {
    if (controller) controller.next();
  });
  repeatBtn.addEventListener("click", () => {
    if (controller) controller.repeat();
  });

  return details;
}
