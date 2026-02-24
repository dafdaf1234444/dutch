# Dutch

Interactive Dutch language learning site built with **Astro 5 + Starlight**.

**Live site:** https://dafdaf1234444.github.io/dutch/

## Quick Start

```bash
npm install
npm run dev              # Dev server at localhost:4321
npm run build            # Production build to ./dist/
npm run preview          # Preview production build
npm run check            # Type-check without building
npm run extract-flashcards  # Regenerate flashcard data from MDX
```

## Project Structure

```
src/
├── components/
│   ├── DutchAudio.astro      # Auto-injects speaker buttons into tables & dialogues
│   ├── FlashcardApp.astro    # Main flashcard practice app (24 decks, 1,752 cards)
│   ├── PageFlashcards.astro  # Per-page flashcard widget (stable DOM, auto-extracts)
│   ├── PageSummary.astro     # Server-rendered summary box (word count, topics, flashcard link)
│   ├── Say.astro             # Inline pronunciation button: <Say text="hallo" />
│   ├── ExamPractice.astro    # Interactive exam with live validation & scoring
│   └── ExternalLinks.astro   # Opens external links in new tabs
├── content/docs/             # All content pages (MDX)
│   ├── index.mdx             # Homepage with learning path
│   ├── grammar/              # 6 grammar pages
│   ├── phrases/              # 8 phrase/dialogue/story pages
│   ├── vocabulary/           # 14 vocabulary + 2 CEFR pages
│   ├── flashcards.mdx        # Standalone flashcard page
│   ├── exam-practice.mdx     # Exam prep with MCQ
│   └── resources.mdx         # External links
├── data/
│   └── flashcard-decks.ts    # Auto-generated from extraction script
└── styles/
    └── custom.css            # Speaker button + table styles
scripts/
└── extract-flashcard-data.mjs  # Parses MDX tables → flashcard-decks.ts
```

## Key Patterns

### Content Pages

Every content page follows this pattern:

```mdx
---
title: Page Title
description: Brief description.
---

import DutchAudio from '@components/DutchAudio.astro';
import PageFlashcards from '@components/PageFlashcards.astro';
import PageSummary from '@components/PageSummary.astro';

<DutchAudio />
<PageSummary wordCount={55} topics={["Topic1", "Topic2", "Topic3"]} />

| Dutch | English | IPA | Example Sentence |
|-------|---------|-----|------------------|
| hallo | hello | `/ˈhɑloː/` | Hallo, hoe gaat het? |

<PageFlashcards />
```

- `<DutchAudio />` must be on its own line after imports
- `<PageSummary />` goes right after `<DutchAudio />` with word count and topic tags
- `<PageFlashcards />` goes at the end of the file
- IPA wrapped in backticks: `` `/ˈhɑloː/` ``

### Audio System (DutchAudio.astro)

Auto-injects speaker buttons into table cells and blockquote dialogues using Web Speech API.

**Voice selection:** `dutch-speech.ts` explicitly finds a Dutch voice via `speechSynthesis.getVoices()` with priority chain: `nl-NL` → `nl-BE` → `nl` → name contains "dutch"/"nederland". Handles async voice loading via `voiceschanged` event + polling fallback. Sets both `utter.lang` AND `utter.voice`.

**Recognized table headers** (case-insensitive):
`dutch`, `dutch word`, `dutch expression`, `dutch phrase`, `example`, `example sentence`, `example sentences`, `dialogue`, `infinitive`, `word`, `diminutive`, `singular`, `plural`, `original`, `conjugation`, `stem`, `correct stem`, `statement`, `question`, `inversion`, `ik`, `jij`, `hij/zij/het`, `wij`, `sentence`, `base verb`, `prefix`, `normal`, `inverted (question)`, `example question`, `example answer`, `tag`, `name`, `spelling`

**Dialogue format** (auto-detected in blockquotes):
```markdown
> **Anna:** Hallo! Hoe gaat het? *(Hello! How are you?)*
> **Mark:** Goed, dank je. *(Good, thank you.)*
```

**English text stripping:** Before speaking, the system strips:
- `<em>` elements (English translations in italics like `*(Hello!)*`)
- ALL parenthetical content containing ASCII letters (e.g., `(man)`, `(hello)`, `(to walk)`)
- IPA in slashes `/…/` and square brackets `[…]`
- Arrow symbols `→`

**Mobile:** Touch targets enlarge to 44px minimum on coarse-pointer (mobile) devices via `@media (pointer: coarse)`.

**Base path:** The site deploys to `/dutch/`. All internal links in MDX content must use the `/dutch/` prefix (e.g., `[link](/dutch/grammar/word-order/)`). Starlight handles sidebar links automatically but manually written markdown links need the prefix.

### IPA Coverage

All content pages now include IPA transcriptions in backtick format (`` `/ˈhɑloː/` ``). This covers vocabulary tables, grammar tables (verbs, diminutives, articles, word order, patterns), phrase pages, and dialogue pages. The extraction script picks up IPA columns automatically.

**Inline IPA display:** The `DutchAudio` component automatically relocates IPA from its own table column to small text below the Dutch word at render time (`relocateIPA()` function). This saves table width while keeping IPA visible. The IPA column headers (`IPA`, `Pronunciation`) are detected and hidden after relocation.

### Flashcard System

**Five practice modes:** Dutch→English, English→Dutch, Mixed, Listen (audio-only), Dictation (type what you hear with scoring).

**Progress features:**
- **Spaced repetition (light):** Cards are prioritized by difficulty — unseen and "Again" cards appear first, "Easy" cards last
- **Difficulty rating:** After revealing each card, rate it Again/Hard/Easy (keyboard shortcuts: 1/2/3) to track mastery
- **Session summary:** End-of-practice screen shows stat cards (easy/hard/again counts), scrollable word list with color-coded ratings
- **Review hard words:** After completing a session, option to re-practice only words rated Again or Hard
- **Topic mastery:** Each topic card on the grid shows a mastery percentage and color-coded bar (green=easy, yellow=hard, red=again)
- **Favorites:** Heart icon on each card to bookmark difficult words; filter by favorites on topic grid
- **Progress persistence:** All card data (difficulty, reviews, favorites) and stats (lifetime reviews, streak) saved to localStorage
- **Stats display:** Review count and streak shown on topic grid and completion screen
- **Running tally:** Both FlashcardApp and PageFlashcards show colored easy/hard/again badges during practice, updating after each rating
- **PageFlashcards ratings:** Per-page flashcard widget also supports Again/Hard/Easy ratings with session summary, syncs to shared localStorage
- **PageFlashcards stable DOM:** Uses a skeleton built once in `connectedCallback()` with three screens (setup/practice/summary). `renderCard()` does targeted element updates only — no full innerHTML rebuild, preventing scroll position loss and layout jumps

Two independent extraction mechanisms:

1. **Global** (FlashcardApp): `npm run extract-flashcards` generates `src/data/flashcard-decks.ts` from 24 MDX files
2. **Per-page** (PageFlashcards): Reads DOM tables at runtime, no pre-processing needed

To add words to global flashcards: update MDX tables, then re-run the extraction script.

### Page Summary (PageSummary.astro)

Server-rendered Astro component (no client JS) showing a compact summary box at the top of each content page:
- Word count badge, topic tags, in-page link to flashcard practice
- Props: `wordCount` (number) and `topics` (string array)
- Placed after `<DutchAudio />` and before intro text on all content pages

### Connected Stories

Cross-topic A2-B1 narratives at `src/content/docs/phrases/connected-stories.mdx`. Five stories deliberately weaving vocabulary from 3-4+ topic areas each. Different from Audio Stories (simple A1 routines) and Fun Stories (funny scenarios with grammar notes).

### Exam Practice (ExamPractice.astro)

Interactive exam component with live validation. Supports three exercise types:
- **MCQ** (`.exam-mcq`): Multiple-choice with radio buttons, used for reading, vocabulary, KNM, and listening
- **Fill-in-blank** (`.exam-fill`): Text input with answer validation, accepts multiple correct answers via `|` separator
- **Word order** (`.exam-order`): Text input for sentence construction, accepts alternatives via `|`

Each section has its own Check button and score display. Scores persist to localStorage per section.

### Sidebar

All pages manually configured in `astro.config.mjs` sidebar array. No auto-discovery. New pages must be added there.

## Known Gotchas

- **MDX curly braces**: Inline `<script>` tags with `{}` break MDX parsing. Always move scripts into Astro components instead.
- **DutchAudio placement**: Must be rendered (not just imported) on each page that needs speaker buttons.
- **Flashcard data regeneration**: After editing vocabulary tables, run `node scripts/extract-flashcard-data.mjs` to update the global flashcard deck.
- **Starlight dark mode**: Components use `--sl-color-*` CSS variables for automatic dark mode support.
- **Large tables**: CEFR pages use `content-visibility: auto` in custom.css for performance.

## Adding Content

### New vocabulary page
1. Create `src/content/docs/vocabulary/new-topic.mdx` with standard template above
2. Add sidebar entry in `astro.config.mjs`
3. Add source to `SOURCES` in `scripts/extract-flashcard-data.mjs`
4. Run extraction: `node scripts/extract-flashcard-data.mjs`

### New grammar page
1. Create `src/content/docs/grammar/topic.mdx`
2. Use recognized table headers for conjugation tables
3. Use `<Say text="word" />` for inline pronunciation
4. Add sidebar entry in `astro.config.mjs`

## Tech Stack

- **Astro 5** + **Starlight** documentation theme
- **Web Speech API** for Dutch pronunciation (browser-native, no backend)
- **Pagefind** search (built into Starlight)
- **TypeScript** (strict mode)
- Path alias: `@components/*` → `./src/components/*`
