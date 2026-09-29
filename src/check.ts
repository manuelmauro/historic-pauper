import type { ParsedDeck } from "./parse.ts";
import { BANNED, HISTORIC_ILLEGAL, MAX_COPIES, MAX_SIDEBOARD, MIN_MAIN } from "./rules.ts";
import type { CardEntry } from "./types.ts";

export interface CardResult {
  name: string;
  main: number;
  side: number;
  /** Undefined when the card is legal. */
  problem?: string;
}

export interface CheckResult {
  legal: boolean;
  mainCount: number;
  sideCount: number;
  cards: CardResult[];
  deckProblems: string[];
  parseProblems: string[];
}

/** Explains why a card outside the legal pool is not legal (e.g. by asking Scryfall). */
export type Explainer = (name: string) => Promise<string>;

export type CardIndex = Map<string, CardEntry>;

/** Index the legal pool by lowercase full name and face name. */
export function buildIndex(cards: CardEntry[]): CardIndex {
  const index: CardIndex = new Map();
  for (const card of cards) {
    for (const key of [card.name, ...card.faces]) {
      const k = key.toLowerCase();
      if (!index.has(k)) index.set(k, card);
    }
  }
  return index;
}

/** Rebalanced cards are exported as "A-Name"; rebalancing never changes rarity. */
function baseName(name: string): string {
  return name.toLowerCase().replace(/^a-/, "");
}

function lookup(name: string, index: CardIndex): CardEntry | undefined {
  return index.get(name.toLowerCase()) ?? index.get(baseName(name));
}

const banned = new Set(BANNED.map((n) => n.toLowerCase()));
const historicIllegal = new Set(HISTORIC_ILLEGAL.map((n) => n.toLowerCase()));

export async function checkDeck(deck: ParsedDeck, index: CardIndex, explain: Explainer): Promise<CheckResult> {
  const { main, side, commander, companion } = deck.sections;
  const names = new Set([...main.keys(), ...side.keys(), ...commander.keys(), ...companion.keys()]);

  const cards = await Promise.all(
    [...names].map(async (name): Promise<CardResult> => {
      const result: CardResult = { name, main: main.get(name) ?? 0, side: side.get(name) ?? 0 };
      const base = baseName(name);
      if (banned.has(base)) {
        result.problem = "Banned in Historic Pauper";
        return result;
      }
      if (historicIllegal.has(base)) {
        result.problem = "Not legal in Historic (allowed in Midweek Magic, not in Community Bo3 HP)";
        return result;
      }
      const card = lookup(name, index);
      if (!card) {
        result.problem = await explain(name);
        return result;
      }
      const copies = result.main + result.side;
      if (copies > MAX_COPIES && !card.basic && !card.anyNumber) {
        result.problem = `${copies} copies across main deck and sideboard (max ${MAX_COPIES})`;
      }
      return result;
    }),
  );

  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  const mainCount = sum(main);
  const sideCount = sum(side);
  const deckProblems: string[] = [];
  if (mainCount < MIN_MAIN) deckProblems.push(`Main deck has ${mainCount} cards (minimum ${MIN_MAIN})`);
  if (sideCount > MAX_SIDEBOARD) deckProblems.push(`Sideboard has ${sideCount} cards (maximum ${MAX_SIDEBOARD})`);
  if (commander.size) deckProblems.push("Deck has a Commander section; Historic Pauper is not a commander format");

  return {
    legal: deckProblems.length === 0 && cards.every((c) => !c.problem),
    mainCount,
    sideCount,
    cards,
    deckProblems,
    parseProblems: deck.problems,
  };
}
