import { THRESHOLDS, TARGET_CARS, TARGET_CAMPINGCARS } from './config.js';
import { getCachedReferencePrice } from './scrapers/autoscout.js';

// Trouve le target config correspondant à une annonce LeBonCoin
function matchTarget(annonce) {
  const titre = annonce.titre?.toLowerCase() || '';
  const allTargets = [...TARGET_CARS, ...TARGET_CAMPINGCARS];

  return allTargets.find(t => {
    const marque = t.marque.toLowerCase();
    const modele = (t.modele || '').toLowerCase();
    return titre.includes(marque) || titre.includes(modele);
  }) || null;
}

// Calcule le score d'opportunité
function calcScore(prixFR, prixDE, couts = THRESHOLDS.TOTAL_COSTS) {
  if (!prixDE || !prixFR) return null;
  const profit_brut = prixDE - prixFR - couts;
  const pct = ((prixDE - prixFR) / prixFR) * 100;
  return { profit_brut: Math.round(profit_brut), pct: Math.round(pct * 10) / 10 };
}

export async function analyzeArbitrage(annonces) {
  const opportunities = [];

  for (const annonce of annonces) {
    const target = matchTarget(annonce);
    if (!target) continue;

    // Récupérer prix de référence DE (avec cache par modèle+année)
    const refDE = await getCachedReferencePrice(target, annonce.annee);

    if (!refDE.median) continue;

    const score = calcScore(annonce.prix_fr, refDE.median);
    if (!score) continue;

    const isOpportunity =
      score.profit_brut >= THRESHOLDS.MIN_DELTA_EUR &&
      score.pct >= THRESHOLDS.MIN_DELTA_PCT;

    const result = {
      ...annonce,
      prix_de_ref: refDE.median,
      count_de: refDE.count,
      url_de_ref: refDE.url,
      profit_brut: score.profit_brut,
      delta_pct: score.pct,
      couts_export: THRESHOLDS.TOTAL_COSTS,
      opportunite: isOpportunity,
      score_label: getScoreLabel(score.profit_brut),
    };

    opportunities.push(result);
  }

  // Trier par profit décroissant
  return opportunities.sort((a, b) => b.profit_brut - a.profit_brut);
}

function getScoreLabel(profit) {
  if (profit >= 8000) return '🔥 Exceptionnel';
  if (profit >= 5000) return '⭐ Excellent';
  if (profit >= 3000) return '✅ Bon';
  if (profit >= 2000) return '👍 Intéressant';
  return '➡️ Faible';
}
