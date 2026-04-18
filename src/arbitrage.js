import { THRESHOLDS, TARGET_YOUNGTIMERS } from './config.js';
import { getRawPricesDE } from './scrapers/mobile-de.js';
import { getRawPricesEbay } from './scrapers/ebay-kleinanzeigen.js';

function matchTarget(annonce) {
  const titre = annonce.titre?.toLowerCase() || '';
  return TARGET_YOUNGTIMERS.find(t => {
    const marque = t.marque.toLowerCase();
    const modele = t.modele.toLowerCase();
    return titre.includes(marque) && (
      titre.includes(modele.split(' ')[0]) ||
      titre.includes(t.searchFR.toLowerCase().split(' ').pop())
    );
  }) || TARGET_YOUNGTIMERS.find(t => titre.includes(t.marque.toLowerCase())) || null;
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

  const [{ prices: mobile, url: urlMobile }, { prices: ebay, url: urlEbay }] = await Promise.all([
    getRawPricesDE(target, bucket),
    getRawPricesEbay(target, bucket),
  ]);

  const result = { mobile, ebay, urlMobile, urlEbay };
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

    const { mobile, ebay, urlMobile, urlEbay } = await getPricesForTarget(target, annonce.annee);

    // Médiane par tranche pour chaque source
    const { med: medMobile } = medianForPrice(mobile, annonce.prix_fr, target);
    const { med: medEbay, count: countEbay } = medianForPrice(ebay, annonce.prix_fr, target);

    // Prendre la plus haute médiane comme référence de revente
    const prixDE = Math.max(medMobile || 0, medEbay || 0) || null;
    if (!prixDE) continue;

    const isEbayBetter = (medEbay || 0) >= (medMobile || 0);
    const refUrl = isEbayBetter ? urlEbay : urlMobile;
    const refCount = isEbayBetter ? countEbay : medianForPrice(mobile, annonce.prix_fr, target).count;
    const refPlatform = isEbayBetter ? 'eBay Kleinanzeigen' : 'Mobile.de';

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
