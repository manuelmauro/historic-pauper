import { describe, expect, it } from "vitest";
import { buildIndex, checkDeck } from "./check.ts";
import { parseDeck } from "./parse.ts";
import type { CardEntry } from "./types.ts";

const card = (name: string, extra: Partial<CardEntry> = {}): CardEntry => ({
  name,
  faces: name.includes(" // ") ? name.split(" // ") : [],
  basic: false,
  anyNumber: false,
  ...extra,
});

const index = buildIndex([
  card("Burst Lightning"),
  card("Kessig Flamebreather"),
  card("Mountain", { basic: true }),
  card("Bonecrusher Giant // Stomp"),
  card("Cranial Ram"),
]);
const explain = async () => "Not legal in Historic";

describe("parseDeck", () => {
  it("parses an Arena export with headers", () => {
    const { sections, problems } = parseDeck(
      "About\nName Burn\n\nDeck\n4 Burst Lightning (ZNR) 137\n2 Fire // Ice (MH3) 293\n\nSideboard\n2 Burst Lightning\n",
    );
    expect(problems).toEqual([]);
    expect([...sections.main]).toEqual([["Burst Lightning", 4], ["Fire // Ice", 2]]);
    expect([...sections.side]).toEqual([["Burst Lightning", 2]]);
  });

  it("treats a blank line as the sideboard separator without headers", () => {
    const { sections } = parseDeck("4 Burst Lightning\n\n1 Mountain\n");
    expect(sections.side.get("Mountain")).toBe(1);
  });

  it("reports unparseable lines", () => {
    expect(parseDeck("Deck\nfour Burst Lightning").problems).toHaveLength(1);
  });
});

describe("checkDeck", () => {
  it("accepts a legal deck, matching card faces and rebalanced names", async () => {
    const deck = parseDeck("Deck\n4 Burst Lightning\n4 Bonecrusher Giant\n1 A-Kessig Flamebreather\n51 Mountain");
    const result = await checkDeck(deck, index, explain);
    expect(result.cards.filter((c) => c.problem)).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("flags banned, historic-illegal, unknown and over-copied cards", async () => {
    const deck = parseDeck(
      "Deck\n4 Cranial Ram\n4 Brainstorm\n3 Burst Lightning\n1 Lightning Bolt\n48 Mountain\n\nSideboard\n2 Burst Lightning",
    );
    const result = await checkDeck(deck, index, explain);
    const problems = Object.fromEntries(result.cards.map((c) => [c.name, c.problem]));
    expect(problems["Cranial Ram"]).toMatch(/Banned/);
    expect(problems["Brainstorm"]).toMatch(/Not legal in Historic/);
    expect(problems["Burst Lightning"]).toMatch(/5 copies/);
    expect(problems["Lightning Bolt"]).toBe("Not legal in Historic");
    expect(problems["Mountain"]).toBeUndefined();
    expect(result.legal).toBe(false);
  });

  it("enforces deck and sideboard sizes", async () => {
    const result = await checkDeck(parseDeck("Deck\n40 Mountain\n\nSideboard\n16 Mountain"), index, explain);
    expect(result.deckProblems).toEqual([
      "Main deck has 40 cards (minimum 60)",
      "Sideboard has 16 cards (maximum 15)",
    ]);
  });
});
