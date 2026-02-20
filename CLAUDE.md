# Dutch Learning Website

Interactive Dutch language learning site built with **Astro 5 + Starlight**.

## Quick Start

```bash
npm install
npm run dev          # Dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview production build
```

## Project Structure

```
src/
├── components/
│   ├── DutchAudio.astro      # Auto-injects speaker buttons into tables & dialogues
│   ├── FlashcardApp.astro    # Main flashcard practice app (20 decks, 1,277 cards)
│   ├── PageFlashcards.astro  # Per-page flashcard widget (auto-extracts from tables)
│   ├── Say.astro             # Inline pronunciation button: <Say text="hallo" />
│   └── ExternalLinks.astro   # Opens external links in new tabs
├── content/docs/             # All content pages (MDX)
│   ├── index.mdx             # Homepage with learning path
│   ├── grammar/              # 4 grammar pages
│   ├── phrases/              # 6 phrase/dialogue pages
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

<DutchAudio />

| Dutch | English | IPA | Example Sentence |
|-------|---------|-----|------------------|
| hallo | hello | `/ˈhɑloː/` | Hallo, hoe gaat het? |

<PageFlashcards />
```

- `<DutchAudio />` must be on its own line after imports
- `<PageFlashcards />` goes at the end of the file
- IPA wrapped in backticks: `` `/ˈhɑloː/` ``

### Audio System (DutchAudio.astro)

Auto-injects speaker buttons into table cells and blockquote dialogues using Web Speech API (`nl-NL`, rate 0.9).

**Recognized table headers** (case-insensitive):
`dutch`, `dutch word`, `dutch expression`, `dutch phrase`, `example`, `example sentence`, `example sentences`, `dialogue`, `infinitive`, `word`, `diminutive`, `singular`, `plural`, `original`, `conjugation`, `stem`, `correct stem`, `statement`, `question`, `inversion`, `ik`, `jij`, `hij/zij/het`, `wij`, `sentence`, `base verb`, `prefix`, `normal`, `inverted (question)`, `example question`, `example answer`, `tag`, `name`, `spelling`

**Dialogue format** (auto-detected in blockquotes):
```markdown
> **Anna:** Hallo! Hoe gaat het? *(Hello! How are you?)*
> **Mark:** Goed, dank je. *(Good, thank you.)*
```

English in `*(italics)*` or `(parentheses)` is stripped before speaking.

### Flashcard System

Two independent extraction mechanisms:

1. **Global** (FlashcardApp): `node scripts/extract-flashcard-data.mjs` generates `src/data/flashcard-decks.ts` from 20 MDX files
2. **Per-page** (PageFlashcards): Reads DOM tables at runtime, no pre-processing needed

To add words to global flashcards: update MDX tables, then re-run the extraction script.

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
