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

// Cherche si l'annonce existe déjà (par ID annonce)
async function findExisting(annonceId) {
  try {
    const records = await base(TABLE).select({
      filterByFormula: `{ID Annonce} = "${annonceId}"`,
      maxRecords: 1,
    }).firstPage();
    return records[0] || null;
  } catch {
    return null;
  }
}

export async function upsertVehicule(vehicule) {
  const existing = await findExisting(vehicule.id);
  const fields = {
    ...toRecord(vehicule),
    'ID Annonce': vehicule.id || '',
  };

  if (existing) {
    // Mise à jour du prix et du score uniquement (ne pas écraser le statut)
    await base(TABLE).update(existing.id, {
      'Prix France (€)': fields['Prix France (€)'],
      'Prix Référence DE (€)': fields['Prix Référence DE (€)'],
      'Profit Brut (€)': fields['Profit Brut (€)'],
      'Delta %': fields['Delta %'],
      'Score': fields['Score'],
      'Opportunité': fields['Opportunité'],
    });
    return { action: 'updated', id: existing.id };
  } else {
    const created = await base(TABLE).create(fields);
    return { action: 'created', id: created.id };
  }
}

export async function syncAll(vehicules) {
  let created = 0, updated = 0, errors = 0;

  for (const v of vehicules) {
    try {
      const result = await upsertVehicule(v);
      if (result.action === 'created') created++;
      else updated++;
      // Airtable rate limit: 5 req/sec
      await new Promise(r => setTimeout(r, 220));
    } catch (err) {
      console.error(`[Airtable] Erreur pour ${v.titre}: ${err.message}`);
      errors++;
    }
  }

  console.log(`[Airtable] Sync: ${created} créés, ${updated} mis à jour, ${errors} erreurs`);
  return { created, updated, errors };
}
