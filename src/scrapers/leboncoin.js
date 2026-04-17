import axios from 'axios';
import * as cheerio from 'cheerio';
import { DELAY_MS } from '../config.js';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildUrl(target) {
  if (target.type === 'camping-car') {
    return `https://www.leboncoin.fr/recherche?category=5&text=${encodeURIComponent(target.marque)}&sort=time&order=desc`;
  }
  const params = new URLSearchParams({
    category: '2',
    brand: target.marque,
    model: target.modele,
    price: `${target.minPrice}-${target.maxPrice}`,
    sort: 'time',
    order: 'desc',
  });
  return `https://www.leboncoin.fr/recherche?${params}`;
}

function parseAd(ad, type = 'voiture') {
  const attrs = {};
  (ad.attributes || []).forEach(a => { attrs[a.key] = a.value_label || a.value; });

  const price = ad.price?.[0] ?? null;
  if (!price) return null;

  const isCampingCar = type === 'camping-car';
  const path = isCampingCar ? 'caravaning' : 'voitures';

  return {
    id: ad.list_id?.toString(),
    titre: ad.subject,
    prix_fr: price,
    annee: parseInt(attrs.regdate) || null,
    km: parseInt((attrs.mileage || '').replace(/\D/g, '')) || null,
    carburant: attrs.fuel || null,
    boite: attrs.gearbox || null,
    localisation: `${ad.location?.city || ''} (${ad.location?.zipcode || ''})`,
    vendeur_pro: ad.owner?.type === 'pro',
    lien: ad.url || `https://www.leboncoin.fr/${path}/${ad.list_id}.htm`,
    photos: ad.images?.urls_large?.slice(0, 3) || [],
    plateforme: 'LeBonCoin',
    type,
  };
}

export async function searchLeboncoin(target) {
  const isCampingCar = target.type === 'camping-car';
  const url = buildUrl(target);

  try {
    const res = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 20000 });
    const $ = cheerio.load(res.data);
    const raw = $('script#__NEXT_DATA__').text();
    if (!raw) throw new Error('__NEXT_DATA__ absent');

    const data = JSON.parse(raw);
    const ads =
      data?.props?.pageProps?.searchData?.ads ||
      data?.props?.pageProps?.ads ||
      [];

    const type = isCampingCar ? 'camping-car' : 'voiture';
    const results = ads.map(ad => parseAd(ad, type)).filter(Boolean);

    console.log(`[LeBonCoin] ${target.marque} ${target.modele || ''} → ${results.length} annonces`);
    return results;
  } catch (err) {
    console.error(`[LeBonCoin] Erreur ${target.marque} ${target.modele || ''}: ${err.message}`);
    return [];
  }
}

export async function searchAllFrance(targets) {
  const all = [];
  for (const target of targets) {
    const results = await searchLeboncoin(target);
    all.push(...results);
    await sleep(DELAY_MS);
  }
  return all;
}
