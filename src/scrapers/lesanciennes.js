import FirecrawlApp from '@mendable/firecrawl-js';
import { DELAY_MS } from '../config.js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const MARQUE_SLUGS = {
  'BMW': 'bmw',
  'Mercedes': 'mercedes-benz',
  'Porsche': 'porsche',
  'VW': 'volkswagen',
  'Audi': 'audi',
};

function parseListings(markdown, target) {
  const results = [];
  const seen = new Set();

  // Split sur les blocs d'annonces (lien /annonce/)
  const blocks = markdown.split(/\n(?=\[)/);

  // Keywords du modèle pour filtrage in-memory
  const keywords = target.searchFR.toLowerCase().split(' ').filter(k => k.length > 1);

  for (const block of blocks) {
    if (!block.includes('lesanciennes.com/annonce/')) continue;

    // Extraire l'URL et l'ID
    const urlMatch = block.match(/https?:\/\/www\.lesanciennes\.com\/annonce\/([\w-]+)/);
    if (!urlMatch) continue;
    const slug = urlMatch[1];
    const idMatch = slug.match(/(a\d{5,})$/);
    const id = idMatch ? idMatch[1] : slug;
    if (seen.has(id)) continue;

    // Extraire le titre (texte entre ** **) — blocs image n'ont pas de titre
    const titreMatch = block.match(/\*\*([^*]+)\*\*/);
    if (!titreMatch) continue;
    seen.add(id); // marquer seulement si bloc valide
    const titre = titreMatch[1].trim();

    const lower = block.toLowerCase();

    // Marque obligatoire + au moins un mot-clé modèle (ex: "bmw" ET ("e30" OU "325"))
    const brandMatch = lower.includes(keywords[0]);
    const modelMatch = keywords.length < 2 || keywords.slice(1).some(k => lower.includes(k));
    if (!brandMatch || !modelMatch) continue;

    // Extraire le prix
    const priceRe = /(\d[\d\s]*)\s*€/g;
    const prices = [...block.matchAll(priceRe)]
      .map(m => parseInt(m[1].replace(/\s/g, '')))
      .filter(p => p >= target.minPrice && p <= target.maxPrice);
    const price = prices[0];
    if (!price) continue;

    // Extraire l'année (toute année 4 chiffres plausible)
    const yearMatch = (titre + ' ' + block).match(/\b(19\d{2}|20\d{2})\b/);
    const annee = yearMatch ? parseInt(yearMatch[1]) : null;
    if (!annee) continue; // rejeter si pas d'année identifiable
    if (annee > target.maxYear) continue;

    // Extraire km
    const kmMatch = block.match(/(\d[\d\s]*)\s*km/i);
    const km = kmMatch ? parseInt(kmMatch[1].replace(/\s/g, '')) : null;

    // Carburant
    const carburant = lower.includes('diesel') ? 'Diesel' : lower.includes('essence') ? 'Essence' : null;

    results.push({
      id: `la-${id}`,
      titre: titre.slice(0, 100),
      prix_fr: price,
      annee,
      km: km && km < 500000 ? km : null,
      carburant,
      localisation: '',
      vendeur_pro: lower.includes('pro') || lower.includes('professionnel'),
      lien: `https://www.lesanciennes.com/annonce/${slug}`,
      plateforme: 'LesAnciennes',
      type: 'youngtimer',
      _target: target,
    });
  }

  return results;
}

export async function searchLesAnciennes(target) {
  const slug = MARQUE_SLUGS[target.marque];
  if (!slug) return [];

  const url = `https://www.lesanciennes.com/annonces/voiture-collection/${slug}/`;

  try {
    const result = await fc.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 2000,
    });

    const markdown = result.markdown || '';
    if (!markdown) { console.log(`[LesAnciennes] ${target.searchFR} → page vide`); return []; }

    const ads = parseListings(markdown, target);
    console.log(`[LesAnciennes] ${target.searchFR} → ${ads.length} annonces`);
    return ads;
  } catch (err) {
    console.error(`[LesAnciennes] Erreur ${target.searchFR}: ${err.message}`);
    return [];
  }
}

const PAGES = 3;
// Cache par marque+page pour éviter de re-scraper dans le même run
const _pageCache = new Map();

async function fetchMarkdown(slug, page) {
  const key = `${slug}-p${page}`;
  if (_pageCache.has(key)) return _pageCache.get(key);

  const url = page === 1
    ? `https://www.lesanciennes.com/annonces/voiture-collection/${slug}/`
    : `https://www.lesanciennes.com/annonces/voiture-collection/${slug}/?page=${page}`;

  await sleep(DELAY_MS);
  try {
    const result = await fc.scrape(url, { formats: ['markdown'], onlyMainContent: true, waitFor: 2000 });
    const markdown = result.markdown || '';
    _pageCache.set(key, markdown);
    return markdown;
  } catch (err) {
    console.error(`[LesAnciennes] Erreur scraping ${slug} p${page}: ${err.message}`);
    return '';
  }
}

export async function searchAllLesAnciennes(targets) {
  const all = [];
  const seen = new Set();

  for (const target of targets) {
    const slug = MARQUE_SLUGS[target.marque];
    if (!slug) continue;

    let found = 0;
    for (let page = 1; page <= PAGES; page++) {
      const markdown = await fetchMarkdown(slug, page);
      if (!markdown) break;

      const ads = parseListings(markdown, target);
      const fresh = ads.filter(a => !seen.has(a.id));
      fresh.forEach(a => seen.add(a.id));
      all.push(...fresh);
      found += fresh.length;

      if (ads.length === 0) break;
    }
    console.log(`[LesAnciennes] ${target.searchFR} → ${found} annonces`);
  }

  return all;
}
