import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const TABLE = 'Opportunités';

function toRecord(v) {
  return {
    'Titre': v.titre || '',
    'Type': v.type === 'camping-car' ? 'Camping-car' : 'Voiture',
    'Prix France (€)': v.prix_fr || 0,
    'Prix Référence DE (€)': v.prix_de_ref || 0,
    'Profit Brut (€)': v.profit_brut || 0,
    'Delta %': v.delta_pct || 0,
    'Score': v.score_label || '',
    'Opportunité': v.opportunite ? true : false,
    'Année': v.annee || null,
    'Kilométrage': v.km || null,
    'Carburant': v.carburant || '',
    'Localisation FR': v.localisation || '',
    'Lien Annonce FR': v.lien || '',
    'Lien Référence DE': v.url_de_ref || '',
    'Plateforme': v.plateforme || 'LeBonCoin',
    'Vendeur Pro': v.vendeur_pro ? true : false,
    'Annonces DE (nb)': v.count_de || 0,
    'Date Détection': new Date().toISOString().split('T')[0],
    'Statut': 'Nouveau',
  };
}

function updateFields(v) {
  return {
    'Prix France (€)': v.prix_fr || 0,
    'Prix Référence DE (€)': v.prix_de_ref || 0,
    'Profit Brut (€)': v.profit_brut || 0,
    'Delta %': v.delta_pct || 0,
    'Score': v.score_label || '',
    'Opportunité': v.opportunite ? true : false,
    'Lien Annonce FR': v.lien || '',
    'Lien Référence DE': v.url_de_ref || '',
  };
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function syncAll(vehicules) {
  let created = 0, updated = 0, errors = 0;

  try {
    // Fetch tous les records existants en une seule passe
    const existing = await base(TABLE).select({
      fields: ['ID Annonce'],
      maxRecords: 2000,
    }).all();

    const existingMap = new Map(existing.map(r => [r.get('ID Annonce'), r.id]));

    const toCreate = [];
    const toUpdate = [];

    for (const v of vehicules) {
      const annonceId = v.id || '';
      if (existingMap.has(annonceId)) {
        toUpdate.push({ id: existingMap.get(annonceId), fields: updateFields(v) });
      } else {
        toCreate.push({ fields: { ...toRecord(v), 'ID Annonce': annonceId } });
      }
    }

    // Batch creates — 10 à la fois
    for (const batch of chunk(toCreate, 10)) {
      try {
        await base(TABLE).create(batch);
        created += batch.length;
      } catch (err) {
        console.error(`[Airtable] Erreur batch create: ${err.message}`);
        errors += batch.length;
      }
      await new Promise(r => setTimeout(r, 250));
    }

    // Batch updates — 10 à la fois
    for (const batch of chunk(toUpdate, 10)) {
      try {
        await base(TABLE).update(batch);
        updated += batch.length;
      } catch (err) {
        console.error(`[Airtable] Erreur batch update: ${err.message}`);
        errors += batch.length;
      }
      await new Promise(r => setTimeout(r, 250));
    }

  } catch (err) {
    console.error(`[Airtable] Erreur fetch existing: ${err.message}`);
    errors = vehicules.length;
  }

  console.log(`[Airtable] Sync: ${created} créés, ${updated} mis à jour, ${errors} erreurs`);
  return { created, updated, errors };
}
