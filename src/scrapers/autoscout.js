import axios from 'axios';
import * as cheerio from 'cheerio';
import { DELAY_MS } from '../config.js';

const BASE_URL = 'https://www.autoscout24.de';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Parse "€ 39.880" → 39880
function parsePrice(str) {
  if (!str) return null;
  const clean = str.replace(/[^\d]/g, '');
  const n = parseInt(clean);
  return (n > 500 && n < 500000) ? n : null;
}

// Parse "27.134 km" → 27134
function parseKm(str) {
  if (!str) return null;
  return parseInt(str.replace(/[^\d]/g, '')) || null;
}

// Parse "01/2022" → 2022
function parseYear(str) {
  if (!str) return null;
  const m = str.match(/(\d{4})/);
  return m ? parseInt(m[1]) : null;
}

function buildUrl(target, year) {
  const params = new URLSearchParams({ atype: 'C', cy: 'D', sort: 'standard', desc: '0' });
  if (target.minPrice) params.set('pricefrom', target.minPrice);
  if (target.maxPrice) params.set('priceto', Math.min(target.maxPrice * 1.5, 150000));
  if (year) { params.set('fregfrom', year - 1); params.set('fregto', year + 1); }

  const slug = target.type === 'camping-car' ? '/wohnmobile' : `/lst/${target.marqueDE}`;
  return `${BASE_URL}${slug}?${params}`;
}

function parseListing(item, modelKeyword) {
  try {
    const price = parsePrice(item.price?.priceFormatted);
    if (!price) return null;

    const model = item.vehicle?.model || item.vehicle?.modelGroup || '';
    const make = item.vehicle?.make || '';

    // Filtrer par modèle si keyword fourni
    if (modelKeyword && !model.toLowerCase().includes(modelKeyword.toLowerCase()) &&
        !item.vehicle?.modelVersionInput?.toLowerCase().includes(modelKeyword.toLowerCase())) {
      return null;
    }

    const regData = item.vehicleDetails?.find(d => d.ariaLabel === 'Erstzulassung')?.data;
    const kmData = item.vehicle?.mileageInKm;

    return {
      prix: price,
      annee: parseYear(regData),
      km: parseKm(kmData),
      carburant: item.vehicle?.fuel || null,
      model: `${make} ${model}`.trim(),
    };
  } catch { return null; }
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// Pas de filtrage modèle : on compare la marque entière (même fourchette de prix)
// AutoScout24.de utilise des slugs modèles différents, mieux vaut la médiane marque
function modelKeyword() { return null; }

export async function getReferencePrice(target, year = null) {
  const url = buildUrl(target, year);
  const keyword = modelKeyword(target);

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(res.data);
    const raw = $('script#__NEXT_DATA__').text();
    if (!raw) throw new Error('__NEXT_DATA__ absent');

    const data = JSON.parse(raw);
    const listings = Object.values(data?.props?.pageProps?.listings || {});

    const parsed = listings.map(l => parseListing(l, keyword)).filter(Boolean);
    const prices = parsed.map(l => l.prix);

    if (!prices.length) {
      console.warn(`[AutoScout24] ${target.marque} ${target.modele || ''} → 0 prix (keyword: ${keyword})`);
      return { median: null, count: 0, url };
    }

    const med = median(prices);
    console.log(`[AutoScout24] ${target.marque} ${target.modele || ''} → médiane DE: ${med?.toLocaleString('fr-FR')}€ (${prices.length} annonces)`);
    return { median: med, count: prices.length, url };

  } catch (err) {
    console.error(`[AutoScout24] Erreur ${target.marque} ${target.modele || ''}: ${err.message}`);
    return { median: null, count: 0, url };
  }
}

const priceCache = new Map();

export async function getCachedReferencePrice(target, year = null) {
  const key = `${target.marqueDE}_${year || 'any'}`;
  if (priceCache.has(key)) return priceCache.get(key);
  await sleep(DELAY_MS);
  const result = await getReferencePrice(target, year);
  priceCache.set(key, result);
  return result;
}
