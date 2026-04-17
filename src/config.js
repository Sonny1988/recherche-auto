// Véhicules cibles et seuils arbitrage

export const THRESHOLDS = {
  MIN_DELTA_EUR: parseInt(process.env.MIN_DELTA_EUR || '2000'),
  MIN_DELTA_PCT: parseInt(process.env.MIN_DELTA_PCT || '15'),
  // Coûts estimés d'export FR→DE
  TRANSPORT_COST: 800,        // transport routier
  REGISTRATION_DE: 400,       // Zulassung allemande
  TUV_COST: 150,              // TÜV si nécessaire
  get TOTAL_COSTS() {
    return this.TRANSPORT_COST + this.REGISTRATION_DE + this.TUV_COST;
  }
};

// Voitures allemandes 10K–50K€
export const TARGET_CARS = [
  // BMW
  { marque: 'BMW', modele: 'Série 3', marqueDE: 'bmw', modeleDE: '3er', minPrice: 10000, maxPrice: 50000, minYear: 2015 },
  { marque: 'BMW', modele: 'Série 5', marqueDE: 'bmw', modeleDE: '5er', minPrice: 15000, maxPrice: 50000, minYear: 2015 },
  { marque: 'BMW', modele: 'X3', marqueDE: 'bmw', modeleDE: 'x3', minPrice: 15000, maxPrice: 50000, minYear: 2015 },
  { marque: 'BMW', modele: 'X5', marqueDE: 'bmw', modeleDE: 'x5', minPrice: 20000, maxPrice: 50000, minYear: 2015 },
  // Mercedes
  { marque: 'Mercedes-Benz', modele: 'Classe C', marqueDE: 'mercedes-benz', modeleDE: 'c-klasse', minPrice: 10000, maxPrice: 50000, minYear: 2015 },
  { marque: 'Mercedes-Benz', modele: 'Classe E', marqueDE: 'mercedes-benz', modeleDE: 'e-klasse', minPrice: 15000, maxPrice: 50000, minYear: 2015 },
  { marque: 'Mercedes-Benz', modele: 'GLC', marqueDE: 'mercedes-benz', modeleDE: 'glc', minPrice: 20000, maxPrice: 50000, minYear: 2016 },
  { marque: 'Mercedes-Benz', modele: 'GLE', marqueDE: 'mercedes-benz', modeleDE: 'gle', minPrice: 25000, maxPrice: 50000, minYear: 2016 },
  // Audi
  { marque: 'Audi', modele: 'A4', marqueDE: 'audi', modeleDE: 'a4', minPrice: 10000, maxPrice: 50000, minYear: 2015 },
  { marque: 'Audi', modele: 'A6', marqueDE: 'audi', modeleDE: 'a6', minPrice: 15000, maxPrice: 50000, minYear: 2015 },
  { marque: 'Audi', modele: 'Q5', marqueDE: 'audi', modeleDE: 'q5', minPrice: 15000, maxPrice: 50000, minYear: 2015 },
  { marque: 'Audi', modele: 'Q7', marqueDE: 'audi', modeleDE: 'q7', minPrice: 25000, maxPrice: 50000, minYear: 2016 },
  // Volkswagen
  { marque: 'Volkswagen', modele: 'Passat', marqueDE: 'volkswagen', modeleDE: 'passat', minPrice: 10000, maxPrice: 35000, minYear: 2015 },
  { marque: 'Volkswagen', modele: 'Tiguan', marqueDE: 'volkswagen', modeleDE: 'tiguan', minPrice: 12000, maxPrice: 40000, minYear: 2016 },
  { marque: 'Volkswagen', modele: 'Touareg', marqueDE: 'volkswagen', modeleDE: 'touareg', minPrice: 20000, maxPrice: 50000, minYear: 2016 },
  // Porsche
  { marque: 'Porsche', modele: 'Macan', marqueDE: 'porsche', modeleDE: 'macan', minPrice: 25000, maxPrice: 50000, minYear: 2016 },
  { marque: 'Porsche', modele: 'Cayenne', marqueDE: 'porsche', modeleDE: 'cayenne', minPrice: 30000, maxPrice: 50000, minYear: 2016 },
];

// Camping-cars (tous budgets, marques allemandes sous-cotées en France)
export const TARGET_CAMPINGCARS = [
  { marque: 'Bürstner', modeleDE: 'buerstner', type: 'camping-car' },
  { marque: 'Knaus', modeleDE: 'knaus', type: 'camping-car' },
  { marque: 'Dethleffs', modeleDE: 'dethleffs', type: 'camping-car' },
  { marque: 'Hymer', modeleDE: 'hymer', type: 'camping-car' },
  { marque: 'Carthago', modeleDE: 'carthago', type: 'camping-car' },
  { marque: 'LMC', modeleDE: 'lmc', type: 'camping-car' },
  { marque: 'Weinsberg', modeleDE: 'weinsberg', type: 'camping-car' },
  { marque: 'Hobby', modeleDE: 'hobby', type: 'camping-car' },
  { marque: 'Pilote', modeleDE: 'pilote', type: 'camping-car' },
  { marque: 'Challenger', modeleDE: 'challenger', type: 'camping-car' },
];

export const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

export const DELAY_MS = 2000; // délai entre requêtes pour ne pas se faire bloquer
