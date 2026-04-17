import axios from 'axios';
import * as cheerio from 'cheerio';
import { DELAY_MS } from '../config.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function parsePrice(s) { const n = parseInt((s||'').replace(/[^\d]/g,'')); return n>500&&n<500000?n:null; }
function parseKm(s) { return parseInt((s||'').replace(/[^\d]/g,''))||null; }
function parseYear(s) { const m=(s||'').match(/(\d{4})/); return m?parseInt(m[1]):null; }

function buildUrl(target) {
  if (target.type === 'camping-car') {
    // camping-cars : atype=N, filtrer par marque via slug
    const params = new URLSearchParams({ atype: 'N', cy: 'F', sort: 'age', desc: '0' });
    return `https://www.autoscout24.fr/lst/${target.marqueDE}?${params}`;
  }
  const params = new URLSearchParams({
    atype: 'C', cy: 'F', sort: 'age', desc: '0',
    pricefrom: target.minPrice,
    priceto: target.maxPrice,
    fregfrom: target.minYear || 2015,
  });
  return `https://www.autoscout24.fr/lst/${target.marqueDE}?${params}`;
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

  // Filtrer camping-cars par marque dans le titre/make
  if (target.type === 'camping-car') {
    const titleLower = `${make} ${model} ${variant}`.toLowerCase();
    if (!titleLower.includes(target.marque.toLowerCase().split(' ')[0].toLowerCase())) {
      return null;
    }
  }

  return {
    id: item.id || item.crossReferenceId,
    titre: `${make} ${model} ${variant}`.trim(),
    prix_fr: price,
    annee: year,
    km,
    carburant: item.vehicle?.fuel || null,
    boite: item.vehicle?.transmission || null,
    localisation: `${item.location?.city || ''} (${item.location?.countryCode || 'FR'})`,
    vendeur_pro: item.seller?.type === 'D',
    lien: item.url || `https://www.autoscout24.fr/offres/${item.id}`,
    photos: (item.images || []).slice(0, 3),
    plateforme: 'AutoScout24.fr',
    type: target.type || 'voiture',
    marqueDE: target.marqueDE,
    modeleDE: target.modeleDE,
  };
}

export async function searchAutoscoutFR(target) {
  const url = buildUrl(target);
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(r.data);
    const raw = $('script#__NEXT_DATA__').text();
    if (!raw) throw new Error('NEXT_DATA absent');

    const data = JSON.parse(raw);
    const listings = Object.values(data?.props?.pageProps?.listings || {});
    const results = listings.map(l => parseListing(l, target)).filter(Boolean);

    console.log(`[AutoScout24.fr] ${target.marque} ${target.modele || ''} → ${results.length} annonces`);
    return results;
  } catch (err) {
    console.error(`[AutoScout24.fr] Erreur ${target.marque}: ${err.message}`);
    return [];
  }
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
