/** A card in the legal pool, trimmed down from Scryfall's card object. */
export interface CardEntry {
  name: string;
  /** Face names for split, adventure and double-faced cards. */
  faces: string[];
  basic: boolean;
  /** "A deck can have any number of cards named ..." */
  anyNumber: boolean;
}

export interface CardPool {
  updated: string;
  query: string;
  cards: CardEntry[];
}
