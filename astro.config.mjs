import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://dafdaf1234444.github.io",
  base: "/dutch",
  integrations: [
    starlight({
      title: "Dutch",
      pagination: false,
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Alphabet", slug: "alphabet" },
            { label: "Pronunciation Guide", slug: "pronunciation-guide" },
            { label: "Phonetics Guide (IPA)", slug: "phonetics-guide" },
          ],
        },
        {
          label: "Grammar",
          items: [
            { label: "Articles: de & het", slug: "grammar/articles-de-het" },
            { label: "Verbs: Present Tense", slug: "grammar/verbs-present-tense" },
            { label: "Word Order", slug: "grammar/word-order" },
            { label: "Diminutives", slug: "grammar/diminutives" },
            { label: "Patterns & Rules", slug: "grammar/patterns-rules" },
            { label: "Grammar in Action", slug: "grammar/grammar-in-action" },
          ],
        },
        {
          label: "Phrases & Dialogues",
          items: [
            { label: "Survival Dutch", slug: "phrases/survival-dutch" },
            { label: "Everyday Phrases", slug: "phrases/everyday" },
            { label: "Questions", slug: "phrases/questions" },
            { label: "Idioms & Expressions", slug: "phrases/idioms-expressions" },
            { label: "Dialogues", slug: "phrases/dialogues" },
            { label: "Audio Stories", slug: "phrases/audio-stories" },
            { label: "Fun Stories", slug: "phrases/fun-stories" },
          ],
        },
        {
          label: "Vocabulary",
          items: [
            { label: "Greetings & Basics", slug: "vocabulary/01-greetings-basics" },
            { label: "Numbers", slug: "vocabulary/02-numbers" },
            { label: "Time, Days & Months", slug: "vocabulary/03-time-days-months" },
            { label: "Colors & Shapes", slug: "vocabulary/04-colors-shapes" },
            { label: "Family & People", slug: "vocabulary/05-family-people" },
            { label: "Food & Drink", slug: "vocabulary/06-food-drink" },
            { label: "House & Home", slug: "vocabulary/07-house-home" },
            { label: "Travel & Directions", slug: "vocabulary/08-travel-directions" },
            { label: "Shopping & Money", slug: "vocabulary/09-shopping-money" },
            { label: "Body & Health", slug: "vocabulary/10-body-health" },
            { label: "Weather & Nature", slug: "vocabulary/11-weather-nature" },
            { label: "Work & School", slug: "vocabulary/12-work-school" },
            { label: "Cognates", slug: "vocabulary/cognates" },
            { label: "False Friends", slug: "vocabulary/false-friends" },
          ],
        },
        {
          label: "Exams & Practice",
          items: [
            { label: "Flashcards", slug: "flashcards" },
            { label: "Exam Practice", slug: "exam-practice" },
            { label: "CEFR A1 Word List", slug: "vocabulary/cefr-a1" },
            { label: "CEFR A2 Word List", slug: "vocabulary/cefr-a2" },
          ],
        },
        {
          label: "Resources",
          items: [
            { label: "Links & Tools", slug: "resources" },
          ],
        },
      ],
    }),
  ],
});
