// Youngtimers — véhicules allemands ≤ 1999, sous-cotés en France vs Allemagne

export const THRESHOLDS = {
  MIN_DELTA_EUR: parseInt(process.env.MIN_DELTA_EUR || '1500'),
  MIN_DELTA_PCT: parseInt(process.env.MIN_DELTA_PCT || '20'),
  TRANSPORT_COST: 800,
  REGISTRATION_DE: 400,
  TUV_COST: 150,
  get TOTAL_COSTS() { return this.TRANSPORT_COST + this.REGISTRATION_DE + this.TUV_COST; }
};

// Youngtimers allemands recherchés en France (≤ 1999)
export const TARGET_YOUNGTIMERS = [
  // BMW
  { marque: 'BMW', modele: 'E30', searchFR: 'BMW E30', searchDE: 'BMW 3er E30', maxYear: 1994, minPrice: 3000, maxPrice: 25000 },
  { marque: 'BMW', modele: 'E36', searchFR: 'BMW E36', searchDE: 'BMW 3er E36', maxYear: 1999, minPrice: 2000, maxPrice: 20000 },
  { marque: 'BMW', modele: 'E34', searchFR: 'BMW E34', searchDE: 'BMW 5er E34', maxYear: 1996, minPrice: 2000, maxPrice: 15000 },
  { marque: 'BMW', modele: 'E39', searchFR: 'BMW E39', searchDE: 'BMW 5er E39', maxYear: 1999, minPrice: 2000, maxPrice: 15000 },
  { marque: 'BMW', modele: 'E31', searchFR: 'BMW E31 850', searchDE: 'BMW 8er E31', maxYear: 1999, minPrice: 10000, maxPrice: 60000 },

  // Mercedes
  { marque: 'Mercedes', modele: 'W124', searchFR: 'Mercedes W124', searchDE: 'Mercedes W124', maxYear: 1997, minPrice: 2000, maxPrice: 20000 },
  { marque: 'Mercedes', modele: 'W201', searchFR: 'Mercedes 190', searchDE: 'Mercedes 190E W201', maxYear: 1993, minPrice: 2000, maxPrice: 15000 },
  { marque: 'Mercedes', modele: 'W202', searchFR: 'Mercedes W202', searchDE: 'Mercedes C-Klasse W202', maxYear: 2000, minPrice: 1500, maxPrice: 12000 },
  { marque: 'Mercedes', modele: 'R129', searchFR: 'Mercedes SL R129', searchDE: 'Mercedes SL R129', maxYear: 2001, minPrice: 8000, maxPrice: 50000 },
  { marque: 'Mercedes', modele: 'W210', searchFR: 'Mercedes W210', searchDE: 'Mercedes E-Klasse W210', maxYear: 2002, minPrice: 2000, maxPrice: 15000 },

  // Porsche
  { marque: 'Porsche', modele: '944', searchFR: 'Porsche 944', searchDE: 'Porsche 944', maxYear: 1991, minPrice: 5000, maxPrice: 30000 },
  { marque: 'Porsche', modele: '968', searchFR: 'Porsche 968', searchDE: 'Porsche 968', maxYear: 1995, minPrice: 10000, maxPrice: 45000 },
  { marque: 'Porsche', modele: '928', searchFR: 'Porsche 928', searchDE: 'Porsche 928', maxYear: 1995, minPrice: 8000, maxPrice: 50000 },
  { marque: 'Porsche', modele: '993', searchFR: 'Porsche 993', searchDE: 'Porsche 911 993', maxYear: 1998, minPrice: 30000, maxPrice: 150000 },

  // VW
  { marque: 'VW', modele: 'Golf GTI Mk2', searchFR: 'Golf GTI', searchDE: 'VW Golf 2 GTI', maxYear: 1992, minPrice: 3000, maxPrice: 20000 },
  { marque: 'VW', modele: 'Golf Mk3', searchFR: 'Golf GTI VR6', searchDE: 'VW Golf 3 GTI VR6', maxYear: 1997, minPrice: 3000, maxPrice: 18000 },
  { marque: 'VW', modele: 'Corrado', searchFR: 'VW Corrado', searchDE: 'VW Corrado', maxYear: 1995, minPrice: 5000, maxPrice: 25000 },

  // Audi
  { marque: 'Audi', modele: '80 B4', searchFR: 'Audi 80', searchDE: 'Audi 80 B4', maxYear: 1996, minPrice: 2000, maxPrice: 12000 },
  { marque: 'Audi', modele: 'Coupé S2', searchFR: 'Audi S2', searchDE: 'Audi S2 Coupe', maxYear: 1995, minPrice: 8000, maxPrice: 40000 },
];

export const DELAY_MS = 2500;
