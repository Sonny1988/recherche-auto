import FirecrawlApp from '@mendable/firecrawl-js';
import { DELAY_MS } from '../config.js';
import { getCached, setCached } from '../cache.js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrices(markdown, target) {
  const prices = [];
  // AS24.de affiche "12.500 €" ou "€ 12.500"
  const re = /(\d{1,3}(?:\.\d{3})+|\d{4,6})\s*€|€\s*(\d{1,3}(?:\.\d{3})+|\d{4,6})/g;
  for (const m of markdown.matchAll(re)) {
    const raw = (m[1] || m[2]).replace(/\./g, '');
    const n = parseInt(raw);
    if (n >= target.minPrice * 0.4 && n <= target.maxPrice * 3) prices.push(n);
  }
  return prices;
}

export async function getRawPricesAS24(target, bucket = null) {
  if (!target.makeSlugAS24 || !target.modelSlugAS24) return { prices: [], url: null };

  const yearKey = bucket ? `${bucket.min}-${bucket.max}` : target.maxYear;
  const cacheKey = `as24-${target.makeSlugAS24}-${target.modelSlugAS24}-${yearKey}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[AS24.de] ${target.modele} ${yearKey} → cache (${cached.length} prix)`);
    return { prices: cached, url: null };
  }

  await sleep(DELAY_MS);

  const params = new URLSearchParams({
    atype: 'C',
    cy: 'D',
    pricefrom: target.minPrice,
    priceto: target.maxPrice,
    fregto: bucket ? bucket.max : target.maxYear,
  });
  if (bucket) params.set('fregfrom', bucket.min);

  const url = `https://www.autoscout24.de/lst/${target.makeSlugAS24}/${target.modelSlugAS24}?${params}`;

  try {
    const result = await fc.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
    });

    const markdown = result.markdown || '';
    const prices = markdown ? parsePrices(markdown, target) : [];
    setCached(cacheKey, prices);
    console.log(`[AS24.de] ${target.modele} → ${prices.length} prix scrapés (${url})`);
    return { prices, url };
  } catch (err) {
    console.error(`[AS24.de] Erreur ${target.modele}: ${err.message}`);
    return { prices: [], url };
  }
}
