/**
 * Extract vocabulary from MDX files and generate flashcard-decks.ts
 * Run with: node scripts/extract-flashcard-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const DOCS = "src/content/docs";

// Files to extract from, with display names
const SOURCES = [
  { file: "vocabulary/01-greetings-basics.mdx", name: "Greetings & Basics" },
  { file: "vocabulary/02-numbers.mdx", name: "Numbers" },
  { file: "vocabulary/03-time-days-months.mdx", name: "Time, Days & Months" },
  { file: "vocabulary/04-colors-shapes.mdx", name: "Colors & Shapes" },
  { file: "vocabulary/05-family-people.mdx", name: "Family & People" },
  { file: "vocabulary/06-food-drink.mdx", name: "Food & Drink" },
  { file: "vocabulary/07-house-home.mdx", name: "House & Home" },
  { file: "vocabulary/08-travel-directions.mdx", name: "Travel & Directions" },
  { file: "vocabulary/09-shopping-money.mdx", name: "Shopping & Money" },
  { file: "vocabulary/10-body-health.mdx", name: "Body & Health" },
  { file: "vocabulary/11-weather-nature.mdx", name: "Weather & Nature" },
  { file: "vocabulary/12-work-school.mdx", name: "Work & School" },
  { file: "vocabulary/cognates.mdx", name: "Cognates" },
  { file: "vocabulary/false-friends.mdx", name: "False Friends" },
  { file: "phrases/survival-dutch.mdx", name: "Survival Phrases" },
  { file: "phrases/everyday.mdx", name: "Everyday Phrases" },
  { file: "phrases/questions.mdx", name: "Question Words" },
  { file: "phrases/idioms-expressions.mdx", name: "Idioms & Expressions" },
  { file: "vocabulary/cefr-a1.mdx", name: "CEFR A1" },
  { file: "vocabulary/cefr-a2.mdx", name: "CEFR A2" },
  { file: "phrases/fun-stories.mdx", name: "Fun Stories" },
  { file: "phrases/audio-stories.mdx", name: "Audio Stories" },
  { file: "phrases/dialogues.mdx", name: "Dialogues" },
  { file: "phrases/connected-stories.mdx", name: "Connected Stories" },
];

// Column headers that contain Dutch text
const DUTCH_HEADERS = new Set([
  "dutch", "dutch word", "dutch expression", "dutch phrase",
  "example", "example sentence", "example sentences",
  "dialogue", "infinitive", "word", "diminutive",
  "singular", "plural", "original", "conjugation",
  "stem", "correct stem", "statement", "question",
  "tag", "example question", "example answer",
  "raw stem", "position 1", "verb", "subject", "rest",
  "example words", "proof (vowel follows)",
]);

// Column headers that contain English text
const ENGLISH_HEADERS = new Set([
  "english", "meaning", "translation", "english meaning",
  "literal meaning", "context", "actual meaning",
  "what it actually means", "english equivalent",
]);

// Column headers that contain IPA
const IPA_HEADERS = new Set(["ipa", "pronunciation"]);

function parseTable(lines) {
  // Find header row (first row with |)
  const headerLine = lines[0];
  if (!headerLine || !headerLine.includes("|")) return [];

  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip separator line (|---|---|...)
  const dataLines = lines.slice(2);

  // Find column indices
  let dutchCol = -1;
  let englishCol = -1;
  let ipaCol = -1;

  headers.forEach((h, i) => {
    const lower = h.replace(/\*\*/g, "").trim().toLowerCase();
    if (dutchCol === -1 && DUTCH_HEADERS.has(lower)) dutchCol = i;
    if (englishCol === -1 && ENGLISH_HEADERS.has(lower)) englishCol = i;
    if (ipaCol === -1 && IPA_HEADERS.has(lower)) ipaCol = i;
  });

  if (dutchCol === -1) return [];

  const entries = [];
  for (const line of dataLines) {
    if (!line.includes("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length); // Remove empty first/last from leading/trailing |

    const dutch = cleanText(cells[dutchCol] || "");
    const english = englishCol >= 0 ? cleanText(cells[englishCol] || "") : "";
    const ipa = ipaCol >= 0 ? cleanIPA(cells[ipaCol] || "") : "";

    if (dutch && dutch.length > 0 && !dutch.startsWith("#") && english) {
      entries.push({ dutch, english, ipa });
    }
  }
  return entries;
}

function cleanText(text) {
  return text
    .replace(/\*\*/g, "") // Remove bold markers
    .replace(/\*/g, "") // Remove italic markers
    .replace(/`/g, "") // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url) -> link
    .replace(/\s+/g, " ")
    .trim();
}

function cleanIPA(text) {
  return text
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function extractFromFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const tables = [];
  let currentTable = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(trimmed);
    } else {
      if (inTable && currentTable.length > 0) {
        tables.push([...currentTable]);
        currentTable = [];
      }
      inTable = false;
    }
  }
  if (currentTable.length > 0) {
    tables.push(currentTable);
  }

  const allEntries = [];
  for (const table of tables) {
    const entries = parseTable(table);
    allEntries.push(...entries);
  }
  return allEntries;
}

// Main
const decks = [];
const seenDutch = new Set();
let totalCards = 0;

for (const source of SOURCES) {
  const filePath = join(DOCS, source.file);
  try {
    const entries = extractFromFile(filePath);
    // Deduplicate within each deck
    const unique = [];
    for (const entry of entries) {
      const key = entry.dutch.toLowerCase();
      if (!seenDutch.has(key)) {
        seenDutch.add(key);
        unique.push(entry);
      }
    }
    if (unique.length > 0) {
      decks.push({ name: source.name, words: unique });
      totalCards += unique.length;
      process.stdout.write(`  ${source.name}: ${unique.length} cards (${entries.length} total, ${entries.length - unique.length} duplicates removed)\n`);
    }
  } catch (e) {
    console.error(`  ERROR reading ${source.file}: ${e.message}`);
  }
}

process.stdout.write(`\nTotal: ${totalCards} unique cards across ${decks.length} decks\n`);
console.log('Note: CEFR A1/A2 decks show fewer cards than source due to cross-deck deduplication (A1: ~86/298, A2: ~297/549).');

// Generate TypeScript file
const tsLines = [
  "// Auto-generated by scripts/extract-flashcard-data.mjs",
  "// Run: node scripts/extract-flashcard-data.mjs",
  "",
  "export interface Word {",
  "  dutch: string;",
  "  english: string;",
  "  ipa: string;",
  "}",
  "",
  "export interface Deck {",
  "  name: string;",
  "  words: Word[];",
  "}",
  "",
  "export const DECKS: Deck[] = [",
];

for (const deck of decks) {
  tsLines.push(`  {`);
  tsLines.push(`    name: ${JSON.stringify(deck.name)},`);
  tsLines.push(`    words: [`);
  for (const word of deck.words) {
    tsLines.push(
      `      { dutch: ${JSON.stringify(word.dutch)}, english: ${JSON.stringify(word.english)}, ipa: ${JSON.stringify(word.ipa)} },`
    );
  }
  tsLines.push(`    ],`);
  tsLines.push(`  },`);
}

tsLines.push("];");
tsLines.push("");

writeFileSync("src/data/flashcard-decks.ts", tsLines.join("\n"));
process.stdout.write(`\nWrote src/data/flashcard-decks.ts\n`);
