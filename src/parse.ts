export type Section = "main" | "side" | "commander" | "companion";

export interface ParsedDeck {
  sections: Record<Section, Map<string, number>>;
  problems: string[];
}

const HEADERS: Record<string, Section> = {
  deck: "main",
  sideboard: "side",
  commander: "commander",
  companion: "companion",
};

// "4 Lightning Bolt (STA) 42", "4 Lightning Bolt", "4x Lightning Bolt"
const LINE_RE = /^(\d+)x?\s+(.+?)(?:\s+\([A-Za-z0-9_]+\)(?:\s+\S+)?)?\s*$/;

/** Arena sometimes writes split cards with a single slash. */
function normalizeName(name: string): string {
  return name.trim().replace(/\s*\/{1,2}\s*/g, " // ");
}

/** Parse a deck in MTG Arena export format. */
export function parseDeck(text: string): ParsedDeck {
  const sections: Record<Section, Map<string, number>> = {
    main: new Map(),
    side: new Map(),
    commander: new Map(),
    companion: new Map(),
  };
  const problems: string[] = [];
  let section: Section = "main";
  let explicitHeaders = false;
  let seenCards = false;
  let inAbout = false;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      // Without headers, Arena separates the sideboard with a blank line.
      if (!explicitHeaders && seenCards && section === "main") section = "side";
      inAbout = false;
      return;
    }
    const header = line.toLowerCase().replace(/:$/, "");
    if (header in HEADERS) {
      section = HEADERS[header];
      explicitHeaders = true;
      inAbout = false;
      return;
    }
    if (header === "about") {
      inAbout = true;
      return;
    }
    if (inAbout || line.startsWith("//") || line.startsWith("#")) return;

    const m = LINE_RE.exec(line);
    if (!m) {
      problems.push(`Line ${i + 1}: could not parse "${line}"`);
      return;
    }
    const name = normalizeName(m[2]);
    const cards = sections[section];
    cards.set(name, (cards.get(name) ?? 0) + Number(m[1]));
    seenCards = true;
  });

  return { sections, problems };
}
