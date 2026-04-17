# Primer — État courant du projet Recherche Auto

_Ce fichier se réécrit en fin de session. Dernière mise à jour : 2026-04-17_

## Contexte actif
- Projet : Arbitrage véhicules France → Allemagne
- Source FR : AutoScout24.fr (LeBonCoin bloqué anti-bot)
- Source DE : AutoScout24.de (référence prix marché allemand)
- Statut : Pipeline complet opérationnel — premier scan réussi (60 véhicules, 28 opportunités)

## Résultats session 2026-04-17

### Premier scan live
- 60 véhicules analysés (BMW Série 3 + Mercedes Classe C + Audi A4)
- 28 opportunités détectées (profit ≥ 2 000€ ET delta ≥ 15%)
- 5 deals "Exceptionnels" (profit > 8 000€)
- 60 entrées créées dans Airtable ✅
- **Top deal**: Mercedes FR 13 490€ → profit brut +19 565€ (+155%)

### Architecture scraping finale
- **LeBonCoin** : abandonné (Cloudflare bloque Node.js + Playwright)
- **AutoScout24.fr** : opérationnel — `lst/{marque}?atype=C&cy=F&pricefrom=X&priceto=Y`
- **AutoScout24.de** : opérationnel — `lst/{marque}?atype=C&cy=D&pricefrom=X&priceto=Y`
- Camping-cars FR : `lst?atype=N&cy=F` (motorhomes) — à améliorer pour filtrer par marque
- Coûts export estimés : 1 350€ (transport 800 + immat DE 400 + TÜV 150)

## Fichiers clés
- `src/scrapers/autoscout-fr.js` — scraper France (AutoScout24.fr)
- `src/scrapers/autoscout.js` — prix référence Allemagne (AutoScout24.de)
- `src/arbitrage.js` — calcul profit brut + score
- `src/airtable.js` — upsert table "Opportunités"
- `src/telegram.js` — alertes Telegram
- `src/run.js` — orchestrateur principal
- `src/config.js` — 17 modèles voitures + 10 marques camping-cars

## Infra
- Airtable : base `app1gxPAbJp8AzH3i` (base Luna), table "Opportunités" créée
- Telegram : bot Luna `7509333475`, chat `1696297979`
- Node.js ESM, Windows

## En cours / À faire

### Priorité 1 — Camping-cars
- Filtrage par marque allemande (Hymer, Bürstner, Knaus) non opérationnel
- AutoScout24.fr ne reconnaît pas les slugs marques camping-car
- → Chercher les IDs marques via la page filtre `/lst?atype=N&cy=F`

### Priorité 2 — Pagination
- AutoScout24 retourne 20 résultats par page
- Ajouter `page=1,2,3` dans les URLs pour scanner plus d'annonces

### Priorité 3 — Précision modèle
- Actuellement compare "toute la marque" FR vs DE (ex: tous BMW)
- Idéal : filtrer par segment de prix similaire + millésime proche

### Priorité 4 — Cron automatique
- Windows Task Scheduler ou PM2 pour lancer `node src/run.js` toutes les 6h
- Alerte Telegram seulement pour les nouveaux deals (pas déjà dans Airtable)

### Priorité 5 — Alertes Telegram
- Actuellement en TODO — tester `sendAlert()` + `sendSummary()`
- Déclencher seulement pour profit > 5 000€

## Points d'attention
- AutoScout24 rate-limit : délai 1.5-2s entre requêtes
- Médiane basée sur 20 annonces seulement (1 page) — signal indicatif
- Les profits affichés sont bruts avant frais (homologation, négociation, etc.)
- Ne pas committer `.env` (contient les clés API)
