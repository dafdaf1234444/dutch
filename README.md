# Dutch

Interactive Dutch language learning site with pronunciation, flashcards, and grammar exercises.

**[Visit the live site →](https://dafdaf1234444.github.io/dutch/)**

## Features

- 36 content pages covering vocabulary, grammar, phrases, and dialogues
- Audio pronunciation for every Dutch word and sentence (Web Speech API)
- IPA phonetic transcriptions displayed inline below Dutch text
- 1,615+ flashcards across 23 topic decks
- Five practice modes: Dutch→English, English→Dutch, Mixed, Listen, and Dictation
- Per-page flashcard widgets for focused practice
- Audio player panel with speed control and blind listening mode
- Exam preparation with reading comprehension and grammar quizzes
- CEFR A1 and A2 word lists

## Development

```bash
npm install
npm run dev       # Dev server at localhost:4321
npm run build     # Production build to ./dist/
npm run preview   # Preview production build
```

## Deployment

The site auto-deploys to GitHub Pages on every push to `main` via GitHub Actions.

## Tech Stack

- [Astro 5](https://astro.build/) + [Starlight](https://starlight.astro.build/) documentation theme
- Web Speech API for Dutch pronunciation (browser-native, no backend)
- TypeScript (strict mode)
