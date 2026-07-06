export interface Bean {
  id: string; // e.g. "B0001"
  name: string;
  country: string;
  region: string;
  farm: string;
  producer: string;
  altitude: number; // in meters
  variety: string;
  process: string; // e.g. "Washed", "Natural", "Honey"
  cropYear: string;
  purchaseShop: string;
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
  initialWeight: number; // in grams
  currentWeight: number; // in grams
  weightLossPercentage: number; // expected roast loss percentage
  recommendedRoastDegree: string;
  notes: string;
  photoUrl?: string;
  createdAt: string;
}

export type RoastStatus = 
  | 'roasted' 
  | 'waiting_day7' 
  | 'waiting_day10' 
  | 'waiting_day14' 
  | 'completed';

export interface Roast {
  id: string; // e.g. "R0001"
  beanId: string;
  roastDate: string; // YYYY-MM-DD
  greenWeight: number; // input weight in grams
  roastedWeight: number; // output weight in grams
  yellowTime: string; // MM:SS
  firstCrackTime: string; // MM:SS
  dropTime: string; // MM:SS
  developmentTime: string; // MM:SS
  developmentRatio: number; // percentage (e.g. 15.5)
  lossRatio: number; // percentage (e.g. 14.2)
  status: RoastStatus;
  notes: string;
  createdAt: string;
}

export interface RoastStep {
  id: string;
  roastId: string;
  time: string; // MM:SS
  heat: number; // 1-8
  air: number; // 1-8
  memo?: string;
}

export interface Tasting {
  id: string;
  roastId: string;
  tastingDay: 7 | 10 | 14;
  tastingDate: string; // YYYY-MM-DD
  fragrance: number; // 0-10
  aroma: number; // 0-10
  flavor: number; // 0-10
  sweetness: number; // 0-10
  acidityIntensity: number; // 0-10 (intensity of acidity)
  acidityQuality: number; // 0-10 (quality of acidity)
  body: number; // 0-10
  aftertaste: number; // 0-10
  balance: number; // 0-10
  cleanCup: number; // 0-10
  overall: number; // 0-10
  score: number; // total out of 100 or custom scale. Q-grader style total is: fragrance + aroma + flavor + sweetness + acidity_intensity/quality average? Or sum of all.
  recommendationRating: number; // 1-5 stars
  flavors: string[]; // array of flavor descriptors (hierarchy or list)
  negatives: string[]; // array of negative descriptors
  improvements: string; // future improvements
  photos: string[]; // base64 or object URLs
  status: 'pending' | 'completed';
  createdAt: string;
}

