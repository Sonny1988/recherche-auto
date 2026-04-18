import FirecrawlApp from '@mendable/firecrawl-js';
import { DELAY_MS, MOBILE_DE_MAKE_IDS } from '../config.js';
import { getCached, setCached } from '../cache.js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrices(markdown, target) {
  const prices = [];
  const re = /(\d{1,3}(?:[.\s]\d{3})*)\s*€/g;
  for (const m of markdown.matchAll(re)) {
    const n = parseInt(m[1].replace(/[.\s]/g, ''));
    if (n >= target.minPrice * 0.4 && n <= target.maxPrice * 3) prices.push(n);
  }
  return prices;
}

export async function getRawPricesDE(target, bucket = null) {
  const yearKey = bucket ? `${bucket.min}-${bucket.max}` : target.maxYear;
  const cacheKey = `mobile-${target.searchDE}-${yearKey}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Mobile.de] ${target.modele} ${yearKey} → cache (${cached.length} prix)`);
    return { prices: cached, url: null };
  }

  await sleep(DELAY_MS);

  const makeId = MOBILE_DE_MAKE_IDS[target.marque];
  const paramObj = {
    sfmr: 'false',
    vc: 'Car',
    minPrice: target.minPrice,
    maxPrice: target.maxPrice,
    maxFirstRegistrationDate: `${bucket ? bucket.max : target.maxYear}-12-31`,
  };
  if (bucket) paramObj.minFirstRegistrationDate = `${bucket.min}-01-01`;

  // makeId filtre la marque côté serveur (ex: BMW uniquement)
  // searchText filtre le modèle en texte libre dans les résultats de cette marque
  if (makeId) {
    paramObj['makeModelVariant1.makeId'] = makeId;
    const modelPart = target.searchDE.replace(target.marque, '').trim();
    if (modelPart) paramObj.searchText = modelPart; // ex: "3er E36", "C-Klasse W202"
  } else {
    paramObj.searchText = target.searchDE;
  }

  const params = new URLSearchParams(paramObj);
  const url = `https://suchen.mobile.de/fahrzeuge/search.html?${params}`;

  try {
    const result = await fc.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
    });

    const markdown = result.markdown || '';
    const prices = markdown ? parsePrices(markdown, target) : [];
    setCached(cacheKey, prices);
    console.log(`[Mobile.de] ${target.modele} → ${prices.length} prix scrapés (${url})`);
    return { prices, url };
  } catch (err) {
    console.error(`[Mobile.de] Erreur ${target.modele}: ${err.message}`);
    return { prices: [], url };
  }
}
