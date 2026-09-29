import type { CardEntry } from "./types.ts";

export const SCRYFALL = "https://api.scryfall.com";

interface ScryfallFace {
  name?: string;
  oracle_text?: string;
}

export interface ScryfallCard extends ScryfallFace {
  name: string;
  type_line?: string;
  card_faces?: ScryfallFace[];
  legalities?: Record<string, string>;
}

// Scryfall allows about 2 requests per second on /cards/search and /cards/named.
const REQUEST_SPACING_MS = 500;

let queue = Promise.resolve();

/** GET a Scryfall URL, spacing requests as Scryfall asks. Resolves to null on 404. */
export function scryfallGet<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  const request = queue.then(async () => {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Scryfall ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  });
  queue = request.then(
    () => new Promise((r) => setTimeout(r, REQUEST_SPACING_MS)),
    () => new Promise((r) => setTimeout(r, REQUEST_SPACING_MS)),
  );
  return request;
}

export function toCardEntry(card: ScryfallCard): CardEntry {
  const faces = card.card_faces ?? [card];
  const oracle = faces.map((f) => f.oracle_text ?? "").join(" ");
  return {
    name: card.name,
    faces: faces.flatMap((f) => (f.name ? [f.name] : [])),
    basic: (card.type_line ?? "").includes("Basic"),
    anyNumber: oracle.includes("A deck can have any number of cards named"),
  };
}

/** Say why a card outside the legal pool isn't legal. */
export async function explainNotLegal(name: string): Promise<string> {
  try {
    const card = await scryfallGet<ScryfallCard>(`${SCRYFALL}/cards/named?exact=${encodeURIComponent(name)}`);
    if (!card) return "Unknown card name (typo?)";
    if (card.legalities?.historic !== "legal") return "Not legal in Historic";
    return "No common printing on MTG Arena";
  } catch {
    return "Not a Historic-legal common on MTG Arena";
  }
}
