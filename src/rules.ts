// Historic Pauper (HP) rules.

/** Scryfall query for every card that can be crafted with a common wildcard in Historic. */
export const LEGAL_POOL_QUERY = "game:arena legal:historic rarity:c";

/** Banned in Historic Pauper (all banned in Midweek Magic as of 5 May 2026). */
export const BANNED = [
  "Ancestral Mask",
  "Cranial Ram",
  "Galvanic Blast",
  "Kuldotha Rebirth",
  "Persistent Petitioners",
  "Refurbished Familiar",
  "Sneaky Snacker",
];

/** Not legal in Historic, so not legal in Community Bo3 HP (they were allowed in Midweek Magic). */
export const HISTORIC_ILLEGAL = [
  "Brainstorm",
  "Crop Rotation",
  "Daze",
  "Devoted Druid",
  "Frantic Search",
  "Preordain",
  "Seething Song",
];

export const MIN_MAIN = 60;
export const MAX_SIDEBOARD = 15;
export const MAX_COPIES = 4;
