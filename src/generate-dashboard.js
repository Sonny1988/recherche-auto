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
  return data.records
    .map(r => ({
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
    }))
    .filter(r => r.titre && r.profit > 0);
}

function cleanTitle(titre) {
  if (/résultats de recherche|voir toutes ses annonces/i.test(titre)) return null;
  return titre.replace(/\(https?:\/\/[^\)]+\)/g, '').trim();
}

function fmtEur(n) {
  return n.toLocaleString('fr-FR') + '\u202f€';
}

function html(records, scanDate) {
  const best = Math.max(...records.map(r => r.profit));
  const avg = Math.round(records.reduce((s, r) => s + r.profit, 0) / records.length);
  const exceptional = records.filter(r => r.score.includes('Exceptionnel')).length;
  const data = JSON.stringify(records);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Arbitrage Youngtimers FR→DE</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d11;--card:#16161d;--hover:#1e1e28;
  --b0:#252530;--b1:#35354a;
  --txt:#e8e8f0;--dim:#6b6b80;
  --green:#22c55e;--gdim:rgba(34,197,94,.13);
  --amber:#f59e0b;--adim:rgba(245,158,11,.13);
  --blue:#3b82f6;--bdim:rgba(59,130,246,.13);
  --mono:'JetBrains Mono',monospace;
  --sans:'Inter',sans-serif;
}
html{-webkit-text-size-adjust:100%}
body{font-family:var(--sans);background:var(--bg);color:var(--txt);min-height:100dvh;padding:16px 14px 80px}

/* HEADER */
.hdr{margin-bottom:20px}
.hdr h1{font-size:1.15rem;font-weight:700;letter-spacing:-.02em}
.hdr h1 span{color:var(--dim)}
.hdr p{font-family:var(--mono);font-size:.65rem;color:var(--dim);margin-top:3px;line-height:1.5}
.pulse{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:.6rem;font-weight:600;
  padding:2px 7px;border-radius:4px;background:rgba(34,197,94,.12);color:var(--green);
  border:1px solid rgba(34,197,94,.22);margin-top:6px;letter-spacing:.04em}

/* KPIS */
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.kpi{background:var(--card);border:1px solid var(--b0);border-radius:10px;padding:12px 14px}
.kpi-lbl{font-size:.6rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:5px}
.kpi-val{font-family:var(--mono);font-size:1.35rem;font-weight:700;line-height:1;color:var(--txt)}
.kpi-val.g{color:var(--green)}.kpi-val.a{color:var(--amber)}
.kpi-sub{font-family:var(--mono);font-size:.58rem;color:var(--dim);margin-top:3px}

/* FILTERS */
.filters{margin-bottom:14px;display:flex;flex-direction:column;gap:8px}
.frow{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;scrollbar-width:none}
.frow::-webkit-scrollbar{display:none}
.flbl{font-size:.6rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;
  white-space:nowrap;padding-top:2px;flex-shrink:0;align-self:center}
.fb{font-family:var(--sans);font-size:.72rem;font-weight:500;
  padding:8px 12px;border-radius:8px;border:1px solid var(--b0);
  background:var(--card);color:var(--dim);cursor:pointer;
  white-space:nowrap;flex-shrink:0;-webkit-tap-highlight-color:transparent;
  transition:all .15s;min-height:36px;display:flex;align-items:center}
.fb:active{opacity:.7}
.fb.on{border-color:var(--amber);color:var(--amber);background:var(--adim)}

/* PROFIT STEPS */
.profit-steps{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;scrollbar-width:none}
.profit-steps::-webkit-scrollbar{display:none}
.ps{font-family:var(--mono);font-size:.65rem;font-weight:600;
  padding:7px 10px;border-radius:7px;border:1px solid var(--b0);
  background:var(--card);color:var(--dim);cursor:pointer;
  white-space:nowrap;flex-shrink:0;-webkit-tap-highlight-color:transparent;
  transition:all .15s;min-height:34px;display:flex;align-items:center}
.ps:active{opacity:.7}
.ps.on{border-color:var(--green);color:var(--green);background:var(--gdim)}

/* META */
.meta{font-family:var(--mono);font-size:.65rem;color:var(--dim);margin-bottom:10px}
.meta b{color:var(--txt)}

/* GRID */
.grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:640px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.grid{grid-template-columns:repeat(3,1fr)}}

/* CARD */
.card{background:var(--card);border:1px solid var(--b0);border-radius:12px;
  padding:14px;display:flex;flex-direction:column;gap:11px}
.card.exc{border-color:rgba(34,197,94,.4);box-shadow:0 0 14px rgba(34,197,94,.07)}
.card.xlt{border-color:rgba(59,130,246,.35)}
.card.bon{border-color:rgba(107,107,128,.3)}

.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.card-title{font-size:.82rem;font-weight:600;line-height:1.4;flex:1}
.sbadge{font-size:.58rem;font-weight:700;padding:3px 7px;border-radius:5px;white-space:nowrap;flex-shrink:0}
.s-exc{background:var(--gdim);color:var(--green);border:1px solid rgba(34,197,94,.25)}
.s-xlt{background:var(--bdim);color:var(--blue);border:1px solid rgba(59,130,246,.25)}
.s-bon{background:rgba(107,107,128,.1);color:#94a3b8;border:1px solid rgba(107,107,128,.25)}
.s-int{background:var(--adim);color:var(--amber);border:1px solid rgba(245,158,11,.25)}
.s-fbl{background:rgba(107,107,128,.07);color:var(--dim);border:1px solid var(--b0)}

/* PRICES ROW */
.prices{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;
  background:rgba(255,255,255,.025);border-radius:8px;padding:10px}
.pb{display:flex;flex-direction:column;gap:3px}
.plbl{font-size:.55rem;color:var(--dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.pval{font-family:var(--mono);font-size:.85rem;font-weight:700;color:var(--txt)}
.pval.pg{color:var(--green);font-size:.95rem}
.pval.pa{color:var(--amber);font-size:.95rem}

/* TAGS */
.tags{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.tag{font-size:.6rem;color:var(--dim);background:rgba(255,255,255,.04);
  border:1px solid var(--b0);border-radius:4px;padding:2px 6px;
  font-family:var(--mono);white-space:nowrap}
.dpill{font-family:var(--mono);font-size:.6rem;font-weight:700;padding:2px 7px;
  border-radius:4px;background:var(--gdim);color:var(--green);
  border:1px solid rgba(34,197,94,.2);white-space:nowrap}

/* FOOTER */
.cfoot{display:flex;align-items:center;justify-content:space-between;gap:6px}
.platag{font-size:.6rem;color:var(--dim);font-family:var(--mono);
  display:flex;align-items:center;gap:4px}
.dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
.lbc{background:#f97316}.les{background:#8b5cf6}.asc{background:#06b6d4}

.links{display:flex;gap:5px}
.clink{font-size:.68rem;font-weight:600;text-decoration:none;
  display:inline-flex;align-items:center;gap:3px;
  padding:7px 10px;border-radius:7px;-webkit-tap-highlight-color:transparent;
  min-height:36px;transition:all .15s}
.clink:active{opacity:.7}
.lkfr{color:var(--amber);border:1px solid rgba(245,158,11,.25);background:var(--adim)}
.lkde{color:#60a5fa;border:1px solid rgba(96,165,250,.25);background:rgba(96,165,250,.08)}
.clink svg{width:10px;height:10px;flex-shrink:0}

.empty{text-align:center;padding:50px 20px;color:var(--dim);font-size:.85rem}
</style>
</head>
<body>

<div class="hdr">
  <h1>Arbitrage Youngtimers <span>FR→DE</span></h1>
  <p>Scan du ${scanDate} · Mobile.de + eBay KA · Frais export 1 350€</p>
  <div class="pulse">● Mis à jour ${scanDate}</div>
</div>

<div class="kpis">
  <div class="kpi">
    <div class="kpi-lbl">Opportunités</div>
    <div class="kpi-val">${records.length}</div>
    <div class="kpi-sub">deals trouvés</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">Meilleur profit</div>
    <div class="kpi-val a">${fmtEur(best)}</div>
    <div class="kpi-sub">brut max</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">Profit moyen</div>
    <div class="kpi-val g">${fmtEur(avg)}</div>
    <div class="kpi-sub">par deal</div>
  </div>
  <div class="kpi">
    <div class="kpi-lbl">🔥 Exceptionnels</div>
    <div class="kpi-val">${exceptional}</div>
    <div class="kpi-sub">profit ≥ 8 000€</div>
  </div>
</div>

<div class="filters">
  <div class="frow">
    <span class="flbl">Score</span>
    <button class="fb on" data-score="all" onclick="setScore('all',this)">Tous</button>
    <button class="fb" data-score="🔥 Exceptionnel" onclick="setScore('🔥 Exceptionnel',this)">🔥 Exceptionnel</button>
    <button class="fb" data-score="⭐ Excellent" onclick="setScore('⭐ Excellent',this)">⭐ Excellent</button>
    <button class="fb" data-score="✅ Bon" onclick="setScore('✅ Bon',this)">✅ Bon</button>
    <button class="fb" data-score="👍 Intéressant" onclick="setScore('👍 Intéressant',this)">👍 Intéressant</button>
  </div>
  <div class="frow">
    <span class="flbl">Marque</span>
    <button class="fb on" data-marque="all" onclick="setMarque('all',this)">Toutes</button>
    <button class="fb" data-marque="BMW" onclick="setMarque('BMW',this)">BMW</button>
    <button class="fb" data-marque="Porsche" onclick="setMarque('Porsche',this)">Porsche</button>
    <button class="fb" data-marque="Mercedes" onclick="setMarque('Mercedes',this)">Mercedes</button>
    <button class="fb" data-marque="Audi" onclick="setMarque('Audi',this)">Audi</button>
    <button class="fb" data-marque="VW" onclick="setMarque('VW',this)">VW</button>
  </div>
  <div class="frow">
    <span class="flbl">Profit min</span>
    <div class="profit-steps">
      <button class="ps on" data-p="0" onclick="setProfit(0,this)">Tous</button>
      <button class="ps" data-p="2000" onclick="setProfit(2000,this)">2 000€+</button>
      <button class="ps" data-p="5000" onclick="setProfit(5000,this)">5 000€+</button>
      <button class="ps" data-p="8000" onclick="setProfit(8000,this)">8 000€+</button>
      <button class="ps" data-p="12000" onclick="setProfit(12000,this)">12 000€+</button>
    </div>
  </div>
</div>

<div class="meta" id="meta"></div>
<div class="grid" id="grid"></div>

<script>
const RAW = ${data};
let fScore='all', fMarque='all', fProfit=0;

const SVG='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 10L10 2M5 2h5v5"/></svg>';

function getMarque(t){
  const s=t.toLowerCase();
  if(s.includes('porsche'))return'Porsche';
  if(s.includes('bmw'))return'BMW';
  if(s.includes('mercedes'))return'Mercedes';
  if(s.includes('audi'))return'Audi';
  if(s.includes('volkswagen')||s.includes('vw')||s.includes('golf')||s.includes('corrado'))return'VW';
  return'Autre';
}
function fmt(n){return n.toLocaleString('fr-FR')+'\u202f€';}
function fmtKm(n){return n?n.toLocaleString('fr-FR')+' km':'—';}

function scoreCard(s){
  if(s.includes('Exceptionnel'))return'exc';
  if(s.includes('Excellent'))return'xlt';
  if(s.includes('Bon'))return'bon';
  return'';
}
function scoreBadge(s){
  if(s.includes('Exceptionnel'))return's-exc';
  if(s.includes('Excellent'))return's-xlt';
  if(s.includes('Bon'))return's-bon';
  if(s.includes('Intéressant'))return's-int';
  return's-fbl';
}
function platClass(p){
  if(p==='LeBonCoin')return'lbc';
  if(p==='LesAnciennes')return'les';
  return'asc';
}

function filtered(){
  return RAW.filter(d=>{
    if(fScore!=='all'&&d.score!==fScore)return false;
    if(fMarque!=='all'&&getMarque(d.titre)!==fMarque)return false;
    if(d.profit<fProfit)return false;
    return true;
  });
}

function render(){
  const data=filtered();
  document.getElementById('meta').innerHTML='<b>'+data.length+'</b> résultat'+(data.length!==1?'s':'')+' affiché'+(data.length!==1?'s':'');
  if(!data.length){document.getElementById('grid').innerHTML='<div class="empty">Aucun résultat.</div>';return;}
  document.getElementById('grid').innerHTML=data.map(d=>\`
<div class="card \${scoreCard(d.score)}">
  <div class="card-top">
    <div class="card-title">\${d.titre}</div>
    <span class="sbadge \${scoreBadge(d.score)}">\${d.score}</span>
  </div>
  <div class="prices">
    <div class="pb"><span class="plbl">Prix FR</span><span class="pval">\${fmt(d.prix_fr)}</span></div>
    <div class="pb"><span class="plbl">Réf DE</span><span class="pval">\${fmt(d.prix_de)}</span></div>
    <div class="pb"><span class="plbl">Profit</span><span class="pval \${d.profit>=8000?'pa':'pg'}">\${fmt(d.profit)}</span></div>
  </div>
  <div class="tags">
    \${d.annee?'<span class="tag">'+d.annee+'</span>':''}
    \${d.km?'<span class="tag">'+fmtKm(d.km)+'</span>':''}
    \${d.carb?'<span class="tag">'+d.carb+'</span>':''}
    <span class="dpill">+\${d.delta}%</span>
  </div>
  <div class="cfoot">
    <div class="platag"><span class="dot \${platClass(d.plateforme)}"></span>\${d.plateforme}</div>
    <div class="links">
      \${d.lien?'<a class="clink lkfr" href="'+d.lien+'" target="_blank" rel="noopener">🇫🇷 FR '+SVG+'</a>':''}
      \${d.lien_de?'<a class="clink lkde" href="'+d.lien_de+'" target="_blank" rel="noopener">🇩🇪 DE '+SVG+'</a>':''}
    </div>
  </div>
</div>\`).join('');
}

function setScore(v,b){fScore=v;document.querySelectorAll('[data-score]').forEach(x=>x.classList.remove('on'));b.classList.add('on');render();}
function setMarque(v,b){fMarque=v;document.querySelectorAll('[data-marque]').forEach(x=>x.classList.remove('on'));b.classList.add('on');render();}
function setProfit(v,b){fProfit=v;document.querySelectorAll('[data-p]').forEach(x=>x.classList.remove('on'));b.classList.add('on');render();}

render();
</script>
</body>
</html>`;
}

export async function generateDashboard() {
  const records = await fetchOpportunities();
  const scanDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const content = html(records, scanDate);
  const outPath = resolve(process.cwd(), 'dashboard.html');
  writeFileSync(outPath, content, 'utf8');
  console.log(`📊 Dashboard généré: ${records.length} opportunités → dashboard.html`);
  return records.length;
}
