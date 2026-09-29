import { buildIndex, checkDeck, type CardIndex, type CheckResult } from "./check.ts";
import { parseDeck } from "./parse.ts";
import { BANNED, HISTORIC_ILLEGAL } from "./rules.ts";
import { explainNotLegal } from "./scryfall.ts";
import type { CardPool } from "./types.ts";

const STORAGE_KEY = "historic-pauper:deck";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const deckInput = $<HTMLTextAreaElement>("deck");
const button = $<HTMLButtonElement>("check");
const poolInfo = $<HTMLSpanElement>("pool-info");
const resultEl = $<HTMLElement>("result");

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function listNames(id: string, names: string[]) {
  $(id).replaceChildren(...names.map((n) => el("li", undefined, n)));
}

function scryfallLink(name: string) {
  const a = el("a", undefined, name);
  a.href = `https://scryfall.com/search?q=${encodeURIComponent(`!"${name.replace(/^A-/, "")}"`)}`;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function render(result: CheckResult) {
  const banner = el("div", `banner ${result.legal ? "ok" : "bad"}`);
  banner.append(
    el("strong", undefined, result.legal ? "Legal for Historic Pauper" : "Not legal for Historic Pauper"),
    el("span", "muted", `Main deck ${result.mainCount} · Sideboard ${result.sideCount}`),
  );

  const nodes: HTMLElement[] = [banner];

  const notes = [...result.deckProblems, ...result.parseProblems];
  if (notes.length) {
    const ul = el("ul", "notes");
    for (const p of result.deckProblems) ul.append(el("li", "bad", p));
    for (const p of result.parseProblems) ul.append(el("li", "warn", p));
    nodes.push(ul);
  }

  const cards = [...result.cards].sort((a, b) => Number(!!b.problem) - Number(!!a.problem));
  const table = el("table");
  const head = el("tr");
  for (const h of ["", "Card", "Main", "Side", ""]) head.append(el("th", undefined, h));
  table.append(el("thead"), el("tbody"));
  table.tHead!.append(head);
  for (const c of cards) {
    const row = el("tr", c.problem ? "bad" : "ok");
    row.append(
      el("td", "mark", c.problem ? "✕" : "✓"),
      el("td"),
      el("td", "num", c.main ? String(c.main) : ""),
      el("td", "num", c.side ? String(c.side) : ""),
      el("td", "reason", c.problem ?? ""),
    );
    row.cells[1].append(scryfallLink(c.name));
    table.tBodies[0].append(row);
  }
  const wrap = el("div", "table-wrap");
  wrap.append(table);
  nodes.push(wrap);

  resultEl.replaceChildren(...nodes);
}

async function loadPool(): Promise<CardIndex> {
  const res = await fetch("./cards.json");
  if (!res.ok) throw new Error(`Could not load card pool (${res.status})`);
  const pool = (await res.json()) as CardPool;
  poolInfo.textContent = `${pool.cards.length.toLocaleString()} legal cards · updated ${new Date(pool.updated).toLocaleDateString()}`;
  return buildIndex(pool.cards);
}

listNames("banned", BANNED);
listNames("historic-illegal", HISTORIC_ILLEGAL);

try {
  deckInput.value = localStorage.getItem(STORAGE_KEY) ?? "";
} catch {
  // Storage unavailable; start empty.
}
deckInput.addEventListener("input", () => {
  try {
    localStorage.setItem(STORAGE_KEY, deckInput.value);
  } catch {
    // Ignore.
  }
});

loadPool().then(
  (index) => {
    button.disabled = false;
    button.textContent = "Check deck";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const deck = parseDeck(deckInput.value);
      if (!Object.values(deck.sections).some((s) => s.size)) {
        resultEl.replaceChildren(el("p", "warn", "No cards found. Paste a deck exported from MTG Arena."));
        return;
      }
      button.disabled = true;
      button.textContent = "Checking…";
      try {
        render(await checkDeck(deck, index, explainNotLegal));
      } finally {
        button.disabled = false;
        button.textContent = "Check deck";
      }
    });
  },
  (err: Error) => {
    button.textContent = "Unavailable";
    resultEl.replaceChildren(el("p", "warn", err.message));
  },
);
