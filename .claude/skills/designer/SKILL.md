---
name: designer
description: "Génère un dashboard HTML des opportunités d'arbitrage youngtimers. Actions: dashboard (vue complète des deals), report (rapport HTML d'une session de scan), card (fiche HTML d'une annonce), export-csv (export Airtable → CSV). Styles disponibles: dark-trader (défaut), minimal-blanc, brutal. Stack: HTML vanilla + Tailwind CDN, zéro dépendance."
---

# Designer — Dashboard Arbitrage Youngtimers

Génère des interfaces visuelles pour visualiser et partager les opportunités d'arbitrage FR→DE.

## Contexte projet

- Stack : HTML vanilla + Tailwind CDN (pas de framework)
- Données source : table Airtable "Opportunités" — base `app1gxPAbJp8AzH3i`
- Palette par défaut : dark mode, accent vert (#22c55e), rouge urgence (#ef4444)
- Typo : JetBrains Mono (chiffres) + Inter (texte)
- Output : fichier `.html` autonome, zéro dépendance réseau après chargement

---

## Actions disponibles

### `dashboard` — Vue complète des opportunités

Génère un dashboard interactif avec toutes les opportunités du dernier scan.

**Données à récupérer depuis Airtable avant de générer :**
```js
// Lire les 50 dernières opportunités triées par profit_brut
GET https://api.airtable.com/v0/app1gxPAbJp8AzH3i/Opportunit%C3%A9s
  ?sort[0][field]=profit_brut&sort[0][direction]=desc
  &maxRecords=50
  &filterByFormula={opportunite}=1
```

**Structure du dashboard :**
```
┌─────────────────────────────────────┐
│  ARBITRAGE SCANNER  [scan en cours] │
│  28 opportunités • Scan: 18 avr.    │
├──────────┬──────────────────────────┤
│ FILTRES  │  TABLEAU DES DEALS       │
│ Marque   │  Titre | Prix FR | DE   │
│ Score    │  Profit | Delta | Score  │
│ Min €    │  Source | Lien →         │
└──────────┴──────────────────────────┘
```

**Règles design :**
- Fond : `#0f172a` (slate-900)
- Cards deals : `#1e293b` (slate-800) avec border `#334155`
- Score 🔥 Exceptionnel → border `#22c55e` + glow vert
- Score ⭐ Excellent → border `#3b82f6` bleu
- Score ✅ Bon → border `#64748b` gris
- Chiffres profit : JetBrains Mono, taille 1.5rem, vert/rouge selon signe
- Liens annonces : s'ouvrent dans un nouvel onglet
- Filtre marque : BMW / Mercedes / Porsche / VW / Audi (boutons toggle)

**Output :** `~/Desktop/arbitrage-dashboard-YYYYMMDD.html`

---

### `report` — Rapport de session

Génère un rapport one-pager d'un scan complet, partageable.

**Structure du rapport :**
```
┌─────────────────────────────────────┐
│  SESSION SCAN — 18 avril 2026       │
│  60 véhicules analysés              │
├─────────────────────────────────────┤
│  RÉSUMÉ                             │
│  28 opportunités • 5 Exceptionnels  │
│  Profit moyen: 4 200€               │
│  Meilleur deal: +19 565€ (+155%)    │
├─────────────────────────────────────┤
│  TOP 5 DEALS (cards visuelles)      │
│  [Titre] [Prix FR→DE] [Profit]      │
├─────────────────────────────────────┤
│  RÉPARTITION PAR MARQUE (bar chart) │
│  BMW ████░░ 12 deals                │
│  Merc ████░ 8 deals                 │
└─────────────────────────────────────┘
```

Bar chart en SVG inline — zéro lib externe.

**Output :** `~/Desktop/scan-report-YYYYMMDD.html`

---

### `card` — Fiche annonce

Génère une fiche HTML pour une seule annonce (à partager, imprimer, archiver).

Paramètre : objet annonce (depuis Airtable ou run.js output)

**Structure de la fiche :**
```
┌──────────────────────────────────┐
│  BMW E30 320i — 1991             │
│  ────────────────────────────── │
│  Prix FR    :  4 500€            │
│  Ref DE     : 12 800€  (Mobile)  │
│  Coûts      :  1 350€            │
│  ────────────────────────────── │
│  PROFIT NET : +6 950€  (+51%)   │
│  Score      : ⭐ Excellent       │
│  ────────────────────────────── │
│  Source: LeBonCoin               │
│  [Voir l'annonce →]              │
│  Scanné le: 18/04/2026           │
└──────────────────────────────────┘
```

**Output :** `~/Desktop/deal-{titre-slug}.html`

---

### `export-csv` — Export CSV

Génère un CSV des opportunités depuis Airtable, prêt pour Excel/Sheets.

```bash
cd "c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto"
node -e "
import('./src/airtable.js').then(async ({ getOpportunities }) => {
  const ops = await getOpportunities();
  const header = 'Titre,Prix FR,Prix DE Ref,Profit Brut,Delta %,Score,Source,URL,Date';
  const rows = ops.map(o => [
    o.titre, o.prix_fr, o.prix_de_ref, o.profit_brut,
    o.delta_pct, o.score_label, o.source, o.url, o.date_scan
  ].map(v => JSON.stringify(v||'')).join(','));
  require('fs').writeFileSync('arbitrage-export.csv', [header,...rows].join('\n'));
  console.log('Export:', ops.length, 'lignes');
})
"
```

**Output :** `arbitrage-export.csv` à la racine du projet

---

## Règles design globales

### Palette dark-trader (défaut)

```css
--bg-primary: #0f172a;      /* fond principal */
--bg-card: #1e293b;         /* cards */
--bg-hover: #334155;        /* hover states */
--text-primary: #f1f5f9;    /* texte principal */
--text-muted: #94a3b8;      /* texte secondaire */
--accent-green: #22c55e;    /* profit positif, CTA */
--accent-red: #ef4444;      /* urgence, pertes */
--accent-blue: #3b82f6;     /* liens, infos */
--border: #334155;          /* bordures */
--font-mono: 'JetBrains Mono', monospace;
--font-sans: 'Inter', sans-serif;
```

### Règles typographie

- Profits/prix : toujours `font-family: var(--font-mono)` — lisibilité chiffres
- Labels score : emoji + texte — pas d'icônes SVG pour le score
- Titres annonces : Inter 500, pas de majuscules forcées
- Délimiteurs milliers : `toLocaleString('fr-FR')` — `4 500€` pas `4500€`

### Règles interaction

- Toutes les lignes tableau : `cursor-pointer` + hover highlight
- Liens annonces : `target="_blank" rel="noopener noreferrer"`
- Filtres : state visuel clair (bouton actif vs inactif)
- Aucun spinner/loader — les données sont embarquées dans le HTML

### Anti-patterns interdits

- Pas de gradients violet/bleu génériques
- Pas de lorem ipsum — toujours des données réelles ou des exemples réalistes
- Pas de rounded-corners excessifs (max `border-radius: 8px`)
- Pas de box-shadow décoratif — uniquement si glow fonctionnel (deal exceptionnel)
- Pas de CDN externe pour les icônes — SVG inline uniquement

---

## Template de base (HTML autonome)

```html
<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arbitrage Youngtimers — {DATE}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --accent: #22c55e;
    }
    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .profit-positive { color: #22c55e; }
    .profit-exceptional { color: #22c55e; text-shadow: 0 0 12px rgba(34,197,94,0.4); }
    .score-exceptional { border-color: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.2); }
    .score-excellent { border-color: #3b82f6; }
  </style>
</head>
<body class="min-h-screen p-6">
  <!-- HEADER -->
  <header class="mb-8">
    <h1 class="text-2xl font-semibold tracking-tight">Arbitrage Youngtimers FR→DE</h1>
    <p class="text-slate-400 mono text-sm mt-1">{N} opportunités • Scan du {DATE}</p>
  </header>

  <!-- DONNÉES EMBARQUÉES -->
  <script>
    const DATA = {/* JSON des opportunités ici */};
  </script>

  <!-- RENDU JS -->
  <script>
    // Rendu dynamique depuis DATA
  </script>
</body>
</html>
```

---

## Workflow standard

1. Récupérer les données depuis Airtable (ou output JSON de `run.js`)
2. Choisir l'action : `dashboard`, `report`, ou `card`
3. Générer le HTML avec les données embarquées dans un `<script>const DATA=...`
4. Sauvegarder sur le Desktop
5. Ouvrir dans le navigateur :
```bash
start "c:/Users/Ubert/Desktop/arbitrage-dashboard-$(date +%Y%m%d).html"
```

