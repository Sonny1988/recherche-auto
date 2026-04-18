import { THRESHOLDS, TARGET_YOUNGTIMERS } from './config.js';
import { getRawPricesDE } from './scrapers/mobile-de.js';
import { getRawPricesEbay } from './scrapers/ebay-kleinanzeigen.js';
import { getRawPricesAS24 } from './scrapers/autoscout-de.js';

function matchTarget(annonce) {
  const titre = annonce.titre?.toLowerCase() || '';
  // Correspondance précise : marque + au moins un mot-clé du modèle ou searchFR
  return TARGET_YOUNGTIMERS.find(t => {
    const marque = t.marque.toLowerCase();
    const modele = t.modele.toLowerCase();
    return titre.includes(marque) && (
      titre.includes(modele.split(' ')[0]) ||
      titre.includes(t.searchFR.toLowerCase().split(' ').pop())
    );
  }) || null;
  // Pas de fallback par marque seule — risque de comparer E30 avec prix E39
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// Médiane filtrée par tranche de prix comparable au véhicule FR
function medianForPrice(rawPrices, prixFR, target) {
  // Tranche ciblée : 60% à 220% du prix FR (véhicules comparables)
  const zoneMin = prixFR * 0.6;
  const zoneMax = prixFR * 2.2;
  const zone = rawPrices.filter(p => p >= zoneMin && p <= zoneMax);

  // Fallback sur plage complète si trop peu de données dans la tranche
  const prices = zone.length >= 3 ? zone
    : rawPrices.filter(p => p >= target.minPrice * 0.5 && p <= target.maxPrice * 2);

  return { med: median(prices), count: prices.length, fromZone: zone.length >= 3 };
}

function calcScore(prixFR, prixDE) {
  if (!prixDE || !prixFR) return null;
  const profit_brut = prixDE - prixFR - THRESHOLDS.TOTAL_COSTS;
  const pct = ((prixDE - prixFR) / prixFR) * 100;
  return { profit_brut: Math.round(profit_brut), pct: Math.round(pct * 10) / 10 };
}

function getScoreLabel(profit) {
  if (profit >= 8000) return '🔥 Exceptionnel';
  if (profit >= 5000) return '⭐ Excellent';
  if (profit >= 3000) return '✅ Bon';
  if (profit >= 2000) return '👍 Intéressant';
  return '➡️ Faible';
}

// Bascule l'année vers la tranche la plus proche (pas de 5 ans)
// → véhicules à ±2 ans partagent le même cache, évite trop d'appels Firecrawl
function yearBucket(year) {
  if (!year) return null;
  const mid = Math.round(year / 5) * 5;
  return { min: mid - 2, max: mid + 2 };
}

// Cache en mémoire des prix bruts par (target + tranche d'années)
const _priceCache = new Map();

async function getPricesForTarget(target, annee) {
  const bucket = yearBucket(annee);
  const key = `${target.searchDE}|${bucket ? `${bucket.min}-${bucket.max}` : 'all'}`;
  if (_priceCache.has(key)) return _priceCache.get(key);

  const [
    { prices: mobile, url: urlMobile },
    { prices: ebay, url: urlEbay },
    { prices: as24, url: urlAS24 },
  ] = await Promise.all([
    getRawPricesDE(target, bucket),
    getRawPricesEbay(target, bucket),
    getRawPricesAS24(target, bucket),
  ]);

  const result = { mobile, ebay, as24, urlMobile, urlEbay, urlAS24 };
  _priceCache.set(key, result);
  return result;
}

export async function analyzeArbitrage(annonces) {
  const results = [];
  const seen = new Set();

  for (const annonce of annonces) {
    if (seen.has(annonce.id)) continue;
    seen.add(annonce.id);

    const target = annonce._target || matchTarget(annonce);
    if (!target) continue;

    const { mobile, ebay, as24, urlMobile, urlEbay, urlAS24 } = await getPricesForTarget(target, annonce.annee);

    // Médiane par tranche pour chaque source
    const { med: medMobile, count: countMobile } = medianForPrice(mobile, annonce.prix_fr, target);
    const { med: medEbay, count: countEbay } = medianForPrice(ebay, annonce.prix_fr, target);
    const { med: medAS24, count: countAS24 } = medianForPrice(as24, annonce.prix_fr, target);

    // Prendre la médiane la plus haute parmi les 3 sources comme référence de revente
    const sources = [
      { med: medMobile || 0, count: countMobile, url: urlMobile, platform: 'Mobile.de' },
      { med: medEbay || 0, count: countEbay, url: urlEbay, platform: 'eBay Kleinanzeigen' },
      { med: medAS24 || 0, count: countAS24, url: urlAS24, platform: 'AutoScout24.de' },
    ];
    const best = sources.reduce((a, b) => b.med > a.med ? b : a);
    const prixDE = best.med || null;
    if (!prixDE) continue;

    const refUrl = best.url;
    const refCount = best.count;
    const refPlatform = best.platform;

    const score = calcScore(annonce.prix_fr, prixDE);
    if (!score) continue;

    const isOpportunity =
      score.profit_brut >= THRESHOLDS.MIN_DELTA_EUR &&
      score.pct >= THRESHOLDS.MIN_DELTA_PCT;

    results.push({
      ...annonce,
      prix_de_ref: prixDE,
      count_de: refCount,
      url_de_ref: refUrl,
      ref_platform: refPlatform,
      profit_brut: score.profit_brut,
      delta_pct: score.pct,
      couts_export: THRESHOLDS.TOTAL_COSTS,
      opportunite: isOpportunity,
      score_label: getScoreLabel(score.profit_brut),
    });
  }

  return results.sort((a, b) => b.profit_brut - a.profit_brut);
}
