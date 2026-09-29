# Historic Pauper Deck Checker

A static site that checks an MTG Arena deck export against the Historic Pauper rules:
every card must be legal in Historic and craftable with a common wildcard on Arena,
minus the HP ban list (`src/rules.ts`).

The legal card pool is downloaded from Scryfall at build time into `cards.json`
(`game:arena legal:historic rarity:c`). Cards outside the pool are looked up live on
Scryfall to explain why they're not legal.

## Development

```sh
npm install
npm run fetch-cards   # writes public/cards.json
npm run dev
npm test
```

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`
and daily, so the card pool stays current. In the repository settings, set
**Pages → Build and deployment → Source** to **GitHub Actions**.
