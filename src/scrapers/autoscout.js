import axios from 'axios';
import * as cheerio from 'cheerio';
import { HTTP_HEADERS, DELAY_MS } from '../config.js';

// AutoScout24.de — prix de référence Allemagne
const BASE_URL = 'https://www.autoscout24.de';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildUrl(target, year, maxKm) {
  const params = new URLSearchParams({
    atype: 'C',
    cy: 'D',
    ustate: 'N,U',
    sort: 'standard',
    desc: '0',
    ...(target.minPrice && { pricefrom: target.minPrice }),
    ...(target.maxPrice && { priceto: Math.min(target.maxPrice * 1.5, 100000) }),
    ...(year && { fregfrom: year, fregto: year + 3 }),
    ...(maxKm && { kmto: maxKm }),
  });

  const slug = target.type === 'camping-car'
    ? `/wohnmobile`
    : `/lst/${target.marqueDE}/${target.modeleDE}`;

  return `${BASE_URL}${slug}?${params.toString()}`;
}

function extractNextData(html) {
  const $ = cheerio.load(html);
  let data = null;
  $('script#__NEXT_DATA__').each((_, el) => {
    try { data = JSON.parse($(el).text()); } catch {}
  });
  return data;
}

function extractListingsFromNextData(nextData) {
  try {
    const props = nextData?.props?.pageProps;
    // AutoScout24 stocke les annonces dans différents chemins selon la version
    const listings =
      props?.listings?.data?.search?.items ||
      props?.initialState?.search?.listings ||
      props?.searchResponse?.listings ||
      [];
    return listings;
  } catch {
    return [];
  }
}

function parseListing(item) {
  try {
    const price = item.prices?.public?.priceRaw || item.price?.value || null;
    if (!price) return null;
    return {
      prix: parseInt(price),
      annee: item.firstRegistration?.year || null,
      km: item.mileage?.value || null,
      carburant: item.fuel?.label || null,
    };
  } catch {
    return null;
  }
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function getReferencePrice(target, year = null, maxKm = null) {
  const url = buildUrl(target, year, maxKm);

  try {
    const res = await axios.get(url, {
      headers: {
        ...HTTP_HEADERS,
        'Accept-Language': 'de-DE,de;q=0.9',
        'Referer': 'https://www.autoscout24.de/',
      },
      timeout: 20000,
    });

    const nextData = extractNextData(res.data);
    const listings = extractListingsFromNextData(nextData);
    const prices = listings.map(parseListing).filter(Boolean).map(l => l.prix);

    if (!prices.length) {
      // Fallback: chercher les prix dans le HTML brut
      const $ = cheerio.load(res.data);
      const pricesFound = [];
      $('[data-testid="regular-price"] span, .cldt-price').each((_, el) => {
        const txt = $(el).text().replace(/[^\d]/g, '');
        const p = parseInt(txt);
        if (p > 1000 && p < 200000) pricesFound.push(p);
      });
      if (pricesFound.length) {
        const med = median(pricesFound);
        console.log(`[AutoScout24] ${target.marque} ${target.modele || ''} → référence DE: ${med}€ (${pricesFound.length} annonces, fallback HTML)`);
        return { median: med, count: pricesFound.length, url };
      }

      console.warn(`[AutoScout24] ${target.marque} ${target.modele || ''} → 0 prix trouvés`);
      return { median: null, count: 0, url };
    }

    const med = median(prices);
    console.log(`[AutoScout24] ${target.marque} ${target.modele || ''} → référence DE: ${med}€ (${prices.length} annonces)`);
    return { median: med, count: prices.length, url };

  } catch (err) {
    console.error(`[AutoScout24] Erreur ${target.marque} ${target.modele || ''}: ${err.message}`);
    return { median: null, count: 0, url };
  }
}

// Cache pour éviter de re-scraper le même modèle/année plusieurs fois
const priceCache = new Map();

export async function getCachedReferencePrice(target, year = null) {
  const key = `${target.marqueDE}_${target.modeleDE}_${year || 'any'}`;
  if (priceCache.has(key)) return priceCache.get(key);

  await sleep(DELAY_MS);
  const result = await getReferencePrice(target, year);
  priceCache.set(key, result);
  return result;
}
