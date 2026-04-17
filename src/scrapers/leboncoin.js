import axios from 'axios';
import * as cheerio from 'cheerio';
import { HTTP_HEADERS, DELAY_MS } from '../config.js';

const LBC_API = 'https://api.leboncoin.fr/api/adfinder/v1/search';
const LBC_API_KEY = 'ba0c2dad52b3585c9a55a7bddc44ce9b';

// Catégories LeBonCoin
const CAT_VOITURES = '2';
const CAT_CAMPINGCAR = '5'; // Caravaning

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildCarFilters(target) {
  return {
    category: { id: CAT_VOITURES },
    keywords: { text: `${target.marque} ${target.modele}` },
    filters: {
      ranges: {
        price: { min: target.minPrice, max: target.maxPrice },
        regdate: { min: target.minYear },
      }
    },
    limit: 35,
    offset: 0,
    sort_by: 'time',
    sort_order: 'desc',
  };
}

function buildCampingCarFilters(target) {
  return {
    category: { id: CAT_CAMPINGCAR },
    keywords: { text: target.marque },
    limit: 35,
    offset: 0,
    sort_by: 'time',
    sort_order: 'desc',
  };
}

function parseAd(ad) {
  const attrs = {};
  (ad.attributes || []).forEach(a => { attrs[a.key] = a.value_label || a.value; });

  const price = ad.price?.[0] ?? null;
  if (!price) return null;

  return {
    id: ad.list_id?.toString(),
    titre: ad.subject,
    prix_fr: price,
    annee: parseInt(attrs.regdate) || null,
    km: parseInt(attrs.mileage?.replace(/\D/g, '')) || null,
    carburant: attrs.fuel || null,
    boite: attrs.gearbox || null,
    localisation: `${ad.location?.city || ''} (${ad.location?.zipcode || ''})`,
    vendeur_pro: ad.owner?.type === 'pro',
    lien: `https://www.leboncoin.fr/voitures/${ad.list_id}.htm`,
    photos: ad.images?.urls_large?.slice(0, 3) || [],
    plateforme: 'LeBonCoin',
    type: 'voiture',
  };
}

function parseCampingCarAd(ad) {
  const price = ad.price?.[0] ?? null;
  if (!price) return null;

  return {
    id: ad.list_id?.toString(),
    titre: ad.subject,
    prix_fr: price,
    annee: null,
    km: null,
    carburant: null,
    boite: null,
    localisation: `${ad.location?.city || ''} (${ad.location?.zipcode || ''})`,
    vendeur_pro: ad.owner?.type === 'pro',
    lien: `https://www.leboncoin.fr/caravaning/${ad.list_id}.htm`,
    photos: ad.images?.urls_large?.slice(0, 3) || [],
    plateforme: 'LeBonCoin',
    type: 'camping-car',
  };
}

export async function searchLeboncoin(target) {
  const isCampingCar = target.type === 'camping-car';
  const body = isCampingCar ? buildCampingCarFilters(target) : buildCarFilters(target);

  try {
    const res = await axios.post(LBC_API, body, {
      headers: {
        ...HTTP_HEADERS,
        'api_key': LBC_API_KEY,
        'Content-Type': 'application/json',
        'Origin': 'https://www.leboncoin.fr',
        'Referer': 'https://www.leboncoin.fr/',
      },
      timeout: 15000,
    });

    const ads = res.data?.ads || [];
    const parser = isCampingCar ? parseCampingCarAd : parseAd;
    const results = ads.map(parser).filter(Boolean);

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
