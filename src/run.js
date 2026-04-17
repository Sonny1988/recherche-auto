import 'dotenv/config';
import { TARGET_CARS, TARGET_CAMPINGCARS } from './config.js';
import { searchAllFrance } from './scrapers/leboncoin.js';
import { analyzeArbitrage } from './arbitrage.js';
import { syncAll } from './airtable.js';
import { sendAlert, sendSummary } from './telegram.js';

async function run() {
  console.log('\n=== RECHERCHE AUTO — Scan arbitrage FR→DE ===');
  console.log(`Démarrage: ${new Date().toLocaleString('fr-FR')}\n`);

  if (!process.env.AIRTABLE_BASE_ID) {
    console.error('❌ AIRTABLE_BASE_ID manquant dans .env');
    console.error('   → Lance d\'abord: node scripts/setup-airtable.js');
    process.exit(1);
  }

  // 1. Scraper les annonces en France
  console.log('📡 Phase 1: Scraping LeBonCoin France...');
  const allTargets = [...TARGET_CARS, ...TARGET_CAMPINGCARS];
  const annonces = await searchAllFrance(allTargets);
  console.log(`   → ${annonces.length} annonces récupérées\n`);

  if (!annonces.length) {
    console.log('Aucune annonce trouvée. Fin.');
    return;
  }

  // 2. Analyser l'arbitrage (récupère prix DE pour chaque modèle)
  console.log('📊 Phase 2: Analyse arbitrage (prix DE en temps réel)...');
  const analysed = await analyzeArbitrage(annonces);
  const opportunities = analysed.filter(v => v.opportunite);
  console.log(`   → ${analysed.length} analysées, ${opportunities.length} opportunités\n`);

  // 3. Sync Airtable (tous les véhicules analysés, pas seulement les opportunités)
  console.log('💾 Phase 3: Sync Airtable...');
  const syncResult = await syncAll(analysed);

  // 4. Alertes Telegram pour les meilleures opportunités
  console.log('\n📱 Phase 4: Alertes Telegram...');
  const topDeals = opportunities.filter(v => v.profit_brut >= 3000);

  for (const deal of topDeals.slice(0, 5)) { // max 5 alertes par scan
    await sendAlert(deal);
    await new Promise(r => setTimeout(r, 500));
  }

  // Résumé final
  await sendSummary(
    { total: annonces.length, opportunities: opportunities.length, ...syncResult },
    opportunities
  );

  console.log('\n=== SCAN TERMINÉ ===');
  console.log(`Total: ${annonces.length} annonces | ${opportunities.length} opportunités | ${topDeals.length} alertes envoyées`);
  console.log(`Airtable: ${syncResult.created} créés, ${syncResult.updated} mis à jour\n`);
}

run().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
