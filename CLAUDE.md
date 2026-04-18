# Projet : Recherche Auto — Arbitrage Youngtimers FR→DE

Pipeline de détection d'opportunités d'arbitrage sur les youngtimers allemands vendus en France.

## Skill routing

Quand la requête correspond à un skill disponible, l'invoquer en priorité :

- Lancer un scan, optimiser le pipeline, diagnostiquer → `/superpower`
- Générer un dashboard, rapport HTML, fiche annonce → `/designer`

## Stack

- Node.js ESM (pas de CommonJS)
- Windows — chemins avec barres obliques inversées dans l'OS, mais Node.js accepte les forward slashes
- Variables d'env dans `.env` (non commité) — dotenv chargé manuellement dans run.js
- Airtable REST API (pas de SDK)
- Firecrawl pour le scraping HTML → Markdown

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/run.js` | Orchestrateur principal — point d'entrée |
| `src/config.js` | 20 youngtimers cibles + seuils d'arbitrage |
| `src/arbitrage.js` | Calcul profit brut + scoring |
| `src/airtable.js` | Upsert des opportunités |
| `src/cache.js` | Cache fichier JSON (prix DE, 6h TTL) |
| `src/scrapers/leboncoin.js` | Scraper France principal |
| `src/scrapers/lesanciennes.js` | Scraper France secondaire |
| `src/scrapers/mobile-de.js` | Prix référence Allemagne |
| `src/scrapers/ebay-kleinanzeigen.js` | Prix référence Allemagne (2e source) |

## Règles

- Ne jamais commiter `.env`
- Délai minimum 1 500ms entre requêtes Firecrawl (rate limit)
- Cache DE invalide après 6h — Mobile.de + eBay sont les seules sources de prix DE
- Profits affichés bruts (avant négociation, frais homologation client)
- Coûts export fixes : transport 800€ + immat DE 400€ + TÜV 150€ = 1 350€ total
