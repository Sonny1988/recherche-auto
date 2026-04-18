import { writeFileSync } from 'fs';
import { resolve } from 'path';

const TABLE = 'Opportunit%C3%A9s';

async function fetchOpportunities() {
  const base = process.env.AIRTABLE_BASE_ID;
  const key = process.env.AIRTABLE_API_KEY;
  const url = `https://api.airtable.com/v0/${base}/${TABLE}?sort[0][field]=Profit%20Brut%20(%E2%82%AC)&sort[0][direction]=desc&maxRecords=80&filterByFormula={Opportunit%C3%A9}=1`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const data = await res.json();
  if (data.error) throw new Error(`Airtable: ${data.error.message}`);

  return data.records.map(r => ({
    titre: cleanTitle(r.fields['Titre'] || ''),
    prix_fr: r.fields['Prix France (€)'] || 0,
    prix_de: r.fields['Prix Référence DE (€)'] || 0,
    profit: r.fields['Profit Brut (€)'] || 0,
    delta: r.fields['Delta %'] || 0,
    score: r.fields['Score'] || '',
    annee: r.fields['Année'] || null,
    km: r.fields['Kilométrage'] || null,
    carb: r.fields['Carburant'] || '',
    lien: r.fields['Lien Annonce FR'] || '',
    lien_de: r.fields['Lien Référence DE'] || '',
    plateforme: r.fields['Plateforme'] || '',
    date: r.fields['Date Détection'] || '',
  })).filter(r => r.titre && r.profit > 0);
}

function cleanTitle(titre) {
  // Supprimer les titres parasites (artefacts scraper)
  if (/résultats de recherche|voir toutes ses annonces/i.test(titre)) return null;
  // Nettoyer les URLs collées au titre
  return titre.replace(/\(https?:\/\/[^\)]+\)/g, '').trim();
}

function html(records, scanDate) {
  const best = Math.max(...records.map(r => r.profit));
  const avg = Math.round(records.reduce((s, r) => s + r.profit, 0) / records.length);
  const exceptional = records.filter(r => r.score.includes('Exceptionnel')).length;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arbitrage Youngtimers FR→DE — ${scanDate}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0d11; --bg-card: #16161d; --bg-hover: #1e1e28;
      --border: #252530; --border-hover: #35354a;
      --text: #e8e8f0; --muted: #6b6b80;
      --green: #22c55e; --green-dim: rgba(34,197,94,0.12);
      --amber: #f59e0b; --amber-dim: rgba(245,158,11,0.12);
      --blue: #3b82f6; --blue-dim: rgba(59,130,246,0.12);
      --gray-dim: rgba(107,107,128,0.10);
      --mono: 'JetBrains Mono', monospace; --sans: 'Inter', sans-serif;
    }
    body { font-family: var(--sans); background: var(--bg); color: var(--text); min-height: 100vh; padding: 24px 20px 60px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
    .header-title { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
    .header-sub { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); margin-top: 4px; }
    .badge { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mono); font-size: 0.65rem; font-weight: 600; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.04em; text-transform: uppercase; }
    .badge-live { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 24px; }
    .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
    .kpi-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 6px; }
    .kpi-value { font-family: var(--mono); font-size: 1.5rem; font-weight: 600; line-height: 1; }
    .kpi-value.green { color: var(--green); } .kpi-value.amber { color: var(--amber); }
    .kpi-sub { font-family: var(--mono); font-size: 0.65rem; color: var(--muted); margin-top: 4px; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; align-items: center; }
    .filter-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-right: 4px; }
    .filter-btn { font-family: var(--sans); font-size: 0.72rem; font-weight: 500; padding: 5px 10px; border-radius: 5px; border: 1px solid var(--border); background: var(--bg-card); color: var(--muted); cursor: pointer; transition: all 0.15s; user-select: none; }
    .filter-btn:hover { border-color: var(--border-hover); color: var(--text); background: var(--bg-hover); }
    .filter-btn.active { border-color: var(--amber); color: var(--amber); background: var(--amber-dim); }
    .filter-divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
    .slider-wrap { display: flex; align-items: center; gap: 8px; }
    .slider-wrap input[type=range] { -webkit-appearance: none; width: 110px; height: 3px; border-radius: 2px; background: var(--border-hover); outline: none; cursor: pointer; }
    .slider-wrap input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--amber); cursor: pointer; }
    .slider-val { font-family: var(--mono); font-size: 0.68rem; color: var(--amber); min-width: 52px; }
    .results-meta { font-size: 0.72rem; color: var(--muted); margin-bottom: 14px; font-family: var(--mono); }
    .results-meta span { color: var(--text); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 10px; }
    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s, background 0.15s; }
    .card:hover { border-color: var(--border-hover); background: var(--bg-hover); }
    .card.exceptional { border-color: rgba(34,197,94,0.35); box-shadow: 0 0 12px rgba(34,197,94,0.08); }
    .card.excellent { border-color: rgba(59,130,246,0.30); }
    .card.bon { border-color: rgba(107,107,128,0.30); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .card-title { font-size: 0.82rem; font-weight: 600; line-height: 1.35; flex: 1; }
    .score-badge { font-size: 0.65rem; font-weight: 600; padding: 2px 7px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.02em; }
    .score-exceptional { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }
    .score-excellent { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(59,130,246,0.25); }
    .score-bon { background: var(--gray-dim); color: #94a3b8; border: 1px solid rgba(107,107,128,0.25); }
    .score-interessant { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.25); }
    .score-faible { background: rgba(107,107,128,0.08); color: var(--muted); border: 1px solid var(--border); }
    .card-prices { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .price-block { display: flex; flex-direction: column; gap: 2px; }
    .price-label { font-size: 0.6rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
    .price-val { font-family: var(--mono); font-size: 0.88rem; font-weight: 600; }
    .price-val.profit-green { color: var(--green); font-size: 1rem; }
    .price-val.profit-amber { color: var(--amber); font-size: 1rem; }
    .card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .meta-tag { font-size: 0.62rem; color: var(--muted); background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; font-family: var(--mono); }
    .delta-pill { font-family: var(--mono); font-size: 0.65rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
    .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .plat-tag { font-size: 0.62rem; color: var(--muted); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }
    .plat-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
    .plat-lbc { background: #f97316; } .plat-les { background: #8b5cf6; } .plat-as { background: #06b6d4; }
    .card-link { font-size: 0.68rem; font-weight: 500; color: var(--amber); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border: 1px solid rgba(245,158,11,0.25); border-radius: 4px; background: var(--amber-dim); transition: all 0.15s; }
    .card-link:hover { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.4); }
    .card-link-de { color: #60a5fa; border-color: rgba(96,165,250,0.25); background: rgba(96,165,250,0.08); }
    .card-link-de:hover { background: rgba(96,165,250,0.15); border-color: rgba(96,165,250,0.4); }
    .card-link svg { width: 10px; height: 10px; }
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 0.85rem; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .kpis { grid-template-columns: repeat(2, 1fr); } body { padding: 16px 12px 40px; } }
  </style>
</head>
<body>
<div class="header">
  <div>
    <div class="header-title">Arbitrage Youngtimers <span style="color:var(--muted)">FR→DE</span></div>
    <div class="header-sub">Scan du ${scanDate} · Mobile.de + eBay Kleinanzeigen · Frais export 1 350€ inclus</div>
  </div>
  <div class="badge badge-live">● Mis à jour ${scanDate}</div>
</div>

<div class="kpis">
  <div class="kpi"><div class="kpi-label">Opportunités</div><div class="kpi-value">${records.length}</div><div class="kpi-sub">deals détectés</div></div>
  <div class="kpi"><div class="kpi-label">Meilleur Profit</div><div class="kpi-value amber">${fmt(best)}</div><div class="kpi-sub">profit brut max</div></div>
  <div class="kpi"><div class="kpi-label">Profit Moyen</div><div class="kpi-value green">${fmt(avg)}</div><div class="kpi-sub">par opportunité</div></div>
  <div class="kpi"><div class="kpi-label">Exceptionnels 🔥</div><div class="kpi-value">${exceptional}</div><div class="kpi-sub">profit ≥ 8 000€</div></div>
  <div class="kpi"><div class="kpi-label">Frais Export</div><div class="kpi-value" style="font-size:1.1rem;color:var(--muted)">1 350€</div><div class="kpi-sub">transport+immat+TÜV</div></div>
</div>

<div class="filters">
  <span class="filter-label">Score</span>
  <button class="filter-btn active" data-score="all" onclick="setScore('all',this)">Tous</button>
  <button class="filter-btn" data-score="🔥 Exceptionnel" onclick="setScore('🔥 Exceptionnel',this)">🔥 Exceptionnel</button>
  <button class="filter-btn" data-score="⭐ Excellent" onclick="setScore('⭐ Excellent',this)">⭐ Excellent</button>
  <button class="filter-btn" data-score="✅ Bon" onclick="setScore('✅ Bon',this)">✅ Bon</button>
  <button class="filter-btn" data-score="👍 Intéressant" onclick="setScore('👍 Intéressant',this)">👍 Intéressant</button>
  <div class="filter-divider"></div>
  <span class="filter-label">Marque</span>
  <button class="filter-btn active" data-marque="all" onclick="setMarque('all',this)">Toutes</button>
  <button class="filter-btn" data-marque="BMW" onclick="setMarque('BMW',this)">BMW</button>
  <button class="filter-btn" data-marque="Porsche" onclick="setMarque('Porsche',this)">Porsche</button>
  <button class="filter-btn" data-marque="Mercedes" onclick="setMarque('Mercedes',this)">Mercedes</button>
  <button class="filter-btn" data-marque="Audi" onclick="setMarque('Audi',this)">Audi</button>
  <button class="filter-btn" data-marque="VW" onclick="setMarque('VW',this)">VW</button>
  <div class="filter-divider"></div>
  <div class="slider-wrap">
    <span class="filter-label">Profit min</span>
    <input type="range" id="profitSlider" min="0" max="${best}" step="500" value="0" oninput="setProfitMin(this.value)">
    <span class="slider-val" id="profitVal">0€</span>
  </div>
</div>

<div class="results-meta" id="resultsMeta"></div>
<div class="grid" id="grid"></div>

<script>
const RAW = ${JSON.stringify(records)};
let filterScore = 'all', filterMarque = 'all', filterProfitMin = 0;

function getMarque(t) {
  const s = t.toLowerCase();
  if (s.includes('porsche')) return 'Porsche';
  if (s.includes('bmw')) return 'BMW';
  if (s.includes('mercedes')) return 'Mercedes';
  if (s.includes('audi')) return 'Audi';
  if (s.includes('volkswagen')||s.includes(' vw ')||s.includes('golf')||s.includes('corrado')) return 'VW';
  return 'Autre';
}
function fmt(n) { return n.toLocaleString('fr-FR')+'\u202f€'; }
function fmtKm(n) { return n ? n.toLocaleString('fr-FR')+' km' : '—'; }
function scoreClass(s) {
  if (s.includes('Exceptionnel')) return 'exceptional';
  if (s.includes('Excellent')) return 'excellent';
  if (s.includes('Bon')) return 'bon'; return '';
}
function scoreBadgeClass(s) {
  if (s.includes('Exceptionnel')) return 'score-exceptional';
  if (s.includes('Excellent')) return 'score-excellent';
  if (s.includes('Bon')) return 'score-bon';
  if (s.includes('Intéressant')) return 'score-interessant';
  return 'score-faible';
}
function platDot(p) {
  if (p === 'LeBonCoin') return 'plat-lbc';
  if (p === 'LesAnciennes') return 'plat-les'; return 'plat-as';
}
const SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10L10 2M5 2h5v5"/></svg>';

function filtered() {
  return RAW.filter(d => {
    if (filterScore !== 'all' && d.score !== filterScore) return false;
    if (filterMarque !== 'all' && getMarque(d.titre) !== filterMarque) return false;
    if (d.profit < filterProfitMin) return false;
    return true;
  });
}

function render() {
  const data = filtered();
  document.getElementById('resultsMeta').innerHTML = \`<span>\${data.length}</span> résultat\${data.length!==1?'s':''} affiché\${data.length!==1?'s':''}\`;
  if (!data.length) { document.getElementById('grid').innerHTML='<div class="empty">Aucun résultat pour ces filtres.</div>'; return; }
  document.getElementById('grid').innerHTML = data.map(d => \`
    <div class="card \${scoreClass(d.score)}">
      <div class="card-top">
        <div class="card-title">\${d.titre}</div>
        <span class="score-badge \${scoreBadgeClass(d.score)}">\${d.score}</span>
      </div>
      <div class="card-prices">
        <div class="price-block"><span class="price-label">Prix FR</span><span class="price-val">\${fmt(d.prix_fr)}</span></div>
        <div class="price-block"><span class="price-label">Réf DE</span><span class="price-val">\${fmt(d.prix_de)}</span></div>
        <div class="price-block"><span class="price-label">Profit brut</span><span class="price-val \${d.profit>=8000?'profit-amber':'profit-green'}">\${fmt(d.profit)}</span></div>
      </div>
      <div class="card-meta">
        \${d.annee?'<span class="meta-tag">'+d.annee+'</span>':''}
        \${d.km?'<span class="meta-tag">'+fmtKm(d.km)+'</span>':''}
        \${d.carb?'<span class="meta-tag">'+d.carb+'</span>':''}
        <span class="delta-pill">+\${d.delta}%</span>
      </div>
      <div class="card-footer">
        <div class="plat-tag"><span class="plat-dot \${platDot(d.plateforme)}"></span>\${d.plateforme}</div>
        <div style="display:flex;gap:6px">
          \${d.lien?'<a class="card-link" href="'+d.lien+'" target="_blank" rel="noopener noreferrer">🇫🇷 Annonce '+SVG+'</a>':''}
          \${d.lien_de?'<a class="card-link card-link-de" href="'+d.lien_de+'" target="_blank" rel="noopener noreferrer">🇩🇪 Réf DE '+SVG+'</a>':''}
        </div>
      </div>
    </div>
  \`).join('');
}

function setScore(v,b) { filterScore=v; document.querySelectorAll('[data-score]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); render(); }
function setMarque(v,b) { filterMarque=v; document.querySelectorAll('[data-marque]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); render(); }
function setProfitMin(v) { filterProfitMin=parseInt(v); document.getElementById('profitVal').textContent=parseInt(v).toLocaleString('fr-FR')+'€'; render(); }

render();
</script>
</body>
</html>`;
}

function fmt(n) { return n.toLocaleString('fr-FR') + '\u202f€'; }

export async function generateDashboard() {
  const records = await fetchOpportunities();
  const scanDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const content = html(records, scanDate);
  const outPath = resolve(process.cwd(), 'dashboard.html');
  writeFileSync(outPath, content, 'utf8');
  console.log(`📊 Dashboard généré: ${records.length} opportunités → dashboard.html`);
  return records.length;
}
