// Downloads the Historic Pauper card pool from Scryfall into public/cards.json.
import { mkdir, writeFile } from "node:fs/promises";
import { LEGAL_POOL_QUERY } from "../src/rules.ts";
import { SCRYFALL, scryfallGet, toCardEntry, type ScryfallCard } from "../src/scryfall.ts";
import type { CardEntry, CardPool } from "../src/types.ts";

interface SearchPage {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
  total_cards: number;
}

const headers = { "User-Agent": "historic-pauper-checker/1.0" };
const params = new URLSearchParams({ q: LEGAL_POOL_QUERY, unique: "cards", order: "name" });
let url: string | undefined = `${SCRYFALL}/cards/search?${params}`;
const cards: CardEntry[] = [];

while (url) {
  const page: SearchPage | null = await scryfallGet<SearchPage>(url, headers);
  if (!page) throw new Error(`No results for ${url}`);
  cards.push(...page.data.map(toCardEntry));
  console.log(`${cards.length}/${page.total_cards}`);
  url = page.has_more ? page.next_page : undefined;
}

const pool: CardPool = { updated: new Date().toISOString(), query: LEGAL_POOL_QUERY, cards };
await mkdir("public", { recursive: true });
await writeFile("public/cards.json", JSON.stringify(pool));
console.log(`Wrote ${cards.length} cards to public/cards.json`);
