/**
 * Crée la table "Opportunités" dans la base Airtable spécifiée.
 * Usage: AIRTABLE_BASE_ID=appXXX node scripts/setup-airtable.js
 */
import 'dotenv/config';
import axios from 'axios';

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!BASE_ID || !API_KEY) {
  console.error('❌ Renseigne AIRTABLE_BASE_ID et AIRTABLE_API_KEY dans .env');
  process.exit(1);
}

const fields = [
  { name: 'Titre', type: 'singleLineText' },
  { name: 'ID Annonce', type: 'singleLineText' },
  { name: 'Type', type: 'singleSelect', options: { choices: [{ name: 'Voiture' }, { name: 'Camping-car' }] } },
  { name: 'Statut', type: 'singleSelect', options: { choices: [
    { name: 'Nouveau', color: 'blueLight2' },
    { name: 'À analyser', color: 'yellowLight2' },
    { name: 'Contacté', color: 'orangeLight2' },
    { name: 'Acheté', color: 'greenLight2' },
    { name: 'Rejeté', color: 'grayLight2' },
  ]}},
  { name: 'Score', type: 'singleLineText' },
  { name: 'Opportunité', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  { name: 'Prix France (€)', type: 'currency', options: { precision: 0, symbol: '€' } },
  { name: 'Prix Référence DE (€)', type: 'currency', options: { precision: 0, symbol: '€' } },
  { name: 'Profit Brut (€)', type: 'currency', options: { precision: 0, symbol: '€' } },
  { name: 'Delta %', type: 'number', options: { precision: 1 } },
  { name: 'Année', type: 'number', options: { precision: 0 } },
  { name: 'Kilométrage', type: 'number', options: { precision: 0 } },
  { name: 'Carburant', type: 'singleLineText' },
  { name: 'Localisation FR', type: 'singleLineText' },
  { name: 'Lien Annonce FR', type: 'url' },
  { name: 'Lien Référence DE', type: 'url' },
  { name: 'Plateforme', type: 'singleLineText' },
  { name: 'Vendeur Pro', type: 'checkbox', options: { icon: 'check', color: 'blueBright' } },
  { name: 'Annonces DE (nb)', type: 'number', options: { precision: 0 } },
  { name: 'Date Détection', type: 'date', options: { dateFormat: { name: 'iso' } } },
  { name: 'Notes', type: 'multilineText' },
];

async function createTable() {
  console.log(`Création de la table "Opportunités" dans la base ${BASE_ID}...`);

  try {
    const res = await axios.post(
      `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
      { name: 'Opportunités', fields },
      { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
    );
    console.log(`✅ Table créée ! ID: ${res.data.id}`);
    console.log(`\n➡️  Ouvre ta base sur airtable.com pour vérifier.`);
    console.log(`➡️  Tu peux maintenant lancer: node src/run.js`);
  } catch (err) {
    if (err.response?.status === 422 && err.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️  La table "Opportunités" existe déjà — OK.');
    } else {
      console.error('❌ Erreur:', err.response?.data || err.message);
    }
  }
}

createTable();
