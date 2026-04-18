import FirecrawlApp from '@mendable/firecrawl-js';
import { DELAY_MS } from '../config.js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseAds(markdown, target) {
  const results = [];
  const lines = markdown.split('\n');

  // Patterns de prix : "12 500 €", "12500€", "12.500 €"
  const priceRe = /(\d[\d\s.]*)\s*€/g;
  // Patterns d'année : "1994", "de 1994", "année 1994"
  const yearRe = /\b(19[6-9]\d|200[0-2])\b/g;
  // Patterns km : "120 000 km", "120000km"
  const kmRe = /(\d[\d\s]*)\s*km/gi;

  // Chercher les blocs d'annonces (souvent séparés par des liens ou titres)
  const adBlocks = markdown.split(/\n(?=\[|\#{1,3}\s)/);

  for (const block of adBlocks) {
    if (block.length < 20) continue;

    const lower = block.toLowerCase();
    const keyword = target.searchFR.toLowerCase().split(' ')[1] || target.searchFR.toLowerCase();
    if (!lower.includes(keyword) && !lower.includes(target.marque.toLowerCase())) continue;

    const prices = [...block.matchAll(priceRe)].map(m => parseInt(m[1].replace(/[\s.]/g, '')));
    const years = [...block.matchAll(yearRe)].map(m => parseInt(m[1]));
    const kms = [...block.matchAll(kmRe)].map(m => parseInt(m[1].replace(/[\s.]/g, '')));

    const price = prices.find(p => p >= 500 && p <= 200000);
    if (!price) continue;

    // Rejeter les blocs sans lien d'annonce réelle
    const linkMatch2 = block.match(/\(https?:\/\/[^\)]+leboncoin[^\)]+\/ad\/[^\)]+\)/);
    if (!linkMatch2) continue;

    const year = years.find(y => y <= target.maxYear && y >= 1960);

    const lien = linkMatch2[0].slice(1, -1);

    // Extraire le lien ID (doit être un vrai ID d'annonce à 10+ chiffres)
    const adId = lien.match(/\/(\d{10,})/)?.[1];
    if (!adId) continue;

    // Extraire le titre depuis le texte du lien /ad/ lui-même
    const titreMatch = block.match(/\[([^\]]+)\]\(https?:\/\/[^\)]+\/ad\/[^\)]+\)/);
    const titreRaw = titreMatch ? titreMatch[1].replace(/^#+\s*/g, '').trim() : '';

    // Titre générique ou parasite → fallback sur marque + modele + année si dispo
    const isGeneric = !titreRaw || /résultats|voir toutes|voir.l.annonce|boutique|annonces de|signaler|pro vérifié/i.test(titreRaw);
    const titre = isGeneric
      ? `${target.marque} ${target.modele}${years[0] ? ' ' + years[0] : ''}`
      : titreRaw;

    results.push({
      id: adId,
      titre: titre.slice(0, 100),
      prix_fr: price,
      annee: year || null,
      km: kms.find(k => k > 0 && k < 500000) || null,
      carburant: lower.includes('diesel') ? 'Diesel' : lower.includes('essence') ? 'Essence' : null,
      localisation: '',
      vendeur_pro: lower.includes('pro') || lower.includes('dealer'),
      lien: lien || `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(target.searchFR)}`,
      plateforme: 'LeBonCoin',
      type: 'youngtimer',
      _target: target,
    });
  }

  return results;
}

const PAGES = 3;

export async function searchLeboncoin(target) {
  const baseUrl = `https://www.leboncoin.fr/recherche?category=2&text=${encodeURIComponent(target.searchFR)}&price=${target.minPrice}-${target.maxPrice}&regdate=1960-${target.maxYear}`;
  const allAds = [];
  const seenIds = new Set();

  for (let page = 1; page <= PAGES; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
    try {
      const result = await fc.scrape(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      });

      const markdown = result.markdown || '';
      if (!markdown) break;

      const ads = parseAds(markdown, target);
      const fresh = ads.filter(a => !seenIds.has(a.id));
      fresh.forEach(a => seenIds.add(a.id));
      allAds.push(...fresh);

      if (ads.length === 0) break; // pas d'annonces = dernière page
      if (page < PAGES) await sleep(DELAY_MS);
    } catch (err) {
      console.error(`[LeBonCoin] Erreur ${target.searchFR} p${page}: ${err.message}`);
      break;
    }
  }

  console.log(`[LeBonCoin] ${target.searchFR} → ${allAds.length} annonces`);
  return allAds;
}

export async function searchAllLeboncoin(targets) {
  const all = [];
  for (const target of targets) {
    const results = await searchLeboncoin(target);
    all.push(...results);
    await sleep(DELAY_MS);
  }
  return all;
}
