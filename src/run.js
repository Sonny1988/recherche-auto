import 'dotenv/config';
import { execSync } from 'child_process';
import { TARGET_YOUNGTIMERS } from './config.js';
import { searchAllLeboncoin } from './scrapers/leboncoin.js';
import { searchAllLesAnciennes } from './scrapers/lesanciennes.js';
import { searchAllFrance } from './scrapers/autoscout-fr.js';
import { analyzeArbitrage } from './arbitrage.js';
import { syncAll } from './airtable.js';
import { generateDashboard } from './generate-dashboard.js';

async function run() {
  console.log('\n=== RECHERCHE AUTO — Scan youngtimers FR→DE ===');
  console.log(`Démarrage: ${new Date().toLocaleString('fr-FR')}\n`);

  if (!process.env.AIRTABLE_BASE_ID) {
    console.error('❌ AIRTABLE_BASE_ID manquant dans .env');
    process.exit(1);
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('❌ FIRECRAWL_API_KEY manquant dans .env');
    process.exit(1);
  }

  // Filtre optionnel par marque (passé depuis le dashboard via SCAN_MARQUES=BMW,Porsche)
  const scanMarques = process.env.SCAN_MARQUES
    ? process.env.SCAN_MARQUES.split(',').map(m => m.trim().toLowerCase())
    : null;
  const targets = scanMarques
    ? TARGET_YOUNGTIMERS.filter(t => scanMarques.includes(t.marque.toLowerCase()))
    : TARGET_YOUNGTIMERS;
  if (scanMarques) console.log(`🎯 Filtre marques: ${scanMarques.join(', ')} (${targets.length} modèles)\n`);

  // 1. Scraper les 3 sources françaises en parallèle
  console.log(`📡 Phase 1: Scraping sources FR (${targets.length} modèles)...`);
  const [annoncesLBC, annoncesLA, annoncesAS24] = await Promise.all([
    searchAllLeboncoin(targets),
    searchAllLesAnciennes(targets),
    searchAllFrance(targets),
  ]);

  // Dédupliquer cross-sources par ID
  const seenIds = new Set();
  const annonces = [...annoncesLBC, ...annoncesLA, ...annoncesAS24].filter(a => {
    if (seenIds.has(a.id)) return false;
    seenIds.add(a.id);
    return true;
  });

  console.log(`   → LeBonCoin: ${annoncesLBC.length} | LesAnciennes: ${annoncesLA.length} | AutoScout24.fr: ${annoncesAS24.length} | Total: ${annonces.length}\n`);

  if (!annonces.length) {
    console.log('Aucune annonce trouvée. Fin.');
    return;
  }

  // 2. Analyser l'arbitrage avec comparaison par tranche de prix
  console.log('📊 Phase 2: Analyse arbitrage (Mobile.de + eBay KA, tranche de prix)...');
  const analysed = await analyzeArbitrage(annonces);
  const opportunities = analysed.filter(v => v.opportunite);
  console.log(`   → ${analysed.length} analysées, ${opportunities.length} opportunités\n`);

  // 3. Sync Airtable (batch)
  console.log('💾 Phase 3: Sync Airtable (batch)...');
  const syncResult = await syncAll(analysed);

  console.log('\n=== SCAN TERMINÉ ===');
  console.log(`Total: ${annonces.length} annonces | ${opportunities.length} opportunités`);
  console.log(`Airtable: ${syncResult.created} créés, ${syncResult.updated} mis à jour`);

  // 4. Regénérer le dashboard et pousser sur GitHub Pages
  console.log('\n🌐 Phase 4: Mise à jour dashboard GitHub Pages...');
  await generateDashboard();
  try {
    const date = new Date().toLocaleDateString('fr-FR');
    execSync('git add dashboard.html', { stdio: 'inherit' });
    execSync(`git commit -m "dashboard: scan ${date} — ${opportunities.length} opportunités"`, { stdio: 'inherit' });
    execSync('git push origin master', { stdio: 'inherit' });
    console.log('✅ Dashboard publié sur GitHub Pages\n');
  } catch (err) {
    console.warn(`⚠️  Push GitHub échoué (${err.message}) — dashboard.html mis à jour localement`);
  }
}

run().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
