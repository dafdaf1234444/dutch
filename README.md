# Dutch Learning

A Dutch language learning website built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/). Features vocabulary tables with audio pronunciation, grammar guides, flashcard practice, exam preparation, and more.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:4321` in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── components/
│   ├── DutchAudio.astro      # Auto-injects speaker buttons into tables & dialogues
│   ├── FlashcardApp.astro     # Interactive flashcard practice component
│   └── Say.astro              # Inline pronunciation button component
├── content/docs/
│   ├── index.mdx              # Homepage
│   ├── alphabet.mdx           # Dutch alphabet with pronunciation
│   ├── pronunciation-guide.mdx
│   ├── phonetics-guide.mdx    # IPA charts and drills
│   ├── exam-practice.mdx      # KNM, reading, grammar, vocab quizzes
│   ├── flashcards.mdx         # Flashcard practice page
│   ├── resources.mdx          # Links and tools
│   ├── grammar/               # Articles, verbs, word order, diminutives
│   ├── phrases/               # Survival Dutch, everyday, questions, idioms, dialogues, audio stories
│   └── vocabulary/            # 12 topic pages + cognates, false friends, CEFR A1/A2 word lists
├── styles/
│   └── custom.css             # Speaker button styles, table optimizations
└── content.config.ts          # Astro content collection config
astro.config.mjs               # Starlight sidebar and site config
tsconfig.json                  # TypeScript config with @components alias
```

## Key Features

- **Audio pronunciation** — Every Dutch word and sentence has a speaker button (Web Speech API, `nl-NL`). The `DutchAudio` component auto-injects buttons based on table column headers.
- **Flashcard practice** — Multi-topic selector with 15 categories and 175+ words. Select topics, shuffle, flip cards to reveal answers.
- **Exam preparation** — Reading comprehension, grammar exercises, vocabulary quizzes, KNM questions.
- **CEFR word lists** — Comprehensive A1 and A2 vocabulary with IPA and example sentences.
- **Audio stories** — Short Dutch stories for listening comprehension practice.

## Adding Content

Content pages are MDX files in `src/content/docs/`. To add audio support to a page:

1. Import and include the DutchAudio component:
   ```mdx
   import DutchAudio from '@components/DutchAudio.astro';
   <DutchAudio />
   ```

2. Use recognized column headers in tables. These headers get automatic speaker buttons:
   - `Dutch`, `Dutch Word`, `Dutch Expression`, `Dutch Phrase`
   - `Example`, `Example Sentence`, `Example Question`, `Example Answer`
   - `Word`, `Diminutive`, `Singular`, `Plural`, `Conjugation`, `Infinitive`
   - `Ik`, `Jij`, `Hij/Zij/Het`, `Wij`
   - And more (see `AUDIO_HEADERS` in `DutchAudio.astro`)

3. Blockquote dialogues (lines with `**Name:** Dutch text`) also get audio buttons automatically.

4. Add the page to the sidebar in `astro.config.mjs`.

## Tech Stack

- **Astro 5** — Static site generator
- **Starlight** — Documentation theme with sidebar, search (Pagefind), dark mode
- **Web Speech API** — Browser-native Dutch text-to-speech
- **TypeScript** — Type-safe components and scripts
