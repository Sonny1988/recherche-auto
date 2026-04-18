import axios from 'axios';
import * as cheerio from 'cheerio';
import { DELAY_MS } from '../config.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const MARQUE_SLUGS = {
  'BMW': 'bmw',
  'Mercedes': 'mercedes-benz',
  'Porsche': 'porsche',
  'VW': 'volkswagen',
  'Audi': 'audi',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function parsePrice(s) { const n = parseInt((s||'').replace(/[^\d]/g,'')); return n>500&&n<500000?n:null; }
function parseKm(s) { return parseInt((s||'').replace(/[^\d]/g,''))||null; }
function parseYear(s) { const m=(s||'').match(/(\d{4})/); return m?parseInt(m[1]):null; }

function buildUrl(target, page = 1) {
  const slug = MARQUE_SLUGS[target.marque] || target.marque.toLowerCase();
  const params = new URLSearchParams({
    atype: 'C', cy: 'F', sort: 'age', desc: '0',
    pricefrom: target.minPrice,
    priceto: target.maxPrice,
    fregto: target.maxYear,
    page,
  });
  return `https://www.autoscout24.fr/lst/${slug}?${params}`;
}

function parseListing(item, target) {
  const price = parsePrice(item.price?.priceFormatted);
  if (!price) return null;

  const make = item.vehicle?.make || '';
  const model = item.vehicle?.model || '';
  const variant = item.vehicle?.variant || '';
  const reg = item.vehicleDetails?.find(d => d.iconName === 'calendar')?.data;
  const km = parseKm(item.vehicle?.mileageInKm);
  const year = parseYear(reg);

  // Filtrer par année max
  if (year && year > target.maxYear) return null;

  // Filtrer par mot-clé modèle (ex: "E30", "W124", "944")
  const fullTitle = `${make} ${model} ${variant}`.toLowerCase();
  const keywords = target.searchFR.toLowerCase().split(' ').slice(1);
  if (keywords.length && !keywords.some(k => fullTitle.includes(k))) return null;

  return {
    id: `as24-${item.id || item.crossReferenceId}`,
    titre: `${make} ${model} ${variant}`.trim().slice(0, 100),
    prix_fr: price,
    annee: year,
    km,
    carburant: item.vehicle?.fuel || null,
    boite: item.vehicle?.transmission || null,
    localisation: `${item.location?.city || ''} (${item.location?.countryCode || 'FR'})`,
    vendeur_pro: item.seller?.type === 'D',
    lien: item.url ? `https://www.autoscout24.fr${item.url}` : `https://www.autoscout24.fr/offres/${item.id}`,
    photos: (item.images || []).slice(0, 3),
    plateforme: 'AutoScout24.fr',
    type: 'youngtimer',
    _target: target,
  };
}

const PAGES = 3;

export async function searchAutoscoutFR(target) {
  const allResults = [];
  const seen = new Set();

  for (let page = 1; page <= PAGES; page++) {
    const url = buildUrl(target, page);
    try {
      const r = await axios.get(url, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(r.data);
      const raw = $('script#__NEXT_DATA__').text();
      if (!raw) break;

      const data = JSON.parse(raw);
      const listings = Object.values(data?.props?.pageProps?.listings || {});
      if (!listings.length) break;

      const results = listings
        .map(l => parseListing(l, target))
        .filter(Boolean)
        .filter(l => !seen.has(l.id));

      results.forEach(l => seen.add(l.id));
      allResults.push(...results);

      if (listings.length < 20) break; // dernière page
      if (page < PAGES) await sleep(DELAY_MS);
    } catch (err) {
      console.error(`[AutoScout24.fr] Erreur ${target.marque} p${page}: ${err.message}`);
      break;
    }
  }

  console.log(`[AutoScout24.fr] ${target.searchFR} → ${allResults.length} annonces`);
  return allResults;
}

export async function searchAllFrance(targets) {
  const all = [];
  for (const target of targets) {
    const results = await searchAutoscoutFR(target);
    all.push(...results);
    await sleep(DELAY_MS);
  }
  return all;
}
