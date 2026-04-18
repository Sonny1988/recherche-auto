import FirecrawlApp from '@mendable/firecrawl-js';
import { DELAY_MS } from '../config.js';
import { getCached, setCached } from '../cache.js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePricesFromListings(markdown, target) {
  const prices = [];
  const seen = new Set();
  const blocks = markdown.split(/\n(?=##\s+\[)/);

  for (const block of blocks) {
    const urlMatch = block.match(/https?:\/\/www\.kleinanzeigen\.de\/s-anzeige\/([\w-]+)/);
    if (!urlMatch) continue;
    const id = urlMatch[1];
    if (seen.has(id)) continue;
    seen.add(id);

    const lower = block.toLowerCase();
    if (/\bsuche\b|\bankauf\b|\bgesucht\b|\bwanted\b/.test(lower)) continue;

    const priceRe = /(\d{1,3}(?:\.\d{3})+|\d{4,})\s*€/g;
    for (const m of block.matchAll(priceRe)) {
      const n = parseInt(m[1].replace(/\./g, ''));
      if (n >= target.minPrice * 0.4 && n <= target.maxPrice * 3) {
        prices.push(n);
        break;
      }
    }
  }

  return prices;
}

export async function getRawPricesEbay(target, bucket = null) {
  const yearKey = bucket ? `${bucket.min}-${bucket.max}` : target.maxYear;
  const cacheKey = `ebay-${target.searchDE}-${yearKey}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[eBay KA] ${target.searchDE} ${yearKey} → cache (${cached.length} prix)`);
    return { prices: cached, url: null };
  }

  await sleep(DELAY_MS);

  // Format Kleinanzeigen : /s-{mots-clés-tirets}/k0c216 — le slug est le terme de recherche,
  // pas une localisation. /s-autos/{slug}/ mettrait le slug en position ville → liste hors sujet.
  const slug = target.searchDE.toLowerCase().replace(/\s+/g, '-');
  const yearParams = bucket
    ? `?minbaujahr=${bucket.min}&maxbaujahr=${bucket.max}`
    : '';
  const url = `https://www.kleinanzeigen.de/s-${slug}/k0c216${yearParams}`;

  try {
    const result = await fc.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
    });

    const markdown = result.markdown || '';
    const prices = markdown ? parsePricesFromListings(markdown, target) : [];
    setCached(cacheKey, prices);
    console.log(`[eBay KA] ${target.searchDE} → ${prices.length} prix scrapés`);
    return { prices, url };
  } catch (err) {
    console.error(`[eBay KA] Erreur ${target.searchDE}: ${err.message}`);
    return { prices: [], url };
  }
}
