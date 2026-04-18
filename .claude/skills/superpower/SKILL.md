---
name: superpower
description: "Mode turbo pour le pipeline arbitrage youngtimers FR→DE. Actions: scan-full (tous les 20 modèles), scan-quick (top 5 par valeur), scan-model (un seul modèle), cache-refresh (force nouveau scraping DE), status (état Airtable + cache), add-target (ajouter un nouveau youngtimer), perf (diagnostics latence). Contexte: Node.js ESM, Windows, scraping AutoScout/LeBonCoin/Mobile.de/eBay."
---

# Superpower — Pipeline Arbitrage Youngtimers

Skill de boost pour le projet `recherche auto`. Maximise la couverture, réduit la latence, identifie les opportunités cachées.

## Contexte projet

| Paramètre | Valeur |
|-----------|--------|
| Répertoire | `c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto/` |
| Commande principale | `node src/run.js` |
| Sources FR | LeBonCoin, LesAnciennes |
| Sources DE ref | Mobile.de, eBay Kleinanzeigen |
| Seuils défaut | profit ≥ 1 500€ ET delta ≥ 20% |
| Airtable | base `app1gxPAbJp8AzH3i`, table "Opportunités" |
| Cache | `src/cache.js` — fichiers JSON dans `cache/` |
| Modèles actifs | 20 youngtimers dans `src/config.js` |

---

## Actions disponibles

### `scan-full` — Scan complet (tous les modèles)

Relance le pipeline sur les 20 modèles avec pagination étendue.

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"
node src/run.js
```

Avant de lancer, vérifier que les caches DE ne sont pas trop anciens :
```bash
find cache/ -name "*.json" -mmin +360 2>/dev/null | head -10
```
Si plus de 5 fichiers > 6h → lancer `scan-full` avec `--refresh` (voir cache-refresh).

---

### `scan-quick` — Scan rapide (top 5 valeur estimée)

Les 5 modèles avec le meilleur ratio liquidité/valeur sur le marché DE :
1. **Porsche 993** (30-150k€) — spread énorme
2. **Mercedes R129** (8-50k€) — très coté DE
3. **BMW E31 850** (10-60k€) — rare en FR
4. **Audi S2 Coupé** (8-40k€) — demande DE forte
5. **Porsche 968** (10-45k€) — niche solide

Pour scanner uniquement ces 5, modifier temporairement `src/config.js` ou utiliser la variable d'env :

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"
QUICK_TARGETS="Porsche 993,Mercedes R129,BMW E31,Audi S2,Porsche 968" node src/run.js
```

---

### `scan-model` — Scanner un seul modèle

Utile pour tester un nouveau target ou re-scanner après une alerte.

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"
SINGLE_MODEL="BMW E30" node src/run.js
```

---

### `cache-refresh` — Forcer le re-scraping des prix DE

Efface les caches Mobile.de + eBay Kleinanzeigen pour un modèle ou tous :

```bash
# Tout effacer
rm -f "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto/cache/"*.json

# Un seul modèle (ex: BMW E30)
rm -f "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto/cache/"*e30*.json
```

Les prix DE sont recalculés au prochain scan. **Ne pas rafraîchir plus d'une fois par 6h** — rate limit.

---

### `status` — État du pipeline

Diagnostique rapide avant un scan :

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"

# Nb d'entrées Airtable
echo "=== Airtable ===" && node -e "
import('./src/airtable.js').then(m => m.countRecords().then(n => console.log('Enregistrements:', n)).catch(e => console.error('Erreur Airtable:', e.message)))
"

# État du cache
echo "=== Cache ===" && ls -la cache/ 2>/dev/null | head -30

# Variables d'env chargées
echo "=== ENV ===" && node -e "
import('dotenv/config').catch(()=>{})
console.log('MIN_DELTA_EUR:', process.env.MIN_DELTA_EUR || '1500 (défaut)')
console.log('MIN_DELTA_PCT:', process.env.MIN_DELTA_PCT || '20 (défaut)')
console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? '✅ présente' : '❌ manquante')
console.log('FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ présente' : '❌ manquante')
"
```

---

### `add-target` — Ajouter un nouveau youngtimer

Pour ajouter un modèle dans `src/config.js` :

1. Vérifier la forme d'un target existant dans `TARGET_YOUNGTIMERS`
2. Ajouter l'entrée avec la structure :
```js
{ marque: 'MARQUE', modele: 'MODELE', searchFR: 'TERME FR', searchDE: 'TERME DE', maxYear: AAAA, minPrice: XXXX, maxPrice: XXXXX }
```
3. Tester avec `scan-model` avant de commiter

Modèles candidats non encore dans la liste :
- Mercedes W126 (S-Class) — très coté DE, sous-côté FR
- BMW E28 (5er) — rare et montant
- Alfa Romeo 164 — niche franco-italienne
- Lancia Delta HF Integrale — prix DE élevés, peu en FR

---

### `perf` — Diagnostics de performance

Mesure le temps de scan par source :

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"
time node src/run.js 2>&1 | tee /tmp/scan-perf.log
grep -E "(scraped|fetched|annonces|ms|Error)" /tmp/scan-perf.log
```

Points chauds connus :
- LeBonCoin : Firecrawl ~3-5s/page — goulot principal
- Mobile.de : ~2s/modèle (cache 6h — OK)
- eBay Kleinanzeigen : ~2s/modèle (cache 6h — OK)
- Airtable upsert : ~200ms/enregistrement

---

## Optimisations recommandées (non encore implémentées)

| Priorité | Amélioration | Impact | Effort |
|----------|-------------|--------|--------|
| 1 | Pagination LeBonCoin (pages 2-3) | +60% annonces | Faible |
| 2 | Pagination LesAnciennes | +40% annonces | Faible |
| 3 | Filtrage par année via URL params | -30% faux positifs | Moyen |
| 4 | Score composite (état + km) | Meilleur ranking | Moyen |
| 5 | Cron Windows Task Scheduler toutes 6h | Automation | Faible |
| 6 | Alertes Telegram profit > 5k€ | Réactivité | Faible |
| 7 | Déduplication Airtable par URL | Éviter doublons | Faible |

Pour implémenter une de ces optimisations, demander `/superpower` + le nom de l'optimisation.

---

## Variables d'environnement utiles

```env
MIN_DELTA_EUR=1500      # seuil profit minimum en €
MIN_DELTA_PCT=20        # seuil delta % minimum
DELAY_MS=2500           # délai entre requêtes (ne pas descendre sous 1500)
```

Modifier dans `.env` pour changer les seuils sans toucher au code.

---

## Workflow recommandé avant un scan

1. `status` — vérifier les clés API et l'état du cache
2. Si cache > 6h → `cache-refresh` pour les modèles prioritaires
3. `scan-quick` — valider que le pipeline tourne (5 modèles seulement)
4. Si OK → `scan-full` pour scan complet
5. Vérifier les résultats dans Airtable

